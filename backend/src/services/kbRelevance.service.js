import { invokeLLMAPI } from './llm.service.js';
import { cleanHtmlForLLM } from './kbQuery.service.js';

/**
 * System prompt for KB relevance evaluation
 */
const KB_RELEVANCE_SYSTEM_PROMPT = `You are an expert Nutanix Technical Support Engineer with deep knowledge of:
- Nutanix AOS/NOS, Prism, AHV, and related products
- Common infrastructure issues: storage, networking, clustering, replication
- Error codes, log analysis, and troubleshooting procedures

Your task is to accurately assess whether Knowledge Base articles are relevant to customer support cases. 

Guidelines:
- Be precise and technical in your assessments
- A KB is relevant only if it would genuinely help resolve the case
- Consider version compatibility but don't be overly strict
- Look for matching error messages, symptoms, or root causes
- Always respond in valid JSON format only, no markdown code blocks`;

/**
 * Build case context from case data for KB relevance checking
 */
export function buildCaseContext(caseData) {
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
 * Build prompt for single KB relevance check
 */
function buildSingleKBRelevancePrompt(kb, caseContext) {
  return `Evaluate if the following Knowledge Base article is relevant to the support case.

## Knowledge Base Article
**KB ID:** ${kb.id || kb.articleNumber || 'N/A'}
**Title:** ${kb.title}
**Summary:** ${kb.summary || 'Not provided'}
**Solution:** ${kb.solution?.substring(0, 2000) || 'Not provided'}
**Description:** ${kb.description?.substring(0, 1500) || 'Not provided'}

## Support Case
**Subject:** ${caseContext.subject}
**Product:** ${caseContext.product || 'Not specified'}
**NOS Version:** ${caseContext.nosVersion || 'Not specified'}
**Skill/Category:** ${caseContext.skill || 'Not specified'}
**Issue Tags:** ${caseContext.tags?.join(', ') || 'None'}

**Problem Description:**
${caseContext.description?.substring(0, 2000) || 'Not provided'}

**Resolution Notes:**
${caseContext.resolutionNotes?.substring(0, 1000) || 'Not yet resolved'}

## Evaluation Criteria
Rate the KB article's relevance based on:
1. **Problem Match (0-40 pts):** Does the KB address the same or similar problem?
2. **Technical Context (0-25 pts):** Does the KB apply to the same product, version, or component?
3. **Solution Applicability (0-25 pts):** Would the KB's solution help resolve this case?
4. **Symptom Alignment (0-10 pts):** Do error messages, behaviors, or symptoms match?

## Instructions
- Be strict: Only mark as relevant if the KB genuinely helps solve this case
- Consider partial relevance: A KB might address part of the issue

Respond in JSON format only:
{
  "kbId": "${kb.id || kb.articleNumber || 'N/A'}",
  "kbTitle": "${kb.title?.substring(0, 100) || ''}",
  "relevanceScore": <number 0-100>,
  "isRelevant": <boolean>,
  "confidence": "<high|medium|low>",
  "reasoning": "<2-3 sentence explanation>",
  "matchedAspects": ["<aspect1>", "<aspect2>"],
  "mismatchedAspects": ["<aspect1>", "<aspect2>"],
  "recommendationType": "<exact_match|partial_match|related_topic|not_relevant>"
}`;
}

/**
 * Build prompt for batch KB relevance check (multiple KBs)
 */
function buildBatchKBRelevancePrompt(kbList, caseContext) {
  const kbSection = kbList.map((kb, index) => `
### KB ${index + 1}
**KB ID:** ${kb.id || kb.articleNumber || `KB-${index + 1}`}
**Title:** ${kb.title}
**Summary:** ${kb.summary || 'Not provided'}
**Solution:** ${kb.solution?.substring(0, 1000) || 'Not provided'}
**Description:** ${kb.description?.substring(0, 500) || 'Not provided'}
`).join('\n---\n');

  return `Evaluate which of the following Knowledge Base articles are relevant to the support case.

## Support Case Context
**Subject:** ${caseContext.subject}
**Product:** ${caseContext.product || 'Not specified'}
**NOS Version:** ${caseContext.nosVersion || 'Not specified'}
**Skill/Category:** ${caseContext.skill || 'Not specified'}
**Issue Tags:** ${caseContext.tags?.join(', ') || 'None'}

**Problem Description:**
${caseContext.description?.substring(0, 2000) || 'Not provided'}

**Resolution Notes:**
${caseContext.resolutionNotes?.substring(0, 1000) || 'Not yet resolved'}

---

## Knowledge Base Articles to Evaluate
${kbSection}

---

## Evaluation Rules
1. **Be selective:** Only mark KBs as relevant if they directly help solve this case
2. **Score strictly:** 
   - 80-100: Exact or near-exact match to the problem
   - 60-79: Addresses the same issue with minor context differences
   - 40-59: Related but not directly applicable
   - 0-39: Not relevant
3. **Consider version compatibility:** A KB for a different NOS version may still be relevant

## Response Format
Return a JSON object. Include ALL evaluated KBs with their scores.

{
  "caseSubject": "<first 50 chars of subject>",
  "evaluatedCount": ${kbList.length},
  "relevantKBs": [
    {
      "kbId": "<kb_id>",
      "kbTitle": "<kb_title>",
      "relevanceScore": <0-100>,
      "isRelevant": <boolean>,
      "confidence": "<high|medium|low>",
      "reasoning": "<brief explanation>",
      "recommendationType": "<exact_match|partial_match|related_topic|not_relevant>"
    }
  ],
  "summary": "<1-2 sentence summary of findings>"
}`;
}

/**
 * Check relevance of a single KB article against a case
 */
export async function checkSingleKBRelevance(kb, caseContext) {
  const prompt = buildSingleKBRelevancePrompt(kb, caseContext);

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
export async function checkBatchKBRelevance(kbList, caseContext) {
  if (!kbList || kbList.length === 0) {
    return {
      caseSubject: caseContext.subject?.substring(0, 50),
      evaluatedCount: 0,
      relevantKBs: [],
      summary: 'No KB articles provided for evaluation.',
    };
  }

  // For single KB, use the single method for more detailed response
  if (kbList.length === 1) {
    const result = await checkSingleKBRelevance(kbList[0], caseContext);
    return {
      caseSubject: caseContext.subject?.substring(0, 50),
      evaluatedCount: 1,
      relevantKBs: [result],
      summary: result.isRelevant
        ? `Found 1 relevant KB: ${result.kbTitle}`
        : 'The provided KB article is not relevant to this case.',
      usage: result.usage,
    };
  }

  const prompt = buildBatchKBRelevancePrompt(kbList, caseContext);

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
export async function checkKBRelevance(kbArticles, caseData, options = {}) {
  const { threshold = 40 } = options;

  // Build case context
  const caseContext = buildCaseContext(caseData);

  // Check relevance
  const result = await checkBatchKBRelevance(kbArticles, caseContext);

  // Filter by threshold if requested
  if (threshold > 0 && result.relevantKBs) {
    result.relevantKBs = result.relevantKBs.filter(
      kb => kb.relevanceScore >= threshold
    );
    result.filteredByThreshold = threshold;
  }

  // Sort by relevance score descending
  if (result.relevantKBs) {
    result.relevantKBs.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  return result;
}

export default {
  checkKBRelevance,
  checkSingleKBRelevance,
  checkBatchKBRelevance,
  buildCaseContext,
};

