// Mock data for Analysis Dashboard
// Based on Leadership FAQs and Serviceability workflow
export const mockDashboardData = {
  totalCases: 156,
  releaseVersion: 'AOS 6.5.2',
  reviewPeriod: 'Jan 15 - Jan 27, 2026',
  caseInflowRate: 42, // cases per day
  caseInflowTrend: 'up', // up, down, stable
  
  // Case Buckets - Categories for case classification
  clusters: {
    total: 7,
    topIssues: [
      { id: 1, name: 'Bug/Improvement', count: 45, color: '#ef4444' },
      { id: 2, name: 'Customer Assistance/Questions', count: 38, color: '#f97316' },
      { id: 3, name: 'RCA-Inconclusive', count: 28, color: '#eab308' },
      { id: 4, name: 'Cx Environment/Non-Nutanix', count: 24, color: '#22c55e' },
      { id: 5, name: 'Issue Self-Resolved', count: 21, color: '#3b82f6' },
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
  
  // Component distribution - Which products are generating most cases
  components: {
    total: 12,
    topComponents: [
      { name: 'LCM (Lifecycle Manager)', percentage: 27 },
      { name: 'Prism Central', percentage: 22 },
      { name: 'AOS Storage', percentage: 18 },
      { name: 'Hypervisor (AHV)', percentage: 15 },
      { name: 'Data Protection', percentage: 10 },
    ],
  },

  // AI Insight for the banner
  aiInsight: {
    title: 'AI Analysis',
    description: '35% of cases relate to LCM catalog cleanup after AOS 6.5.2 upgrade. Pattern suggests Day 0 regression - recommend prioritizing ENG-45678 fix. Case inflow rate increased 15% post-release.',
  },
};

export default mockDashboardData;
