import { invokeLLMAPI } from './llm.service.js';
import { cleanHtmlForLLM } from '../utils/dataFormatter.js';
import {
  ARTIFACT_RELEVANCE_SYSTEM_PROMPT,
  TAG_VALIDATION_SYSTEM_PROMPT,
  buildArtifactRelevancePrompt,
  buildTagValidationPrompt,
  validateArtifactRelevanceResponse,
  validateTagValidationResponse,
} from '../prompts/kbJiraValidation.prompts.js';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build standardized case context from various case data formats
 */
export function buildCaseContext(caseData) {
  const caseInfo = caseData.caseInfo || caseData;
  const resolution = caseData.resolution || {};
  const tags = caseData.tags || {};

  return {
    caseNumber: caseInfo.caseNumber || caseInfo.case_number__c,
    subject: caseInfo.subject,
    description: cleanHtmlForLLM(caseInfo.description),
    resolutionNotes: cleanHtmlForLLM(
      resolution.resolutionNotes || resolution.resolution__c || caseInfo.resolution__c
    ),
    actionsTaken: cleanHtmlForLLM(caseInfo.actionsTaken || caseInfo.actions_taken__c),
    product: caseInfo.product || caseInfo.product_type__c,
    nosVersion: caseInfo.nosVersion || caseInfo.nos_version_snapshot__c,
    skill: caseInfo.skill || caseInfo.skill__c,
    component: caseInfo.component || caseInfo.component__c,
    tags: [
      ...(tags.openTags || []),
      ...(tags.closeTags || []),
    ].filter(Boolean),
    hasJira: Boolean(caseData.jiraKey || caseInfo.jira_key__c),
    jiraKey: caseData.jiraKey || caseInfo.jira_key__c,
    hasKB: Boolean(caseData.kbId || caseInfo.kb_article__c),
    kbId: caseData.kbId || caseInfo.kb_article__c,
  };
}

/**
 * Transform raw JIRA API response to simplified format for LLM
 */
export function transformJiraDetails(jiraResponse) {
  if (!jiraResponse) return null;

  const fields = jiraResponse.fields || {};

  return {
    key: jiraResponse.key,
    summary: fields.summary,
    description: cleanHtmlForLLM(fields.description),
    issueType: fields.issuetype?.name,
    status: fields.status?.name,
    resolution: fields.resolution?.name,
    priority: fields.priority?.name,
    labels: fields.labels || [],
    components: (fields.components || []).map(c => c.name),
    affectedVersions: (fields.versions || []).map(v => v.name),
    fixVersions: (fields.fixVersions || []).map(v => v.name),
    releaseNotes: fields.customfield_11165, // Release notes custom field
  };
}

/**
 * Transform KB article data to standardized format
 */
export function transformKBArticle(kbData) {
  if (!kbData) return null;

  return {
    id: kbData.id || kbData.articleNumber,
    articleNumber: kbData.articleNumber,
    title: kbData.title,
    summary: kbData.summary,
    solution: cleanHtmlForLLM(kbData.solution || kbData.solution__c),
    description: cleanHtmlForLLM(kbData.description || kbData.description__c),
  };
}

/**
 * Parse LLM JSON response with error handling
 */
function parseLLMResponse(response) {
  const content = response.content || response.text;
  // Clean up potential markdown code blocks
  const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(jsonStr);
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * LLM Call 1: Validate KB and JIRA artifact relevance
 */
export async function validateArtifactRelevance(caseContext, kbArticle, jiraDetails) {
  const prompt = buildArtifactRelevancePrompt({
    caseContext,
    kbArticle: transformKBArticle(kbArticle),
    jiraDetails: transformJiraDetails(jiraDetails),
  });

  const response = await invokeLLMAPI({
    systemPrompt: ARTIFACT_RELEVANCE_SYSTEM_PROMPT,
    userPrompt: prompt,
    temperature: 0.2, // Low temperature for consistent evaluation
    maxTokens: 2048,
  });

  try {
    const result = parseLLMResponse(response);

    // Validate response structure
    const validation = validateArtifactRelevanceResponse(result);
    if (!validation.valid) {
      console.warn('Artifact relevance response validation warning:', validation.error);
    }

    return {
      ...result,
      usage: response.usage,
    };
  } catch (parseError) {
    console.error('Failed to parse artifact relevance response:', parseError);
    console.error('Raw response:', response.content || response.text);
    throw new Error('Failed to parse artifact relevance LLM response as JSON');
  }
}

/**
 * LLM Call 2: Validate closed tags accuracy
 */
export async function validateClosedTags(caseContext, closedTags, availableTags = null) {
  const prompt = buildTagValidationPrompt({
    caseContext,
    closedTags,
    availableTags,
  });

  const response = await invokeLLMAPI({
    systemPrompt: TAG_VALIDATION_SYSTEM_PROMPT,
    userPrompt: prompt,
    temperature: 0.2,
    maxTokens: 2048,
  });

  try {
    const result = parseLLMResponse(response);

    // Validate response structure
    const validation = validateTagValidationResponse(result);
    if (!validation.valid) {
      console.warn('Tag validation response validation warning:', validation.error);
    }

    return {
      ...result,
      usage: response.usage,
    };
  } catch (parseError) {
    console.error('Failed to parse tag validation response:', parseError);
    console.error('Raw response:', response.content || response.text);
    throw new Error('Failed to parse tag validation LLM response as JSON');
  }
}

// ============================================================================
// MAIN VALIDATION FUNCTION (PARALLEL EXECUTION)
// ============================================================================

/**
 * Validate a closed case with hybrid 2-call approach:
 * - Call 1: KB + JIRA relevance (combined)
 * - Call 2: Closed tag accuracy
 * 
 * Both calls run in parallel for optimal latency.
 * 
 * @param {Object} caseData - Full case data object
 * @param {Object} options - Validation options
 * @param {Object} options.kbArticle - KB article data (optional)
 * @param {Object} options.jiraDetails - JIRA details from API (optional)
 * @param {Array<string>} options.closedTags - Array of closed tag names
 * @param {Array} options.availableTags - Available tag categories for reference (optional)
 * @param {boolean} options.skipArtifacts - Skip artifact validation
 * @param {boolean} options.skipTags - Skip tag validation
 * @returns {Object} Combined validation results
 */
export async function validateCase(caseData, options = {}) {
  const {
    kbArticle = null,
    jiraDetails = null,
    closedTags = [],
    availableTags = null,
    skipArtifacts = false,
    skipTags = false,
  } = options;

  // Build case context once
  const caseContext = buildCaseContext(caseData);

  // Prepare parallel promises
  const promises = [];
  const resultKeys = [];

  // LLM Call 1: Artifact relevance (KB + JIRA)
  if (!skipArtifacts && (kbArticle || jiraDetails)) {
    promises.push(
      validateArtifactRelevance(caseContext, kbArticle, jiraDetails)
        .catch(error => ({
          error: true,
          message: error.message,
          type: 'artifact_validation_error',
        }))
    );
    resultKeys.push('artifactValidation');
  }

  // LLM Call 2: Tag validation
  if (!skipTags && closedTags.length > 0) {
    promises.push(
      validateClosedTags(caseContext, closedTags, availableTags)
        .catch(error => ({
          error: true,
          message: error.message,
          type: 'tag_validation_error',
        }))
    );
    resultKeys.push('tagValidation');
  }

  // Execute in parallel
  const startTime = Date.now();
  const results = await Promise.all(promises);
  const executionTime = Date.now() - startTime;

  // Map results to keys
  const validationResults = {};
  results.forEach((result, index) => {
    validationResults[resultKeys[index]] = result;
  });

  // Compute overall summary
  const summary = computeOverallSummary(validationResults);

  return {
    caseNumber: caseContext.caseNumber,
    caseSubject: caseContext.subject?.substring(0, 100),
    ...validationResults,
    summary,
    metadata: {
      executionTimeMs: executionTime,
      parallelCalls: promises.length,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Compute overall validation summary from results
 */
function computeOverallSummary(results) {
  const issues = [];
  let overallScore = 100;

  // Check artifact validation
  if (results.artifactValidation && !results.artifactValidation.error) {
    const av = results.artifactValidation;
    
    // KB issues
    if (av.kbValidation?.isPresent && !av.kbValidation.isRelevant) {
      issues.push(`KB article (${av.kbValidation.kbId}) is not relevant`);
      overallScore -= 15;
    }
    
    // JIRA issues
    if (av.jiraValidation?.isPresent && !av.jiraValidation.isRelevant) {
      issues.push(`JIRA (${av.jiraValidation.jiraKey}) is not relevant`);
      overallScore -= 20;
    }
  }

  // Check tag validation
  if (results.tagValidation && !results.tagValidation.error) {
    const tv = results.tagValidation;
    
    // Inaccurate tags
    const inaccurateTags = tv.validatedTags?.filter(t => !t.isAccurate) || [];
    if (inaccurateTags.length > 0) {
      issues.push(`${inaccurateTags.length} inaccurate tag(s): ${inaccurateTags.map(t => t.tag).join(', ')}`);
      overallScore -= (inaccurateTags.length * 5);
    }
    
    // Missing tags
    if (tv.missingTags?.length > 0) {
      issues.push(`${tv.missingTags.length} suggested missing tag(s)`);
      overallScore -= (tv.missingTags.length * 3);
    }
  }

  // Check for errors
  if (results.artifactValidation?.error) {
    issues.push('Artifact validation failed');
  }
  if (results.tagValidation?.error) {
    issues.push('Tag validation failed');
  }

  overallScore = Math.max(0, Math.min(100, overallScore));

  return {
    overallScore,
    quality: overallScore >= 80 ? 'good' : overallScore >= 60 ? 'acceptable' : 'poor',
    issueCount: issues.length,
    issues,
    needsReview: issues.length > 0,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  validateCase,
  validateArtifactRelevance,
  validateClosedTags,
  buildCaseContext,
  transformJiraDetails,
  transformKBArticle,
};
