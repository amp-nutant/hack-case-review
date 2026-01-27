import api from './api';

export const reportsApi = {
  getAll: () => api.get('/reports'),
  
  getById: (reportId) => api.get(`/reports/${reportId}`),
  
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  delete: (reportId) => api.delete(`/reports/${reportId}`),
};

export default reportsApi;
