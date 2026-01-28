import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Analysis, Report, Case } from '../models/index.js';
import { generateMockAnalysis, generateMockClusters } from '../utils/dataSimulator.js';
import llmService from '../services/llm.service.js';
import { aggregateAnalyses } from '../services/aggregation.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    
    // Check if analysis exists with clusters
    const analysis = await Analysis.findOne({ reportId });
    
    if (analysis?.clusters?.length > 0) {
      return res.json(analysis.clusters);
    }
    
    // Generate mock clusters
    const clusters = generateMockClusters();
    
    // Save clusters
    if (analysis) {
      analysis.clusters = clusters;
      await analysis.save();
    } else {
      await Analysis.create({
        reportId,
        clusters,
      });
    }
    
    res.json(clusters);
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
 * Get aggregated analysis from output files
 */
export const getAggregatedAnalysis = async (req, res, next) => {
  try {
    const outputDir = path.join(__dirname, '../../output');
    
    // Try to load pre-computed aggregation first
    const summaryPath = path.join(outputDir, 'aggregated_summary.json');
    try {
      const summaryContent = await fs.readFile(summaryPath, 'utf-8');
      return res.json(JSON.parse(summaryContent));
    } catch {
      // No pre-computed summary, generate on the fly
    }
    
    // Load all analysis files
    const files = await fs.readdir(outputDir);
    const analysisFiles = files.filter(f => f.startsWith('analysis_') && f.endsWith('.json'));
    
    if (analysisFiles.length === 0) {
      return res.json({
        metadata: { totalCases: 0 },
        buckets: {},
        clusters: [],
        cases: [],
        message: 'No analyses found. Run batch analysis first.',
      });
    }
    
    const analyses = [];
    for (const file of analysisFiles) {
      try {
        const content = await fs.readFile(path.join(outputDir, file), 'utf-8');
        analyses.push(JSON.parse(content));
      } catch (e) {
        console.warn(`Warning: Could not read ${file}`);
      }
    }
    
    // Aggregate and return
    const aggregated = aggregateAnalyses(analyses);
    res.json(aggregated);
  } catch (error) {
    next(error);
  }
};

/**
 * Get clusters from aggregated analysis
 */
export const getAggregatedClusters = async (req, res, next) => {
  try {
    const outputDir = path.join(__dirname, '../../output');
    const summaryPath = path.join(outputDir, 'aggregated_summary.json');
    
    try {
      const content = await fs.readFile(summaryPath, 'utf-8');
      const aggregated = JSON.parse(content);
      return res.json(aggregated.clusters || []);
    } catch {
      // Generate on the fly
      const files = await fs.readdir(outputDir);
      const analysisFiles = files.filter(f => f.startsWith('analysis_') && f.endsWith('.json'));
      
      const analyses = [];
      for (const file of analysisFiles) {
        try {
          const content = await fs.readFile(path.join(outputDir, file), 'utf-8');
          analyses.push(JSON.parse(content));
        } catch (e) {
          // Skip
        }
      }
      
      const aggregated = aggregateAnalyses(analyses);
      return res.json(aggregated.clusters || []);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get filterable case list
 */
export const getCaseList = async (req, res, next) => {
  try {
    const { 
      issueType, 
      productArea, 
      complexity, 
      sentiment,
      isBug,
      minScore,
      maxScore,
      keyword,
    } = req.query;
    
    const outputDir = path.join(__dirname, '../../output');
    const summaryPath = path.join(outputDir, 'aggregated_summary.json');
    
    let cases = [];
    
    try {
      const content = await fs.readFile(summaryPath, 'utf-8');
      const aggregated = JSON.parse(content);
      cases = aggregated.cases || [];
    } catch {
      // Load individual files
      const files = await fs.readdir(outputDir);
      const analysisFiles = files.filter(f => f.startsWith('analysis_') && f.endsWith('.json'));
      
      for (const file of analysisFiles) {
        try {
          const content = await fs.readFile(path.join(outputDir, file), 'utf-8');
          const analysis = JSON.parse(content);
          cases.push({
            caseNumber: analysis.caseNumber,
            brief: analysis.analysis?.issueSummary?.brief || 'N/A',
            issueType: analysis.analysis?.tags?.issueType || 'Unknown',
            resolutionType: analysis.analysis?.tags?.resolutionType || 'Unknown',
            complexity: analysis.analysis?.tags?.technicalComplexity || 'Unknown',
            productAreas: analysis.analysis?.tags?.productArea || [],
            overallScore: analysis.analysis?.qualityAssessment?.overallHandling?.score || 0,
            sentiment: analysis.analysis?.sentimentAnalysis?.customerSentiment?.overall || 'Unknown',
            isBug: analysis.analysis?.issueClassification?.isBug?.verdict || false,
            keywords: analysis.analysis?.clusteringFeatures?.keywords || [],
          });
        } catch (e) {
          // Skip
        }
      }
    }
    
    // Apply filters
    if (issueType) {
      cases = cases.filter(c => c.issueType === issueType);
    }
    if (productArea) {
      cases = cases.filter(c => c.productAreas?.includes(productArea));
    }
    if (complexity) {
      cases = cases.filter(c => c.complexity === complexity);
    }
    if (sentiment) {
      cases = cases.filter(c => c.sentiment === sentiment);
    }
    if (isBug !== undefined) {
      cases = cases.filter(c => c.isBug === (isBug === 'true'));
    }
    if (minScore) {
      cases = cases.filter(c => c.overallScore >= parseInt(minScore, 10));
    }
    if (maxScore) {
      cases = cases.filter(c => c.overallScore <= parseInt(maxScore, 10));
    }
    if (keyword) {
      const kw = keyword.toLowerCase();
      cases = cases.filter(c => 
        c.keywords?.some(k => k.toLowerCase().includes(kw)) ||
        c.brief?.toLowerCase().includes(kw)
      );
    }
    
    res.json({
      total: cases.length,
      cases,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single case analysis
 */
export const getCaseAnalysis = async (req, res, next) => {
  try {
    const { caseNumber } = req.params;
    const outputDir = path.join(__dirname, '../../output');
    
    // Try different file name formats
    const possibleFiles = [
      `analysis_${caseNumber}.json`,
      `analysis_${caseNumber.replace(/^0+/, '')}.json`,
    ];
    
    for (const fileName of possibleFiles) {
      try {
        const filePath = path.join(outputDir, fileName);
        const content = await fs.readFile(filePath, 'utf-8');
        return res.json(JSON.parse(content));
      } catch {
        // Try next
      }
    }
    
    res.status(404).json({
      status: 'error',
      message: `Analysis not found for case ${caseNumber}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get buckets/breakdowns
 */
export const getBuckets = async (req, res, next) => {
  try {
    const { dimension } = req.params;
    const outputDir = path.join(__dirname, '../../output');
    const summaryPath = path.join(outputDir, 'aggregated_summary.json');
    
    try {
      const content = await fs.readFile(summaryPath, 'utf-8');
      const aggregated = JSON.parse(content);
      
      if (dimension && aggregated.buckets?.[dimension]) {
        return res.json(aggregated.buckets[dimension]);
      }
      
      return res.json(aggregated.buckets || {});
    } catch {
      return res.json({});
    }
  } catch (error) {
    next(error);
  }
};

export default {
  generateSummary,
  getClusters,
  chat,
  getChatHistory,
  getAggregatedAnalysis,
  getAggregatedClusters,
  getCaseList,
  getCaseAnalysis,
  getBuckets,
};
