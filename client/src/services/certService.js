import { api, getApiBaseUrl } from './api';

export const certService = {
  async uploadCertificate(file, sync = false) {
    const formData = new FormData();
    formData.append('certificate', file);

    // Do NOT set Content-Type manually — axios detects FormData and automatically
    // sets 'multipart/form-data; boundary=...' with the correct boundary value.
    // Overriding it here would strip the boundary and break the server-side parser.
    const res = await api.post(`/certificates?sync=${sync}`, formData);
    return res.data;
  },

  async getCertificates(params = {}) {
    const res = await api.get('/certificates', { params });
    return res.data;
  },

  async getCertificateById(id) {
    const res = await api.get(`/certificates/${id}`);
    return res.data;
  },

  async deleteCertificate(id) {
    const res = await api.delete(`/certificates/${id}`);
    return res.data;
  },

  async reprocessCertificate(id) {
    const res = await api.post(`/certificates/${id}/process`);
    return res.data;
  },

  getFileUrl(id) {
    const base = getApiBaseUrl();
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const authQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${base}/certificates/${id}/file${authQuery}`;
  }
};
