import Clap from '../models/Clap.js';
import BlogComment from '../models/BlogComment.js';
import Content from '../models/Content.js';
import Bookmark from '../models/Bookmark.js';
import PublicProfile from '../models/PublicProfile.js';

export const addClap = async (userId, postId) => {
  try {
    await Clap.create({ userId, postId });
    await Content.updateOne({ _id: postId }, { $inc: { clapCount: 1 } });
    return { clapped: true };
  } catch (error) {
    if (error.code === 11000) {
      return { clapped: false, alreadyClapped: true };
    }
    throw error;
  }
};

export const removeClap = async (userId, postId) => {
  const res = await Clap.deleteOne({ userId, postId });
  if (res.deletedCount > 0) {
    await Content.updateOne({ _id: postId, clapCount: { $gt: 0 } }, { $inc: { clapCount: -1 } });
    return { clapped: false, removed: true };
  }
  return { clapped: false, removed: false };
};

export const addComment = async (userId, postId, text) => {
  const comment = await BlogComment.create({ userId, postId, text: text.trim() });
  await Content.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });
  return comment;
};

export const deleteComment = async (commentId, { userId, allowPostAuthor = false } = {}) => {
  const comment = await BlogComment.findById(commentId);
  if (!comment) return { deleted: false };

  if (comment.userId !== userId && !allowPostAuthor) {
    return { deleted: false, reason: 'forbidden' };
  }

  await BlogComment.deleteOne({ _id: commentId });
  await Content.updateOne({ _id: comment.postId, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } });
  return { deleted: true };
};

export const getComments = async (postId, { limit = 20, skip = 0 } = {}) => {
  const comments = await BlogComment.find({ postId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
  const total = await BlogComment.countDocuments({ postId });
  return { comments, total };
};

// Bookmark functions
export const addBookmark = async (userId, postId) => {
  try {
    await Bookmark.create({ userId, postId });
    return { bookmarked: true };
  } catch (error) {
    if (error.code === 11000) {
      return { bookmarked: false, alreadyBookmarked: true };
    }
    throw error;
  }
};

export const removeBookmark = async (userId, postId) => {
  const res = await Bookmark.deleteOne({ userId, postId });
  if (res.deletedCount > 0) {
    return { bookmarked: false, removed: true };
  }
  return { bookmarked: false, removed: false };
};

export const getBookmarks = async (userId, { limit = 20, skip = 0 } = {}) => {
  const bookmarks = await Bookmark.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
  
  const postIds = bookmarks.map(b => b.postId);
  const posts = await Content.find({ _id: { $in: postIds }, status: 'published' })
    .select('title slug excerpt coverImage publishedAt userId clapCount commentCount author')
    .lean();
  
  // Get author profiles
  const userIds = [...new Set(posts.map(p => p.userId))];
  const profiles = await PublicProfile.find({ userId: { $in: userIds } })
    .select('userId username displayName avatarUrl followersCount')
    .lean();
  const profileMap = new Map(profiles.map(p => [p.userId, p]));
  
  // Attach author profiles to posts and maintain bookmark order
  const postMap = new Map(posts.map(p => [p._id.toString(), { ...p, authorProfile: profileMap.get(p.userId) || null }]));
  const orderedPosts = postIds
    .map(id => postMap.get(id.toString()))
    .filter(Boolean); // Only include posts that exist (status: published)
  
  const total = await Bookmark.countDocuments({ userId });
  return { bookmarks, posts: orderedPosts, total };
};

export const isBookmarked = async (userId, postId) => {
  const bookmark = await Bookmark.findOne({ userId, postId });
  return !!bookmark;
};
