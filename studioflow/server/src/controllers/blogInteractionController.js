import { addClap, removeClap, addComment, deleteComment, getComments, addBookmark, removeBookmark, getBookmarks, isBookmarked } from '../services/interactionService.js';

export const postClap = async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ error: 'postId required' });
    const result = await addClap(req.userId, postId);
    res.json(result);
  } catch (error) {
    console.error('Clap Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

export const deleteClap = async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ error: 'postId required' });
    const result = await removeClap(req.userId, postId);
    res.json(result);
  } catch (error) {
    console.error('Unclap Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

export const postComment = async (req, res) => {
  try {
    const { postId, text } = req.body;
    if (!postId || !text) return res.status(400).json({ error: 'postId and text required' });
    const comment = await addComment(req.userId, postId, text);
    res.status(201).json(comment);
  } catch (error) {
    console.error('Comment Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

export const removeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    if (!commentId) return res.status(400).json({ error: 'commentId required' });
    const result = await deleteComment(commentId, { userId: req.userId, allowPostAuthor: false });
    if (result.reason === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    res.json(result);
  } catch (error) {
    console.error('Delete Comment Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

export const listComments = async (req, res) => {
  try {
    const { postId } = req.query;
    const { limit = 20, skip = 0 } = req.query;
    if (!postId) return res.status(400).json({ error: 'postId required' });
    const parsedLimit = Math.min(Number(limit) || 20, 100);
    const parsedSkip = Number(skip) || 0;
    const data = await getComments(postId, { limit: parsedLimit, skip: parsedSkip });
    res.json(data);
  } catch (error) {
    console.error('List Comments Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

// Bookmark handlers
export const postBookmark = async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ error: 'postId required' });
    const result = await addBookmark(req.userId, postId);
    res.json(result);
  } catch (error) {
    console.error('Bookmark Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

export const deleteBookmark = async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ error: 'postId required' });
    const result = await removeBookmark(req.userId, postId);
    res.json(result);
  } catch (error) {
    console.error('Unbookmark Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

export const listBookmarks = async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;
    const parsedLimit = Math.min(Number(limit) || 20, 100);
    const parsedSkip = Number(skip) || 0;
    const data = await getBookmarks(req.userId, { limit: parsedLimit, skip: parsedSkip });
    res.json(data);
  } catch (error) {
    console.error('List Bookmarks Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

export const checkBookmark = async (req, res) => {
  try {
    const { postId } = req.query;
    if (!postId) return res.status(400).json({ error: 'postId required' });
    const bookmarked = await isBookmarked(req.userId, postId);
    res.json({ bookmarked });
  } catch (error) {
    console.error('Check Bookmark Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};
