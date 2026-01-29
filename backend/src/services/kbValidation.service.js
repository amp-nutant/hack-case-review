import { invokeLLMAPI } from './llm.service.js';

import { KB_RELEVANCE_SYSTEM_PROMPT, buildSingleKBRelevanceUserPrompt, buildBatchKBRelevanceUserPrompt } from '../prompts/kbValidation.prompts.js';
import { cleanHtmlForLLM } from '../utils/dataFormatter.js';

/**
 * Build case context from case data for KB relevance checking
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
    tags: [
      ...(tags.openTags || []),
      ...(tags.closeTags || []),
    ].filter(Boolean),
  };
}

/**
 * Check relevance of a single KB article against a case
 */
async function checkSingleKBRelevance(kb, caseContext) {
  const prompt = buildSingleKBRelevanceUserPrompt(kb, caseContext);

  const response = await invokeLLMAPI({
    systemPrompt: KB_RELEVANCE_SYSTEM_PROMPT,
    userPrompt: prompt,
    temperature: 0.2, // Low temperature for consistent evaluation
    maxTokens: 1024,
  });

  try {
    const content = response.content || response.text;
    // Clean up potential markdown code blocks
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      ...result,
      usage: response.usage,
    };
  } catch (parseError) {
    console.error('Failed to parse KB relevance response:', parseError);
    console.error('Raw response:', response.content || response.text);
    throw new Error('Failed to parse LLM response as JSON');
  }
}

/**
 * Check relevance of multiple KB articles against a case (batch)
 */
async function checkBatchKBRelevance(kbList, caseContext) {
  if (!kbList || kbList.length === 0) {
    return {
      caseSubject: caseContext.subject?.substring(0, 50),
      evaluatedCount: 0,
      kbScoresAndRecommendations: [],
      summary: 'No KB articles provided for evaluation.',
    };
  }

  // For single KB, use the single method for more detailed response
  if (kbList.length === 1) {
    const result = await checkSingleKBRelevance(kbList[0], caseContext);
    return {
      caseSubject: caseContext.subject?.substring(0, 50),
      evaluatedCount: 1,
      kbScoresAndRecommendations: [result],
      summary: result.isRelevant
        ? `Found 1 relevant KB: ${result.kbTitle}`
        : 'The provided KB article is not relevant to this case.',
      usage: result.usage,
    };
  }

  const prompt = buildBatchKBRelevanceUserPrompt(kbList, caseContext);

  const response = await invokeLLMAPI({
    systemPrompt: KB_RELEVANCE_SYSTEM_PROMPT,
    userPrompt: prompt,
    temperature: 0.2,
    maxTokens: 2048,
  });

  try {
    const content = response.content || response.text;
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      ...result,
      usage: response.usage,
    };
  } catch (parseError) {
    console.error('Failed to parse batch KB relevance response:', parseError);
    console.error('Raw response:', response.content || response.text);
    throw new Error('Failed to parse LLM response as JSON');
  }
}

/**
 * Main function to check KB relevance
 * Automatically chooses single or batch based on input
 */
async function validateKBRelevance(kbArticles, caseData, options = {}) {
  const { threshold = 40 } = options;

  if (kbArticles.length === 0) {
    return {
      isValid: true,
      reason: 'No KB articles provided for evaluation.',
    };
  }

  // Build case context
  const caseContext = buildCaseContext(caseData);

  // Check relevance
  const result = await checkBatchKBRelevance(kbArticles, caseContext);

  let kbScoresAndRecommendations = [];
  if (Array.isArray(result.kbScoresAndRecommendations)) {
    kbScoresAndRecommendations = result.kbScoresAndRecommendations;
  } else {
    kbScoresAndRecommendations = [result];
  }

  const filteredThresholds = kbScoresAndRecommendations?.filter(kb => kb.relevanceScore >= threshold) || [];

  return {
    isValid: filteredThresholds.length > 0,
    reason: filteredThresholds.length > 0 ? filteredThresholds[0].reasoning : kbScoresAndRecommendations?.[0]?.reasoning,
  };
}

export {
  validateKBRelevance,
};

