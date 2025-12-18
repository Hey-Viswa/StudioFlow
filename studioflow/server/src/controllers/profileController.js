import PublicProfile from '../models/PublicProfile.js';
import Follow from '../models/Follow.js';
import Content from '../models/Content.js';
import User from '../models/User.js';

// Feature Flag Check
const isCreatorProfileEnabled = () => process.env.ENABLE_CREATOR_PROFILES === 'true';

export const getProfileByUsername = async (req, res) => {
    try {
        if (!isCreatorProfileEnabled()) {
             return res.status(404).json({ error: 'Profiles disabled' });
        }

        const { username } = req.params;
        const profile = await PublicProfile.findOne({ username, isPublic: true });

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getProfilePosts = async (req, res) => {
    try {
        if (!isCreatorProfileEnabled()) {
             return res.status(404).json({ error: 'Profiles disabled' });
        }
        
        const { username } = req.params;
        const profile = await PublicProfile.findOne({ username, isPublic: true });
        
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // Fetch public posts by this author
        // We assume 'author' field in Content is the userId or we need to query by it
        // Phase 6 plan says Content model should store author info. 
        // Currently Content model likely stores 'userId' or 'author'.
        // Let's assume 'userId' for now matching the profile's userId.
        const posts = await Content.find({ 
            userId: profile.userId, 
            status: 'published',
            type: 'blog' 
        }).sort({ createdAt: -1 });

        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const followUser = async (req, res) => {
    try {
        if (!isCreatorProfileEnabled()) return res.status(404).json({ error: 'Feature disabled' });

        const { username } = req.params;
        const followerId = req.userId;
        
        console.log(`[Follow] User ${followerId} attempting to follow username: ${username}`);

        // Find profile by username (don't require isPublic for following)
        const targetProfile = await PublicProfile.findOne({ username });
        if (!targetProfile) {
            console.log(`[Follow] Target profile not found for username: ${username}`);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`[Follow] Target profile found: ${targetProfile.userId}, follower: ${followerId}`);

        if (targetProfile.userId === followerId) {
            console.log(`[Follow] Self-follow attempt blocked`);
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        // Toggle follow
        const existingFollow = await Follow.findOne({ followerId, followingId: targetProfile.userId });
        
        if (existingFollow) {
            await Follow.deleteOne({ _id: existingFollow._id });
            await PublicProfile.findByIdAndUpdate(targetProfile._id, { $inc: { followersCount: -1 } });
            console.log(`[Follow] Unfollowed successfully`);
            return res.json({ following: false });
        } else {
            await Follow.create({ followerId, followingId: targetProfile.userId });
            await PublicProfile.findByIdAndUpdate(targetProfile._id, { $inc: { followersCount: 1 } });
            console.log(`[Follow] Followed successfully`);
            return res.json({ following: true });
        }
    } catch (error) {
        console.error(`[Follow] Error:`, error);
        res.status(500).json({ error: error.message });
    }
};

export const getMyProfile = async (req, res) => {
    try {
        const userId = req.userId;
        let profile = await PublicProfile.findOne({ userId });
        
        if (!profile) {
            // Return empty/default if not set up
            return res.json({ isConfigured: false });
        }
        
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateMyProfile = async (req, res) => {
    try {
        const userId = req.userId; // Guaranteed by auth middleware
        const { username, displayName, bio, isPublic } = req.body;

        console.log('📝 Updating Profile for:', userId);
        console.log('   Data:', { username, displayName, bio });

        // Check username uniqueness if changing
        if (username) {
            const existing = await PublicProfile.findOne({ username, userId: { $ne: userId } });
            if (existing) {
                console.warn('❌ Username taken:', username);
                return res.status(400).json({ error: 'Username taken' });
            }
        }

        const profile = await PublicProfile.findOneAndUpdate(
            { userId },
            { 
                $set: { 
                    username, 
                    displayName, 
                    bio, 
                    isPublic,
                    updatedAt: new Date() 
                } 
            },
            { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
        );

        console.log('✅ Profile updated/created:', profile?._id);
        res.json(profile);
    } catch (error) {
        console.error('❌ Profile Update Error:', error);
        
        // Handle Duplicate Key Error (MongoDB E11000)
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Username taken' });
        }

        // Handle Validation Errors explicitly
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message).join(', ');
            return res.status(400).json({ error: messages });
        }
        res.status(500).json({ error: error.message });
    }
};
