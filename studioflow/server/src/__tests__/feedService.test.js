import { jest } from '@jest/globals';

describe('feedService', () => {
  let followFindMock;
  let feedInsertMock;
  let feedFindMock;
  let contentFindMock;
  let profileFindMock;

  let fanOutOnPublish;
  let getFeed;

  const buildFindChain = (data) => ({
    sort: jest.fn(() => ({
      limit: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue(data)
      }))
    }))
  });

  const buildSelectChain = (data) => ({
    select: jest.fn(() => ({
      lean: jest.fn().mockResolvedValue(data)
    }))
  });

  beforeEach(async () => {
    jest.resetModules();

    followFindMock = jest.fn();
    feedInsertMock = jest.fn();
    feedFindMock = jest.fn();
    contentFindMock = jest.fn();
    profileFindMock = jest.fn();

    jest.unstable_mockModule('../models/Follow.js', () => ({
      default: { find: followFindMock }
    }));

    jest.unstable_mockModule('../models/FeedItem.js', () => ({
      default: {
        insertMany: feedInsertMock,
        find: feedFindMock
      }
    }));

    jest.unstable_mockModule('../models/Content.js', () => ({
      default: { find: contentFindMock }
    }));

    jest.unstable_mockModule('../models/PublicProfile.js', () => ({
      default: { find: profileFindMock }
    }));

    const service = await import('../services/feedService.js');
    fanOutOnPublish = service.fanOutOnPublish;
    getFeed = service.getFeed;
  });

  test('fanOutOnPublish inserts feed items per follower', async () => {
    followFindMock.mockReturnValue(buildSelectChain([{ followerId: 'f1' }, { followerId: 'f2' }]));
    feedInsertMock.mockResolvedValue(true);
    const count = await fanOutOnPublish('author1', 'post1');
    expect(count).toBe(2);
    expect(feedInsertMock).toHaveBeenCalledWith([
      { userId: 'f1', postId: 'post1', reason: 'followed_creator' },
      { userId: 'f2', postId: 'post1', reason: 'followed_creator' }
    ], { ordered: false });
  });

  test('getFeed returns enriched items and cursor when paginated', async () => {
    const now = new Date();
    const feedItems = [{ userId: 'u1', postId: 'p1', createdAt: now }];
    const posts = [{ _id: 'p1', userId: 'author1', title: 'T', slug: 't' }];
    const profiles = [{ userId: 'author1', username: 'a1' }];

    feedFindMock.mockReturnValue(buildFindChain(feedItems));
    contentFindMock.mockReturnValue(buildSelectChain(posts));
    profileFindMock.mockReturnValue(buildSelectChain(profiles));

    const res = await getFeed('u1', { limit: 10 });
    expect(feedFindMock).toHaveBeenCalledWith({ userId: 'u1' });
    expect(res.items[0].post.title).toBe('T');
    expect(res.items[0].author.username).toBe('a1');
    expect(res.nextCursor).toBeNull();
  });

  test('getFeed filters out unpublished/deleted posts', async () => {
    const now = new Date();
    // FeedItems reference two posts, but only one is published
    const feedItems = [
      { userId: 'u1', postId: 'p1', createdAt: now },
      { userId: 'u1', postId: 'p2', createdAt: new Date(now - 1000) }
    ];
    // Content query only returns the published post (p1), p2 is unpublished/missing
    const posts = [{ _id: 'p1', userId: 'author1', title: 'Published', slug: 'pub', status: 'published' }];
    const profiles = [{ userId: 'author1', username: 'a1' }];

    feedFindMock.mockReturnValue(buildFindChain(feedItems));
    contentFindMock.mockReturnValue(buildSelectChain(posts));
    profileFindMock.mockReturnValue(buildSelectChain(profiles));

    const res = await getFeed('u1', { limit: 10 });
    // Only 1 item should be returned (the published one)
    expect(res.items).toHaveLength(1);
    expect(res.items[0].post.title).toBe('Published');
    expect(res.items[0].post.status).toBe('published');
  });
});
