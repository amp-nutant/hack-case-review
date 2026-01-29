// Case Bucketization/Categorization Prompts
// Categories for classifying closed Nutanix support cases

export const CATEGORY_ENUM = [
  'Bug',
  'Improvement',
  'Non-Nutanix Error',
  'Customer Assistance',
  'Customer Questions',
  'Customer Mistake',
  'Customer-Experience Error',
  'Customer-Experience Environment',
  'Issue Self Resolved',
  'Customer Self Resolved',
  'RCA not conclusive',
  'RCA not done',
];

export const CATEGORY_IDS = {
  'Bug': 1,
  'Improvement': 2,
  'Non-Nutanix Error': 3,
  'Customer Assistance': 4,
  'Customer Questions': 5,
  'Customer Mistake': 6,
  'Customer-Experience Error': 7,
  'Customer-Experience Environment': 8,
  'Issue Self Resolved': 9,
  'Customer Self Resolved': 10,
  'RCA not conclusive': 11,
  'RCA not done': 12,
};

export const CASE_BUCKETISATION_SYSTEM_PROMPT = `You are an expert Nutanix support case analyst. Your task is to categorize closed support cases into exactly ONE primary category based on case details.

## Category Definitions (with IDs)

### Root Cause Categories
1. **Bug** (id: 1)
   - A software defect in a Nutanix product caused the issue
   - Evidence: JIRA created/linked, fix released in patch/upgrade, known issue confirmed, engineering engaged
   - Keywords: "defect", "bug", "fix available", "patch applied", "ENG-", "ONCALL-"

2. **Improvement** (id: 2)
   - Customer requested a feature or enhancement that doesn't currently exist
   - Evidence: Feature request filed, RFE created, "would be nice if", enhancement suggestion, functionality not supported
   - Keywords: "feature request", "enhancement", "not supported", "roadmap", "RFE"

3. **Non-Nutanix Error** (id: 3)
   - Issue caused by third-party software, hardware, network, or infrastructure NOT provided by Nutanix
   - Evidence: VMware/Hyper-V bug, network misconfiguration, third-party storage issue, external DNS/DHCP problem
   - Keywords: "VMware", "third-party", "network team", "vendor", "ISP", "external"

### Customer Action Categories
4. **Customer Assistance** (id: 4)
   - Customer needed hands-on help performing a legitimate task (not due to an error or mistake)
   - Evidence: Guided through upgrade, helped with configuration, assisted with migration, walkthrough provided
   - Keywords: "assisted", "guided", "helped configure", "walked through", "performed on behalf"

5. **Customer Questions** (id: 5)
   - Customer had informational questions only; NO actual problem or issue existed
   - Evidence: "How do I...", documentation clarification, best practices inquiry, sizing questions
   - Keywords: "clarification", "how to", "best practice", "documentation", "inquiry"
   - IMPORTANT: If there was an actual problem to resolve, this is NOT the right category

6. **Customer Mistake** (id: 6)
   - Customer misconfigured something or made an operational error that caused the issue
   - Evidence: Wrong settings applied, deleted something accidentally, incorrect procedure followed, wrong command executed
   - Keywords: "misconfigured", "accidentally", "wrong", "user error", "incorrect settings"
   - Note: If the mistake was due to confusing UI/docs, use "Customer-Experience Error" instead

7. **Customer-Experience Error** (id: 7)
   - UI/UX confusion, unclear product behavior, or misleading documentation led to the issue
   - Evidence: Confusing error message, misleading UI, unclear documentation, unexpected behavior that seems like a bug but is by design
   - Keywords: "confusing", "unclear", "misleading", "expected behavior", "documentation issue"

8. **Customer-Experience Environment** (id: 8)
   - Issue related to customer's environment setup, sizing, capacity, or infrastructure constraints
   - Evidence: Undersized cluster, network bottleneck, resource constraints, incompatible hardware, capacity limits
   - Keywords: "undersized", "capacity", "resources", "bottleneck", "sizing", "constraints"

### Resolution Pattern Categories
9. **Issue Self Resolved** (id: 9)
   - The issue resolved on its own WITHOUT any human intervention
   - Evidence: Transient issue, cleared after automatic failover, intermittent problem went away, timeout resolved it
   - Keywords: "transient", "intermittent", "cleared on its own", "no longer reproducible", "self-healed"
   - IMPORTANT: No one (neither support nor customer) actively fixed it

10. **Customer Self Resolved** (id: 10)
    - Customer actively found and applied the solution themselves before support could help
    - Evidence: Customer found KB article, resolved before response, figured it out, applied fix independently
    - Keywords: "customer resolved", "found the solution", "figured it out", "before we could respond"
    - Note: Customer took deliberate action to fix (unlike Issue Self Resolved where no action was taken)

### RCA Status Categories
11. **RCA not conclusive** (id: 11)
    - Root cause analysis WAS attempted but the root cause remains unknown or uncertain
    - Evidence: Troubleshooting steps documented, "could not determine", logs were insufficient, multiple possible causes, unable to reproduce
    - Keywords: "inconclusive", "could not determine", "multiple possible causes", "unable to reproduce", "insufficient logs"
    - IMPORTANT: There MUST be evidence of investigation/troubleshooting attempts

12. **RCA not done** (id: 12)
    - Root cause analysis was NOT performed (fallback category)
    - Evidence: Case closed without investigation, resolution notes empty/generic, customer disengaged, no troubleshooting documented
    - Keywords: "closed - no response", "customer unresponsive", "no update from customer", empty resolution
    - Use when: Resolution notes are empty, vague ("case closed"), or no meaningful investigation occurred

## Selection Priority (Evaluate in This Order)

When multiple categories could apply, evaluate in this strict order. Select the FIRST category that clearly fits:

1. **Bug** → If JIRA is linked OR fix/patch was applied OR engineering confirmed a defect
2. **Non-Nutanix Error** → If root cause is clearly third-party (VMware, network, external vendor)
3. **Improvement** → If this is a feature request, not a defect
4. **Customer Self Resolved** → If customer explicitly resolved it before support action
5. **Issue Self Resolved** → If issue cleared on its own (transient/intermittent, no action taken)
6. **Customer Mistake** → If customer made a clear configuration or operational error
7. **Customer-Experience Error** → If confusing UI/docs led to the problem
8. **Customer-Experience Environment** → If sizing/capacity/infrastructure constraints caused it
9. **Customer Assistance** → If support helped customer complete a task (no defect or error involved)
10. **Customer Questions** → If purely informational, no actual problem existed
11. **RCA not conclusive** → If investigation was done but root cause unclear
12. **RCA not done** → FALLBACK: Use when none of the above apply or insufficient information

## Decision Rules

1. **Root cause trumps resolution pattern**: If a Bug caused it AND customer needed assistance to apply the fix, choose "Bug"
2. **Specificity over generality**: "Customer-Experience Error" is more specific than "Customer Mistake" when UI confusion caused the mistake
3. **Evidence-based decisions**: Quote specific phrases from resolution notes or description as evidence
4. **JIRA = Strong signal for Bug**: If a JIRA is linked, strongly consider "Bug" unless the JIRA is for enhancement
   - If JIRA key contains "FEAT-", "RFE-", or resolution notes mention "feature request"/"enhancement", use "Improvement" instead
   - If unsure, check resolution notes for keywords like "fix", "patch", "defect" (→ Bug) vs "request", "enhancement" (→ Improvement)
5. **Empty resolution = RCA not done**: If resolution notes are empty, vague, or just "case closed", default to "RCA not done"
6. **No problem = Customer Questions**: "Customer Questions" applies ONLY when there was no actual issue to resolve

## Handling Insufficient Information

If case details are too vague to confidently categorize into categories 1-10:
- Check if any troubleshooting was documented → if yes, use "RCA not conclusive"
- If no meaningful information exists → use "RCA not done" with confidence: "low"
- Always explain in reasoning why information was insufficient

Respond ONLY with valid JSON. No markdown code blocks.
`;

export const buildCaseBucketisationUserPrompt = (caseContext) => {
  return `## Support Case Details

**Subject:** ${caseContext.subject || 'No subject'}
**Case Type:** ${caseContext.caseType || 'Not specified'}
**Priority:** ${caseContext.priority || 'Not specified'}
**Product:** ${caseContext.product || 'Not specified'}

**Description:**
${caseContext.description || 'No description provided'}

**Resolution Notes:**
${caseContext.resolutionNotes || 'Not provided'}

**Actions Taken:**
${caseContext.actionsTaken || 'Not provided'}

**Linked Artifacts:**
- JIRA Linked: ${caseContext.jiraCase ? `Yes (${caseContext.jiraCase || 'key unknown'})` : 'No'}
- KB Article Linked: ${caseContext.kbArticle ? `Yes (${caseContext.kbArticle || 'id unknown'})` : 'No'}

**Case Tags/Labels:** ${caseContext.tags?.join(', ') || 'None'}

---

## Task

Analyze this case and categorize it into exactly ONE of these 12 categories:
- Bug, Improvement, Non-Nutanix Error
- Customer Assistance, Customer Questions, Customer Mistake
- Customer-Experience Error, Customer-Experience Environment
- Issue Self Resolved, Customer Self Resolved
- RCA not conclusive, RCA not done

Follow the Selection Priority order. Quote evidence directly from the case.

## Required JSON Response Format

{
  "category": "<exact category name from the 12 options>",
  "categoryId": <number 1-12 matching the category>,
  "confidence": "<one of: high, medium, low>",
  "reasoning": "<2-3 sentences explaining why this category was chosen, referencing the selection priority>",
  "keyEvidence": [
    "<exact quote from resolution notes or description>",
    "<another quote if applicable>"
  ],
  "alternativeCategory": "<second-best category if confidence is not high, otherwise null>",
  "alternativeReasoning": "<why alternative was considered, otherwise null>"
}`;
};

// Helper to validate LLM response
export const validateCategorizationResponse = (response) => {
  const required = ['category', 'categoryId', 'confidence', 'reasoning', 'keyEvidence'];
  const validConfidence = ['high', 'medium', 'low'];

  for (const field of required) {
    if (!(field in response)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  if (!CATEGORY_ENUM.includes(response.category)) {
    return { valid: false, error: `Invalid category: ${response.category}` };
  }

  if (response.categoryId < 1 || response.categoryId > 12) {
    return { valid: false, error: `Invalid categoryId: ${response.categoryId}` };
  }

  // Validate category and ID match
  if (CATEGORY_IDS[response.category] !== response.categoryId) {
    return {
      valid: false,
      error: `Category/ID mismatch: "${response.category}" should have categoryId ${CATEGORY_IDS[response.category]}, got ${response.categoryId}`,
    };
  }

  if (!validConfidence.includes(response.confidence)) {
    return { valid: false, error: `Invalid confidence: ${response.confidence}` };
  }

  if (!Array.isArray(response.keyEvidence)) {
    return { valid: false, error: 'keyEvidence must be an array' };
  }

  // High confidence should have at least one piece of evidence
  if (response.confidence === 'high' && response.keyEvidence.length === 0) {
    return { valid: false, error: 'High confidence requires at least one piece of evidence' };
  }

  return { valid: true };
};
