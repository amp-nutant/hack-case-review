import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { reportsApi } from '../../services/reportsApi';

// Async thunks
export const fetchReports = createAsyncThunk(
  'reports/fetchReports',
  async (_, { rejectWithValue }) => {
    try {
      const response = await reportsApi.getAll();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchReportById = createAsyncThunk(
  'reports/fetchReportById',
  async (reportId, { rejectWithValue }) => {
    try {
      const response = await reportsApi.getById(reportId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const uploadReport = createAsyncThunk(
  'reports/uploadReport',
  async (file, { rejectWithValue }) => {
    try {
      const response = await reportsApi.upload(file);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteReport = createAsyncThunk(
  'reports/deleteReport',
  async (reportId, { rejectWithValue }) => {
    try {
      await reportsApi.delete(reportId);
      return reportId;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  items: [],
  currentReport: null,
  loading: false,
  uploading: false,
  error: null,
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearCurrentReport: (state) => {
      state.currentReport = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all reports
      .addCase(fetchReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch single report
      .addCase(fetchReportById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentReport = action.payload;
      })
      .addCase(fetchReportById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Upload report
      .addCase(uploadReport.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadReport.fulfilled, (state, action) => {
        state.uploading = false;
        state.items.unshift(action.payload);
        state.currentReport = action.payload;
      })
      .addCase(uploadReport.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload;
      })
      // Delete report
      .addCase(deleteReport.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.currentReport?.id === action.payload) {
          state.currentReport = null;
        }
      });
  },
});

export const { clearCurrentReport, clearError } = reportsSlice.actions;
export default reportsSlice.reducer;
