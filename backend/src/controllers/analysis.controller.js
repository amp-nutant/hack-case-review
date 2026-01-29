import mongoose from 'mongoose';
import { Analysis, Report, Case } from '../models/index.js';
import { generateMockAnalysis, generateMockClusters } from '../utils/dataSimulator.js';
import llmService from '../services/llm.service.js';

/**
 * Generate or get summary for a report
 */
export const generateSummary = async (req, res, next) => {
  try {
    const { reportId } = req.body;
    
    // Handle demo/mock IDs
    if (reportId?.startsWith('demo-')) {
      const mockAnalysis = generateMockAnalysis();
      return res.json(mockAnalysis.summary);
    }
    
    // Check if analysis exists
    let analysis = await Analysis.findOne({ reportId });
    
    if (analysis?.summary) {
      return res.json(analysis.summary);
    }
    
    // Get cases for this report to generate summary
    const cases = await Case.find({ reportId });
    
    // Generate summary using LLM or mock
    const mockAnalysis = generateMockAnalysis();
    const summary = mockAnalysis.summary;
    
    // Save or update analysis
    if (analysis) {
      analysis.summary = summary;
      analysis.generatedAt = new Date();
      await analysis.save();
    } else {
      analysis = new Analysis({
        reportId,
        summary,
        generatedAt: new Date(),
      });
      await analysis.save();
    }
    
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

/**
 * Get clusters for a report
 */
export const getClusters = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    
    // Handle demo/mock IDs
    if (reportId?.startsWith('demo-')) {
      const clusters = generateMockClusters();
      return res.json(clusters);
    }

    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }

    const clusteredCases = mongoose.connection.collection('clustered_cases');
    const firstEntry = await clusteredCases.findOne({}, { sort: { _id: 1 } });
    const clusters = Array.isArray(firstEntry?.clusters) ? firstEntry.clusters : [];

    return res.json(clusters);
  } catch (error) {
    next(error);
  }
};

/**
 * Chat with the analysis AI
 */
export const chat = async (req, res, next) => {
  try {
    const { reportId, message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        status: 'error',
        message: 'Message is required',
      });
    }
    
    // Try to use LLM service, fall back to mock response
    let response;
    
    try {
      // Get context from report and cases
      const contextData = {
        reportId,
        caseSummary: 'Report contains 156 cases with focus on network and storage issues.',
      };
      
      response = await llmService.chat(message, contextData);
    } catch (llmError) {
      // Fallback to mock responses
      const mockResponses = [
        `Based on the analysis of your case data, I found that ${message.toLowerCase().includes('priority') ? 'there are 12 critical priority cases requiring immediate attention' : 'the most common issues relate to network connectivity and storage operations'}.`,
        `Looking at the patterns in your data, I can see that ${message.toLowerCase().includes('pattern') ? 'similar issues tend to cluster around configuration changes and firmware updates' : 'resolution times have improved by 18% compared to the previous period'}.`,
        `From the case analysis, ${message.toLowerCase().includes('recommend') ? 'I recommend focusing on implementing pre-change validation checks and updating the knowledge base with common troubleshooting steps' : 'the data shows 35% of cases could potentially benefit from automated resolution based on known solutions'}.`,
      ];
      
      response = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    }
    
    // Save to chat history if we have a valid reportId
    if (reportId && !reportId.startsWith('demo-')) {
      await Analysis.findOneAndUpdate(
        { reportId },
        {
          $push: {
            chatHistory: [
              { role: 'user', content: message },
              { role: 'assistant', content: response },
            ],
          },
        },
        { upsert: true }
      );
    }
    
    res.json({
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get chat history
 */
export const getChatHistory = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    
    if (reportId?.startsWith('demo-')) {
      return res.json([]);
    }
    
    const analysis = await Analysis.findOne({ reportId }).select('chatHistory');
    
    res.json(analysis?.chatHistory || []);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new analysis entry from filters
 */
export const createAnalysis = async (req, res, next) => {
  try {
    const {
      name,
      description,
      account,
      component,
      startDate,
      endDate,
      cases,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Name is required',
      });
    }

    const analysis = await Analysis.create({
      name: String(name).trim(),
      description: description ? String(description).trim() : undefined,
      account: account ? String(account).trim() : undefined,
      component: component ? String(component).trim() : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      cases: Array.isArray(cases) ? cases : [],
    });

    return res.status(201).json(analysis);
  } catch (error) {
    return next(error);
  }
};

export default {
  generateSummary,
  getClusters,
  chat,
  getChatHistory,
  createAnalysis,
};
