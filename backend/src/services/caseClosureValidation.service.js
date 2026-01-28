import { invokeLLMAPI, parseLLMJSONResponse } from './llm.service.js';
import {
  CLOSURE_TAG_VALIDATION_SYSTEM_PROMPT,
  buildClosureTagValidationUserPrompt,
  buildSimplifiedClosureTagPrompt,
} from '../prompts/caseClosureValidation.prompts.js';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract relevant fields from full case data for closure tag validation
 * 
 * @param {Object} caseData - Full case data object
 * @returns {Object} Extracted context for validation
 */
export const extractClosureTagContext = (caseData) => {
  const caseInfo = caseData.caseInfo || {};
  const resolution = caseData.resolution || {};
  const tags = caseData.tags || {};

  return {
    subject: caseInfo.subject,
    description: caseInfo.description,
    resolutionNotes: resolution.resolutionNotes,
    product: caseInfo.product,
    skill: caseInfo.skill,
    caseType: caseInfo.type,
    openTags: tags.openTags || [],
    closeTags: tags.closeTags || [],
    conversation: caseData.conversation || [],
    hasConversation: (caseData.conversation?.length || 0) > 0,
  };
};

function validateClosureTagResponse(result) {
  if (['good', 'acceptable'].includes(result.overallAssessment.tagQuality)) {
    return {
      isValid: true,
      missingTags: result.missingTags?.filter((tag) => tag.confidence === 'high') || [],
    };
  } else {
    return {
      isValid: false,
      missingTags: result.missingTags?.filter((tag) => ['high', 'medium'].includes(tag.confidence)) || [],
    };
  }
}

// ============================================================================
// MAIN VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate closure tags for a case using full case data (including conversation)
 * 
 * @param {Object} caseData - Full case data object (same structure as sample-case-data.js)
 * @param {Object} options - Optional configuration
 * @param {number} options.temperature - LLM temperature (default: 0.2)
 * @param {number} options.maxTokens - Max tokens for response (default: 2048)
 * @returns {Object} Validation result with tag assessments and recommendations
 */
export async function validateClosureTags(caseData, options = {}) {
  const {
    temperature = 0.2,
    maxTokens = 2048,
  } = options;

  // Extract context for logging/debugging
  const context = extractClosureTagContext(caseData);
  
  // Check if there are closure tags to validate
  if (!context.closeTags || context.closeTags.length === 0) {
    return {
      isValid: true,
    };
  }

  // Build prompt using full case data
  const prompt = buildClosureTagValidationUserPrompt(context);

  try {
    const response = await invokeLLMAPI({
      systemPrompt: CLOSURE_TAG_VALIDATION_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature,
      maxTokens,
    });

    const result = parseLLMJSONResponse(response);

    return validateClosureTagResponse(result);
  } catch (error) {
    console.error('Error validating closure tags:', error);
    
    return {
      isValid: false,
    };
  }
}

/**
 * Validate closure tags using simplified case context (without conversation)
 * 
 * @param {Object} caseData - Full case data object
 * @param {Object} options - Optional configuration
 * @returns {Object} Validation result
 */
export async function validateClosureTagsSimplified(caseData, options = {}) {
  const {
    temperature = 0.2,
    maxTokens = 1536,
  } = options;

  // Extract context for logging/debugging
  const context = extractClosureTagContext(caseData);

  const { closeTags = [] } = context;

  // Check if there are closure tags to validate
  if (!closeTags || closeTags.length === 0) {
    return {
      isValid: true,
    };
  }

  // Build simplified prompt
  const prompt = buildSimplifiedClosureTagPrompt(context);

  try {
    const response = await invokeLLMAPI({
      systemPrompt: CLOSURE_TAG_VALIDATION_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature,
      maxTokens,
    });

    const result = parseLLMJSONResponse(response);

    const validationResult = validateClosureTagResponse(result);

    return validationResult;
  } catch (error) {
    console.error('Error validating closure tags (simplified):', error);
    
    return {
      isValid: false,
    };
  }
}
