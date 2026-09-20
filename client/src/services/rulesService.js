import { api } from './api';

export const rulesService = {
  async getCurrentRules() {
    const res = await api.get('/rules/current');
    return res.data;
  },

  async getAllRules() {
    const res = await api.get('/rules/all');
    return res.data;
  },

  async previewScheme(params) {
    const res = await api.get('/rules/resolve-preview', { params });
    return res.data;
  }
};

