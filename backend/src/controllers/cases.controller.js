import { Case } from '../models/index.js';
import CaseDetails from '../models/CaseDetails.model.js';
import { generateMockCases } from '../utils/dataSimulator.js';

/**
 * Get cases by report ID
 */
export const getByReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Handle demo/mock IDs
    if (id.startsWith('demo-')) {
      const mockCases = generateMockCases(15);
      return res.json(mockCases);
    }
    
    const cases = await Case.find({ reportId: id }).sort({ createdAt: -1 });
    
    // If no cases, return mock data
    if (cases.length === 0) {
      const mockCases = generateMockCases(15);
      return res.json(mockCases);
    }
    
    res.json(cases);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single case by ID
 */
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Handle demo/mock IDs
    if (id.startsWith('case-')) {
      const mockCases = generateMockCases(1);
      mockCases[0].id = id;
      return res.json(mockCases[0]);
    }
    
    const caseItem = await Case.findById(id);
    
    if (!caseItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Case not found',
      });
    }
    
    res.json(caseItem);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a case
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Handle demo/mock IDs
    if (id.startsWith('case-')) {
      const mockCases = generateMockCases(1);
      return res.json({ ...mockCases[0], ...updates, id });
    }
    
    const caseItem = await Case.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!caseItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Case not found',
      });
    }
    
    res.json(caseItem);
  } catch (error) {
    next(error);
  }
};

/**
 * Search cases
 */
export const search = async (req, res, next) => {
  try {
    const { q, status, priority, reportId } = req.query;
    
    const query = {};
    
    if (reportId) query.reportId = reportId;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { caseNumber: { $regex: q, $options: 'i' } },
      ];
    }
    
    const cases = await Case.find(query).sort({ createdAt: -1 }).limit(100);
    
    res.json(cases);
  } catch (error) {
    next(error);
  }
};

/**
 * Transform a case-details document into the minimal shape required by the CaseList page.
 * Fields returned: caseNumber, subject/title, bucket, closedTag, kbArticle, jiraTicket,
 * and the validation flags for KB/JIRA/Closed Tag.
 */
const toCaseListDto = (item) => {
  const caseInfo = item.caseInfo || {};

  const closedTagValue =
    item.tags?.closeTags?.[0] ||
    caseInfo.closetags__c ||
    caseInfo.closedTags ||
    item.closedTag ||
    null;

  const kbValue =
    caseInfo.kbArticle ||
    caseInfo.kb_article__c ||
    item.kbArticle ||
    null;

  const jiraValue =
    caseInfo.jiraCase ||
    caseInfo.jira_case_no__c ||
    item.jiraTicket ||
    null;

  const normalizeStatus = (details = {}) => {
    if (details?.missing) return { status: 'missing', reason: '' };
    if (details?.valid) return { status: 'valid', reason: '' };
    if (details && details.valid === false) return { status:'wrong', reason: details.reason };
  };

  // Build issues array from validation summary
  const issues = [];
  if (item.tagValidationSummary?.tagsWithImprovements?.length > 0) {
    issues.push(...item.tagValidationSummary.tagsWithImprovements.map(t => t.suggestedImprovement));
  }
  if (item.kb?.valid === false) issues.push('KB validation issue');
  if (item.jira?.valid === false) issues.push('JIRA validation issue');
  if (item.isClosedTagValid === false) issues.push('Closed tag validation issue');

  return {
    id: item._id?.toString(),
    caseNumber: caseInfo.caseNumber || item.caseNumber || '',
    title: caseInfo.subject || item.title || '',
    bucket: item.bucket || caseInfo.bucket || 'Uncategorized',
    closedTag: {
      value: closedTagValue,
      status: item.isClosedTagValid ? 'valid' : 'wrong',
      suggestedValue: item.tagValidationSummary || null,
    },
    kbArticle: {
      value: kbValue,
      status: normalizeStatus(item.kb?.status),
      reason: normalizeStatus(item.kb?.reason),
      suggestedValue: item.recommendedKB || null,
    },
    jiraTicket: {
      value: jiraValue,
      status: normalizeStatus(item.jira?.status),
      reason: normalizeStatus(item.jira?.reason),
      suggestedValue: item.recommendedJIRA || null,
    },
    issues,
    isKBValid: item.kb?.valid,
    isJIRAValid: item.jira?.valid,
    isClosedTagValid: item.isClosedTagValid,
  };
};

/**
 * Get all cases from the case-details collection (normalized for the CaseList page)
 */
export const getAllCaseDetails = async (_req, res, next) => {
  try {
    console.log('[getAllCaseDetails] Fetching all cases from case-details collection...');
    const cases = await CaseDetails.find({}).lean();
    console.log(`[getAllCaseDetails] Found ${cases.length} cases`);
    if (cases.length > 0) {
      console.log('[getAllCaseDetails] Sample case:', JSON.stringify(cases[0], null, 2).substring(0, 500));
    }
    const normalized = cases.map(toCaseListDto);
    console.log(`[getAllCaseDetails] Returning ${normalized.length} normalized cases`);
    res.json(normalized);
  } catch (error) {
    console.error('[getAllCaseDetails] Error:', error);
    next(error);
  }
};

/**
 * Get full case details by case number from case-details collection
 * Returns all fields needed for the CaseDetail page
 */
export const getCaseDetailsByCaseNumber = async (req, res, next) => {
  try {
    const { caseNumber } = req.params;
    
    console.log(`[getCaseDetailsByCaseNumber] Fetching case: ${caseNumber}`);
    
    const caseDoc = await CaseDetails.findOne({ caseNumber }).lean();
    
    if (!caseDoc) {
      console.log(`[getCaseDetailsByCaseNumber] Case not found: ${caseNumber}`);
      // Return default/standard values if not found
      return res.json(getDefaultCaseDetails(caseNumber));
    }
    
    const normalized = normalizeCaseDetails(caseDoc);
    console.log(`[getCaseDetailsByCaseNumber] Found case: ${caseNumber}`);
    
    res.json(normalized);
  } catch (error) {
    console.error('[getCaseDetailsByCaseNumber] Error:', error);
    next(error);
  }
};

/**
 * Normalize a case-details document to the shape expected by the frontend CaseDetail page
 */
const normalizeCaseDetails = (doc) => {
  const caseInfo = doc.caseInfo || {};
  const customer = doc.customer || {};
  const ownership = doc.ownership || {};
  const resolution = doc.resolution || {};
  const escalation = doc.escalation || {};
  const responseMetrics = doc.responseMetrics || {};
  const tags = doc.tags || {};
  const timeline = doc.timeline || {};
  const tagValidationSummary = doc.tagValidationSummary || {};

  // Helper to determine validation status
  const normalizeValidationStatus = (flag) => {
    if (flag === true) return 'valid';
    if (flag === false) return 'wrong';
    return 'missing';
  };

  // Extract values
  const closedTagValue = tags.closeTags?.[0] || null;
  const kbValue = caseInfo.kbArticle || null;
  const jiraValue = caseInfo.jiraCase || null;

  // Get suggested tag from validation summary
  const suggestedTag = 
    tagValidationSummary.tagsNeedingReplacement?.[0]?.suggestedReplacement ||
    tagValidationSummary.tagsWithImprovements?.[0]?.suggestedImprovement ||
    null;

  const tagReason = 
    tagValidationSummary.tagsNeedingReplacement?.[0]?.reasoning ||
    tagValidationSummary.overallAssessment?.summary ||
    (doc.isClosedTagValid === false ? 'Wrong tag: Generic tag used instead of specific category' : null);

  // Build issues array from validation data
  const issues = [];
  if (tagValidationSummary.tagsNeedingReplacement?.length > 0) {
    issues.push(...tagValidationSummary.tagsNeedingReplacement.map(t => 
      `Replace tag: ${t.tag} → ${t.suggestedReplacement}`
    ));
  }
  if (tagValidationSummary.tagsWithImprovements?.length > 0) {
    issues.push(...tagValidationSummary.tagsWithImprovements.map(t => 
      `Improve tag: ${t.tag} → ${t.suggestedImprovement}`
    ));
  }
  if (doc.kb?.valid === false) issues.push('Outdated KB article');
  if (doc.jira?.valid === false) issues.push('No JIRA ticket attached');
  if (doc.isClosedTagValid === false) issues.push('Closed tag validation issue');

  // Generate actionsTaken from conversation history (support responses with meaningful content)
  const actionsTaken = extractActionsTaken(doc.conversation || []);

  // Generate identifiedActions from validation issues
  const identifiedActions = generateIdentifiedActions(doc, caseInfo, tags, tagValidationSummary);

  // Generate NXpert summary from case data
  const nxpertSummary = generateNXpertSummary(doc, caseInfo, tagValidationSummary);

  return {
    // Core identifiers
    id: doc._id?.toString(),
    caseNumber: caseInfo.caseNumber || doc.caseNumber || '',
    caseId: caseInfo.caseId || '',
    
    // Basic info
    title: caseInfo.subject || '',
    description: caseInfo.description || '',
    status: caseInfo.status || 'Unknown',
    priority: caseInfo.priority || 'P4 - Low',
    type: caseInfo.type || '',
    origin: caseInfo.origin || '',
    complexity: caseInfo.complexity || '',
    product: caseInfo.product || '',
    skill: caseInfo.skill || '',
    supportLevel: caseInfo.supportLevel || '',
    
    // Dates
    createdAt: caseInfo.createdDate || doc.createdAt || null,
    closedAt: caseInfo.closedDate || doc.closedAt || null,
    caseAgeDays: caseInfo.caseAgeDays || null,
    isClosed: caseInfo.isClosed || false,
    
    // Technical details
    aosVersion: caseInfo.nosVersion || 'N/A',
    hypervisorVersion: caseInfo.hypervisorVersion || 'N/A',
    pcVersion: caseInfo.product || 'N/A',
    serialNumber: caseInfo.serialNumber || '',
    clusterId: caseInfo.clusterId || '',
    
    // Customer info
    accountName: customer.accountName || 'Unknown Account',
    contactName: customer.contactName || '',
    contactEmail: customer.contactEmail || '',
    accountId: customer.accountId || '',
    contactId: customer.contactId || '',
    
    // Ownership
    owner: ownership.currentOwner || 'Unassigned',
    ownerId: ownership.ownerId || '',
    threadId: ownership.threadId || '',
    
    // Bucket and tags
    bucket: doc.bucket || 'Uncategorized',
    openTags: tags.openTags || [],
    closeTags: tags.closeTags || [],
    
    // Validation objects for UI components (KB, JIRA, Closure Tag cards)
    closedTag: {
      value: closedTagValue,
      status: normalizeValidationStatus(doc.isClosedTagValid, closedTagValue),
      suggestedValue: suggestedTag,
      reason: tagReason,
    },
    kbArticle: {
      value: kbValue,
      status: normalizeValidationStatus(doc.kb?.valid),
      suggestedValue: null,
      reason: kbValue
        ? (doc.isKBValid === false ? 'Outdated: KB does not apply to current version' : 'Valid KB article attached')
        : 'No KB article attached',
    },
    jiraTicket: {
      value: jiraValue,
      status: normalizeValidationStatus(doc.jira?.valid),
      suggestedValue: null,
      reason: jiraValue
        ? (doc.isJIRAValid === false ? 'JIRA ticket validation issue' : 'Valid JIRA ticket attached')
        : 'No JIRA ticket attached',
    },
    
    // Validation flags
    isKBValid: doc.kb?.valid ?? null,
    isJIRAValid: doc.jira?.valid ?? null,
    isClosedTagValid: doc.isClosedTagValid ?? null,
    
    // Validation summary
    tagValidationSummary: {
      hasImprovements: tagValidationSummary.hasImprovements || false,
      summary: tagValidationSummary.summary || {},
      tagsNeedingReplacement: tagValidationSummary.tagsNeedingReplacement || [],
      tagsWithImprovements: tagValidationSummary.tagsWithImprovements || [],
      missingTags: tagValidationSummary.missingTags || [],
      overallAssessment: tagValidationSummary.overallAssessment || {},
    },
    
    // Issues detected (for Associated Issues card)
    issues,
    
    // NXpert Analysis Summary
    analysis: {
      summary: nxpertSummary,
    },
    
    // Actions Taken timeline (derived from conversation)
    actionsTaken,
    
    // Identified Actions table (derived from validation issues)
    identifiedActions,
    
    // Escalation info
    escalation: {
      isEscalated: escalation.isEscalated || false,
      escalatedDate: escalation.escalatedDate || null,
      escalationStatus: escalation.escalationStatus || null,
      escalationTemperature: escalation.escalationTemperature || null,
      portalEscalationReason: escalation.portalEscalationReason || null,
      escalationIssueSummary: escalation.escalationIssueSummary || null,
    },
    
    // Resolution info
    resolution: {
      resolutionNotes: resolution.resolutionNotes || null,
      firstResponseProvided: resolution.firstResponseProvided || null,
      reliefProvided: resolution.reliefProvided || null,
    },
    
    // Response metrics
    responseMetrics: {
      avgResponseTimeHours: responseMetrics.avgResponseTimeHours || null,
      medianResponseTimeHours: responseMetrics.medianResponseTimeHours || null,
      minResponseTimeHours: responseMetrics.minResponseTimeHours || null,
      maxResponseTimeHours: responseMetrics.maxResponseTimeHours || null,
      totalCustomerMessages: responseMetrics.totalCustomerMessages || 0,
      totalSupportResponses: responseMetrics.totalSupportResponses || 0,
    },
    
    // Conversation history
    conversation: (doc.conversation || []).map((msg, idx) => ({
      sequence: msg.sequence || idx + 1,
      type: msg.type || 'unknown',
      id: msg.id || '',
      timestamp: msg.timestamp || null,
      subject: msg.subject || '',
      from: msg.from || {},
      to: msg.to || '',
      cc: msg.cc || '',
      content: msg.content || '',
      contentPreview: msg.contentPreview || '',
      hasAttachment: msg.hasAttachment || false,
      direction: msg.direction || 'unknown',
      isCustomer: msg.isCustomer || false,
      author: msg.author || '',
      isPublic: msg.isPublic ?? true,
    })),
    
    // Timeline events
    timeline: {
      events: timeline.events || [],
      categorized: timeline.categorized || {},
      totalEvents: timeline.totalEvents || 0,
    },
    
    // Metadata
    source: doc.source || 'unknown',
    batchId: doc.batchId || '',
    reportId: doc.reportId || '',
    importedAt: doc.importedAt || null,
    updatedAt: doc.updatedAt || null,
  };
};

/**
 * Extract actionsTaken timeline from conversation history
 * Filters to meaningful support responses with action-oriented content
 */
const ACTION_KEYWORDS = [
  'PROBLEM DESCRIPTION',
  'ACTION PLAN',
  'PRIOR ACTIONS',
  'resolved',
  'completed',
  'provided',
  'connected',
  'followed',
  'checked',
  'verified',
  'uploaded',
  'reviewed',
];

const extractActionsTaken = (conversation) => {
  const actionsTaken = [];

  for (const msg of conversation) {
    if (msg.direction !== 'outbound' || msg.isCustomer || !msg.content) continue;

    const content = msg.content;
    const isActionMessage = ACTION_KEYWORDS.some((keyword) => content.includes(keyword));
    if (!isActionMessage) continue;

    let description = content.substring(0, 300);

    if (description.includes('PROBLEM DESCRIPTION')) {
      const actionPlanMatch = content.match(/ACTION PLAN[\s\S]*?(?=ACTION PLAN OWNER|CURRENT STATUS|$)/i);
      if (actionPlanMatch) {
        description = actionPlanMatch[0].substring(0, 300).trim();
      }
    }

    description = description
      .replace(/-{3,}/g, '')
      .replace(/\n{2,}/g, ' ')
      .trim();

    if (description.length > 10) {
      actionsTaken.push({
        timestamp: msg.timestamp,
        description: description.length > 200 ? `${description.substring(0, 200)}...` : description,
      });
    }
  }

  if (actionsTaken.length === 0) {
    const supportMessages = conversation.filter((m) => m.direction === 'outbound' && !m.isCustomer);

    if (supportMessages.length > 0) {
      const firstMsg = supportMessages[0];
      actionsTaken.push({
        timestamp: firstMsg.timestamp,
        description: 'Initial case review and triage completed.',
      });

      if (supportMessages.length > 1) {
        const lastMsg = supportMessages[supportMessages.length - 1];
        actionsTaken.push({
          timestamp: lastMsg.timestamp,
          description: 'Case resolution and closure summary provided.',
        });
      }
    }
  }

  return actionsTaken.slice(0, 10); // Limit to 10 entries
};

/**
 * Generate identifiedActions from validation issues
 */
const generateIdentifiedActions = (doc, caseInfo, tags, tagValidationSummary) => {
  const actions = [];
  let actionId = 1;

  const addAction = (actionType, currentState, recommendedChange) => {
    actions.push({
      id: `action-${doc._id}-${actionId++}`,
      actionType,
      currentState,
      recommendedChange,
      status: 'Pending',
    });
  };

  if (doc.isKBValid === false && caseInfo.kbArticle) {
    addAction('update_kb', caseInfo.kbArticle, 'Review and update KB article');
  } else if (!caseInfo.kbArticle) {
    addAction('attach_kb', 'Not attached', 'Attach relevant KB article');
  }

  if (doc.isJIRAValid === false && caseInfo.jiraCase) {
    addAction('attach_jira', caseInfo.jiraCase, 'Verify JIRA ticket relevance');
  } else if (!caseInfo.jiraCase) {
    addAction('attach_jira', 'Not attached', 'Attach relevant JIRA ticket');
  }

  if (doc.isClosedTagValid === false) {
    const currentTag = tags.closeTags?.[0] || 'Unknown';
    const suggestedTag =
      tagValidationSummary.tagsNeedingReplacement?.[0]?.suggestedReplacement ||
      tagValidationSummary.tagsWithImprovements?.[0]?.suggestedImprovement ||
      'Review closure tag';

    addAction('fix_closure_tag', currentTag, suggestedTag);
  }

  const aosVersion = caseInfo.nosVersion || '';
  if (aosVersion && aosVersion.match(/^6\.[0-4]/)) {
    addAction('software_update', `AOS ${aosVersion}`, 'Consider upgrading to latest AOS version');
  }

  return actions;
};

/**
 * Generate NXpert AI summary from case data
 */
const generateNXpertSummary = (doc, caseInfo, tagValidationSummary) => {
  const subject = caseInfo.subject || 'Unknown issue';
  const description = caseInfo.description || '';
  const closedTag = doc.tags?.closeTags?.[0] || 'Unknown';
  const status = caseInfo.status || 'Unknown';
  
  // Build a contextual summary
  let summary = `This case involves ${subject.toLowerCase()}.`;
  
  // Add description context if available
  if (description) {
    const descSnippet = description.substring(0, 150).replace(/\n/g, ' ').trim();
    summary += ` ${descSnippet}${description.length > 150 ? '...' : ''}`;
  }
  
  // Add validation issues context
  const issues = [];
  if (doc.isClosedTagValid === false) {
    const suggestedTag = tagValidationSummary.tagsNeedingReplacement?.[0]?.suggestedReplacement;
    if (suggestedTag) {
      issues.push(`closure tag should be "${suggestedTag}" instead of "${closedTag}"`);
    } else {
      issues.push('closure tag needs review');
    }
  }
  if (doc.isKBValid === false) {
    issues.push('KB article needs update');
  }
  if (!caseInfo.jiraCase) {
    issues.push('no JIRA ticket attached');
  }
  
  if (issues.length > 0) {
    summary += ` Analysis indicates: ${issues.join(', ')}.`;
  }
  
  // Add resolution context if closed
  if (status === 'Closed') {
    summary += ' Case has been resolved and closed.';
  }
  
  return summary;
};

/**
 * Return default/standard values for a case that doesn't exist
 */
const getDefaultCaseDetails = (caseNumber) => ({
  id: null,
  caseNumber: caseNumber || '',
  caseId: '',
  title: 'Case not found',
  description: 'No case details available for this case number.',
  status: 'Unknown',
  priority: 'P4 - Low',
  type: '',
  origin: '',
  complexity: '',
  product: '',
  skill: '',
  supportLevel: '',
  createdAt: new Date().toISOString(),
  closedAt: null,
  caseAgeDays: '0',
  isClosed: false,
  aosVersion: 'N/A',
  hypervisorVersion: 'N/A',
  pcVersion: 'N/A',
  serialNumber: '',
  clusterId: '',
  accountName: 'Unknown Account',
  contactName: 'Unknown Contact',
  contactEmail: '',
  accountId: '',
  contactId: '',
  owner: 'Unassigned',
  ownerId: '',
  threadId: '',
  bucket: 'Uncategorized',
  openTags: [],
  closeTags: [],
  closedTag: { 
    value: null, 
    status: 'missing', 
    suggestedValue: null, 
    reason: 'No closure tag available' 
  },
  kbArticle: { 
    value: null, 
    status: 'missing', 
    suggestedValue: null, 
    reason: 'No KB article attached' 
  },
  jiraTicket: { 
    value: null, 
    status: 'missing', 
    suggestedValue: null, 
    reason: 'No JIRA ticket attached' 
  },
  isKBValid: null,
  isJIRAValid: null,
  isClosedTagValid: null,
  tagValidationSummary: {
    hasImprovements: false,
    summary: {},
    tagsNeedingReplacement: [],
    tagsWithImprovements: [],
    missingTags: [],
    overallAssessment: {},
  },
  issues: [],
  analysis: {
    summary: 'Case details not found. Unable to provide analysis.',
  },
  actionsTaken: [],
  identifiedActions: [],
  escalation: {
    isEscalated: false,
    escalatedDate: null,
    escalationStatus: null,
    escalationTemperature: null,
    portalEscalationReason: null,
    escalationIssueSummary: null,
  },
  resolution: {
    resolutionNotes: null,
    firstResponseProvided: null,
    reliefProvided: null,
  },
  responseMetrics: {
    avgResponseTimeHours: null,
    medianResponseTimeHours: null,
    minResponseTimeHours: null,
    maxResponseTimeHours: null,
    totalCustomerMessages: 0,
    totalSupportResponses: 0,
  },
  conversation: [],
  timeline: { events: [], categorized: {}, totalEvents: 0 },
  source: 'unknown',
  batchId: '',
  reportId: '',
  importedAt: null,
  updatedAt: null,
});

export default {
  getByReport,
  getById,
  update,
  search,
  getAllCaseDetails,
  getCaseDetailsByCaseNumber,
};
