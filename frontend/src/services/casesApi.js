import api from './api';

export const casesApi = {
  getByReport: (reportId) => api.get(`/reports/${reportId}/cases`),
  
  getById: (caseId) => api.get(`/cases/${caseId}`),
  
  update: (caseId, data) => api.patch(`/cases/${caseId}`, data),
};

export default casesApi;
