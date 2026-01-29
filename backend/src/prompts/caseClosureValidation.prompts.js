import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const validTags = require('../data/tags.json');

// Pre-defined valid closure tags - suggestions MUST come from this list
export const VALID_CLOSURE_TAGS = validTags.closeTags;

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

export const CLOSURE_TAG_VALIDATION_SYSTEM_PROMPT = `You are an expert Nutanix Support Case Quality Analyst specializing in case closure validation and tagging accuracy.

Your task is to validate whether the closure tags assigned to a support case accurately represent the case's actual issue, resolution, and outcome.

## Your Expertise
- Deep knowledge of Nutanix products: AOS, AHV, Prism Central, Prism Element, NCC, LCM, Files, Objects, etc.
- Understanding of support case workflows and tagging conventions
- Ability to identify mismatches between case content and assigned tags

## Validation Principles
1. **Accuracy**: Closure tags must correctly describe the issue type, product area, and resolution approach
2. **Completeness**: Important aspects of the case should be captured in tags
3. **Consistency**: Tags should align with the problem description, conversation, and resolution notes
4. **Evidence-Based**: Every tag assessment must be backed by specific evidence from the case

## Accuracy Level Definitions

| Level | isAccurate | When to Use | Action |
|-------|------------|-------------|--------|
| **accurate** | true | Tag precisely matches the case content | None needed |
| **partially_accurate** | true | Tag is in the correct category but too broad/generic when a more specific tag exists | Suggest improvement (not replacement) |
| **inaccurate** | false | Tag contradicts or doesn't apply to the case | Require replacement |

### Examples:
- "Prism Central - Others" when case is about PC Scale Up → **partially_accurate** (correct product, but "Prism Central - Scale Up" is more specific)
- "Prism Central - Scale Up" for a PC scaling case → **accurate** (precise match)
- "AHV - Networking" for a Prism Central issue → **inaccurate** (wrong product entirely)

### Specificity Issues (for partially_accurate tags):
- **too_broad**: Generic tag used when a more specific tag exists (e.g., "Others", "Questions", "Other")
- **too_narrow**: Overly specific tag when a broader one applies better
- **related_but_different**: Similar category but different sub-component

## CRITICAL RULE
- All suggested tags (replacements or missing tags) MUST come from the pre-defined list provided
- DO NOT invent or create new tags - only use tags from the valid closure tags list
- If no suitable tag exists in the list, state "No suitable tag in predefined list"

Respond ONLY with valid JSON. No markdown code blocks.`;

// ============================================================================
// USER PROMPT BUILDER
// ============================================================================

/**
 * Build user prompt for closure tag validation
 * 
 * @param {Object} caseData - Full case data object from sample-case-data.js structure
 * @param {Array<string>} validClosureTags - Optional list of valid closure tags (defaults to VALID_CLOSURE_TAGS)
 * @returns {string} Formatted prompt for LLM
 */
export const buildClosureTagValidationUserPrompt = (caseData, validClosureTags = VALID_CLOSURE_TAGS) => {

  const caseInfo = caseData.caseInfo || {};
  const resolution = caseData.resolution || {};
  const tags = caseData.tags || {};
  const conversation = caseData.conversation || [];

  // Extract key conversation points (limit to avoid token overflow)
  const conversationSummary = conversation
    .slice(0, 6) // First 6 messages
    .map((msg, idx) => {
      const direction = msg.isCustomer ? 'CUSTOMER' : 'SUPPORT';
      const content = msg.content?.substring(0, 500) || msg.contentPreview?.substring(0, 500) || '';
      return `[${idx + 1}] ${direction}: ${content}${content.length >= 500 ? '...' : ''}`;
    })
    .join('\n\n');

  // Format valid closure tags as compact list
  const validTagsList = validClosureTags.join(' | ');

  // Build the prompt
  return `Validate if the closure tags assigned to this support case are accurate and appropriate.

## IMPORTANT: Valid Closure Tags (ALL suggestions MUST come from this list)
${validTagsList}

## Case Information
**Subject:** ${caseInfo.subject || 'N/A'}
**Case Type:** ${caseInfo.type || 'Not specified'}

## Product Context
**Product:** ${caseInfo.product || 'Not specified'}
**Skill Category:** ${caseInfo.skill || 'Not specified'}
**NOS Version:** ${caseInfo.nosVersion || 'Not specified'}

## Problem Description
${caseInfo.description || 'No description provided'}

## Resolution
**Resolution Notes:** ${resolution.resolutionNotes || 'Not provided'}

## Case Conversation Summary
${conversationSummary || 'No conversation available'}

---

## Tags Assigned to This Case

### Open Tags (assigned when case was opened):
${tags.openTags?.length > 0 
    ? tags.openTags.map(tag => `- ${tag}`).join('\n') 
    : 'None assigned'}

### Closure Tags (assigned when case was closed - VALIDATE THESE):
${tags.closeTags?.length > 0 
    ? tags.closeTags.map(tag => `- ${tag}`).join('\n') 
    : 'No closure tags assigned'}

---

## Validation Task

For each **closure tag**, determine:
1. **Is it accurate?** Does the tag correctly describe an aspect of this case?
2. **What is the evidence?** Quote specific text from the case that supports or contradicts this tag
3. **Confidence level:** How certain are you about this assessment?

Also identify:
- **Missing tags**: Important aspects of the case not captured by any closure tag
- **Suggested corrections**: Better tags that should replace inaccurate ones

**CRITICAL**: All suggestedReplacement and suggestedTag values MUST be exact matches from the Valid Closure Tags list above. Do NOT create new tags.

## Evaluation Criteria

When validating closure tags, consider:
1. **Product/Component Match**: Does the tag match the actual product or component involved?
2. **Issue Type Match**: Does the tag correctly categorize the type of issue (Question, Bug, Configuration, etc.)?
3. **Resolution Alignment**: Does the tag reflect how the case was actually resolved?
4. **Specificity**: Is the tag appropriately specific (not too broad or too narrow)?

## Required JSON Response Format

{
  "closureTagsValidation": [
    {
      "tag": "<closure tag name>",
      "isAccurate": <true for accurate/partially_accurate, false for inaccurate>,
      "accuracyLevel": "<accurate|partially_accurate|inaccurate>",
      "confidence": "<high|medium|low>",
      "reasoning": "<2-3 sentence explanation of why this tag is/isn't accurate>",
      "supportingEvidence": "<direct quote from case that supports this assessment>",
      "suggestedReplacement": "<replacement tag if inaccurate, otherwise null>"
    }
  ],
  "missingTags": [
    {
      "suggestedTag": "<tag that should have been added>",
      "reason": "<why this tag is needed>",
      "confidence": "<high|medium|low>",
      "evidence": "<quote from case supporting this tag>"
    }
  ],
  "overallAssessment": {
    "accuracyScore": <0-100>,
    "tagQuality": "<good|acceptable|poor>",
    "summary": "<2-3 sentence overall assessment of closure tag quality>"
  }
}`;
};

// ============================================================================
// SIMPLIFIED PROMPT BUILDER (minimal context)
// ============================================================================

/**
 * Build a simplified prompt for closure tag validation with minimal context
 * Use when you only have basic case info without full conversation
 * 
 * @param {Object} params - Simplified case parameters
 * @param {Array<string>} validClosureTags - Optional list of valid closure tags (defaults to VALID_CLOSURE_TAGS)
 * @returns {string} Formatted prompt for LLM
 */
export const buildSimplifiedClosureTagPrompt = (caseData, validClosureTags = VALID_CLOSURE_TAGS) => {
  const { subject, caseType, product, skill, description, resolutionNotes, openTags = [], closeTags = [] } = caseData;

  // Format valid closure tags as compact list
  const validTagsList = validClosureTags.join(' | ');

  return `Validate if the closure tags assigned to this support case are accurate.

## IMPORTANT: Valid Closure Tags (ALL suggestions MUST come from this list)
${validTagsList}

---

## Case Context
**Subject:** ${subject || 'N/A'}
**Case Type:** ${caseType || 'Not specified'}
**Product:** ${product || 'Not specified'}
**Skill:** ${skill || 'Not specified'}

**Description:**
${description || 'No description provided'}

**Resolution Notes:**
${resolutionNotes || 'Not provided'}

---

## Tags to Validate

**Open Tags:** ${openTags.length > 0 ? openTags.join(', ') : 'None'}

**Closure Tags (VALIDATE THESE):** ${closeTags.length > 0 ? closeTags.join(', ') : 'None'}

---

## Task
Validate each closure tag for accuracy against the case content.
**CRITICAL**: All suggestedReplacement and suggestedTag values MUST be exact matches from the Valid Closure Tags list. Do NOT create new tags.

## Accuracy Levels
- **accurate** (isAccurate: true): Tag precisely matches case content
- **partially_accurate** (isAccurate: true): Correct category but too broad (suggest improvement, not replacement)
- **inaccurate** (isAccurate: false): Wrong tag, needs replacement

## Required JSON Response

{
  "closureTagsValidation": [
    {
      "tag": "<tag name>",
      "isAccurate": <true for accurate/partially_accurate, false for inaccurate>,
      "accuracyLevel": "<accurate|partially_accurate|inaccurate>",
      "confidence": "<high|medium|low>",
      "reasoning": "<explanation>",
      "supportingEvidence": "<quote from case>",
      "suggestedReplacement": "<replacement if inaccurate, otherwise null>"
    }
  ],
  "missingTags": [
    {
      "suggestedTag": "<missing tag>",
      "reason": "<why needed>",
      "confidence": "<high|medium|low>",
      "evidence": "<supporting quote>"
    }
  ],
  "overallAssessment": {
    "accuracyScore": <0-100>,
    "tagQuality": "<good|acceptable|poor>",
    "summary": "<overall assessment>"
  }
}`;
};
