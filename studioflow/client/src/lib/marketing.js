import api from './api';

export const marketingApi = {
  // Leads
  subscribe: async (data) => {
    return api.post('/leads/subscribe', data);
  },
  
  verifyLead: async (token) => {
    return api.get(`/leads/verify/${token}`);
  },

  // Feedback
  submitFeedback: async (data, tokenGetter) => {
    return api.post('/feedback', data, { getToken: tokenGetter });
  },

  // Content
  getPosts: async (type) => { // type: 'blog' | 'changelog'
    return api.get(`/content/${type}`);
  },

  getPostBySlug: async (type, slug) => {
    return api.get(`/content/${type}/${slug}`);
  }
};
