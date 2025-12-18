import Response from '../models/Response.js';
import Content from '../models/Content.js';
import PublicProfile from '../models/PublicProfile.js';

export const createResponse = async (req, res) => {
    try {
        const { contentId, body, parentId } = req.body;
        const userId = req.user.clerkUserId;

        if (!body || !body.trim()) {
            return res.status(400).json({ error: 'Comment body is required' });
        }

        // Verify content exists
        const content = await Content.findById(contentId);
        if (!content) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // If parentId is provided, verify it exists and is top-level (no nested nesting)
        if (parentId) {
            const parent = await Response.findById(parentId);
            if (!parent) {
                return res.status(404).json({ error: 'Parent comment not found' });
            }
            if (parent.parentId) {
                return res.status(400).json({ error: 'Nested replies are limited to 1 level' });
            }
        }

        const response = await Response.create({
            contentId,
            userId,
            body,
            parentId: parentId || null
        });

        // Return with author populated
        const populated = await Response.findById(response._id).populate('author');
        res.status(201).json(populated);
    } catch (error) {
        console.error('Create Response Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

export const getResponses = async (req, res) => {
    try {
        const { contentId } = req.params;

        // Fetch top-level comments
        const responses = await Response.find({
            contentId,
            parentId: null,
            status: 'active'
        })
        .sort({ createdAt: -1 }) // Newest first
        .populate('author')
        .populate({
            path: 'replies',
            match: { status: 'active' },
            populate: { path: 'author' }
        });

        res.json(responses);
    } catch (error) {
        console.error('Get Responses Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

export const deleteResponse = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.clerkUserId;

        const response = await Response.findById(id);
        if (!response) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Check ownership (or admin capability if we had it)
        if (response.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Soft delete
        response.status = 'deleted';
        await response.save();

        res.json({ message: 'Comment deleted' });
    } catch (error) {
        console.error('Delete Response Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

export const likeResponse = async (req, res) => {
     try {
        const { id } = req.params;
        const userId = req.user.clerkUserId;

        const response = await Response.findById(id);
        if (!response) return res.status(404).json({ error: 'Comment not found' });

        const hasLiked = response.likedBy.includes(userId);

        if (hasLiked) {
            response.likes = Math.max(0, response.likes - 1);
            response.likedBy = response.likedBy.filter(uid => uid !== userId);
        } else {
            response.likes += 1;
            response.likedBy.push(userId);
        }

        await response.save();
        res.json({ likes: response.likes, hasLiked: !hasLiked });

     } catch (error) {
         console.error('Like Response Error:', error);
         res.status(500).json({ error: 'Server Error' });
     }
};
