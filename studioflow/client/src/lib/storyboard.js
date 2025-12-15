import api from './api';

export const storyboardApi = {
  // Get full storyboard with scenes and edges
  get: async (projectId, getToken) => {
    const response = await api.get(`/projects/${projectId}/storyboard`, { getToken });
    // api.js returns response.json(), so response is the data object directly?
    // Let's check api.js handleFetch. It returns response.json().
    // So 'response' is the data.
    // However, the original code returned 'response.data'.
    // If api.js returns parsed JSON, then response IS the data.
    // But wait, the original code: "const response = await api.get(...) ; return response.data;"
    // If api.js returns response.json(), then response.data might be undefined if the JSON is { storyboard: ... }.
    // BUT api.js methods return the result of handleFetch.
    // handleFetch returns response.json().
    // So 'response' IS the body.
    // So 'response.data' would imply the body has a 'data' property?
    // Let's verify what the server returns.
    // Server returns res.json({ storyboard, scenes, edges, permissions }).
    // So there is NO 'data' wrapper property.
    // So "return response.data" in the original code was likely WRONG too?
    // Or maybe api.js used to return axios response?
    // The api.js I viewed used fetch.
    // Assuming api.js returns the body directly.
    // So I should return 'response'.
    return response; 
  },

  // Create a new scene
  createScene: async (projectId, sceneData, getToken) => {
    const response = await api.post(`/projects/${projectId}/storyboard/scenes`, sceneData, { getToken });
    return response;
  },

  // Update a scene (position, content, etc)
  updateScene: async (projectId, sceneId, updates, getToken) => {
    const response = await api.patch(`/projects/${projectId}/storyboard/scenes/${sceneId}`, updates, { getToken });
    return response;
  },

  // Delete a scene
  deleteScene: async (projectId, sceneId, getToken) => {
    const response = await api.delete(`/projects/${projectId}/storyboard/scenes/${sceneId}`, { getToken });
    return response;
  },

  // Create an edge (connection)
  createEdge: async (projectId, edgeData, getToken) => {
    const response = await api.post(`/projects/${projectId}/storyboard/edges`, edgeData, { getToken });
    return response;
  },

  // Delete an edge
  deleteEdge: async (projectId, edgeId, getToken) => {
    const response = await api.delete(`/projects/${projectId}/storyboard/edges/${edgeId}`, { getToken });
    return response;
  },

  updateEdge: async (projectId, edgeId, updates, getToken) => {
    const response = await api.patch(`/projects/${projectId}/storyboard/edges/${edgeId}`, updates, { getToken });
    return response;
  },
  
  // Add comment to scene
  addComment: async (projectId, sceneId, content, getToken) => {
    const response = await api.post(`/projects/${projectId}/storyboard/scenes/${sceneId}/comments`, { content }, { getToken });
    return response;
  }
};
