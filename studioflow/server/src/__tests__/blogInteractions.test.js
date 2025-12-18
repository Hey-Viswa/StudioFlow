import { jest } from '@jest/globals';

const createQueryChain = (data) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(data)
});

describe('interactionService', () => {
  let createMock;
  let deleteOneMock;
  let updateOneMock;
  let commentCreateMock;
  let commentFindByIdMock;
  let commentDeleteOneMock;
  let commentFindMock;
  let commentCountMock;

  let addClap;
  let removeClap;
  let addComment;
  let deleteComment;
  let getComments;

  beforeEach(async () => {
    jest.resetModules();

    createMock = jest.fn();
    deleteOneMock = jest.fn();
    updateOneMock = jest.fn();

    commentCreateMock = jest.fn();
    commentFindByIdMock = jest.fn();
    commentDeleteOneMock = jest.fn();
    commentFindMock = jest.fn();
    commentCountMock = jest.fn();

    jest.unstable_mockModule('../models/Clap.js', () => ({
      default: {
        create: createMock,
        deleteOne: deleteOneMock
      }
    }));

    jest.unstable_mockModule('../models/Content.js', () => ({
      default: {
        updateOne: updateOneMock
      }
    }));

    jest.unstable_mockModule('../models/BlogComment.js', () => ({
      default: {
        create: commentCreateMock,
        findById: commentFindByIdMock,
        deleteOne: commentDeleteOneMock,
        find: commentFindMock,
        countDocuments: commentCountMock
      }
    }));

    const service = await import('../services/interactionService.js');
    addClap = service.addClap;
    removeClap = service.removeClap;
    addComment = service.addComment;
    deleteComment = service.deleteComment;
    getComments = service.getComments;
  });

  test('addClap increments counter on first clap', async () => {
    createMock.mockResolvedValue({ _id: 'c1' });
    const res = await addClap('user1', 'post1');
    expect(res).toEqual({ clapped: true });
    expect(createMock).toHaveBeenCalledWith({ userId: 'user1', postId: 'post1' });
    expect(updateOneMock).toHaveBeenCalledWith({ _id: 'post1' }, { $inc: { clapCount: 1 } });
  });

  test('addClap returns alreadyClapped on duplicate error', async () => {
    createMock.mockRejectedValue({ code: 11000 });
    const res = await addClap('user1', 'post1');
    expect(res.alreadyClapped).toBe(true);
    expect(updateOneMock).not.toHaveBeenCalled();
  });

  test('removeClap decrements when deletion occurs', async () => {
    deleteOneMock.mockResolvedValue({ deletedCount: 1 });
    const res = await removeClap('user1', 'post1');
    expect(res).toEqual({ clapped: false, removed: true });
    expect(updateOneMock).toHaveBeenCalledWith({ _id: 'post1', clapCount: { $gt: 0 } }, { $inc: { clapCount: -1 } });
  });

  test('addComment trims text and increments counter', async () => {
    commentCreateMock.mockResolvedValue({ _id: 'cm1', text: 'hi' });
    const res = await addComment('user1', 'post1', ' hi ');
    expect(res).toEqual({ _id: 'cm1', text: 'hi' });
    expect(commentCreateMock).toHaveBeenCalledWith({ userId: 'user1', postId: 'post1', text: 'hi' });
    expect(updateOneMock).toHaveBeenCalledWith({ _id: 'post1' }, { $inc: { commentCount: 1 } });
  });

  test('deleteComment forbids non-owner', async () => {
    commentFindByIdMock.mockResolvedValue({ _id: 'cm1', userId: 'other', postId: 'post1' });
    const res = await deleteComment('cm1', { userId: 'me', allowPostAuthor: false });
    expect(res).toEqual({ deleted: false, reason: 'forbidden' });
    expect(commentDeleteOneMock).not.toHaveBeenCalled();
  });

  test('deleteComment removes comment and decrements counter', async () => {
    commentFindByIdMock.mockResolvedValue({ _id: 'cm1', userId: 'me', postId: 'post1' });
    commentDeleteOneMock.mockResolvedValue({ deletedCount: 1 });
    const res = await deleteComment('cm1', { userId: 'me' });
    expect(res).toEqual({ deleted: true });
    expect(commentDeleteOneMock).toHaveBeenCalledWith({ _id: 'cm1' });
    expect(updateOneMock).toHaveBeenCalledWith({ _id: 'post1', commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } });
  });

  test('getComments returns paginated data', async () => {
    commentFindMock.mockReturnValue(createQueryChain([{ _id: 'cm1' }]));
    commentCountMock.mockResolvedValue(1);
    const res = await getComments('post1', { limit: 10, skip: 0 });
    expect(commentFindMock).toHaveBeenCalledWith({ postId: 'post1' });
    expect(res).toEqual({ comments: [{ _id: 'cm1' }], total: 1 });
  });
});
