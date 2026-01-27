// Mock data for Analysis Dashboard
export const mockDashboardData = {
  totalCases: 156,
  
  clusters: {
    total: 7,
    topIssues: [
      { id: 1, name: 'Storage Operations', count: 35, color: '#ef4444' },
      { id: 2, name: 'Network Issues', count: 28, color: '#f97316' },
      { id: 3, name: 'VM Migration Errors', count: 21, color: '#eab308' },
      { id: 4, name: 'Authentication Failures', count: 18, color: '#22c55e' },
    ],
  },
  
  actions: {
    total: 23,
    items: [
      { id: 1, title: 'Update KB-12345 for AOS 6.5 storage operations', priority: 'critical' },
      { id: 2, title: 'Document network timeout workaround in KB-23456', priority: 'high' },
      { id: 3, title: 'Escalate VM migration bug to engineering', priority: 'critical' },
      { id: 4, title: 'Create JIRA for authentication service issue', priority: 'high' },
    ],
  },
  
  kbJiraIssues: {
    total: 34,
    kbMissing: 12,
    kbOutdated: 8,
    jiraOpen: 14,
    topKBGaps: [
      { title: 'KB-12345: Storage operations timeout', status: 'No Article' },
      { title: 'JIRA-5678: VM migration fails on large clusters', status: 'Open' },
    ],
  },
  
  components: {
    total: 12,
    topComponents: [
      { name: 'Prism Central', percentage: 27 },
      { name: 'AOS Storage', percentage: 22 },
      { name: 'Networking (Flow)', percentage: 18 },
      { name: 'Hypervisor (AHV)', percentage: 15 },
    ],
  },
};

export default mockDashboardData;
