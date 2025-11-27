// Example integration for Comment Notifications
// Add this to your taskCommentController.js or similar

import { createNotification, createBulkNotifications } from '../services/notificationService.js';

// Example 1: Notify project owner when comment is added
export const addComment = async (req, res) => {
  try {
    const { projectId, taskId, content } = req.body;
    const userId = req.userId; // From Clerk auth
    
    // ... your existing comment creation logic ...
    const comment = await Comment.create({ /* ... */ });
    
    // Get project owner and commenter info
    const project = await Project.findById(projectId);
    const commenter = await getUserInfo(userId); // Your helper function
    
    // ✅ NOTIFICATION: Notify project owner
    if (project.ownerId !== userId) { // Don't notify if owner comments
      await createNotification({
        userId: project.ownerId,
        type: 'comment-added',
        title: 'New Comment',
        message: `${commenter.name} commented on ${project.name}`,
        link: `/projects/${projectId}`,
        priority: 'normal',
        sendEmail: true
      });
    }
    
    // ✅ NOTIFICATION: Check for @mentions
    const mentionRegex = /@(\w+)/g;
    const mentions = [...content.matchAll(mentionRegex)];
    
    if (mentions.length > 0) {
      // Find users by username
      const mentionedUsers = await findUsersByUsernames(mentions.map(m => m[1]));
      
      // Create notification for each mentioned user
      await createBulkNotifications(
        mentionedUsers.map(user => ({
          userId: user.id,
          type: 'comment-mention',
          title: 'Mentioned in Comment',
          message: `${commenter.name} mentioned you in a comment`,
          link: `/projects/${projectId}`,
          priority: 'high',
          sendEmail: true
        }))
      );
    }
    
    res.json({ success: true, comment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Example 2: Notify when someone replies to your comment
export const replyToComment = async (req, res) => {
  try {
    const { commentId, content } = req.body;
    const userId = req.userId;
    
    // ... your existing reply logic ...
    const parentComment = await Comment.findById(commentId);
    const reply = await Comment.create({ /* ... */ });
    
    const replier = await getUserInfo(userId);
    
    // ✅ NOTIFICATION: Notify original commenter
    if (parentComment.authorId !== userId) {
      await createNotification({
        userId: parentComment.authorId,
        type: 'comment-reply',
        title: 'Reply to Your Comment',
        message: `${replier.name} replied to your comment`,
        link: `/projects/${parentComment.projectId}`,
        priority: 'normal',
        sendEmail: true
      });
    }
    
    res.json({ success: true, reply });
  } catch (error) {
    console.error('Error replying to comment:', error);
    res.status(500).json({ error: error.message });
  }
};
