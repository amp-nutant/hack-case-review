import { configureStore } from '@reduxjs/toolkit';
import reportsReducer from './slices/reportsSlice';
import casesReducer from './slices/casesSlice';
import analysisReducer from './slices/analysisSlice';

export const store = configureStore({
  reducer: {
    reports: reportsReducer,
    cases: casesReducer,
    analysis: analysisReducer,
  },
  devTools: import.meta.env.DEV,
});

export default store;
