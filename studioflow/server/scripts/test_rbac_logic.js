
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Project from '../src/models/Project.js';
import ProjectMember from '../src/models/ProjectMember.js';
import { ROLES, PERMISSIONS, checkPermission } from '../src/utils/permissions.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const testRBAC = async () => {
    try {
        console.log('🧪 Testing RBAC Logic...');

        // 1. Verify Permission Utility
        console.log('\n1. Verifying Permission Utility:');

        const ownerCanDelete = checkPermission(ROLES.OWNER, PERMISSIONS.PROJECT_DELETE);
        console.log(`   - Owner can delete project: ${ownerCanDelete} (Expected: true)`);

        const memberCanDelete = checkPermission(ROLES.TEAM_MEMBER, PERMISSIONS.PROJECT_DELETE);
        console.log(`   - Member can delete project: ${memberCanDelete} (Expected: false)`);

        const clientCanRequestRevision = checkPermission(ROLES.CLIENT, PERMISSIONS.PROJECT_REQUEST_REVISION);
        console.log(`   - Client can request revision: ${clientCanRequestRevision} (Expected: true)`);

        const memberCanUpdate = checkPermission(ROLES.TEAM_MEMBER, PERMISSIONS.PROJECT_UPDATE);
        console.log(`   - Member can update project (generic): ${memberCanUpdate} (Expected: false)`);
        // Wait, matrix says Member cannot update project details. 
        // My permissions.js says: TEAM_MEMBER: [PROJECT_VIEW, TASK_CREATE...] -> NO PROJECT_UPDATE. Correct.

        if (ownerCanDelete && !memberCanDelete && clientCanRequestRevision && !memberCanUpdate) {
            console.log('✅ Permission Utility Logic is CORRECT.');
        } else {
            console.error('❌ Permission Utility Logic is INCORRECT.');
        }

        // 2. Verify Controller Logic (Simulation)
        // We can't easily run the controller without a full mock, but we can verify the logic flow.
        // The logic in updateProject is:
        /*
        if ((title || brief || dueDate || tasks) && !checkPermission(userRole, PERMISSIONS.PROJECT_UPDATE)) {
           error
        }
        */

        console.log('\n2. Simulating Controller Checks:');

        // Scenario: Team Member tries to update Title
        const role = ROLES.TEAM_MEMBER;
        const updateTitle = true;
        const hasUpdatePermission = checkPermission(role, PERMISSIONS.PROJECT_UPDATE);

        if (updateTitle && !hasUpdatePermission) {
            console.log(`   - Team Member updating title -> BLOCKED (Correct)`);
        } else {
            console.error(`   - Team Member updating title -> ALLOWED (Incorrect)`);
        }

        // Scenario: Client tries to Request Revision
        const clientRole = ROLES.CLIENT;
        const status = 'needs-revision';
        const hasRevisionPermission = checkPermission(clientRole, PERMISSIONS.PROJECT_REQUEST_REVISION);

        if (status === 'needs-revision' && hasRevisionPermission) {
            console.log(`   - Client requesting revision -> ALLOWED (Correct)`);
        } else {
            console.error(`   - Client requesting revision -> BLOCKED (Incorrect)`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
};

testRBAC();
