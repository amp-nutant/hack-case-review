import api from './api';

export const analysisApi = {
  create: (payload) => api.post('/analysis', payload),
  
  generateSummary: (reportId) => api.post('/analysis/summary', { reportId }),
  
  chat: (reportId, message) => api.post('/analysis/chat', { reportId, message }),
  
  getClusters: (reportId) => api.get(`/issue-groups/${reportId}`),
  
  getChartData: (reportId, chartType) => api.get(`/charts/${reportId}/${chartType}`),
};

export default analysisApi;
