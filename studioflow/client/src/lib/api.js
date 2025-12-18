// API base URL configuration
// Ensure we use the production URL if VITE_API_URL is missing or invalid (like '/')
const envApiUrl = import.meta.env.VITE_API_URL;
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL = (envApiUrl && envApiUrl.startsWith('http'))
  ? envApiUrl
  : (isLocal ? 'http://localhost:5000/api' : 'https://studioflow-production-gjcfazechpafc7df.centralindia-01.azurewebsites.net/api');

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

// Helper to handle fetch errors
const handleFetch = async (url, options) => {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.error || errorBody.message || response.statusText;
      } catch (e) {
        // Ignore JSON parse error, stick to statusText
      }

      if (response.status >= 500) {
        // window.dispatchEvent(new Event('api-network-error')); // Removed: Don't trigger global overlay
        throw new Error(`Server Error: ${errorMessage}`);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    // Check if it's a network error (TypeError is often thrown for network issues)
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error("Network Error Detected");
      // window.dispatchEvent(new Event('api-network-error')); // Removed
    }
    throw error;
  }
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

    return handleFetch(url, {
      ...fetchOptions,
      method: 'GET',
      headers,
    });
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

    return handleFetch(url, {
      ...fetchOptions,
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
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

    return handleFetch(url, {
      ...fetchOptions,
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
  },

  delete: async (endpoint, options = {}) => {
    const url = getApiUrl(endpoint);
    const { getToken: tokenGetter, body, ...fetchOptions } = options;

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

    return handleFetch(url, {
      ...fetchOptions,
      method: 'DELETE',
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
  },

  patch: async (endpoint, data, options = {}) => {
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

    return handleFetch(url, {
      ...fetchOptions,
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
  }
};

export default api;

