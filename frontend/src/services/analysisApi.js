import api from './api';

export const analysisApi = {
  generateSummary: (reportId) => api.post('/analysis/summary', { reportId }),
  
  chat: (reportId, message) => api.post('/analysis/chat', { reportId, message }),
  
  getClusters: (reportId) => api.get(`/clusters/${reportId}`),
  
  getChartData: (reportId, chartType) => api.get(`/charts/${reportId}/${chartType}`),
  
  // New aggregated analysis endpoints
  getAggregatedAnalysis: () => api.get('/analysis/aggregated'),
  
  getAggregatedClusters: () => api.get('/analysis/clusters'),
  
  getCaseList: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const queryString = params.toString();
    return api.get(`/analysis/cases${queryString ? `?${queryString}` : ''}`);
  },
  
  getCaseAnalysis: (caseNumber) => api.get(`/analysis/cases/${caseNumber}`),
  
  getBuckets: (dimension = null) => {
    if (dimension) {
      return api.get(`/analysis/buckets/${dimension}`);
    }
    return api.get('/analysis/buckets');
  },
};

export default analysisApi;
