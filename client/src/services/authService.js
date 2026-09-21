import { api } from './api';

export const authService = {
  async register(data) {
    const res = await api.post('/auth/register', data);
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }
    if (res.data.user) {
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async login(credentials) {
    const res = await api.post('/auth/login', credentials);
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }
    if (res.data.user) {
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async getProfile() {
    const res = await api.get('/student/profile');
    return res.data;
  },

  async updateProfile(data) {
    const res = await api.put('/student/profile', data);
    return res.data;
  },

  async getDashboard() {
    const res = await api.get('/student/dashboard');
    return res.data;
  },

  async changePassword(data) {
    const res = await api.post('/auth/change-password', data);
    return res.data;
  },

  async forgotPassword(email) {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(token, password, confirmPassword) {
    const res = await api.post(`/auth/reset-password/${encodeURIComponent(token)}`, {
      password,
      confirmPassword
    });
    return res.data;
  },

  async verifyEmail(token) {
    const res = await api.get(`/auth/verify-email/${encodeURIComponent(token)}`);
    return res.data;
  },

  async resendVerification() {
    const res = await api.post('/auth/resend-verification');
    return res.data;
  }
};
