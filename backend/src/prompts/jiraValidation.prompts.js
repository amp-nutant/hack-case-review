/**
 * System prompt for JIRA relevance evaluation
 */
const JIRA_RELEVANCE_SYSTEM_PROMPT = `You are an expert Nutanix Technical Support Engineer evaluating JIRA issue relevance to support cases.

Guidelines:
- A JIRA is relevant if it describes the same bug, issue, or root cause as the support case
- Match on: error messages, symptoms, affected components, versions, and resolution approach
- Consider version compatibility but don't be overly strict
- Respond in valid JSON format only, no markdown code blocks`;

/**
 * Build prompt for single JIRA relevance check
 */
function buildSingleJIRARelevanceUserPrompt(jira, caseContext) {
  return `Evaluate if this JIRA issue is relevant to the support case.

## JIRA Issue
**Key:** ${jira.key}
**Summary:** ${jira.summary}
**Type:** ${jira.issueType || 'N/A'}
**Status:** ${jira.status || 'N/A'}
**Resolution:** ${jira.resolution || 'N/A'}
**Priority:** ${jira.priority || 'N/A'}
**Components:** ${(jira.components || []).map(c => c.name || c).join(', ') || 'N/A'}
**Labels:** ${(jira.labels || []).join(', ') || 'N/A'}
**Affected Versions:** ${(jira.affectedVersions || []).map(v => v.name || v).join(', ') || 'N/A'}
**Fix Versions:** ${(jira.fixVersions || []).map(v => v.name || v).join(', ') || 'N/A'}
**Description:** ${(jira.description || 'Not provided').substring(0, 1500)}
**Release Notes:** ${(jira.releaseNotes || '').substring(0, 500) || 'N/A'}

## Support Case
**Subject:** ${caseContext.subject}
**Product:** ${caseContext.product || 'Not specified'}
**NOS Version:** ${caseContext.nosVersion || 'Not specified'}
**Skill:** ${caseContext.skill || 'Not specified'}
**Tags:** ${caseContext.tags?.join(', ') || 'None'}

**Problem Description:**
${caseContext.description?.substring(0, 1500) || 'Not provided'}

**Resolution Notes:**
${caseContext.resolutionNotes?.substring(0, 800) || ''}

## Evaluation Criteria
1. **Issue Match (0-40 pts):** Does the JIRA describe the same bug/problem?
2. **Component Match (0-25 pts):** Same product, component, or affected area?
3. **Resolution Fit (0-25 pts):** Does the JIRA fix address the case's root cause?
4. **Symptom Match (0-10 pts):** Do errors or symptoms align?

Respond in JSON:
{
  "jiraKey": "${jira.key}",
  "jiraSummary": "${(jira.fields?.summary || jira.summary || '').substring(0, 100)}",
  "relevanceScore": <0-100>,
  "isRelevant": <boolean>,
  "confidence": "<high|medium|low>",
  "reasoning": "<2-3 sentence explanation>",
  "matchedAspects": ["<aspect1>", "<aspect2>"],
  "mismatchedAspects": ["<aspect1>"],
  "recommendationType": "<exact_match|partial_match|related_issue|not_relevant>"
}`;
}

/**
 * Build prompt for batch JIRA relevance check (multiple JIRAs)
 */
function buildBatchJIRARelevanceUserPrompt(jiraList, caseContext) {
  const jiraSection = jiraList.map((jiraDetails, index) => {
    return `
### JIRA ${index + 1}
**Key:** ${jiraDetails.key}
**Summary:** ${jiraDetails.summary}
**Type:** ${jiraDetails.issueType || 'N/A'}
**Status:** ${jiraDetails.status || 'N/A'}
**Resolution:** ${jiraDetails.resolution || 'N/A'}
**Components:** ${(jiraDetails.components || []).map(c => c.name || c).join(', ') || 'N/A'}
**Labels:** ${(jiraDetails.labels || []).slice(0, 5).join(', ') || 'N/A'}
**Fix Versions:** ${(jiraDetails.fixVersions || []).map(v => v.name || v).join(', ') || 'N/A'}
**Description:** ${(jiraDetails.description || '').substring(0, 600) || 'N/A'}`;
  }).join('\n---\n');

  return `Evaluate which JIRA issues are relevant to this support case.

## Support Case
**Subject:** ${caseContext.subject}
**Product:** ${caseContext.product || 'Not specified'}
**NOS Version:** ${caseContext.nosVersion || 'Not specified'}
**Skill:** ${caseContext.skill || 'Not specified'}
**Tags:** ${caseContext.tags?.join(', ') || 'None'}

**Problem Description:**
${caseContext.description?.substring(0, 1500) || 'Not provided'}

**Resolution Notes:**
${caseContext.resolutionNotes?.substring(0, 800) || ''}

---

## JIRA Issues to Evaluate
${jiraSection}

---

## Scoring Guide
- 80-100: Exact match - same bug/issue
- 60-79: Same issue, minor context differences
- 40-59: Related but not directly applicable
- 0-39: Not relevant

Respond in JSON:
{
  "evaluatedCount": ${jiraList.length},
  "jiraValidations": [
    {
      "jiraKey": "<key>",
      "jiraSummary": "<summary>",
      "relevanceScore": <0-100>,
      "isRelevant": <boolean>,
      "confidence": "<high|medium|low>",
      "reasoning": "<brief explanation>",
      "recommendationType": "<exact_match|partial_match|related_issue|not_relevant>"
    }
  ],
  "summary": "<1-2 sentence summary>"
}`;
}

/**
 * Validate JIRA relevance response structure
 */
function validateJIRARelevanceResponse(response, isBatch = false) {
  if (isBatch) {
    if (!response.jiraValidations || !Array.isArray(response.jiraValidations)) {
      return { valid: false, error: 'Missing jiraValidations array' };
    }
  } else {
    if (typeof response.relevanceScore !== 'number' || response.relevanceScore < 0 || response.relevanceScore > 100) {
      return { valid: false, error: 'relevanceScore must be 0-100' };
    }
    if (typeof response.isRelevant !== 'boolean') {
      return { valid: false, error: 'isRelevant must be boolean' };
    }
  }
  return { valid: true };
}

export {
  JIRA_RELEVANCE_SYSTEM_PROMPT,
  buildSingleJIRARelevanceUserPrompt,
  buildBatchJIRARelevanceUserPrompt,
  validateJIRARelevanceResponse,
};
