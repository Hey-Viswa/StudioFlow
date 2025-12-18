
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { updateMyProfile } from '../src/controllers/profileController.js';
import PublicProfile from '../src/models/PublicProfile.js';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studioflow';

// Mock Response Object
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    return res;
};

async function verifyRouteShadowing() {
    console.log('\n🔍 Verifying Route Shadowing...');
    try {
        const response = await fetch('http://localhost:5000/api/content/mine');
        console.log(`   GET /api/content/mine Status: ${response.status}`);
        
        if (response.status === 401) {
            console.log('   ✅ Success: Got 401 Unauthorized. This means the request hit the Protected Route (verifyClerk) as expected.');
        } else if (response.status === 400) {
            console.log('   ❌ Failure: Got 400. This likely means it fell through to /content/:type and was rejected as invalid type.');
        } else {
            console.log(`   ⚠️ Unexpected status: ${response.status}`);
        }
    } catch (error) {
        console.log('   ❌ Error contacting server:', error.message);
    }
}

async function verifyProfileErrorHandling() {
    console.log('\n🔍 Verifying Profile Duplicate Error Handling...');
    
    // Connect to DB
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('   ✅ Connected to MongoDB');
    } catch (e) {
        console.error('   ❌ DB Connection Failed:', e);
        return;
    }

    try {
        // Cleanup Test Data
        await PublicProfile.deleteMany({ userId: { $in: ['test_user_1', 'test_user_2'] } });

        // 1. Create first profile
        console.log('   Creating first profile (test_user_1)...');
        const req1 = {
            userId: 'test_user_1',
            body: { username: 'test_duplicate', displayName: 'Test 1', isPublic: true }
        };
        const res1 = mockRes();
        await updateMyProfile(req1, res1);

        if (res1.body && res1.body.username === 'test_duplicate') {
            console.log('   ✅ User 1 created.');
        } else {
            console.log('   ❌ Failed to create User 1:', res1.body);
        }

        // 2. Try to create second profile with same username
        console.log('   Attempting to create second profile (test_user_2) with same username...');
        const req2 = {
            userId: 'test_user_2',
            body: { username: 'test_duplicate', displayName: 'Test 2', isPublic: true }
        };
        const res2 = mockRes();
        await updateMyProfile(req2, res2);

        // Check result
        if (res2.statusCode === 400 && res2.body.error === 'Username taken') {
            console.log('   ✅ Success: Got 400 "Username taken" as expected!');
        } else {
            console.log('   ❌ Failure: Expected 400 "Username taken", got:', res2.statusCode, res2.body);
            if (res2.statusCode === 500) {
                console.log('   (This indicates the internal server error was not caught properly)');
            }
        }

    } catch (error) {
        console.error('   ❌ Test Execution Error:', error);
    } finally {
        await PublicProfile.deleteMany({ userId: { $in: ['test_user_1', 'test_user_2'] } });
        await mongoose.disconnect();
    }
}

async function run() {
    await verifyRouteShadowing();
    await verifyProfileErrorHandling();
}

run();
