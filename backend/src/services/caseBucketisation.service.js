import { invokeLLMAPI, parseLLMJSONResponse } from './llm.service.js';

import { buildCaseBucketisationUserPrompt, CASE_BUCKETISATION_SYSTEM_PROMPT } from '../prompts/caseBucketisation.prompts.js';

export const buildCaseBucketisationContext = (caseDetails) => {
  const basicCaseInfo = caseDetails.caseInfo;
  const resolutionInfo = caseDetails.resolution;

  return {
    subject: basicCaseInfo.subject,
    caseType: basicCaseInfo.type,
    priority: basicCaseInfo.priority,
    product: basicCaseInfo.product,
    description: basicCaseInfo.description,
    resolutionNotes: resolutionInfo.resolutionNotes,
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