/**
 * Action Summary Service
 * 
 * Generates actionable insights from reviewed cases, organized into categories:
 * 1. Cases with wrong closed tags
 * 2. Top JIRAs not yet closed (prioritize for fix)
 * 3. Top JIRAs fixed but customer needs version update
 * 4. Missing KB / KB not linked
 * 5. Cases that could be addressed by new KB (recommend creation)
 * 6. Bugs/Improvements without JIRA
 */

import { formatActionsForLLM } from "../utils/dataFormatter.js";
import { invokeLLMAPI, parseLLMJSONResponse } from "./llm.service.js";

// ============================================================================
// KB TITLE GENERATION PROMPTS
// ============================================================================

const KB_TITLE_GENERATION_SYSTEM_PROMPT = `You are an expert technical writer specializing in creating Knowledge Base article titles for enterprise software support.

Your task is to generate a clear, descriptive KB article title based on a group of related support cases.

Guidelines for KB titles:
- Be specific and descriptive (e.g., "How to Resolve AHV Host Network Timeout During VM Migration")
- Start with action-oriented words when appropriate: "How to", "Troubleshooting", "Configuring", "Understanding"
- Include the product/component name when relevant
- Keep titles between 8-15 words
- Avoid vague terms like "issue", "problem" alone
- Focus on the solution/topic rather than the symptom
- Make it searchable - use keywords customers would search for

Title formats by issue type:
- Bug/Known Issue: "Known Issue: [Component] - [Symptom] [Version if applicable]"
- How-to: "How to [Action] in [Product/Component]"
- Troubleshooting: "Troubleshooting [Symptom] in [Product/Component]"
- Configuration: "Configuring [Feature] in [Product/Component]"
- FAQ: "[Product] - [Common Question Topic]"

Return your response as JSON:
{
  "title": "<8-15 word KB article title>",
  "articleType": "<how_to|troubleshooting|known_issue|configuration|faq>",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "summary": "<1-2 sentence description of what the KB would cover>"
}`;

/**
 * Build user prompt for KB title generation
 */
function buildKBTitleGenerationPrompt(group) {
  const { product, skill, bucket, cases } = group;
  
  // Sample up to 10 cases for context
  const sampleCases = cases.slice(0, 10);
  
  const caseDetails = sampleCases.map((c, idx) => {
    const parts = [`Case ${idx + 1}:`];
    if (c.subject) parts.push(`  Subject: ${c.subject}`);
    if (c.resolutionNotes) parts.push(`  Resolution: ${c.resolutionNotes.substring(0, 300)}${c.resolutionNotes.length > 300 ? '...' : ''}`);
    if (c.actionsTaken && c.actionsTaken !== 'No specific actions documented.') {
      parts.push(`  Actions Taken:\n${c.actionsTaken.split('\n').map(a => `    ${a}`).join('\n')}`);
    }
    return parts.join('\n');
  }).join('\n\n');

  return `Generate a KB article title for the following group of ${cases.length} related support cases.

Context:
- Product: ${product}
- Component/Skill: ${skill}
- Case Category: ${bucket}
- Total Cases: ${cases.length}

Sample Cases:
${caseDetails}

Based on these cases, generate an appropriate KB article title that would help customers find solutions to similar issues.`;
}

// ============================================================================
// 1. WRONG CLOSED TAGS
// ============================================================================

/**
 * Get cases with incorrect closure tags that need review
 * 
 * @param {Array} caseList - List of reviewed cases
 * @returns {Object} Summary of cases with wrong tags
 */
export function getCasesWithWrongClosedTags(caseList) {
  const wrongTagCases = caseList.filter(
    (c) => !c.isClosedTagValid
  );

  return {
    category: 'wrong_closed_tags',
    title: 'Cases with Incorrect Closure Tags',
    count: wrongTagCases.length,
    priority: wrongTagCases.length > 10 ? 'high' : wrongTagCases.length > 5 ? 'medium' : 'low',
    cases: wrongTagCases.map((c) => ({
      caseNumber: c.caseNumber,
      currentTag: c.closedTag || c.tags?.closeTags?.[0],
      suggestedTag: c.tagValidationSummary?.tagsWithImprovements?.[0]?.suggestedImprovement ||
                    c.tagValidationSummary?.tagsNeedingReplacement?.[0]?.suggestedReplacement,
      reason: c.tagValidationSummary?.tagsNeedingReplacement?.[0]?.reasoning ||
              c.tagValidationSummary?.overallAssessment?.summary,
      subject: c.caseInfo?.subject,
    })),
    actionRequired: 'Review and correct closure tags for accurate reporting',
  };
}

// ============================================================================
// 2. TOP JIRAS NOT YET CLOSED (PRIORITIZE FOR FIX)
// ============================================================================

/**
 * Get top JIRAs that are still open and affecting multiple cases
 * These should be prioritized for engineering fix
 * 
 * @param {Array} caseList - List of reviewed cases
 * @param {number} topN - Number of top JIRAs to return (default: 10)
 * @returns {Object} Summary of open JIRAs by case count
 */
export function getTopOpenJIRAsForPrioritization(caseList, topN = 10) {
  // Filter cases that have valid JIRAs
  const casesWithJira = caseList.filter(
    (c) => c.jira?.present && c.jira?.jiraDetails?.length > 0
  );

  // Group by JIRA key and count
  const jiraCountMap = {};
  
  for (const caseDetail of casesWithJira) {
    for (const jira of caseDetail.jira.jiraDetails || []) {
      // Only consider open/in-progress JIRAs
      const status = (jira.status || '').toLowerCase();
      const isOpen = !['closed', 'resolved', 'done', 'fixed'].includes(status);
      
      if (isOpen) {
        if (!jiraCountMap[jira.key]) {
          jiraCountMap[jira.key] = {
            key: jira.key,
            summary: jira.summary,
            status: jira.status,
            issueType: jira.issueType,
            components: jira.components || [],
            labels: jira.labels || [],
            caseNumbers: [],
            caseCount: 0,
          };
        }
        jiraCountMap[jira.key].caseNumbers.push(caseDetail.caseNumber);
        jiraCountMap[jira.key].caseCount += 1;
      }
    }
  }

  // Sort by case count and take top N
  const topJiras = Object.values(jiraCountMap)
    .sort((a, b) => b.caseCount - a.caseCount)
    .slice(0, topN);

  return {
    category: 'open_jiras_prioritization',
    title: 'Open JIRAs to Prioritize for Fix',
    count: topJiras.length,
    totalCasesAffected: topJiras.reduce((sum, j) => sum + j.caseCount, 0),
    priority: topJiras.length > 0 && topJiras[0].caseCount > 5 ? 'high' : 'medium',
    jiras: topJiras.map((j) => ({
      ...j,
      impactLevel: j.caseCount > 10 ? 'critical' : j.caseCount > 5 ? 'high' : 'medium',
    })),
    actionRequired: 'Escalate to engineering for prioritized fix based on customer impact',
  };
}

// ============================================================================
// 3. FIXED JIRAS - CUSTOMER NEEDS VERSION UPDATE
// ============================================================================

/**
 * Get JIRAs that are fixed but customer hasn't updated to fixed version
 * 
 * @param {Array} caseList - List of reviewed cases
 * @param {number} topN - Number of top JIRAs to return (default: 10)
 * @returns {Object} Summary of fixed JIRAs needing customer action
 */
export function getFixedJIRAsNeedingCustomerUpdate(caseList, topN = 10) {
  const casesWithFixedJira = caseList.filter(
    (c) => c.jira?.present && c.jira?.jiraDetails?.length > 0
  );

  const jiraCountMap = {};

  for (const caseDetail of casesWithFixedJira) {
    for (const jira of caseDetail.jira.jiraDetails || []) {
      const status = (jira.status || '').toLowerCase();
      const resolution = (jira.resolution || '').toLowerCase();
      
      // JIRA is fixed/closed with a fix
      const isFixed = ['closed', 'resolved', 'done'].includes(status) &&
                      ['fixed', 'done', 'resolved'].includes(resolution);
      
      if (isFixed && jira.fixVersions?.length > 0) {
        if (!jiraCountMap[jira.key]) {
          jiraCountMap[jira.key] = {
            key: jira.key,
            summary: jira.summary,
            status: jira.status,
            resolution: jira.resolution,
            fixVersions: jira.fixVersions,
            components: jira.components || [],
            caseNumbers: [],
            caseCount: 0,
            customerVersions: [],
          };
        }
        jiraCountMap[jira.key].caseNumbers.push(caseDetail.caseNumber);
        jiraCountMap[jira.key].caseCount += 1;
        
        // Track customer's current version if available
        const customerVersion = caseDetail.caseInfo?.nosVersion;
        if (customerVersion && !jiraCountMap[jira.key].customerVersions.includes(customerVersion)) {
          jiraCountMap[jira.key].customerVersions.push(customerVersion);
        }
      }
    }
  }

  const topJiras = Object.values(jiraCountMap)
    .sort((a, b) => b.caseCount - a.caseCount)
    .slice(0, topN);

  return {
    category: 'fixed_jiras_customer_update',
    title: 'Fixed JIRAs - Customer Needs Version Update',
    count: topJiras.length,
    totalCasesAffected: topJiras.reduce((sum, j) => sum + j.caseCount, 0),
    priority: topJiras.length > 0 ? 'medium' : 'low',
    jiras: topJiras.map((j) => ({
      ...j,
      recommendation: `Advise customer to upgrade to ${j.fixVersions.join(' or ')}`,
    })),
    actionRequired: 'Proactively reach out to customers to recommend upgrade',
  };
}

// ============================================================================
// 4. MISSING KB / KB NOT LINKED
// ============================================================================

/**
 * Get cases where KB is missing or not properly linked
 * 
 * @param {Array} caseList - List of reviewed cases
 * @returns {Object} Summary of KB issues
 */
export function getCasesWithMissingKB(caseList) {
  // Cases where KB should exist but doesn't
  const kbMissingCases = caseList.filter(
    (c) => c.kb && c.kb.missing
  );

  // Cases where KB exists but is not valid/relevant
  const kbNotValidCases = caseList.filter(
    (c) => c.kb?.present && !c.kb?.valid
  );

  // Cases without any KB linked
  const kbNotLinkedCases = caseList.filter(
    (c) => !c.kb?.present && !c.kb?.missing && 
           ['Customer Assistance', 'Customer Questions', 'Bug'].includes(c.bucket)
  );

  return {
    category: 'missing_kb',
    title: 'KB Articles Missing or Not Linked',
    summary: {
      kbMissing: kbMissingCases.length,
      kbNotValid: kbNotValidCases.length,
      kbNotLinked: kbNotLinkedCases.length,
      total: kbMissingCases.length + kbNotValidCases.length + kbNotLinkedCases.length,
    },
    priority: (kbMissingCases.length + kbNotValidCases.length) > 10 ? 'high' : 'medium',
    sections: {
      kbShouldExist: {
        title: 'Cases Where KB Should Exist',
        count: kbMissingCases.length,
        cases: kbMissingCases.slice(0, 20).map((c) => ({
          caseNumber: c.caseNumber,
          bucket: c.bucket,
          subject: c.caseInfo?.subject,
          product: c.caseInfo?.product,
        })),
      },
      kbNotRelevant: {
        title: 'Linked KB Not Relevant',
        count: kbNotValidCases.length,
        cases: kbNotValidCases.slice(0, 20).map((c) => ({
          caseNumber: c.caseNumber,
          linkedKB: c.kb?.article,
          reason: c.kb?.reason,
          subject: c.caseInfo?.subject,
        })),
      },
      kbNotLinked: {
        title: 'Cases Without KB Link (Should Have One)',
        count: kbNotLinkedCases.length,
        cases: kbNotLinkedCases.slice(0, 20).map((c) => ({
          caseNumber: c.caseNumber,
          bucket: c.bucket,
          subject: c.caseInfo?.subject,
        })),
      },
    },
    actionRequired: 'Link existing KBs or create new articles for common issues',
  };
}

// ============================================================================
// 5. RECOMMEND KB CREATION (GROUP SIMILAR CASES)
// ============================================================================

/**
 * Group cases without KB that could be addressed by new KB articles
 * Groups by similar product/component/issue type
 * 
 * @param {Array} caseList - List of reviewed cases
 * @param {number} minCasesForRecommendation - Minimum cases to recommend KB creation (default: 3)
 * @returns {Object} KB creation recommendations
 */
export function getKBCreationRecommendations(caseList, minCasesForRecommendation = 3) {
  // Get cases missing KB that could benefit from one
  const casesNeedingKB = caseList.filter(
    (c) => (c.kb?.missing || !c.kb?.present) &&
           ['Customer Assistance', 'Customer Questions', 'Bug'].includes(c.bucket)
  );

  // Group by product + skill/component
  const groupedCases = {};

  for (const caseDetail of casesNeedingKB) {
    const product = caseDetail.caseInfo?.product || 'Unknown';
    const skill = caseDetail.caseInfo?.skill || 'General';
    const bucket = caseDetail.bucket || 'Uncategorized';
    
    const groupKey = `${product}|${skill}|${bucket}`;
    
    if (!groupedCases[groupKey]) {
      groupedCases[groupKey] = {
        product,
        skill,
        bucket,
        cases: [],
        caseCount: 0,
        commonSubjects: [],
      };
    }

    let closureSummary = [...caseDetail.conversation].reverse().find(
      (message) => message.direction === 'outbound' && message.subject?.toLowerCase()?.includes('closure ')
    );
    closureSummary = closureSummary?.content;
    closureSummary = formatActionsForLLM(closureSummary);
    
    groupedCases[groupKey].cases.push({
      caseNumber: caseDetail.caseNumber,
      subject: caseDetail.caseInfo?.subject,
      resolutionNotes: caseDetail.resolution?.resolutionNotes,
      actionsTaken: closureSummary,
    });
    groupedCases[groupKey].caseCount += 1;
  }

  // Filter groups with enough cases and sort by count
  const filteredGroups = Object.values(groupedCases)
    .filter((g) => g.caseCount >= minCasesForRecommendation)
    .sort((a, b) => b.caseCount - a.caseCount)
    .slice(0, 15);

  // Generate recommendations with fallback titles (sync version for initial response)
  const recommendations = filteredGroups.map((group) => ({
    ...group,
    suggestedKBTitle: generateFallbackKBTitle(group).title,
    impactScore: group.caseCount,
    priority: group.caseCount > 10 ? 'high' : group.caseCount > 5 ? 'medium' : 'low',
  }));

  return {
    category: 'kb_creation_recommendations',
    title: 'Recommended KB Articles to Create',
    count: recommendations.length,
    totalCasesAddressed: recommendations.reduce((sum, r) => sum + r.caseCount, 0),
    priority: recommendations.length > 0 && recommendations[0].caseCount > 5 ? 'high' : 'medium',
    recommendations,
    // Include raw groups for async title generation
    _groupsForTitleGeneration: filteredGroups,
    actionRequired: 'Create KB articles to reduce future case volume',
  };
}

/**
 * Enhance KB recommendations with LLM-generated titles
 * Call this separately after initial summary generation for async title generation
 * 
 * @param {Object} kbRecommendations - Output from getKBCreationRecommendations
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Enhanced recommendations with LLM-generated titles
 */
export async function enhanceKBRecommendationsWithTitles(kbRecommendations, options = {}) {
  const groups = kbRecommendations._groupsForTitleGeneration || kbRecommendations.recommendations;
  
  if (!groups || groups.length === 0) {
    return kbRecommendations;
  }

  const enhancedGroups = await generateKBTitlesForGroups(groups, options);
  
  return {
    ...kbRecommendations,
    recommendations: enhancedGroups.map((group) => ({
      product: group.product,
      skill: group.skill,
      bucket: group.bucket,
      caseCount: group.caseCount,
      cases: group.cases,
      suggestedKB: group.suggestedKB,
      suggestedKBTitle: group.suggestedKB?.title || group.suggestedKBTitle,
      impactScore: group.caseCount,
      priority: group.caseCount > 10 ? 'high' : group.caseCount > 5 ? 'medium' : 'low',
    })),
    titlesGenerated: true,
  };
}

/**
 * Generate a suggested KB title based on grouped cases using LLM
 * 
 * @param {Object} group - Group of cases with product, skill, bucket, and cases array
 * @returns {Promise<Object>} Generated KB title and metadata
 */
async function generateSuggestedKBTitle(group) {
  const { product, skill, bucket, cases } = group;
  
  // Fallback title if LLM fails
  const fallbackTitle = generateFallbackKBTitle({ product, skill, bucket });
  
  if (!cases || cases.length === 0) {
    return fallbackTitle;
  }

  try {
    const userPrompt = buildKBTitleGenerationPrompt(group);
    
    const response = await invokeLLMAPI({
      systemPrompt: KB_TITLE_GENERATION_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 512,
      temperature: 0.4, // Balanced for creativity but consistency
    });

    const parsed = parseLLMJSONResponse(response);
    
    if (parsed.title) {
      return {
        title: parsed.title,
        articleType: parsed.articleType || 'general',
        keywords: parsed.keywords || [],
        summary: parsed.summary || '',
        generated: true,
      };
    }
    
    // Try to extract title from text response
    const textTitle = extractTitleFromText(response.text || response.content);
    if (textTitle) {
      return {
        title: textTitle,
        articleType: 'general',
        keywords: [],
        summary: '',
        generated: true,
        extractedFromText: true,
      };
    }

    return fallbackTitle;
  } catch (error) {
    console.error('Error generating KB title:', error.message);
    return fallbackTitle;
  }
}

/**
 * Extract title from text response if JSON parsing fails
 */
function extractTitleFromText(text) {
  if (!text) return null;
  
  // Look for title patterns
  const patterns = [
    /title["\s:]+["']?([^"'\n]{10,100})["']?/i,
    /"([^"]{10,100})"/,
    /^([A-Z][^.!?\n]{10,100})/m,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Generate a fallback KB title without LLM
 */
function generateFallbackKBTitle({ product, skill, bucket }) {
  let prefix;
  
  switch (bucket) {
    case 'Customer Questions':
      prefix = 'FAQ:';
      break;
    case 'Customer Assistance':
      prefix = 'How to Configure';
      break;
    case 'Bug':
      prefix = 'Known Issue:';
      break;
    case 'Improvement':
      prefix = 'Feature Guide:';
      break;
    default:
      prefix = 'Guide:';
  }
  
  return {
    title: `${prefix} ${product} - ${skill}`,
    articleType: bucket === 'Bug' ? 'known_issue' : 'general',
    keywords: [product, skill].filter(Boolean),
    summary: '',
    generated: false,
  };
}

/**
 * Generate KB titles for multiple groups in batch
 * 
 * @param {Array} groups - Array of case groups
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} Array of groups with generated titles
 */
export async function generateKBTitlesForGroups(groups, options = {}) {
  const { batchSize = 3, delayBetweenBatches = 1000 } = options;
  const results = [];

  for (let i = 0; i < groups.length; i += batchSize) {
    const batch = groups.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (group) => {
        const kbTitle = await generateSuggestedKBTitle(group);
        return {
          ...group,
          suggestedKB: kbTitle,
        };
      })
    );
    
    results.push(...batchResults);
    
    // Delay between batches to avoid rate limiting
    if (i + batchSize < groups.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

// ============================================================================
// 6. BUGS/IMPROVEMENTS WITHOUT JIRA
// ============================================================================

/**
 * Get cases classified as Bug/Improvement that don't have a JIRA
 * These need JIRA creation for tracking
 * 
 * @param {Array} caseList - List of reviewed cases
 * @returns {Object} Summary of cases needing JIRA creation
 */
export function getCasesNeedingJIRACreation(caseList) {
  const casesNeedingJira = caseList.filter(
    (c) => ['Bug', 'Improvement'].includes(c.bucket) &&
           (!c.jira?.present || c.identifiers?.includes('jira_missing'))
  );

  // Group by product/component for easier processing
  const groupedByProduct = {};
  
  for (const caseDetail of casesNeedingJira) {
    const product = caseDetail.caseInfo?.product || 'Unknown';
    
    if (!groupedByProduct[product]) {
      groupedByProduct[product] = {
        product,
        bugs: [],
        improvements: [],
        totalCount: 0,
      };
    }
    
    const caseInfo = {
      caseNumber: caseDetail.caseNumber,
      subject: caseDetail.caseInfo?.subject,
      skill: caseDetail.caseInfo?.skill,
      description: caseDetail.caseInfo?.description?.substring(0, 200),
      priority: caseDetail.caseInfo?.priority,
    };
    
    if (caseDetail.bucket === 'Bug') {
      groupedByProduct[product].bugs.push(caseInfo);
    } else {
      groupedByProduct[product].improvements.push(caseInfo);
    }
    groupedByProduct[product].totalCount += 1;
  }

  const productGroups = Object.values(groupedByProduct)
    .sort((a, b) => b.totalCount - a.totalCount);

  return {
    category: 'jira_creation_needed',
    title: 'Bugs/Improvements Without JIRA',
    summary: {
      totalBugs: casesNeedingJira.filter((c) => c.bucket === 'Bug').length,
      totalImprovements: casesNeedingJira.filter((c) => c.bucket === 'Improvement').length,
      total: casesNeedingJira.length,
    },
    priority: casesNeedingJira.length > 10 ? 'high' : casesNeedingJira.length > 5 ? 'medium' : 'low',
    byProduct: productGroups,
    actionRequired: 'Create JIRA tickets for tracking and engineering prioritization',
  };
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate complete action summary for a list of reviewed cases
 * 
 * @param {Array} caseList - List of reviewed cases
 * @param {Object} options - Configuration options
 * @returns {Object} Complete action summary with all categories
 */
export async function generateActionSummary(caseList, options = {}) {
  const { topN = 10, minCasesForKB = 3 } = options;

  const summary = {
    // 1. Wrong closed tags
    wrongClosedTags: getCasesWithWrongClosedTags(caseList),
    
    // 2. Open JIRAs to prioritize
    openJirasPrioritization: getTopOpenJIRAsForPrioritization(caseList, topN),
    
    // 3. Fixed JIRAs - customer update needed
    fixedJirasCustomerUpdate: getFixedJIRAsNeedingCustomerUpdate(caseList, topN),
    
    // 4. Missing KB issues
    missingKB: getCasesWithMissingKB(caseList),
    
    // 5. KB creation recommendations
    kbCreationRecommendations: getKBCreationRecommendations(caseList, minCasesForKB),
    
    // 6. Cases needing JIRA creation
    jiraCreationNeeded: getCasesNeedingJIRACreation(caseList),
  };

  // Generate overall priority actions
  summary.topPriorityActions = await generateTopPriorityActions(summary);

  return summary;
}

/**
 * Generate top priority actions across all categories
 */
async function generateTopPriorityActions(summary) {
  const actions = [];

  // High priority actions
  if (summary.wrongClosedTags.count > 10) {
    actions.push({
      priority: 'high',
      category: 'wrong_closed_tags',
      action: `Review ${summary.wrongClosedTags.count} cases with incorrect closure tags`,
      cases: summary.wrongClosedTags.count,
    });
  }

  if (summary.openJirasPrioritization.jiras.length > 0) {
    const topJira = summary.openJirasPrioritization.jiras[0];
    actions.push({
      priority: 'high',
      category: 'open_jiras',
      action: `Prioritize JIRA ${topJira.key} affecting ${topJira.caseCount} cases`,
      cases: topJira.caseCount,
    });
  }

  if (summary.jiraCreationNeeded.summary.total > 5) {
    actions.push({
      priority: 'high',
      category: 'jira_creation',
      action: `Create JIRAs for ${summary.jiraCreationNeeded.summary.totalBugs} bugs and ${summary.jiraCreationNeeded.summary.totalImprovements} improvements`,
      cases: summary.jiraCreationNeeded.summary.total,
    });
  }

  if (summary.kbCreationRecommendations.recommendations.length > 0) {
    const topRec = summary.kbCreationRecommendations.recommendations[0];
    const kbTitleResult = await generateSuggestedKBTitle(topRec);
    const kbTitle = kbTitleResult.title || topRec.suggestedKBTitle;
    actions.push({
      priority: 'medium',
      category: 'kb_creation',
      action: `Create KB for "${kbTitle}" (${topRec.caseCount} cases)`,
      cases: topRec.caseCount,
      suggestedKB: kbTitleResult,
    });
  }

  if (summary.fixedJirasCustomerUpdate.jiras.length > 0) {
    actions.push({
      priority: 'medium',
      category: 'customer_update',
      action: `Notify ${summary.fixedJirasCustomerUpdate.totalCasesAffected} customers about available fixes`,
      cases: summary.fixedJirasCustomerUpdate.jiras.length,
    });
  }

  return actions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateActionSummary,
  getCasesWithWrongClosedTags,
  getTopOpenJIRAsForPrioritization,
  getFixedJIRAsNeedingCustomerUpdate,
  getCasesWithMissingKB,
  getKBCreationRecommendations,
  getCasesNeedingJIRACreation,
  generateKBTitlesForGroups,
  enhanceKBRecommendationsWithTitles,
};
