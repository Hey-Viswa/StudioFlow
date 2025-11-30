import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logAudit } from '../src/services/auditService.js';
import { verifyEntitlement } from '../src/utils/entitlement.js';
import Project from '../src/models/Project.js';
import ProjectMember from '../src/models/ProjectMember.js';
import PaymentThread from '../src/models/PaymentThread.js';
import ProjectInvoice from '../src/models/ProjectInvoice.js';
import Entitlement from '../src/models/Entitlement.js';
import OwnershipTransferRequest from '../src/models/OwnershipTransferRequest.js';
import AuditLog from '../src/models/AuditLog.js';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env:', result.error);
} else {
    console.log('.env loaded successfully');
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/studioflow';

const runTests = async () => {
    console.log('🚀 Starting RBAC V2 Feature Verification...');
    console.log('🔌 Connecting to MongoDB...');

    try {
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            serverApi: {
                version: '1',
                strict: true,
                deprecationErrors: true,
            }
        };
        await mongoose.connect(MONGO_URI, options);
        console.log('✅ Connected to MongoDB');

        // Setup Test Data
        const ownerId = 'test_owner_' + Date.now();
        const clientId = 'test_client_' + Date.now();
        const teamMemberId = 'test_member_' + Date.now();

        console.log(`\n👤 Test Users:\n  Owner: ${ownerId}\n  Client: ${clientId}\n  Member: ${teamMemberId}`);

        // 1. Test Project Creation & Audit Log
        console.log('\n--- 1. Testing Project Creation & Audit Log ---');
        const project = await Project.create({
            title: 'RBAC Test Project',
            ownerId: ownerId,
            status: 'active'
        });

        await ProjectMember.create({
            projectId: project._id,
            userId: ownerId,
            role: 'owner',
            status: 'active',
            invitedBy: ownerId // Self-invited
        });

        // Manually trigger audit log (simulating controller)
        await logAudit({
            userId: ownerId,
            action: 'create_project',
            resourceType: 'project',
            resourceId: project._id,
            details: { title: project.title }
        });

        // Verify Audit Log
        const createLog = await AuditLog.findOne({
            action: 'create_project',
            resourceId: project._id
        });

        if (createLog) {
            console.log('✅ Audit Log verified for create_project');
        } else {
            console.error('❌ Audit Log MISSING for create_project');
        }

        // 2. Test Entitlement Enforcement (Pre-Payment)
        console.log('\n--- 2. Testing Entitlement Enforcement (Pre-Payment) ---');

        // Add client to project
        await ProjectMember.create({
            projectId: project._id,
            userId: clientId,
            role: 'client',
            status: 'active',
            invitedBy: ownerId
        });

        const isEntitledPre = await verifyEntitlement(clientId, project._id);
        if (!isEntitledPre) {
            console.log('✅ Entitlement correctly DENIED before payment');
        } else {
            console.error('❌ Entitlement WRONGLY GRANTED before payment');
        }

        // 3. Test Webhook Processing (Payment Capture)
        console.log('\n--- 3. Testing Webhook Processing (Payment Capture) ---');

        // Setup Payment Thread & Invoice
        const orderId = 'order_' + Date.now();
        const paymentId = 'pay_' + Date.now();

        const invoice = await ProjectInvoice.create({
            projectId: project._id,
            userId: ownerId, // Added userId
            amount: 5000,
            status: 'pending',
            client: { userId: clientId },
            dueDate: new Date(Date.now() + 86400000), // Added dueDate as it is required
            items: [{ title: 'Milestone 1', rate: 5000, amount: 5000 }] // Added items to calculate totals
        });

        const paymentThread = await PaymentThread.create({
            projectId: project._id,
            title: 'Milestone 1',
            amount: 5000,
            type: 'milestone',
            status: 'pending',
            razorpayOrderId: orderId,
            invoiceId: invoice._id
        });

        // Simulate Payment Capture Logic (copying logic from paymentController)
        console.log(`Simulating payment capture for order: ${orderId}`);

        paymentThread.status = 'paid';
        paymentThread.razorpayPaymentId = paymentId;
        paymentThread.paidAt = new Date();
        await paymentThread.save();

        await ProjectInvoice.findByIdAndUpdate(invoice._id, {
            status: 'paid',
            paidAt: new Date(),
            razorpayPaymentId: paymentId,
            accessGranted: true
        });

        await Entitlement.create({
            userId: clientId,
            projectId: project._id,
            paymentThreadId: paymentThread._id,
            scope: 'project_download',
            grantedAt: new Date()
        });

        await logAudit({
            userId: clientId,
            action: 'payment_success',
            resourceType: 'payment',
            resourceId: paymentThread._id,
            status: 'success'
        });

        // Verify Entitlement Post-Payment
        const isEntitledPost = await verifyEntitlement(clientId, project._id);
        if (isEntitledPost) {
            console.log('✅ Entitlement correctly GRANTED after payment');
        } else {
            console.error('❌ Entitlement MISSING after payment');
        }

        // Verify Audit Log for Payment
        const paymentLog = await AuditLog.findOne({
            action: 'payment_success',
            resourceId: paymentThread._id
        });
        if (paymentLog) console.log('✅ Audit Log verified for payment_success');
        else console.error('❌ Audit Log MISSING for payment_success');


        // 4. Test Ownership Transfer
        console.log('\n--- 4. Testing Ownership Transfer ---');

        // Add team member
        await ProjectMember.create({
            projectId: project._id,
            userId: teamMemberId,
            role: 'team_member',
            status: 'active',
            invitedBy: ownerId
        });

        // Create Request
        const transferRequest = await OwnershipTransferRequest.create({
            projectId: project._id,
            currentOwnerId: ownerId,
            newOwnerId: teamMemberId,
            status: 'pending',
            expiresAt: new Date(Date.now() + 86400000)
        });
        console.log('Transfer requested');

        // Simulate Acceptance
        // 1. Update Project Owner
        project.ownerId = teamMemberId;
        await project.save();

        // 2. Update Roles
        await ProjectMember.findOneAndUpdate(
            { projectId: project._id, userId: ownerId },
            { role: 'team_member' }
        );
        await ProjectMember.findOneAndUpdate(
            { projectId: project._id, userId: teamMemberId },
            { role: 'owner' }
        );

        // 3. Update Request
        transferRequest.status = 'accepted';
        await transferRequest.save();

        await logAudit({
            userId: teamMemberId,
            action: 'ownership_transfer_accepted',
            resourceType: 'project',
            resourceId: project._id,
            details: { oldOwnerId: ownerId }
        });

        // Verify
        const updatedProject = await Project.findById(project._id);
        const newOwnerMember = await ProjectMember.findOne({ projectId: project._id, userId: teamMemberId });
        const oldOwnerMember = await ProjectMember.findOne({ projectId: project._id, userId: ownerId });

        if (updatedProject.ownerId === teamMemberId &&
            newOwnerMember.role === 'owner' &&
            oldOwnerMember.role === 'team_member') {
            console.log('✅ Ownership transfer verified successfully');
        } else {
            console.error('❌ Ownership transfer FAILED verification');
            console.log('Debug:', {
                projOwner: updatedProject.ownerId,
                newRole: newOwnerMember.role,
                oldRole: oldOwnerMember.role
            });
        }

        // 5. Test Refund & Revocation
        console.log('\n--- 5. Testing Refund & Revocation ---');

        // Simulate Refund
        paymentThread.status = 'refunded';
        await paymentThread.save();

        await ProjectInvoice.findByIdAndUpdate(invoice._id, {
            status: 'refunded',
            accessGranted: false
        });

        await Entitlement.findOneAndUpdate(
            { paymentThreadId: paymentThread._id },
            { revokedAt: new Date(), revocationReason: 'Test Refund' }
        );

        await logAudit({
            userId: clientId,
            action: 'refund_processed',
            resourceType: 'entitlement',
            resourceId: paymentThread._id, // loosely linked
            status: 'success'
        });

        // Verify Revocation
        const isEntitledRefund = await verifyEntitlement(clientId, project._id);
        if (!isEntitledRefund) {
            console.log('✅ Entitlement correctly REVOKED after refund');
        } else {
            console.error('❌ Entitlement STILL ACTIVE after refund');
        }

        console.log('\n✨ All Verification Steps Completed!');

    } catch (error) {
        console.error('❌ Error running verification:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

runTests();
