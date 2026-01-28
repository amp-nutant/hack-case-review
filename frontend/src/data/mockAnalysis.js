// Card-style cluster data for the Clusters page (matches UI reference)
export const mockCaseClusters = [
  {
    id: 'cassandra-timeout',
    name: 'Cassandra Timeout Issues',
    count: 47,
    component: 'Cassandra',
    trend: '+12%',
    severity: 'high',
    color: '#ef4444',
  },
  {
    id: 'curator-snapshot',
    name: 'Curator Snapshot Failures',
    count: 35,
    component: 'Curator',
    trend: '+8%',
    severity: 'high',
    color: '#f97316',
  },
  {
    id: 'dnd-policy',
    name: 'DND Policy Sync Errors',
    count: 28,
    component: 'DND',
    trend: '+180%',
    severity: 'medium',
    color: '#eab308',
  },
  {
    id: 'prism-connectivity',
    name: 'Prism Central Connectivity',
    count: 24,
    component: 'Prism',
    trend: '+5%',
    severity: 'medium',
    color: '#22c55e',
  },
  {
    id: 'aos-upgrade',
    name: 'AOS Upgrade Failures',
    count: 19,
    component: 'AOS',
    trend: '-15%',
    severity: 'low',
    color: '#3b82f6',
  },
  {
    id: 'stargate-latency',
    name: 'Stargate I/O Latency',
    count: 15,
    component: 'Stargate',
    trend: '+2%',
    severity: 'medium',
    color: '#8b5cf6',
  },
];

export const mockSummary = {
  overview: 'This report contains 156 cases from Q4 2025, with the majority relating to storage and network operations. There is a notable increase in upgrade-related issues following the recent AOS release.',
  keyFindings: [
    'Storage operation issues increased by 25% compared to Q3',
    'Network connectivity problems often correlate with firmware updates',
    '35% of cases could potentially be resolved with knowledge base articles',
    'Average resolution time improved by 18% compared to previous quarter',
  ],
  recommendations: [
    'Consider implementing pre-upgrade validation checks',
    'Update knowledge base with common storage troubleshooting steps',
    'Review network configuration best practices documentation',
    'Implement proactive monitoring for identified patterns',
  ],
  trends: {
    improving: ['Resolution time', 'Customer satisfaction', 'First contact resolution'],
    declining: ['Storage-related cases', 'Upgrade issues'],
    stable: ['Network cases', 'Authentication issues'],
  },
};

export const mockChartData = {
  priorityDistribution: [
    { name: 'Critical', value: 12, color: '#ef4444' },
    { name: 'High', value: 38, color: '#f97316' },
    { name: 'Medium', value: 67, color: '#eab308' },
    { name: 'Low', value: 39, color: '#22c55e' },
  ],
  statusOverview: [
    { name: 'Open', value: 45 },
    { name: 'In Progress', value: 38 },
    { name: 'Resolved', value: 52 },
    { name: 'Closed', value: 21 },
  ],
  casesOverTime: [
    { date: '2025-12-01', count: 12 },
    { date: '2025-12-02', count: 8 },
    { date: '2025-12-03', count: 15 },
    { date: '2025-12-04', count: 10 },
    { date: '2025-12-05', count: 18 },
    { date: '2025-12-06', count: 5 },
    { date: '2025-12-07', count: 3 },
    { date: '2025-12-08', count: 14 },
    { date: '2025-12-09', count: 11 },
    { date: '2025-12-10', count: 16 },
    { date: '2025-12-11', count: 9 },
    { date: '2025-12-12', count: 13 },
    { date: '2025-12-13', count: 7 },
    { date: '2025-12-14', count: 15 },
  ],
  assigneeWorkload: [
    { name: 'John Smith', open: 8, inProgress: 5, resolved: 12 },
    { name: 'Sarah Johnson', open: 6, inProgress: 7, resolved: 15 },
    { name: 'Mike Chen', open: 5, inProgress: 4, resolved: 10 },
    { name: 'Emily Davis', open: 4, inProgress: 6, resolved: 18 },
    { name: 'Alex Thompson', open: 7, inProgress: 3, resolved: 8 },
    { name: 'Unassigned', open: 15, inProgress: 0, resolved: 0 },
  ],
};

export default {
  mockCaseClusters,
  mockSummary,
  mockChartData,
};
