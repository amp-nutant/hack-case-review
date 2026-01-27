import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { analysisApi } from '../../services/analysisApi';

// Async thunks
export const generateSummary = createAsyncThunk(
  'analysis/generateSummary',
  async (reportId, { rejectWithValue }) => {
    try {
      const response = await analysisApi.generateSummary(reportId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchClusters = createAsyncThunk(
  'analysis/fetchClusters',
  async (reportId, { rejectWithValue }) => {
    try {
      const response = await analysisApi.getClusters(reportId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const sendChatMessage = createAsyncThunk(
  'analysis/sendChatMessage',
  async ({ reportId, message }, { rejectWithValue }) => {
    try {
      const response = await analysisApi.chat(reportId, message);
      return { userMessage: message, assistantMessage: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  summary: null,
  clusters: [],
  chatHistory: [],
  loading: false,
  chatLoading: false,
  error: null,
};

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    clearAnalysis: (state) => {
      state.summary = null;
      state.clusters = [];
      state.chatHistory = [];
      state.error = null;
    },
    clearChatHistory: (state) => {
      state.chatHistory = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate summary
      .addCase(generateSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(generateSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch clusters
      .addCase(fetchClusters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClusters.fulfilled, (state, action) => {
        state.loading = false;
        state.clusters = action.payload;
      })
      .addCase(fetchClusters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Chat message
      .addCase(sendChatMessage.pending, (state) => {
        state.chatLoading = true;
        state.error = null;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.chatLoading = false;
        state.chatHistory.push({
          role: 'user',
          content: action.payload.userMessage,
          timestamp: new Date().toISOString(),
        });
        state.chatHistory.push({
          role: 'assistant',
          content: action.payload.assistantMessage.response,
          timestamp: new Date().toISOString(),
        });
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.chatLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAnalysis, clearChatHistory, clearError } = analysisSlice.actions;
export default analysisSlice.reducer;
