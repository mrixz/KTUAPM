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
  withCredentials: true, // Send the httpOnly auth cookie on every request
  headers: {
    'Content-Type': 'application/json'
  }
});

// NOTE: We deliberately do NOT attach an Authorization header from localStorage.
// Authentication is handled exclusively via the httpOnly cookie set by the server.
// This eliminates the XSS attack surface from storing JWT tokens in localStorage.

// Response interceptor for session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.startsWith('/auth/')) {
        localStorage.removeItem('user');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);
