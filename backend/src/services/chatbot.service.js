import CaseDetails from '../models/CaseDetails.model.js';
import ClusteredCases from '../models/ClusteredCases.model.js';
import { invokeLLMAPI } from './llm.service.js';

// Query patterns the chatbot can handle
const QUERY_PATTERNS = {
  CASE_LOOKUP: /case\s*#?\s*(\d+)/i,
  CASE_COUNT: /(how many|count|total)\s*(cases?)?/i,
  CLUSTER_INFO: /(cluster|group|category|bucket|categories)/i,
  PRIORITY: /(critical|p1|p2|high priority|urgent)/i,
  PRODUCT: /(prism central|prism|lcm|aos|ahv|life cycle|acropolis)/i,
  SUMMARY: /(summary|overview|summarize|give me|show me all)/i,
  TOP_ISSUES: /(top|common|frequent|most|major)\s*(issues?|problems?|errors?)/i,
  RESOLUTION: /(resolution|resolved|fix|solved|how was)/i,
  CUSTOMER: /(customer|account|client)\s+(\w+)/i,
  TAG: /(tag|tags|closure tag|close tag)/i,
  TAG_DISTRIBUTION: /(top|common|most|frequent|distribution|list|all)\s*(close\s*)?tags?|(close\s*)?tags?\s*(distribution|breakdown|ranking|stats|statistics)/i,
  KB: /(kb|knowledge base|article)/i,
  JIRA: /(jira|ticket|bug|engineering)/i,
  VALIDATION: /(valid|invalid|wrong|incorrect|issue)/i,
};

/**
 * Main chat function - processes user query and returns response
 */
export const processChat = async (userMessage, conversationHistory = []) => {
  try {
    // 1. Detect query intent and fetch relevant data
    const context = await buildContext(userMessage);
    
    // 2. Build system prompt with context
    const systemPrompt = buildSystemPrompt(context);
    
    // 3. Build conversation context from history
    const historyContext = buildHistoryContext(conversationHistory);
    
    // 4. Call LLM with context
    const response = await invokeLLMAPI({
      systemPrompt: systemPrompt + historyContext,
      userPrompt: userMessage,
      maxTokens: 2048,
      temperature: 0.7,
    });
    
    return {
      content: response.content || response.text,
      context: context.type,
    };
  } catch (error) {
    console.error('Chatbot processChat error:', error);
    throw error;
  }
};

/**
 * Build context from conversation history
 */
function buildHistoryContext(history) {
  if (!history || history.length === 0) return '';
  
  const relevantHistory = history.slice(-6); // Last 6 messages
  const historyText = relevantHistory
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');
  
  return `\n\n## Recent Conversation\n${historyText}\n`;
}

/**
 * Build context based on query type - queries MongoDB
 */
async function buildContext(query) {
  const context = { type: 'general', data: null };
  const queryLower = query.toLowerCase();
  
  try {
    // Check for specific case lookup
    const caseMatch = query.match(QUERY_PATTERNS.CASE_LOOKUP);
    if (caseMatch) {
      const caseNumber = caseMatch[1];
      const caseData = await CaseDetails.findOne({ 
        $or: [
          { caseNumber: { $regex: caseNumber } },
          { 'caseInfo.caseNumber': { $regex: caseNumber } }
        ]
      }).lean();
      
      if (caseData) {
        context.type = 'case_detail';
        context.data = caseData;
        return context;
      }
    }
    
    // Check for top issues / cluster analysis
    if (QUERY_PATTERNS.TOP_ISSUES.test(queryLower) || 
        (QUERY_PATTERNS.CLUSTER_INFO.test(queryLower) && !QUERY_PATTERNS.CASE_LOOKUP.test(query))) {
      const clusterData = await ClusteredCases.findOne({}).lean();
      context.type = 'cluster_analysis';
      context.data = clusterData;
      return context;
    }
    
    // Check for summary/overview
    if (QUERY_PATTERNS.SUMMARY.test(queryLower) || QUERY_PATTERNS.CASE_COUNT.test(queryLower)) {
      const [caseCount, clusterData, sampleCases] = await Promise.all([
        CaseDetails.countDocuments(),
        ClusteredCases.findOne({}).lean(),
        CaseDetails.find({}).limit(5).lean(),
      ]);
      context.type = 'summary';
      context.data = { 
        caseCount, 
        clusters: clusterData?.summary,
        distributions: clusterData?.distributions,
        sampleCases 
      };
      return context;
    }
    
    // Check for priority-based queries
    if (QUERY_PATTERNS.PRIORITY.test(queryLower)) {
      const cases = await CaseDetails.find({
        $or: [
          { 'caseInfo.priority': { $regex: /P[12]/i } },
          { 'caseInfo.priority': { $regex: /critical/i } }
        ]
      }).limit(15).lean();
      context.type = 'priority_cases';
      context.data = cases;
      return context;
    }
    
    // Check for product-based queries
    const productMatch = queryLower.match(QUERY_PATTERNS.PRODUCT);
    if (productMatch) {
      const product = productMatch[0];
      const cases = await CaseDetails.find({
        $or: [
          { 'caseInfo.product': { $regex: product, $options: 'i' } },
          { 'caseInfo.skill': { $regex: product, $options: 'i' } }
        ]
      }).limit(15).lean();
      context.type = 'product_cases';
      context.data = { product, cases, count: cases.length };
      return context;
    }
    
    // Check for tag distribution/aggregation queries (BEFORE validation check)
    if (QUERY_PATTERNS.TAG_DISTRIBUTION.test(queryLower)) {
      // Aggregate close tags across all cases
      const allCases = await CaseDetails.find({
        'tags.closeTags': { $exists: true, $ne: [] }
      }).lean();
      
      // Count occurrences of each close tag
      const tagCounts = {};
      const tagCaseMapping = {};
      
      allCases.forEach(c => {
        const closeTags = c.tags?.closeTags || [];
        closeTags.forEach(tag => {
          if (tag) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            if (!tagCaseMapping[tag]) tagCaseMapping[tag] = [];
            tagCaseMapping[tag].push({
              caseNumber: c.caseInfo?.caseNumber || c.caseNumber,
              subject: c.caseInfo?.subject,
              bucket: c.bucket
            });
          }
        });
      });
      
      // Sort by count descending
      const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({
          tag,
          count,
          percentage: ((count / allCases.length) * 100).toFixed(1),
          cases: tagCaseMapping[tag]
        }));
      
      // Also get bucket distribution
      const bucketCounts = {};
      allCases.forEach(c => {
        const bucket = c.bucket || 'Unknown';
        bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
      });
      
      const sortedBuckets = Object.entries(bucketCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([bucket, count]) => ({
          bucket,
          count,
          percentage: ((count / allCases.length) * 100).toFixed(1)
        }));
      
      context.type = 'tag_distribution';
      context.data = { 
        totalCases: allCases.length,
        closeTags: sortedTags,
        buckets: sortedBuckets
      };
      return context;
    }
    
    // Check for validation issues - comprehensive check
    if (QUERY_PATTERNS.VALIDATION.test(queryLower) || 
        QUERY_PATTERNS.TAG.test(queryLower) ||
        QUERY_PATTERNS.KB.test(queryLower) ||
        QUERY_PATTERNS.JIRA.test(queryLower)) {
      
      // Determine what type of validation issue to look for
      const isJiraQuery = QUERY_PATTERNS.JIRA.test(queryLower);
      const isKbQuery = QUERY_PATTERNS.KB.test(queryLower);
      const isTagQuery = QUERY_PATTERNS.TAG.test(queryLower);
      
      let query = {};
      
      if (isJiraQuery) {
        // Look for cases with JIRA issues: invalid flag, missing JIRA, or error flag
        query = {
          $or: [
            { isJIRAValid: false },
            { 'caseInfo.jiraCase': null },
            { 'caseInfo.jiraCase': '' },
            { 'caseInfo.jiraCase': { $exists: false } },
            { 'jira.missing': true },
            { error: true }
          ]
        };
      } else if (isKbQuery) {
        // Look for cases with KB issues
        query = {
          $or: [
            { isKBValid: false },
            { 'caseInfo.kbArticle': null },
            { 'caseInfo.kbArticle': '' },
            { 'caseInfo.kbArticle': { $exists: false } },
            { 'kb.missing': true }
          ]
        };
      } else if (isTagQuery) {
        // Look for cases with tag issues - check detailed validation summary
        query = {
          $or: [
            { isClosedTagValid: false },
            { 'tagValidationSummary.inaccurateTags.0': { $exists: true } },
            { 'tagValidationSummary.partiallyAccurateTags.0': { $exists: true } },
            { 'tagValidationSummary.missingTags.0': { $exists: true } }
          ]
        };
      } else {
        // General validation - check all types
        query = {
          $or: [
            { isKBValid: false },
            { isJIRAValid: false },
            { isClosedTagValid: false },
            { error: true },
            { 'tagValidationSummary.inaccurateTags.0': { $exists: true } },
            { 'tagValidationSummary.missingTags.0': { $exists: true } },
            { 'caseInfo.jiraCase': null },
            { 'caseInfo.kbArticle': null }
          ]
        };
      }
      
      const cases = await CaseDetails.find(query).limit(15).lean();
      
      // Determine specific issue type for context
      let issueType = 'general';
      if (isJiraQuery) issueType = 'jira';
      else if (isKbQuery) issueType = 'kb';
      else if (isTagQuery) issueType = 'tag';
      
      context.type = 'validation_issues';
      context.data = { cases, issueType, count: cases.length };
      return context;
    }
    
    // Check for customer/account queries
    const customerMatch = query.match(QUERY_PATTERNS.CUSTOMER);
    if (customerMatch) {
      const customerName = customerMatch[2];
      const cases = await CaseDetails.find({
        'customer.accountName': { $regex: customerName, $options: 'i' }
      }).limit(15).lean();
      context.type = 'customer_cases';
      context.data = { customerName, cases, count: cases.length };
      return context;
    }
    
    // Check for resolution queries
    if (QUERY_PATTERNS.RESOLUTION.test(queryLower)) {
      const clusterData = await ClusteredCases.findOne({}).lean();
      context.type = 'resolution_patterns';
      context.data = clusterData;
      return context;
    }
    
    // Default: provide general summary with cluster data
    const [clusterData, caseCount] = await Promise.all([
      ClusteredCases.findOne({}).lean(),
      CaseDetails.countDocuments()
    ]);
    context.type = 'general';
    context.data = { 
      summary: clusterData?.summary, 
      distributions: clusterData?.distributions,
      caseCount 
    };
    
    return context;
  } catch (error) {
    console.error('Error building context:', error);
    return context;
  }
}

/**
 * Build system prompt with retrieved context
 */
function buildSystemPrompt(context) {
  const basePrompt = `You are an AI assistant for Nutanix support case analysis. 
You help users understand support cases, identify patterns, and provide actionable insights.

Guidelines:
- Be concise and professional
- Use markdown formatting for readability (headers, bullet points, bold)
- When showing case numbers, format as "Case #XXXXXXXX"
- Provide specific numbers and percentages when available
- If data is limited, acknowledge it and provide what you can
- For follow-up questions, remember the conversation context`;

  let contextSection = '';
  
  if (context.type === 'case_detail') {
    const cd = context.data;
    const caseInfo = cd?.caseInfo || {};
    const tags = cd?.tags || {};
    const customer = cd?.customer || {};
    
    contextSection = `
## Case Context - Specific Case Details
**Case Number:** ${caseInfo.caseNumber || cd?.caseNumber || 'N/A'}
**Subject:** ${caseInfo.subject || 'N/A'}
**Product:** ${caseInfo.product || 'N/A'}
**Priority:** ${caseInfo.priority || 'N/A'}
**Status:** ${caseInfo.status || 'N/A'}
**Complexity:** ${caseInfo.complexity || 'N/A'}
**Skill:** ${caseInfo.skill || 'N/A'}
**Customer:** ${customer.accountName || 'N/A'}

**Description:** 
${caseInfo.description || 'No description available'}

**Bucket/Category:** ${cd?.bucket || 'Uncategorized'}
**Open Tags:** ${tags.openTags?.join(', ') || 'None'}
**Close Tags:** ${tags.closeTags?.join(', ') || 'None'}

**References:**
- KB Article: ${caseInfo.kbArticle || 'None attached'}
- JIRA: ${caseInfo.jiraCase || 'None attached'}

**Validation Status:**
- KB Valid: ${cd?.isKBValid === true ? '✓ Valid' : cd?.isKBValid === false ? '✗ Invalid' : 'Not checked'}
- JIRA Valid: ${cd?.isJIRAValid === true ? '✓ Valid' : cd?.isJIRAValid === false ? '✗ Invalid' : 'Not checked'}
- Tag Valid: ${cd?.isClosedTagValid === true ? '✓ Valid' : cd?.isClosedTagValid === false ? '✗ Invalid' : 'Not checked'}

**Tag Validation Summary:**
${cd?.tagValidationSummary ? JSON.stringify(cd.tagValidationSummary, null, 2).substring(0, 500) : 'No validation summary'}

**KB Details:**
${cd?.kb ? JSON.stringify(cd.kb, null, 2).substring(0, 400) : 'No KB details'}

**JIRA Details:**
${cd?.jira ? JSON.stringify(cd.jira, null, 2).substring(0, 400) : 'No JIRA details'}
`;
  } else if (context.type === 'cluster_analysis') {
    const topClusters = context.data?.summary?.top_10_clusters || [];
    const distributions = context.data?.distributions || {};
    
    contextSection = `
## Cluster Analysis Context
**Total Cases:** ${context.data?.summary?.total_cases || 'N/A'}
**Total Clusters:** ${context.data?.summary?.total_clusters || 'N/A'}
**Significant Clusters:** ${context.data?.summary?.significant_clusters || 'N/A'}
**Singleton Clusters:** ${context.data?.summary?.singleton_clusters || 'N/A'}

**Cluster Size Statistics:**
- Min: ${context.data?.summary?.cluster_size_stats?.min || 'N/A'}
- Max: ${context.data?.summary?.cluster_size_stats?.max || 'N/A'}
- Mean: ${context.data?.summary?.cluster_size_stats?.mean || 'N/A'}
- Median: ${context.data?.summary?.cluster_size_stats?.median || 'N/A'}

**Top Issue Categories (Clusters):**
${topClusters.map((c, i) => `${i+1}. **${c.title}** - ${c.size} cases (Cluster ID: ${c.cluster_id})`).join('\n')}

**Product Distribution:**
${distributions.by_product?.map(p => `- ${p.product || 'Unknown'}: ${p.count} cases (${p.percentage}%)`).join('\n') || 'No data'}

**Priority Distribution:**
${distributions.by_priority?.map(p => `- ${p.priority}: ${p.count} cases (${p.percentage}%)`).join('\n') || 'No data'}

**Complexity Distribution:**
${distributions.by_complexity?.map(c => `- ${c.complexity}: ${c.count} cases (${c.percentage}%)`).join('\n') || 'No data'}
`;
  } else if (context.type === 'summary') {
    contextSection = `
## Summary Context
**Total Cases in Database:** ${context.data?.caseCount || 'N/A'}
**Total Clusters:** ${context.data?.clusters?.total_clusters || 'N/A'}
**Significant Clusters:** ${context.data?.clusters?.significant_clusters || 'N/A'}
**Cases in Significant Clusters:** ${context.data?.clusters?.cases_in_significant_clusters || 'N/A'}

**Product Distribution:**
${context.data?.distributions?.by_product?.slice(0, 5).map(p => `- ${p.product || 'Unknown'}: ${p.count} (${p.percentage}%)`).join('\n') || 'No data'}

**Priority Distribution:**
${context.data?.distributions?.by_priority?.map(p => `- ${p.priority}: ${p.count} (${p.percentage}%)`).join('\n') || 'No data'}

**Sample Cases:**
${context.data?.sampleCases?.map(c => `- Case #${c.caseNumber || c.caseInfo?.caseNumber}: ${c.caseInfo?.subject || 'No subject'}`).join('\n') || 'No cases available'}
`;
  } else if (context.type === 'priority_cases') {
    const priorityCases = context.data || [];
    contextSection = `
## High Priority Cases Context
**Found ${priorityCases.length} critical/high priority cases:**

${priorityCases.map(c => {
  const ci = c.caseInfo || {};
  return `- **Case #${ci.caseNumber || c.caseNumber}**: ${ci.subject || 'No subject'}
  - Priority: ${ci.priority}, Product: ${ci.product || 'N/A'}, Status: ${ci.status}
  - Customer: ${c.customer?.accountName || 'N/A'}`;
}).join('\n\n')}
`;
  } else if (context.type === 'product_cases') {
    const productCases = context.data?.cases || [];
    contextSection = `
## Product Cases Context
**Product:** ${context.data?.product}
**Found ${context.data?.count} cases:**

${productCases.map(c => {
  const ci = c.caseInfo || {};
  return `- **Case #${ci.caseNumber || c.caseNumber}**: ${ci.subject || 'No subject'}
  - Priority: ${ci.priority}, Status: ${ci.status}, Bucket: ${c.bucket || 'N/A'}`;
}).join('\n\n')}
`;
  } else if (context.type === 'tag_distribution') {
    const closeTags = context.data?.closeTags || [];
    const buckets = context.data?.buckets || [];
    const totalCases = context.data?.totalCases || 0;
    
    contextSection = `
## Close Tag Distribution Context
**Total Cases with Close Tags:** ${totalCases}

### Top Close Tags (by frequency):
| Rank | Tag | Count | % of Cases |
|------|-----|-------|------------|
${closeTags.slice(0, 15).map((t, i) => `| ${i + 1} | ${t.tag} | ${t.count} | ${t.percentage}% |`).join('\n')}

### Close Tags with Case Details:
${closeTags.slice(0, 10).map(t => `
**${t.tag}** (${t.count} cases, ${t.percentage}%):
${t.cases?.map(c => `  - Case #${c.caseNumber}: ${c.subject || 'No subject'} [${c.bucket || 'N/A'}]`).join('\n') || 'No cases'}
`).join('\n')}

### Bucket/Category Distribution:
${buckets.map((b, i) => `${i + 1}. **${b.bucket}**: ${b.count} cases (${b.percentage}%)`).join('\n')}

Note: Present this data clearly in a markdown table. The user asked for "top close tags" or tag distribution.
`;
  } else if (context.type === 'validation_issues') {
    const validationCases = context.data?.cases || context.data || [];
    const issueType = context.data?.issueType || 'general';
    const count = Array.isArray(validationCases) ? validationCases.length : 0;
    
    let issueTypeLabel = 'Validation';
    if (issueType === 'jira') issueTypeLabel = 'JIRA';
    else if (issueType === 'kb') issueTypeLabel = 'KB Article';
    else if (issueType === 'tag') issueTypeLabel = 'Tag';
    
    contextSection = `
## ${issueTypeLabel} Issues Context
**Found ${count} cases with ${issueTypeLabel.toLowerCase()} issues:**

${validationCases.map(c => {
  const ci = c.caseInfo || {};
  const issues = [];
  
  // Check boolean flags
  if (c.isKBValid === false) issues.push('KB Invalid');
  if (c.isJIRAValid === false) issues.push('JIRA Invalid');
  if (c.isClosedTagValid === false) issues.push('Tag Invalid');
  if (c.error === true) issues.push('Has Error');
  
  // Check for missing references
  if (!ci.jiraCase) issues.push('Missing JIRA');
  if (!ci.kbArticle) issues.push('Missing KB');
  
  // Check detailed tag validation
  const tagSummary = c.tagValidationSummary || {};
  if (tagSummary.inaccurateTags?.length > 0) {
    issues.push(`Inaccurate Tags: ${tagSummary.inaccurateTags.map(t => t.tag).join(', ')}`);
  }
  if (tagSummary.partiallyAccurateTags?.length > 0) {
    issues.push(`Partially Accurate Tags: ${tagSummary.partiallyAccurateTags.map(t => t.tag).join(', ')}`);
  }
  if (tagSummary.missingTags?.length > 0) {
    issues.push(`Missing Tags: ${tagSummary.missingTags.map(t => t.suggestedTag).join(', ')}`);
  }
  
  // Get suggested replacements
  const suggestions = [];
  if (tagSummary.inaccurateTags?.length > 0) {
    tagSummary.inaccurateTags.forEach(t => {
      if (t.suggestedReplacement) suggestions.push(`Replace "${t.tag}" with "${t.suggestedReplacement}"`);
    });
  }
  
  return `- **Case #${ci.caseNumber || c.caseNumber}**: ${ci.subject || 'No subject'}
  - Product: ${ci.product || 'N/A'}, Priority: ${ci.priority || 'N/A'}
  - Issues Found: ${issues.length > 0 ? issues.join('; ') : 'None flagged'}
  - Current Close Tag: ${c.tags?.closeTags?.[0] || 'None'}
  - KB Article: ${ci.kbArticle || 'Not attached'}
  - JIRA Ticket: ${ci.jiraCase || 'Not attached'}
  ${suggestions.length > 0 ? `- Suggestions: ${suggestions.join('; ')}` : ''}`;
}).join('\n\n')}
`;
  } else if (context.type === 'customer_cases') {
    const customerCases = context.data?.cases || [];
    contextSection = `
## Customer Cases Context
**Customer:** ${context.data?.customerName}
**Found ${context.data?.count} cases:**

${customerCases.map(c => {
  const ci = c.caseInfo || {};
  return `- **Case #${ci.caseNumber || c.caseNumber}**: ${ci.subject || 'No subject'}
  - Priority: ${ci.priority}, Status: ${ci.status}, Product: ${ci.product || 'N/A'}`;
}).join('\n\n')}
`;
  } else if (context.type === 'resolution_patterns') {
    const resData = context.data;
    contextSection = `
## Resolution Patterns Context
**Total Cases:** ${resData?.summary?.total_cases || 'N/A'}
**Average Resolution Time by Cluster:**

${resData?.clusters?.slice(0, 10).map(c => 
  `- **${c.representative_title || c.generated_name}**: Avg ${c.avg_resolution_days?.toFixed(1) || 'N/A'} days (${c.size} cases)`
).join('\n') || 'No cluster data available'}
`;
  } else {
    // Default / general context
    contextSection = `
## General Context
**Total Cases:** ${context.data?.caseCount || 'N/A'}
**Total Clusters:** ${context.data?.summary?.total_clusters || 'N/A'}

**Top Issue Categories:**
${context.data?.summary?.top_10_clusters?.slice(0, 5).map((c, i) => 
  `${i+1}. ${c.title} (${c.size} cases)`
).join('\n') || 'No cluster data available'}

**Product Distribution:**
${context.data?.distributions?.by_product?.slice(0, 3).map(p => 
  `- ${p.product || 'Unknown'}: ${p.count} cases (${p.percentage}%)`
).join('\n') || 'No data'}

You can help users with:
- Looking up specific cases (e.g., "Tell me about case #02106340")
- Finding patterns and top issues
- Searching by product, priority, or customer
- Identifying validation issues with tags, KB, or JIRA
`;
  }
  
  return `${basePrompt}\n\n${contextSection}\n\nAnswer the user's question based on this context. Be helpful and specific.`;
}

export default { processChat };
