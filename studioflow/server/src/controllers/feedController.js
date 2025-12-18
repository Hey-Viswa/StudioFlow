import { getFeed } from '../services/feedService.js';

export const getUserFeed = async (req, res) => {
  try {
    const { limit = 20, cursor } = req.query;
    const parsedLimit = Math.min(Number(limit) || 20, 100);
    const feed = await getFeed(req.userId, { limit: parsedLimit, cursor });
    res.json(feed);
  } catch (error) {
    console.error('Get Feed Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};
