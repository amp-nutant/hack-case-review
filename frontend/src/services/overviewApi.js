import api from './api';

export const overviewApi = {
  getByReport: (reportId) =>
    api.get(`/overview/${reportId}`, {
      params: { _t: Date.now() },
    }),
};

export default overviewApi;
