import { invokeLLMAPI } from './llm.service.js';

import {
  JIRA_RELEVANCE_SYSTEM_PROMPT,
  buildSingleJIRARelevanceUserPrompt,
  buildBatchJIRARelevanceUserPrompt,
  validateJIRARelevanceResponse,
} from '../prompts/jiraValidation.prompts.js';
import { cleanHtmlForLLM } from '../utils/dataFormatter.js';

/**
 * Build case context from case data for JIRA relevance checking
 */
function buildCaseContext(caseData) {
  const caseInfo = caseData.caseInfo || caseData;
  const resolution = caseData.resolution || {};
  const tags = caseData.tags || {};

  return {
    subject: caseInfo.subject,
    description: cleanHtmlForLLM(caseInfo.description),
    resolutionNotes: resolution.resolutionNotes || resolution.resolution__c,
    product: caseInfo.product || caseInfo.product_type__c,
    nosVersion: caseInfo.nosVersion || caseInfo.nos_version_snapshot__c,
    skill: caseInfo.skill || caseInfo.skill__c,
    tags: [...(tags.openTags || []), ...(tags.closeTags || [])].filter(Boolean),
  };
}

/**
 * Transform raw JIRA API response to simplified format for prompts
 */
function transformJiraDetails(jiraList) {
  return jiraList.map((jiraResponse) => {
    const jiraFields = jiraResponse.fields || {};

    return {
      key: jiraResponse.key,
      summary: jiraFields.summary,
      issueType: jiraFields.issuetype?.name,
      status: jiraFields.status?.name,
      resolution: jiraFields.resolution?.name,
      priority: jiraFields.priority?.name,
      labels: jiraFields.labels || [],
      components: (jiraFields.components || []).map(c => c.name),
      affectedVersions: (jiraFields.versions || []).map(v => v.name),
      fixVersions: (jiraFields.fixVersions || []).map(v => v.name),
      releaseNotes: jiraFields.customfield_11165,
      description: cleanHtmlForLLM(jiraFields.description),
    };
  });
}

/**
 * Check relevance of a single JIRA issue against a case
 */
async function checkSingleJIRARelevance(jiraDetails, caseContext) {
  const prompt = buildSingleJIRARelevanceUserPrompt(jiraDetails, caseContext);

  const response = await invokeLLMAPI({
    systemPrompt: JIRA_RELEVANCE_SYSTEM_PROMPT,
    userPrompt: prompt,
    temperature: 0.2,
    maxTokens: 1024,
  });

  try {
    const content = response.content || response.text;
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(jsonStr);

    // Validate response structure
    const validation = validateJIRARelevanceResponse(result, false);
    if (!validation.valid) {
      console.warn('JIRA relevance response validation warning:', validation.error);
    }

    return {
      ...result,
      usage: response.usage,
    };
  } catch (parseError) {
    console.error('Failed to parse JIRA relevance response:', parseError);
    console.error('Raw response:', response.content || response.text);
    throw new Error('Failed to parse LLM response as JSON');
  }
}

/**
 * Check relevance of multiple JIRA issues against a case (batch)
 */
async function checkBatchJIRARelevance(jiraList, caseContext) {
  if (!jiraList || jiraList.length === 0) {
    return {
      caseSubject: caseContext.subject?.substring(0, 50),
      evaluatedCount: 0,
      jiraValidations: [],
      summary: 'No JIRA issues provided for evaluation.',
    };
  }

  // Transform all JIRAs if they're raw API responses
  const transformedJiraList = transformJiraDetails(jiraList);

  // For single JIRA, use the single method for more detailed response
  if (transformedJiraList.length === 1) {
    const result = await checkSingleJIRARelevance(transformedJiraList[0], caseContext);
    return {
      caseSubject: caseContext.subject?.substring(0, 50),
      evaluatedCount: 1,
      jiraValidations: [result],
      summary: result.isRelevant
        ? `Found 1 relevant JIRA: ${result.jiraKey}`
        : 'The provided JIRA issue is not relevant to this case.',
      usage: result.usage,
    };
  }

  const prompt = buildBatchJIRARelevanceUserPrompt(transformedJiraList, caseContext);

  const response = await invokeLLMAPI({
    systemPrompt: JIRA_RELEVANCE_SYSTEM_PROMPT,
    userPrompt: prompt,
    temperature: 0.2,
    maxTokens: 2048,
  });

  try {
    const content = response.content || response.text;
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(jsonStr);

    // Validate response structure
    const validation = validateJIRARelevanceResponse(result, true);
    if (!validation.valid) {
      console.warn('Batch JIRA relevance response validation warning:', validation.error);
    }

    return {
      caseSubject: caseContext.subject?.substring(0, 50),
      ...result,
      usage: response.usage,
    };
  } catch (parseError) {
    console.error('Failed to parse batch JIRA relevance response:', parseError);
    console.error('Raw response:', response.content || response.text);
    throw new Error('Failed to parse LLM response as JSON');
  }
}

/**
 * Main function to check JIRA relevance
 * Automatically chooses single or batch based on input
 *
 * @param {Array|Object} jiraIssues - Single JIRA or array of JIRA issues (raw API response or transformed)
 * @param {Object} caseData - Case data object
 * @param {Object} options - Options for filtering
 * @param {number} options.threshold - Minimum relevance score (default: 40)
 * @returns {Object} Validation result with jiraValidations array
 */
async function validateJIRARelevance(jiraIssues, caseData, options = {}) {
  const { threshold = 40 } = options;

  if (jiraIssues.length === 0) {
    return {
      isValid: true,
      reason: 'No JIRA issues provided for evaluation.',
    };
  }

  // Normalize to array
  const jiraList = Array.isArray(jiraIssues) ? jiraIssues : [jiraIssues];

  // Build case context
  const caseContext = buildCaseContext(caseData);

  // Check relevance
  const result = await checkBatchJIRARelevance(jiraList, caseContext);

  let jiraScoresAndRecommendations = [];
  if (Array.isArray(result.jiraValidations)) {
    jiraScoresAndRecommendations = result.jiraValidations;
  } else {
    jiraScoresAndRecommendations = [result];
  }

  const filteredThresholds = jiraScoresAndRecommendations?.filter(jira => jira.relevanceScore >= threshold) || [];

  return {
    isValid: filteredThresholds.length > 0,
    reason: filteredThresholds.length > 0 ? filteredThresholds[0].reasoning : jiraScoresAndRecommendations?.[0]?.reasoning,
  };
}

export {
  validateJIRARelevance,
  transformJiraDetails,
};
