import api, { getApiUrl } from './api.js';

const buildQuery = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      search.append(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

export const clapPost = (postId, getToken) => api.post('clap', { postId }, { getToken });
export const unclapPost = (postId, getToken) => api.delete('clap', { getToken, body: JSON.stringify({ postId }) });

export const addComment = (postId, text, getToken) => api.post('comment', { postId, text }, { getToken });
export const deleteComment = (commentId, getToken) => api.delete(`comment/${commentId}`, { getToken });
export const fetchComments = (postId, options = {}, getToken) => {
  const qs = buildQuery({ postId, limit: options.limit, skip: options.skip });
  return api.get(`comment${qs}`, { getToken });
};

export const fetchFeed = (options = {}, getToken) => {
  const qs = buildQuery({ limit: options.limit, cursor: options.cursor });
  return api.get(`feed${qs}`, { getToken });
};

// Bookmark functions
export const bookmarkPost = (postId, getToken) => api.post('bookmark', { postId }, { getToken });
export const unbookmarkPost = (postId, getToken) => api.delete('bookmark', { getToken, body: JSON.stringify({ postId }) });
export const fetchBookmarks = (options = {}, getToken) => {
  const qs = buildQuery({ limit: options.limit, skip: options.skip });
  return api.get(`bookmarks${qs}`, { getToken });
};
export const checkBookmark = (postId, getToken) => api.get(`bookmark/check${buildQuery({ postId })}`, { getToken });

// Convenience helpers for absolute URLs if needed by SSR/static contexts
export const feedUrl = (options = {}) => `${getApiUrl('feed')}${buildQuery(options)}`;
export const commentsUrl = (postId, options = {}) => `${getApiUrl('comment')}${buildQuery({ postId, ...options })}`;
