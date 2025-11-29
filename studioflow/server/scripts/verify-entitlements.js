import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars - Correct path is ../.env (server/.env)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const run = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is missing in .env');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Connected to MongoDB');

        // Import middleware dynamically after connection
        const { checkResourceLimit } = await import('../src/middlewares/entitlementMiddleware.js');
        console.log('Middleware imported');

        // Import models
        const User = (await import('../src/models/User.js')).default;
        const Project = (await import('../src/models/Project.js')).default;
        console.log('Models imported');

        // 1. Create a test user with FREE plan
        console.log('👤 Creating test user (Free Plan)...');
        const testUser = await User.create({
            clerkUserId: 'test_entitlement_user_' + Date.now(),
            email: 'test_entitlement@example.com',
            subscription: {
                plan: 'free',
                status: 'active'
            }
        });
        console.log('User created:', testUser._id);

        try {
            // 2. Create 5 projects (Max for free plan)
            console.log('📚 Creating 5 test projects...');
            for (let i = 0; i < 5; i++) {
                await Project.create({
                    title: `Test Project ${i}`,
                    ownerId: testUser._id,
                    status: 'active'
                });
            }

            // 3. Test: Try to create 6th project (Should Fail)
            console.log('🛑 Testing limit enforcement (Expect Failure)...');

            const req = { userId: testUser._id };
            const res = {
                status: (code) => {
                    return {
                        json: (data) => {
                            console.log(`   Response: ${code}`, data);
                            if (code === 403 && data.code === 'LIMIT_REACHED') {
                                console.log('   ✅ Limit correctly enforced!');
                            } else {
                                console.error('   ❌ Unexpected response!');
                                throw new Error('Limit not enforced');
                            }
                        }
                    };
                }
            };
            const next = () => {
                console.error('   ❌ Middleware called next() unexpectedly!');
                throw new Error('Limit not enforced');
            };

            await checkResourceLimit('project')(req, res, next);

            // 4. Upgrade user to PRO
            console.log('⬆️ Upgrading user to PRO...');
            testUser.subscription.plan = 'pro';
            await testUser.save();

            // 5. Test: Try to create 6th project (Should Succeed)
            console.log('🟢 Testing limit with PRO plan (Expect Success)...');

            let nextCalled = false;
            const nextSuccess = () => {
                nextCalled = true;
                console.log('   ✅ Middleware called next() as expected!');
            };

            await checkResourceLimit('project')(req, res, nextSuccess);

            if (!nextCalled) {
                throw new Error('Middleware blocked request for PRO user');
            }

        } finally {
            // Cleanup
            console.log('🧹 Cleaning up...');
            if (testUser) {
                await Project.deleteMany({ ownerId: testUser._id });
                await User.findByIdAndDelete(testUser._id);
            }
            await mongoose.connection.close();
            console.log('👋 Done');
        }

    } catch (err) {
        console.error('❌ Test Failed:', err);
        process.exit(1);
    }
};

run();
