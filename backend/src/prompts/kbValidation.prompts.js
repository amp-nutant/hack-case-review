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
 * Build prompt for single KB relevance check
 */
function buildSingleKBRelevanceUserPrompt(kb, caseContext) {
  return `Evaluate if the following Knowledge Base article is relevant to the support case.

## Knowledge Base Article
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
${caseContext.resolutionNotes?.substring(0, 1000) || ''}

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
  "kbId": "${kb.articleNumber || kb.id || 'N/A'}",
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
function buildBatchKBRelevanceUserPrompt(kbList, caseContext) {
  const kbSection = kbList.map((kb, index) => `
### KB ${kb.articleNumber}
**KB ID:** ${kb.articleNumber || kb.id || `KB-${index + 1}`}
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
  "kbScoresAndRecommendations": [
    {
      "kbId": "<kb_article_number>",
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

export {
  KB_RELEVANCE_SYSTEM_PROMPT,
  buildSingleKBRelevanceUserPrompt,
  buildBatchKBRelevanceUserPrompt,
};