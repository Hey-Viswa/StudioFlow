// API base URL configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to construct full API URLs
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Get auth token from Clerk
const getToken = async () => {
  // This will be injected by the component using useAuth
  return null;
};

// API client with auth
const api = {
  get: async (endpoint, options = {}) => {
    const url = getApiUrl(endpoint);
    const { getToken: tokenGetter, ...fetchOptions } = options;
    
    const headers = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    // Add auth token if tokenGetter provided
    if (tokenGetter) {
      const token = await tokenGetter();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  },

  post: async (endpoint, data, options = {}) => {
    const url = getApiUrl(endpoint);
    const { getToken: tokenGetter, ...fetchOptions } = options;
    
    const headers = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    // Add auth token if tokenGetter provided
    if (tokenGetter) {
      const token = await tokenGetter();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  },

  put: async (endpoint, data, options = {}) => {
    const url = getApiUrl(endpoint);
    const { getToken: tokenGetter, ...fetchOptions } = options;
    
    const headers = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (tokenGetter) {
      const token = await tokenGetter();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  },

  delete: async (endpoint, options = {}) => {
    const url = getApiUrl(endpoint);
    const { getToken: tokenGetter, ...fetchOptions } = options;
    
    const headers = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (tokenGetter) {
      const token = await tokenGetter();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }
};

export default api;

