import api from './api';

export const storyboardApi = {
  // Get full storyboard with scenes and edges
  get: async (projectId) => {
    const response = await api.get(`/projects/${projectId}/storyboard`);
    return response.data;
  },

  // Create a new scene
  createScene: async (projectId, sceneData) => {
    const response = await api.post(`/projects/${projectId}/storyboard/scenes`, sceneData);
    return response.data;
  },

  // Update a scene (position, content, etc)
  updateScene: async (projectId, sceneId, updates) => {
    const response = await api.patch(`/projects/${projectId}/storyboard/scenes/${sceneId}`, updates);
    return response.data;
  },

  // Delete a scene
  deleteScene: async (projectId, sceneId) => {
    const response = await api.delete(`/projects/${projectId}/storyboard/scenes/${sceneId}`);
    return response.data;
  },

  // Create an edge (connection)
  createEdge: async (projectId, edgeData) => {
    const response = await api.post(`/projects/${projectId}/storyboard/edges`, edgeData);
    return response.data;
  },

  // Delete an edge
  deleteEdge: async (projectId, edgeId) => {
    const response = await api.delete(`/projects/${projectId}/storyboard/edges/${edgeId}`);
    return response.data;
  },
  
  // Add comment to scene
  addComment: async (projectId, sceneId, content) => {
    const response = await api.post(`/projects/${projectId}/storyboard/scenes/${sceneId}/comments`, { content });
    return response.data;
  }
};
