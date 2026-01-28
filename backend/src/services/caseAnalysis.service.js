import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { invokeLLMAPI } from './llm.service.js';
import { extractActions } from './caseQuery.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load predefined tag lists
let TAG_LISTS = { openTags: [], closeTags: [] };
try {
  const tagsPath = path.join(__dirname, '../data/tags.json');
  const tagsData = fs.readFileSync(tagsPath, 'utf-8');
  TAG_LISTS = JSON.parse(tagsData);
  console.log(`📋 Loaded ${TAG_LISTS.openTags?.length || 0} open tags and ${TAG_LISTS.closeTags?.length || 0} close tags for validation`);
} catch (error) {
  console.warn('Warning: Could not load tags.json for LLM context');
}

/**
 * Analyze a case using LLM to extract insights, tags, and summaries
 * @param {Object} caseData - The case JSON data from caseQuery.service
 * @returns {Promise<Object>} Analysis results with tags and insights
 */
export const analyzeCase = async (caseData) => {
  // Extract actions taken during case handling
  console.log('📋 Extracting actions from case...');
  const actions = extractActions(caseData);
  console.log(`   Found: ${actions.keywords.length} keywords, ${actions.toolsUsed.length} tools, ${actions.proceduresFollowed.length} procedures`);

  // Prepare a condensed version of case data for LLM context
  const caseContext = prepareCaseContext(caseData);
  
  // Build the system prompt with tag lists
  const systemPrompt = buildSystemPrompt();
  
  // Build user prompt with case data and extracted actions
  const userPrompt = buildUserPrompt(caseContext, actions);

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
      extractedActions: actions, // Include extracted actions in output
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
 * Build the system prompt with predefined tag lists
 */
function buildSystemPrompt() {
  return `You are an expert support case analyst for Nutanix technical support. Your task is to analyze support cases and provide structured insights.

You will receive:
1. Case details (subject, description, status, priority, resolution, conversation, etc.)
2. EXISTING TAGS that were applied to the case (openTags and closeTags)
3. PREDEFINED TAG LISTS - the official valid tags that should be used

YOUR TAG VALIDATION TASK:
1. Thoroughly understand the problem described in the case
2. Review the PREDEFINED OPEN TAGS list and select which tags should apply to this case
3. Compare your selected tags with the EXISTING openTags - score and explain
4. Review the PREDEFINED CLOSE TAGS list and select which tags should apply based on the resolution
5. Compare your selected tags with the EXISTING closeTags - score and explain

IMPORTANT FOR TAG VALIDATION:
- Only recommend tags that exist in the PREDEFINED lists
- Explain WHY each tag should or should not apply based on case content
- Be specific about what in the case supports or contradicts each tag

Return a JSON object with the following structure:

{
  "issueSummary": {
    "brief": "One-line summary of the issue",
    "detailed": "2-3 paragraph detailed summary of what happened",
    "rootCause": "Identified root cause if determinable, or 'Unable to determine' if not clear",
    "technicalArea": "Primary technical area (e.g., Storage, Networking, Virtualization, Backup/DR, Prism, AOS Core, etc.)"
  },
  
  "tagValidation": {
    "openTags": {
      "appliedTags": ["list the openTags that were applied to the case"],
      "recommendedTags": ["tags from PREDEFINED OPEN TAGS list that SHOULD apply based on the problem"],
      "correctlyApplied": ["tags that were applied AND should have been applied"],
      "incorrectlyApplied": ["tags that were applied but should NOT have been - with reason"],
      "missingTags": ["tags that should have been applied but weren't - with reason"],
      "score": 1-10,
      "explanation": "Detailed explanation of why this score, referencing specific case content"
    },
    "closeTags": {
      "appliedTags": ["list the closeTags that were applied to the case"],
      "recommendedTags": ["tags from PREDEFINED CLOSE TAGS list that SHOULD apply based on resolution"],
      "correctlyApplied": ["tags that were applied AND should have been applied"],
      "incorrectlyApplied": ["tags that were applied but should NOT have been - with reason"],
      "missingTags": ["tags that should have been applied but weren't - with reason"],
      "score": 1-10,
      "explanation": "Detailed explanation of why this score, referencing resolution content"
    },
    "overallScore": 1-10,
    "overallExplanation": "Summary of tag accuracy across open and close tags"
  },
  
  "closeTagPrediction": {
    "predictedTags": [
      {
        "tag": "Exact tag name from PREDEFINED CLOSE TAGS list",
        "confidence": "High|Medium|Low",
        "basedOn": ["List of actions/evidence that led to this prediction"],
        "reasoning": "Why this tag should be applied"
      }
    ],
    "actionToTagMapping": {
      "toolsUsed": ["Which close tags are suggested by the tools used"],
      "kbArticles": ["Which close tags are suggested by KB articles referenced"],
      "configChanges": ["Which close tags are suggested by configuration changes"],
      "keywords": ["Which close tags are suggested by keywords identified"]
    },
    "topPredictions": ["Top 3-5 most confident close tag predictions"],
    "comparisonWithApplied": {
      "matchingTags": ["Tags that were applied and match predictions"],
      "missingTags": ["Predicted tags that were NOT applied but should have been"],
      "extraTags": ["Applied tags that don't match predictions - may be incorrect"]
    }
  },
  
  "issueClassification": {
    "isBug": {
      "verdict": true|false|"Unable to determine",
      "confidence": "High|Medium|Low",
      "evidence": "Specific evidence from case supporting this conclusion",
      "bugType": "Software Bug|Hardware Defect|Firmware Issue|null if not a bug"
    },
    "isConfigurationIssue": {
      "verdict": true|false|"Unable to determine",
      "confidence": "High|Medium|Low",
      "evidence": "Evidence that this was resolved via configuration",
      "configurationType": "Cluster Config|Network Config|VM Config|Storage Config|null"
    },
    "isCustomerError": {
      "verdict": true|false|"Unable to determine",
      "confidence": "High|Medium|Low",
      "evidence": "Evidence that customer made a mistake/error",
      "errorType": "Workflow Error|Misconfiguration|Operational Mistake|Misunderstanding|null",
      "description": "What the customer did wrong, if applicable"
    },
    "isNonNutanixIssue": {
      "verdict": true|false|"Unable to determine",
      "confidence": "High|Medium|Low",
      "evidence": "Evidence that issue was NOT with Nutanix products",
      "actualSource": "Third-party Software|Customer Infrastructure|Network|Hypervisor|Hardware (non-Nutanix)|null",
      "description": "What the actual issue source was"
    }
  },
  
  "resolutionAnalysis": {
    "resolutionMethod": "Bug Fix|Configuration Change|Workaround|Upgrade|Documentation|Customer Education|No Action Needed|Unresolved",
    "resolvedBy": {
      "who": "Support|Customer Self-Resolved|Engineering|Third Party|Auto-Resolved|Unknown",
      "confidence": "High|Medium|Low",
      "evidence": "Evidence of who resolved it"
    },
    "wasSelfResolved": {
      "verdict": true|false|"Unable to determine",
      "evidence": "Evidence that customer resolved it themselves or issue resolved on its own"
    },
    "supportContribution": {
      "level": "Critical|Significant|Moderate|Minimal|None",
      "description": "How much support contributed to the resolution"
    },
    "resolutionQuality": {
      "score": 1-10,
      "isPermanentFix": true|false|"Unable to determine",
      "isWorkaround": true|false,
      "willRecur": "Likely|Possible|Unlikely|No",
      "reasoning": "Why this resolution quality score"
    }
  },
  
  "rcaAssessment": {
    "rcaPerformed": true|false|"Partial",
    "rcaQuality": {
      "score": 1-10,
      "verdict": "Comprehensive|Adequate|Incomplete|Missing|Not Applicable",
      "reasoning": "Assessment of RCA quality"
    },
    "rcaConclusive": {
      "verdict": true|false|"Unable to determine",
      "evidence": "What RCA concluded or why it was inconclusive"
    },
    "rcaActionable": {
      "verdict": true|false,
      "actionsIdentified": ["List of actions identified from RCA"],
      "actionsImplemented": ["Actions that were actually implemented"],
      "missingActions": ["Actions that should have been taken but weren't"]
    },
    "rcaGaps": ["What was missing from the RCA"],
    "rcaRecommendations": ["Recommendations for better RCA in similar cases"]
  },
  
  "tags": {
    "problemCategory": ["array of problem categories"],
    "productArea": ["array of product areas involved"],
    "technicalComplexity": "Low|Medium|High|Critical",
    "issueType": "Bug|Configuration|User Error|Documentation Gap|Feature Request|Hardware|Third Party|Unknown",
    "resolutionType": "Bug Fix|Workaround|Permanent Fix|Configuration Change|Upgrade Required|Customer Education|No Action Needed|Self-Resolved|Unresolved",
    "faultAttribution": "Nutanix Software|Nutanix Hardware|Customer Error|Third Party|Environment|Unknown"
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
    "automationOpportunities": ["Could this be automated?"],
    "preventionRecommendations": ["How similar issues could be prevented"]
  },
  
  "metadata": {
    "confidenceScore": 0.0-1.0,
    "analysisLimitations": ["Any limitations in the analysis"],
    "dataQualityIssues": ["Any data quality issues noticed"],
    "requiresHumanReview": true|false,
    "reviewReasons": ["Why human review is needed, if applicable"]
  }
}

IMPORTANT GUIDELINES:
- Be objective and evidence-based in your assessments
- If information is missing, indicate "Unable to determine" or null
- Provide specific examples from the conversation when possible
- Consider the full context including escalation status and response times
- For TAG VALIDATION: You MUST select tags ONLY from the PREDEFINED lists provided
- Explain WHY each tag matches or doesn't match based on specific case content
- For bug vs configuration, look for evidence in resolution notes and conversation
- For customer error, look for signs that customer misconfigured or misused something
- For non-Nutanix issues, identify when the problem was with third-party software, customer network, etc.
- For RCA assessment, evaluate if the root cause was properly identified and if actions were taken
- Return ONLY valid JSON, no additional text`;
}

/**
 * Build the user prompt with case data, actions, and predefined tag lists
 */
function buildUserPrompt(caseContext, actions) {
  return `Analyze this support case and provide structured insights.

=== PREDEFINED OPEN TAGS (select from this list only) ===
${JSON.stringify(TAG_LISTS.openTags || [], null, 2)}

=== PREDEFINED CLOSE TAGS (select from this list only) ===
${JSON.stringify(TAG_LISTS.closeTags || [], null, 2)}

=== EXTRACTED ACTIONS FROM CASE ===
This is what was done during case handling:
${JSON.stringify(actions, null, 2)}

=== CASE DATA ===
${JSON.stringify(caseContext, null, 2)}

IMPORTANT INSTRUCTIONS:
1. For tag validation, you MUST recommend tags ONLY from the predefined lists above.
2. Use the EXTRACTED ACTIONS to help predict appropriate close tags:
   - Tools used → map to specific product/component close tags
   - KB articles referenced → indicate specific issue types
   - Configuration changes → indicate config-related close tags
   - Keywords identified → map to product areas
3. Explain WHY each tag applies based on specific actions and case content.`;
}

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
      faultAttribution: ac.analysis.tags?.faultAttribution,
      
      // Issue Classification
      isBug: ac.analysis.issueClassification?.isBug?.verdict,
      isConfigurationIssue: ac.analysis.issueClassification?.isConfigurationIssue?.verdict,
      isCustomerError: ac.analysis.issueClassification?.isCustomerError?.verdict,
      isNonNutanixIssue: ac.analysis.issueClassification?.isNonNutanixIssue?.verdict,
      customerErrorType: ac.analysis.issueClassification?.isCustomerError?.errorType,
      nonNutanixSource: ac.analysis.issueClassification?.isNonNutanixIssue?.actualSource,
      
      // Resolution Analysis
      resolutionMethod: ac.analysis.resolutionAnalysis?.resolutionMethod,
      resolvedBy: ac.analysis.resolutionAnalysis?.resolvedBy?.who,
      wasSelfResolved: ac.analysis.resolutionAnalysis?.wasSelfResolved?.verdict,
      supportContribution: ac.analysis.resolutionAnalysis?.supportContribution?.level,
      isPermanentFix: ac.analysis.resolutionAnalysis?.resolutionQuality?.isPermanentFix,
      isWorkaround: ac.analysis.resolutionAnalysis?.resolutionQuality?.isWorkaround,
      
      // RCA Assessment
      rcaPerformed: ac.analysis.rcaAssessment?.rcaPerformed,
      rcaQualityScore: ac.analysis.rcaAssessment?.rcaQuality?.score,
      rcaConclusive: ac.analysis.rcaAssessment?.rcaConclusive?.verdict,
      rcaActionable: ac.analysis.rcaAssessment?.rcaActionable?.verdict,
      
      // Tag Validation
      openTagsAccuracyScore: ac.analysis.tagValidation?.openTagsAccuracy?.score,
      closeTagsAccuracyScore: ac.analysis.tagValidation?.closeTagsAccuracy?.score,
      overallTagMatchScore: ac.analysis.tagValidation?.overallTagMatchScore,
      
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
