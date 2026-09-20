import { api } from './api';

export const analyticsService = {
  async getOverview() {
    const res = await api.get('/analytics/overview');
    return res.data;
  },

  async getCategories() {
    const res = await api.get('/analytics/categories');
    return res.data;
  },

  async getTimeline() {
    const res = await api.get('/analytics/timeline');
    return res.data;
  },

  async getOpportunities() {
    const res = await api.get('/analytics/opportunities');
    return res.data;
  },

  async getTelemetry() {
    const res = await api.get('/analytics/telemetry');
    return res.data;
  },

  async getLatestEvaluation() {
    const res = await api.get('/evaluation/latest');
    return res.data;
  },

  async runEvaluation(count = 520) {
    const res = await api.post('/evaluation/run', { count });
    return res.data;
  }
};
