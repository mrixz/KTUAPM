import axios from 'axios';

/**
 * Normalize and resolve the API base URL.
 * Supports VITE_API_URL environment variable for production (e.g. Render Web Service URL)
 * with graceful fallback to '/api' for local Vite proxy development.
 */
export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || typeof envUrl !== 'string' || !envUrl.trim()) {
    return '/api';
  }
  const clean = envUrl.trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true // Send the httpOnly auth cookie on every request
});

// Request interceptor: send Bearer token if available (supports cross-origin environments where 3rd-party cookies are blocked)
api.interceptors.request.use(
  (reqConfig) => {
    const token = localStorage.getItem('token');
    if (token && !reqConfig.headers.Authorization) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
    // If sending FormData, delete Content-Type so browser/Axios sets multipart/form-data with the correct boundary
    if (typeof FormData !== 'undefined' && reqConfig.data instanceof FormData) {
      if (reqConfig.headers?.delete) {
        reqConfig.headers.delete('Content-Type');
      } else if (reqConfig.headers) {
        delete reqConfig.headers['Content-Type'];
      }
    }
    return reqConfig;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthPage =
        window.location.hash.includes('/auth/') ||
        window.location.pathname.includes('/auth/');
      if (!isAuthPage) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.hash = '#/auth/login';
      }
    }
    return Promise.reject(error);
  }
);
