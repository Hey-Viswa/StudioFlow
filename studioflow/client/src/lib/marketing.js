import api from './api';

export const marketingApi = {
  // Leads
  subscribe: async (data) => {
    return api.post('/marketing/leads/subscribe', data);
  },
  
  verifyLead: async (token) => {
    return api.get(`/marketing/leads/verify/${token}`);
  },

  // Feedback
  submitFeedback: async (data, tokenGetter) => {
    return api.post('/marketing/feedback', data, { getToken: tokenGetter });
  },

  // Content
  getPosts: async (type) => { // type: 'blog' | 'changelog'
    return api.get(`/marketing/content/${type}`);
  },

  getPostBySlug: async (type, slug, tokenGetter) => {
    return api.get(`/marketing/content/${type}/${slug}`, { getToken: tokenGetter });
  }
};
