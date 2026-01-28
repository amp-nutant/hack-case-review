// Mock data for Analysis Dashboard
// Based on Leadership FAQs and Serviceability workflow
export const mockDashboardData = {
  totalCases: 156,
  releaseVersion: 'AOS 6.5.2',
  reviewPeriod: 'Jan 15 - Jan 27, 2026',
  caseInflowRate: 42, // cases per day
  caseInflowTrend: 'up', // up, down, stable
  
  // Case Buckets - Categories for case classification
  // All buckets from the case review workflow
  buckets: {
    total: 7,
    items: [
      { id: 1, name: 'Bug/Improvement', value: 45, fill: '#e67e5a' },
      { id: 2, name: 'Customer Assistance', value: 38, fill: '#f59e42' },
      { id: 3, name: 'RCA-Inconclusive', value: 28, fill: '#eab308' },
      { id: 4, name: 'Cx Environment', value: 24, fill: '#34a88f' },
      { id: 5, name: 'Issue Self-Resolved', value: 21, fill: '#1b6dc6' },
      { id: 6, name: 'Documentation Gap', value: 12, fill: '#8b5cf6' },
      { id: 7, name: 'Duplicate/Invalid', value: 8, fill: '#9aa5b5' },
    ],
    // Top 5 for overview display
    topIssues: [
      { id: 1, name: 'Bug/Improvement', count: 45, fill: '#e67e5a' },
      { id: 2, name: 'Customer Assistance', count: 38, fill: '#f59e42' },
      { id: 3, name: 'RCA-Inconclusive', count: 28, fill: '#eab308' },
      { id: 4, name: 'Cx Environment', count: 24, fill: '#34a88f' },
      { id: 5, name: 'Issue Self-Resolved', count: 21, fill: '#1b6dc6' },
    ],
  },
  
  // Actions to be Taken - Derived from case review analysis
  // affectedCases = number of cases that would be deflected if action is taken
  actions: {
    total: 28,
    items: [
      { id: 1, title: 'Bug fix needed in LCM catalog cleanup (ENG-45678)', priority: 'critical', affectedCases: 28, percentage: 18 },
      { id: 2, title: 'Create KB for AOS 6.5.2 upgrade pre-checks', priority: 'critical', affectedCases: 22, percentage: 14 },
      { id: 3, title: 'Update documentation for storage container limits', priority: 'high', affectedCases: 15, percentage: 10 },
      { id: 4, title: 'Add in-product guardrails for unsupported configs', priority: 'high', affectedCases: 12, percentage: 8 },
      { id: 5, title: 'Recommend software update to 6.5.2.1 hotfix', priority: 'high', affectedCases: 9, percentage: 6 },
    ],
  },
  
  // KB/JIRA Analysis - Tracking documentation gaps and open issues
  kbJiraIssues: {
    total: 34,
    kbMissing: 12,
    kbOutdated: 8,
    jiraOpen: 14,
    topKBGaps: [
      { id: 'ENG-52341', title: 'LCM inventory sync fails', status: 'Open', caseCount: 28, percentage: 18 },
      { id: 'KB-9876', title: 'AHV upgrade path documentation needed', status: 'No Article', caseCount: 22, percentage: 14 },
      { id: 'ENG-48923', title: 'PC registration timeout after upgrade', status: 'Open', caseCount: 15, percentage: 10 },
    ],
  },
  
  // Closed Tags distribution - How cases are tagged when closed
  closedTags: {
    total: 18,
    // All closed tags with case counts and colors
    items: [
      { id: 1, name: 'Prism Central - PE-PC Connection', value: 28, fill: '#e67e5a' },
      { id: 2, name: 'Prism Central - Others', value: 24, fill: '#f59e42' },
      { id: 3, name: 'Prism Central - CMSP', value: 21, fill: '#eab308' },
      { id: 4, name: 'Prism Central - LDAP', value: 18, fill: '#34a88f' },
      { id: 5, name: 'Prism Central - Upgrade', value: 15, fill: '#1b6dc6' },
      { id: 6, name: 'Prism Central - App Monitoring/Xstream', value: 12, fill: '#8b5cf6' },
      { id: 7, name: 'Prism Central - AHV Image Management', value: 10, fill: '#ec4899' },
      { id: 8, name: 'Prism Central - PC Management', value: 9, fill: '#06b6d4' },
      { id: 9, name: 'Prism Central - Register/Unregister', value: 8, fill: '#84cc16' },
      { id: 10, name: 'Prism Central - CMSP - IAM', value: 7, fill: '#f43f5e' },
      { id: 11, name: 'Prism Central - Memory Usage', value: 6, fill: '#a855f7' },
      { id: 12, name: 'Prism Central - Out of Memory (OOM)', value: 5, fill: '#14b8a6' },
      { id: 13, name: 'Prism Central - Install/Deploy', value: 4, fill: '#f97316' },
      { id: 14, name: 'Prism Central - Stuck Task', value: 4, fill: '#6366f1' },
      { id: 15, name: 'Prism Central - CMSP - Authn / Authz', value: 3, fill: '#22c55e' },
      { id: 16, name: 'Prism Central - CMSP - Upgrade', value: 3, fill: '#0ea5e9' },
      { id: 17, name: 'Prism Central - Reporting', value: 2, fill: '#d946ef' },
      { id: 18, name: 'Prism Central - CPU Usage', value: 2, fill: '#64748b' },
    ],
    // Top 5 for overview display (with percentages for progress bars)
    topTags: [
      { id: 1, name: 'Prism Central - PE-PC Connection', count: 28, percentage: 18, fill: '#e67e5a' },
      { id: 2, name: 'Prism Central - Others', count: 24, percentage: 15, fill: '#f59e42' },
      { id: 3, name: 'Prism Central - CMSP', count: 21, percentage: 13, fill: '#eab308' },
      { id: 4, name: 'Prism Central - LDAP', count: 18, percentage: 12, fill: '#34a88f' },
      { id: 5, name: 'Prism Central - Upgrade', count: 15, percentage: 10, fill: '#1b6dc6' },
    ],
  },

  // AI Insight for the banner
  aiInsight: {
    title: 'AI Analysis',
    description: '35% of cases relate to LCM catalog cleanup after AOS 6.5.2 upgrade. Pattern suggests Day 0 regression - recommend prioritizing ENG-45678 fix. Case inflow rate increased 15% post-release.',
  },
};

export default mockDashboardData;
