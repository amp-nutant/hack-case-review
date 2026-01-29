import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { casesApi } from '../../services/casesApi';

// Async thunks
export const fetchAllCases = createAsyncThunk(
  'cases/fetchAllCases',
  async (_, { rejectWithValue }) => {
    try {
      const response = await casesApi.getAll();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchCasesByReport = createAsyncThunk(
  'cases/fetchCasesByReport',
  async (reportId, { rejectWithValue }) => {
    try {
      const response = await casesApi.getByReport(reportId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchCaseById = createAsyncThunk(
  'cases/fetchCaseById',
  async (caseId, { rejectWithValue }) => {
    try {
      const response = await casesApi.getById(caseId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Fetch full case details by case number from case-details collection
export const fetchCaseDetailsByCaseNumber = createAsyncThunk(
  'cases/fetchCaseDetailsByCaseNumber',
  async (caseNumber, { rejectWithValue }) => {
    try {
      const response = await casesApi.getDetailsByCaseNumber(caseNumber);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  items: [],
  currentCase: null,
  loading: false,
  error: null,
  filters: {
    status: null,
    priority: null,
    search: '',
  },
};

const casesSlice = createSlice({
  name: 'cases',
  initialState,
  reducers: {
    clearCurrentCase: (state) => {
      state.currentCase = null;
    },
    clearCases: (state) => {
      state.items = [];
      state.currentCase = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch cases by report
      .addCase(fetchCasesByReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCasesByReport.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCasesByReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch all case-details cases
      .addCase(fetchAllCases.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllCases.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchAllCases.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch single case
      .addCase(fetchCaseById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCaseById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCase = action.payload;
      })
      .addCase(fetchCaseById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch case details by case number
      .addCase(fetchCaseDetailsByCaseNumber.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCaseDetailsByCaseNumber.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCase = action.payload;
      })
      .addCase(fetchCaseDetailsByCaseNumber.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearCurrentCase,
  clearCases,
  setFilters,
  clearFilters,
  clearError,
} = casesSlice.actions;

export default casesSlice.reducer;
