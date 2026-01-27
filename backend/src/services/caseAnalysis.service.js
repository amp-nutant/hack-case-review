import { invokeLLMAPI } from './llm.service.js';

/**
 * Analyze a case using LLM to extract insights, tags, and summaries
 * @param {Object} caseData - The case JSON data from caseQuery.service
 * @returns {Promise<Object>} Analysis results with tags and insights
 */
export const analyzeCase = async (caseData) => {
  // Prepare a condensed version of case data for LLM context
  const caseContext = prepareCaseContext(caseData);
  
  const systemPrompt = `You are an expert support case analyst. Your task is to analyze support cases and provide structured insights.

You will receive a JSON object containing case details including:
- Case information (subject, description, status, priority)
- Customer information
- Resolution notes
- Escalation details
- Response metrics
- Full conversation timeline

Analyze the case thoroughly and return a JSON object with the following structure:

{
  "issueSummary": {
    "brief": "One-line summary of the issue",
    "detailed": "2-3 paragraph detailed summary of what happened",
    "rootCause": "Identified root cause if determinable",
    "technicalArea": "Primary technical area (e.g., Storage, Networking, Virtualization, etc.)"
  },
  
  "tags": {
    "problemCategory": ["array of problem categories"],
    "productArea": ["array of product areas involved"],
    "technicalComplexity": "Low|Medium|High|Critical",
    "issueType": "Bug|Configuration|User Error|Documentation Gap|Feature Request|Hardware|Unknown",
    "resolutionType": "Workaround|Permanent Fix|Configuration Change|Upgrade Required|No Action Needed|Unresolved"
  },
  
  "qualityAssessment": {
    "resolutionQuality": {
      "score": 1-10,
      "reasoning": "Why this score"
    },
    "responseTimeliness": {
      "score": 1-10,
      "reasoning": "Based on response metrics"
    },
    "communicationQuality": {
      "score": 1-10,
      "reasoning": "Based on conversation tone and clarity"
    },
    "technicalAccuracy": {
      "score": 1-10,
      "reasoning": "Based on solution provided"
    },
    "overallHandling": {
      "score": 1-10,
      "reasoning": "Overall case handling assessment"
    }
  },
  
  "sentimentAnalysis": {
    "customerSentiment": {
      "overall": "Positive|Neutral|Negative|Mixed",
      "trajectory": "Improving|Stable|Declining",
      "frustrationLevel": "None|Low|Medium|High",
      "satisfactionIndicators": ["list of indicators"]
    },
    "supportSentiment": {
      "tone": "Professional|Friendly|Formal|Rushed",
      "empathy": "High|Medium|Low",
      "proactiveness": "High|Medium|Low"
    }
  },
  
  "experienceInsights": {
    "positiveAspects": ["What went well"],
    "improvementAreas": ["What could be improved"],
    "escalationJustified": true|false|null,
    "wasResolutionEffective": true|false|null,
    "customerEffortLevel": "Low|Medium|High",
    "timeToResolutionAssessment": "Fast|Acceptable|Slow|Very Slow"
  },
  
  "clusteringFeatures": {
    "primaryTopic": "Main topic for clustering",
    "secondaryTopics": ["Additional topics"],
    "keywords": ["Key technical terms"],
    "similarCaseIndicators": ["Patterns that might match other cases"],
    "complexityFactors": ["What made this case complex or simple"]
  },
  
  "actionableInsights": {
    "knowledgeBaseGaps": ["KB articles that should exist or be improved"],
    "processImprovements": ["Suggested process improvements"],
    "trainingOpportunities": ["Skills or knowledge gaps identified"],
    "automationOpportunities": ["Could this be automated?"]
  },
  
  "metadata": {
    "confidenceScore": 0.0-1.0,
    "analysisLimitations": ["Any limitations in the analysis"],
    "dataQualityIssues": ["Any data quality issues noticed"]
  }
}

IMPORTANT:
- Be objective and evidence-based in your assessments
- If information is missing, indicate "Unable to determine" or null
- Provide specific examples from the conversation when possible
- Consider the full context including escalation status and response times
- Return ONLY valid JSON, no additional text`;

  const userPrompt = `Analyze this support case and provide structured insights:

${JSON.stringify(caseContext, null, 2)}`;

  try {
    const response = await invokeLLMAPI({
      systemPrompt,
      userPrompt,
      maxTokens: 4096,
      temperature: 0.3, // Lower temperature for more consistent structured output
    });

    // Parse the LLM response
    const analysisText = response.content || response.text;
    const analysis = parseJSONResponse(analysisText);

    return {
      caseNumber: caseData.caseInfo.caseNumber,
      analysisTimestamp: new Date().toISOString(),
      analysis,
      inputSummary: {
        conversationLength: caseData.conversation?.length || 0,
        totalEvents: caseData.timeline?.totalEvents || 0,
        hadEscalation: caseData.escalation?.isEscalated || false,
        avgResponseTime: caseData.responseMetrics?.avgResponseTimeHours,
      },
    };
  } catch (error) {
    console.error('LLM analysis failed:', error.message);
    throw new Error(`Case analysis failed: ${error.message}`);
  }
};

/**
 * Prepare condensed case context for LLM (to fit within token limits)
 */
function prepareCaseContext(caseData) {
  return {
    caseInfo: {
      caseNumber: caseData.caseInfo.caseNumber,
      subject: caseData.caseInfo.subject,
      description: caseData.caseInfo.description,
      status: caseData.caseInfo.status,
      priority: caseData.caseInfo.priority,
      type: caseData.caseInfo.type,
      createdDate: caseData.caseInfo.createdDate,
      closedDate: caseData.caseInfo.closedDate,
      caseAgeDays: caseData.caseInfo.caseAgeDays,
      complexity: caseData.caseInfo.complexity,
      product: caseData.caseInfo.product,
      nosVersion: caseData.caseInfo.nosVersion,
      jiraCase: caseData.caseInfo.jiraCase,
      kbArticle: caseData.caseInfo.kbArticle,
    },
    
    customer: caseData.customer,
    
    tags: caseData.tags,
    
    resolution: caseData.resolution,
    
    escalation: caseData.escalation,
    
    responseMetrics: {
      avgResponseTimeHours: caseData.responseMetrics.avgResponseTimeHours,
      medianResponseTimeHours: caseData.responseMetrics.medianResponseTimeHours,
      minResponseTimeHours: caseData.responseMetrics.minResponseTimeHours,
      maxResponseTimeHours: caseData.responseMetrics.maxResponseTimeHours,
      totalCustomerMessages: caseData.responseMetrics.totalCustomerMessages,
      totalSupportResponses: caseData.responseMetrics.totalSupportResponses,
    },
    
    // Condensed conversation (keep full content but limit if too long)
    conversation: caseData.conversation.map(msg => ({
      sequence: msg.sequence,
      type: msg.type,
      timestamp: msg.timestamp,
      direction: msg.direction,
      isCustomer: msg.isCustomer,
      author: msg.author || msg.from?.name,
      subject: msg.subject,
      // Truncate very long messages
      content: truncateText(msg.content, 2000),
      timeSincePreviousHours: msg.timeSincePreviousHours,
    })),
    
    timeline: {
      totalEvents: caseData.timeline.totalEvents,
      eventTypes: caseData.timeline.events.map(e => e.type),
      ownerChanges: caseData.timeline.categorized.ownership.length,
      escalationEvents: caseData.timeline.categorized.escalation.length,
    },
  };
}

/**
 * Truncate text to max length
 */
function truncateText(text, maxLength) {
  if (!text) return null;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '... [truncated]';
}

/**
 * Parse JSON from LLM response, handling potential formatting issues
 */
function parseJSONResponse(text) {
  if (!text) {
    throw new Error('Empty response from LLM');
  }

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Continue to next attempt
      }
    }

    // Try to find JSON object in text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Continue
      }
    }

    throw new Error('Failed to parse LLM response as JSON');
  }
}

/**
 * Batch analyze multiple cases
 */
export const analyzeCases = async (casesData, options = {}) => {
  const { concurrency = 2, onProgress } = options;
  const results = [];
  const errors = [];

  for (let i = 0; i < casesData.length; i += concurrency) {
    const batch = casesData.slice(i, i + concurrency);
    const batchPromises = batch.map(async (caseData) => {
      try {
        const analysis = await analyzeCase(caseData);
        results.push(analysis);
        return { success: true, caseNumber: caseData.caseInfo.caseNumber };
      } catch (error) {
        errors.push({
          caseNumber: caseData.caseInfo.caseNumber,
          error: error.message,
        });
        return { success: false, caseNumber: caseData.caseInfo.caseNumber };
      }
    });

    await Promise.all(batchPromises);

    if (onProgress) {
      onProgress({
        processed: Math.min(i + concurrency, casesData.length),
        total: casesData.length,
        successCount: results.length,
        errorCount: errors.length,
      });
    }
  }

  return { results, errors };
};

/**
 * Extract clustering features from multiple analyzed cases
 */
export const extractClusteringFeatures = (analyzedCases) => {
  return analyzedCases.map(ac => ({
    caseNumber: ac.caseNumber,
    features: {
      // From analysis
      primaryTopic: ac.analysis.clusteringFeatures?.primaryTopic,
      secondaryTopics: ac.analysis.clusteringFeatures?.secondaryTopics || [],
      keywords: ac.analysis.clusteringFeatures?.keywords || [],
      technicalArea: ac.analysis.issueSummary?.technicalArea,
      problemCategories: ac.analysis.tags?.problemCategory || [],
      productAreas: ac.analysis.tags?.productArea || [],
      issueType: ac.analysis.tags?.issueType,
      complexity: ac.analysis.tags?.technicalComplexity,
      resolutionType: ac.analysis.tags?.resolutionType,
      
      // Sentiment features
      customerSentiment: ac.analysis.sentimentAnalysis?.customerSentiment?.overall,
      frustrationLevel: ac.analysis.sentimentAnalysis?.customerSentiment?.frustrationLevel,
      
      // Quality scores (normalized)
      resolutionQualityScore: ac.analysis.qualityAssessment?.resolutionQuality?.score,
      responseTimelinessScore: ac.analysis.qualityAssessment?.responseTimeliness?.score,
      overallHandlingScore: ac.analysis.qualityAssessment?.overallHandling?.score,
      
      // Metrics
      hadEscalation: ac.inputSummary.hadEscalation,
      avgResponseTime: ac.inputSummary.avgResponseTime,
      conversationLength: ac.inputSummary.conversationLength,
    },
  }));
};

export default {
  analyzeCase,
  analyzeCases,
  extractClusteringFeatures,
};
