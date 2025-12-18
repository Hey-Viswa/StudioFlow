import FeedItem from '../models/FeedItem.js';
import Follow from '../models/Follow.js';
import Content from '../models/Content.js';
import PublicProfile from '../models/PublicProfile.js';

/**
 * Fan-out on publish: insert feed items for all followers of author
 */
export const fanOutOnPublish = async (authorId, postId) => {
  const followers = await Follow.find({ followingId: authorId }).select('followerId').lean();
  if (!followers.length) return 0;

  const bulk = followers.map((f) => ({
    userId: f.followerId,
    postId,
    reason: 'followed_creator'
  }));

  await FeedItem.insertMany(bulk, { ordered: false }).catch(() => null);
  return bulk.length;
};

/**
 * Get feed items for a user sorted by newest first
 */
export const getFeed = async (userId, { limit = 20, cursor } = {}) => {
  const query = { userId };
  if (cursor) {
    query.createdAt = { $lt: new Date(cursor) };
  }

  const items = await FeedItem.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const postIds = items.map((i) => i.postId);
  // Only return published posts — unpublished/deleted posts are filtered out
  const posts = await Content.find({ _id: { $in: postIds }, status: 'published' })
    .select('title slug publishedAt clapCount commentCount userId status')
    .lean();
  const profiles = await PublicProfile.find({ userId: { $in: posts.map((p) => p.userId) } })
    .select('userId username displayName avatarUrl followersCount')
    .lean();

  const postMap = new Map(posts.map((p) => [p._id.toString(), p]));
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  // Filter out feed items where post is unpublished/deleted (no longer in postMap)
  const enriched = items
    .filter((item) => postMap.has(item.postId.toString()))
    .map((item) => {
      const post = postMap.get(item.postId.toString());
      const authorProfile = profileMap.get(post.userId) || {};
      return { ...item, post, author: authorProfile };
    });

  const nextCursor = items.length === limit ? items[items.length - 1].createdAt : null;

  return { items: enriched, nextCursor };
};
