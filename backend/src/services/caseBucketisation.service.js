import { invokeLLMAPI, parseLLMJSONResponse } from './llm.service.js';

import { buildCaseBucketisationUserPrompt, CASE_BUCKETISATION_SYSTEM_PROMPT } from '../prompts/caseBucketisation.prompts.js';
import { formatActionsForLLM } from '../utils/dataFormatter.js';

export const buildCaseBucketisationContext = (caseDetails) => {
  const basicCaseInfo = caseDetails.caseInfo;
  const resolutionInfo = caseDetails.resolution;

  // get the Closure Summary from the case conversation
  let closureSummary = [...caseDetails.conversation].reverse().find(
    (message) => message.direction === 'outbound' && message.subject?.toLowerCase()?.includes('closure ')
  );
  closureSummary = closureSummary?.content;
  closureSummary = formatActionsForLLM(closureSummary);

  return {
    subject: basicCaseInfo.subject,
    caseType: basicCaseInfo.type,
    priority: basicCaseInfo.priority,
    product: basicCaseInfo.product,
    description: basicCaseInfo.description,
    resolutionNotes: resolutionInfo.resolutionNotes,
    actionsTaken: closureSummary,
    jiraCase: basicCaseInfo.jiraCase,
    kbArticle: basicCaseInfo.kbArticle,
    caseTags: caseDetails.tags?.closeTags || [],
  };
};

export async function bucketiseCase(caseDetails) {
  try {
    const caseContext = buildCaseBucketisationContext(caseDetails);
    const prompt = buildCaseBucketisationUserPrompt(caseContext);
    const response = await invokeLLMAPI({
      systemPrompt: CASE_BUCKETISATION_SYSTEM_PROMPT,
      userPrompt: prompt,
    });
    
    return parseLLMJSONResponse(response);
  } catch (err) {
    console.error('Error bucketising case:', err);
    throw err;
  }
}