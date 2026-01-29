import api from './api';

export const casesApi = {
  getAll: () => api.get('/cases'),

  getByReport: (reportId) => api.get(`/reports/${reportId}/cases`),
  
  getById: (caseId) => api.get(`/cases/${caseId}`),
  
  // Get full case details by case number from case-details collection
  getDetailsByCaseNumber: (caseNumber) => api.get(`/cases/details/${caseNumber}`),
  
  update: (caseId, data) => api.patch(`/cases/${caseId}`, data),
};

export default casesApi;
