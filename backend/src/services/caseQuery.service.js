import { query } from '../config/postgres.js';

// Internal email domains to filter out internal conversations
const INTERNAL_DOMAINS = ['@nutanix.com', '@support_case@'];

// Event type categories for better understanding
const EVENT_TYPE_CATEGORIES = {
  lifecycle: ['Case Creation', 'Case Closure', 'Stale Case Reset'],
  ownership: ['Owner Change', 'Handoff Approved', 'Handoff Pending for Review', 'Handoff Rejected'],
  escalation: ['Escalation', 'De-Escalation', 'Acknowledged'],
  automation: ['Discovery', 'Predicted', 'Snoozed', 'Dismissed'],
  exceptions: ['Expired Asset Exception', 'Uplift Exception'],
  attachments: ['Case Attachment'],
};

/**
 * Check if an email is internal (between Nutanix employees)
 */
function isInternalEmail(email) {
  const from = (email.fromaddress || '').toLowerCase();
  const to = (email.toaddress || '').toLowerCase();
  
  // If both from and to are internal, it's internal conversation
  const fromInternal = INTERNAL_DOMAINS.some(domain => from.includes(domain.toLowerCase()));
  const toInternal = INTERNAL_DOMAINS.some(domain => to.includes(domain.toLowerCase()));
  
  // Internal if: from internal AND to internal AND not incoming from customer
  // Keep emails where customer is involved
  if (fromInternal && toInternal && !email.incoming) {
    return true;
  }
  
  return false;
}

/**
 * Check if a comment is internal
 */
function isInternalComment(comment) {
  // If not public, it's internal
  if (comment.public__c === false) {
    return true;
  }
  return false;
}

/**
 * Determine if message is from customer
 */
function isCustomerMessage(email, caseData) {
  if (!email) return false;
  
  const fromAddress = (email.fromaddress || '').toLowerCase();
  const customerEmail = (caseData.contact_email__c || '').toLowerCase();
  
  // Check if incoming and from customer domain
  if (email.incoming) {
    // If from address matches customer email
    if (customerEmail && fromAddress.includes(customerEmail.split('@')[0])) {
      return true;
    }
    // If not from nutanix domain, likely customer
    if (!INTERNAL_DOMAINS.some(domain => fromAddress.includes(domain.toLowerCase()))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Fetch complete case details including conversations, tags, resolution, and metrics
 * @param {string} caseNumber - The case number (e.g., '00475706')
 * @returns {Promise<Object>} Complete case data as JSON
 */
export const getCaseDetails = async (caseNumber) => {
  // Normalize case number (remove leading zeros if needed for search)
  const normalizedCaseNumber = caseNumber.replace(/^0+/, '');
  
  // Fetch main case data
  const caseResult = await query(
    `SELECT 
      id,
      casenumber,
      subject,
      description,
      status,
      priority,
      type,
      origin,
      createddate,
      closeddate,
      isclosed,
      isescalated,
      escalated__c,
      escalated_date__c,
      escalation_status__c,
      escalation_temperature__c,
      portal_escalation_reason__c,
      portal_escalation_comments__c,
      escalation_issue_summary__c,
      escalation_information__c,
      resolution__c,
      opentags__c,
      closetags__c,
      first_response_provided__c,
      relief_provided__c,
      case_age_days__c,
      response_time_hrs__c,
      case_owner__c,
      ownerid,
      contactid,
      accountid,
      contact_email__c,
      contact_txt__c,
      acct_name_text__c,
      jira_case_no__c,
      kb_article__c,
      product_type__c,
      nos_version_snapshot__c,
      serial_number__c,
      cluster_id__c,
      case_complexity__c,
      skill__c,
      support_level__c,
      thread_id__c
    FROM case2 
    WHERE casenumber = $1 
       OR casenumbershort__c = $2`,
    [caseNumber, normalizedCaseNumber]
  );

  if (caseResult.rows.length === 0) {
    throw new Error(`Case not found: ${caseNumber}`);
  }

  const caseData = caseResult.rows[0];
  const caseId = caseData.id;

  // Fetch case comments (only public/external)
  const commentsResult = await query(
    `SELECT 
      id,
      name,
      comment__c,
      commented_by__c,
      commented_by_txt__c,
      commented_on__c,
      public__c,
      comment_type__c,
      case_owner__c,
      createddate
    FROM casecomment__c 
    WHERE parent__c = $1 
      AND isdeleted = false
    ORDER BY commented_on__c ASC`,
    [caseId]
  );

  // Fetch email messages
  const emailsResult = await query(
    `SELECT 
      id,
      subject,
      fromname,
      fromaddress,
      toaddress,
      ccaddress,
      textbody,
      htmlbody,
      incoming,
      messagedate,
      hasattachment,
      status,
      createddate
    FROM emailmessage 
    WHERE parentid = $1 
      AND isdeleted = false
    ORDER BY messagedate ASC`,
    [caseId]
  );

  // Fetch case events (timeline)
  const eventsResult = await query(
    `SELECT 
      id,
      name,
      type__c,
      eventtime__c,
      eventuser__c,
      status__c,
      priority__c,
      escalated__c,
      escalation_status__c,
      case_owner_name__c,
      details__c
    FROM case_events__c 
    WHERE case__c = $1 
      AND isdeleted = false
    ORDER BY eventtime__c ASC`,
    [caseId]
  );

  // Filter out internal conversations
  const externalComments = commentsResult.rows.filter(c => !isInternalComment(c));
  const externalEmails = emailsResult.rows.filter(e => !isInternalEmail(e));

  // Build conversation timeline (merge comments and emails, external only)
  const conversation = buildConversationTimeline(
    externalComments,
    externalEmails,
    caseData
  );

  // Calculate response metrics based on customer messages
  const responseMetrics = calculateResponseMetrics(externalEmails, externalComments, caseData);

  // Categorize events
  const categorizedEvents = categorizeEvents(eventsResult.rows);

  // Build the complete JSON response
  return {
    caseInfo: {
      caseNumber: caseData.casenumber,
      caseId: caseData.id,
      subject: caseData.subject,
      description: caseData.description,
      status: caseData.status,
      priority: caseData.priority,
      type: caseData.type,
      origin: caseData.origin,
      isClosed: caseData.isclosed,
      createdDate: caseData.createddate,
      closedDate: caseData.closeddate,
      caseAgeDays: caseData.case_age_days__c,
      complexity: caseData.case_complexity__c,
      product: caseData.product_type__c,
      nosVersion: caseData.nos_version_snapshot__c,
      serialNumber: caseData.serial_number__c,
      clusterId: caseData.cluster_id__c,
      skill: caseData.skill__c,
      supportLevel: caseData.support_level__c,
      jiraCase: caseData.jira_case_no__c,
      kbArticle: caseData.kb_article__c,
    },

    customer: {
      accountName: caseData.acct_name_text__c,
      contactName: caseData.contact_txt__c,
      contactEmail: caseData.contact_email__c,
      accountId: caseData.accountid,
      contactId: caseData.contactid,
    },

    ownership: {
      currentOwner: caseData.case_owner__c,
      ownerId: caseData.ownerid,
      threadId: caseData.thread_id__c,
    },

    tags: {
      openTags: parseTags(caseData.opentags__c),
      closeTags: parseTags(caseData.closetags__c),
    },

    resolution: {
      resolutionNotes: caseData.resolution__c,
      firstResponseProvided: caseData.first_response_provided__c,
      reliefProvided: caseData.relief_provided__c,
    },

    escalation: {
      isEscalated: caseData.isescalated || caseData.escalated__c,
      escalatedDate: caseData.escalated_date__c,
      escalationStatus: caseData.escalation_status__c,
      escalationTemperature: caseData.escalation_temperature__c,
      portalEscalationReason: caseData.portal_escalation_reason__c,
      portalEscalationComments: caseData.portal_escalation_comments__c,
      escalationIssueSummary: caseData.escalation_issue_summary__c,
      escalationInformation: caseData.escalation_information__c,
    },

    responseMetrics: responseMetrics,

    timeline: {
      events: eventsResult.rows.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type__c,
        category: getEventCategory(e.type__c),
        timestamp: e.eventtime__c,
        status: e.status__c,
        priority: e.priority__c,
        escalated: e.escalated__c,
        escalationStatus: e.escalation_status__c,
        owner: e.case_owner_name__c,
        details: e.details__c,
      })),
      categorized: categorizedEvents,
      totalEvents: eventsResult.rows.length,
    },

    conversation: conversation,

    metadata: {
      generatedAt: new Date().toISOString(),
      totalComments: commentsResult.rows.length,
      totalEmails: emailsResult.rows.length,
      totalEvents: eventsResult.rows.length,
      externalComments: externalComments.length,
      externalEmails: externalEmails.length,
      filteredInternalComments: commentsResult.rows.length - externalComments.length,
      filteredInternalEmails: emailsResult.rows.length - externalEmails.length,
    },
  };
};

/**
 * Get event category
 */
function getEventCategory(eventType) {
  for (const [category, types] of Object.entries(EVENT_TYPE_CATEGORIES)) {
    if (types.includes(eventType)) {
      return category;
    }
  }
  return 'other';
}

/**
 * Categorize events by type
 */
function categorizeEvents(events) {
  const categorized = {
    lifecycle: [],
    ownership: [],
    escalation: [],
    automation: [],
    exceptions: [],
    attachments: [],
    other: [],
  };

  events.forEach(event => {
    const category = getEventCategory(event.type__c);
    categorized[category].push({
      type: event.type__c,
      timestamp: event.eventtime__c,
      status: event.status__c,
      owner: event.case_owner_name__c,
    });
  });

  return categorized;
}

/**
 * Build a unified conversation timeline from comments and emails
 * Filters internal conversations and orders chronologically
 */
function buildConversationTimeline(comments, emails, caseData) {
  const timeline = [];
  const customerEmail = (caseData.contact_email__c || '').toLowerCase();

  // Add comments to timeline
  comments.forEach(comment => {
    const direction = determineCommentDirection(comment, caseData);
    timeline.push({
      type: 'comment',
      id: comment.id,
      timestamp: comment.commented_on__c || comment.createddate,
      author: comment.commented_by_txt__c || 'Unknown',
      authorId: comment.commented_by__c,
      isPublic: comment.public__c,
      content: comment.comment__c,
      direction: direction,
      isCustomer: direction === 'inbound',
    });
  });

  // Add emails to timeline
  emails.forEach(email => {
    const fromAddress = (email.fromaddress || '').toLowerCase();
    const isFromCustomer = email.incoming && 
      (customerEmail && fromAddress.includes(customerEmail.split('@')[0]) ||
       !INTERNAL_DOMAINS.some(d => fromAddress.includes(d.toLowerCase())));
    
    timeline.push({
      type: 'email',
      id: email.id,
      timestamp: email.messagedate || email.createddate,
      subject: email.subject,
      from: {
        name: email.fromname,
        address: email.fromaddress,
      },
      to: email.toaddress,
      cc: email.ccaddress,
      content: email.textbody || stripHtml(email.htmlbody),
      contentPreview: truncateContent(email.textbody || stripHtml(email.htmlbody), 500),
      hasAttachment: email.hasattachment,
      direction: email.incoming ? 'inbound' : 'outbound',
      isCustomer: isFromCustomer,
    });
  });

  // Sort by timestamp
  timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Add sequence numbers and calculate time gaps
  let prevTimestamp = null;
  return timeline.map((item, index) => {
    const currentTime = new Date(item.timestamp);
    const timeSincePrevious = prevTimestamp 
      ? (currentTime - prevTimestamp) / (1000 * 60 * 60) // Hours
      : null;
    prevTimestamp = currentTime;
    
    return {
      sequence: index + 1,
      ...item,
      timeSincePreviousHours: timeSincePrevious ? parseFloat(timeSincePrevious.toFixed(2)) : null,
    };
  });
}

/**
 * Truncate content for preview
 */
function truncateContent(content, maxLength) {
  if (!content) return null;
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}

/**
 * Determine if a comment is from customer or support
 */
function determineCommentDirection(comment, caseData) {
  // If the commenter is the case contact, it's inbound
  if (comment.commented_by__c === caseData.contactid) {
    return 'inbound';
  }
  
  const authorLower = (comment.commented_by_txt__c || '').toLowerCase();
  
  // If author contains customer-related keywords, likely inbound
  if (authorLower.includes('customer') || 
      authorLower.includes('portal') ||
      authorLower.includes('contact')) {
    return 'inbound';
  }
  
  // If author contains support/nutanix keywords, outbound
  if (authorLower.includes('nutanix') || 
      authorLower.includes('support') ||
      authorLower.includes('engineer')) {
    return 'outbound';
  }
  
  // Default to outbound (support response)
  return 'outbound';
}

/**
 * Calculate response time metrics based on customer messages
 * Measures time from customer message to next support response
 */
function calculateResponseMetrics(emails, comments, caseData) {
  const customerEmail = (caseData.contact_email__c || '').toLowerCase();
  const responseTimes = [];
  const responseDetails = [];
  
  // Build timeline with proper direction detection
  const allComms = [];
  
  // Add emails with proper customer detection
  emails.forEach(e => {
    const fromAddress = (e.fromaddress || '').toLowerCase();
    const isFromCustomer = e.incoming && 
      (customerEmail && fromAddress.includes(customerEmail.split('@')[0]) ||
       !INTERNAL_DOMAINS.some(d => fromAddress.includes(d.toLowerCase())));
    
    allComms.push({
      timestamp: new Date(e.messagedate || e.createddate),
      direction: isFromCustomer ? 'customer' : 'support',
      type: 'email',
      from: e.fromaddress,
      subject: e.subject,
    });
  });
  
  // Add comments
  comments.forEach(c => {
    const direction = determineCommentDirection(c, caseData);
    allComms.push({
      timestamp: new Date(c.commented_on__c || c.createddate),
      direction: direction === 'inbound' ? 'customer' : 'support',
      type: 'comment',
      author: c.commented_by_txt__c,
    });
  });
  
  // Sort by timestamp
  allComms.sort((a, b) => a.timestamp - b.timestamp);

  // Calculate time between customer message and next support response
  let lastCustomerMessage = null;
  
  for (const comm of allComms) {
    if (comm.direction === 'customer') {
      lastCustomerMessage = comm;
    } else if (lastCustomerMessage && comm.direction === 'support') {
      const responseTimeHours = (comm.timestamp - lastCustomerMessage.timestamp) / (1000 * 60 * 60);
      responseTimes.push(responseTimeHours);
      
      responseDetails.push({
        customerMessageAt: lastCustomerMessage.timestamp.toISOString(),
        supportResponseAt: comm.timestamp.toISOString(),
        responseTimeHours: parseFloat(responseTimeHours.toFixed(2)),
        customerMessageType: lastCustomerMessage.type,
        supportResponseType: comm.type,
      });
      
      lastCustomerMessage = null; // Reset after response
    }
  }

  // Calculate statistics
  const customerMessages = allComms.filter(c => c.direction === 'customer');
  const supportMessages = allComms.filter(c => c.direction === 'support');
  
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : null;
  
  const minResponseTime = responseTimes.length > 0
    ? Math.min(...responseTimes)
    : null;
  
  const maxResponseTime = responseTimes.length > 0
    ? Math.max(...responseTimes)
    : null;
  
  // Calculate median
  const sortedTimes = [...responseTimes].sort((a, b) => a - b);
  const medianResponseTime = sortedTimes.length > 0
    ? sortedTimes.length % 2 === 0
      ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
      : sortedTimes[Math.floor(sortedTimes.length / 2)]
    : null;

  return {
    avgResponseTimeHours: avgResponseTime ? parseFloat(avgResponseTime.toFixed(2)) : null,
    medianResponseTimeHours: medianResponseTime ? parseFloat(medianResponseTime.toFixed(2)) : null,
    minResponseTimeHours: minResponseTime ? parseFloat(minResponseTime.toFixed(2)) : null,
    maxResponseTimeHours: maxResponseTime ? parseFloat(maxResponseTime.toFixed(2)) : null,
    totalCustomerMessages: customerMessages.length,
    totalSupportResponses: supportMessages.length,
    totalResponsesCounted: responseTimes.length,
    responseTimesHours: responseTimes.map(t => parseFloat(t.toFixed(2))),
    responseDetails: responseDetails,
  };
}

/**
 * Parse comma-separated tags into array
 */
function parseTags(tagsString) {
  if (!tagsString) return [];
  return tagsString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html) {
  if (!html) return null;
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Search for cases by various criteria
 */
export const searchCases = async (options = {}) => {
  const {
    status = 'Closed',
    limit = 10,
    offset = 0,
    priority,
    product,
    dateFrom,
    dateTo,
  } = options;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (status) {
    whereClause += ` AND status = $${paramIndex++}`;
    params.push(status);
  }

  if (priority) {
    whereClause += ` AND priority = $${paramIndex++}`;
    params.push(priority);
  }

  if (product) {
    whereClause += ` AND product_type__c ILIKE $${paramIndex++}`;
    params.push(`%${product}%`);
  }

  if (dateFrom) {
    whereClause += ` AND createddate >= $${paramIndex++}`;
    params.push(dateFrom);
  }

  if (dateTo) {
    whereClause += ` AND createddate <= $${paramIndex++}`;
    params.push(dateTo);
  }

  const result = await query(
    `SELECT 
      casenumber,
      subject,
      status,
      priority,
      createddate,
      closeddate,
      case_owner__c,
      product_type__c
    FROM case2 
    ${whereClause}
    ORDER BY createddate DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );

  return result.rows;
};

export default {
  getCaseDetails,
  searchCases,
};
