import { v4 as uuidv4 } from 'uuid';

// Random helpers
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Data constants
const statuses = ['open', 'in_progress', 'resolved', 'closed'];
const priorities = ['low', 'medium', 'high', 'critical'];
const assignees = ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Emily Davis', 'Alex Thompson', null];
const customers = ['Acme Corporation', 'TechStart Inc', 'Global Finance Ltd', 'Healthcare Plus', 'Retail Solutions Co', 'Manufacturing Corp', 'AI Research Labs'];

const issueTitles = [
  'Cluster connectivity issues after firmware upgrade',
  'VM migration fails with storage error',
  'Prism Central dashboard loading slowly',
  'Backup job fails with permission denied',
  'Alert storm from multiple hosts',
  'License activation failed on new cluster',
  'Node went into maintenance mode unexpectedly',
  'Data replication lag exceeding threshold',
  'Unable to create new protection domain',
  'GPU passthrough not working after upgrade',
  'High CPU utilization on controller VMs',
  'Network timeout during live migration',
  'Storage container showing incorrect capacity',
  'Authentication failure for LDAP users',
  'Snapshot creation taking too long',
  'Cluster expansion wizard fails at validation',
  'Metro availability sync issues',
  'NCC health check reporting false positives',
  'AHV host showing disconnected state',
  'Volume group mount fails on Windows VM',
];

const issueDescriptions = [
  'Customer reports intermittent issues that started after the latest update. Multiple teams have been notified but root cause is still under investigation.',
  'The issue affects production workloads and is causing service degradation. Customer has requested an urgent resolution.',
  'This is a recurring problem that has been seen in similar environments. Previous solutions may be applicable.',
  'Customer discovered this during routine maintenance. No immediate business impact but needs resolution before scheduled operations.',
  'Multiple users are affected by this issue. Customer has implemented a temporary workaround but needs a permanent fix.',
];

const categories = [
  'Network Configuration',
  'Storage Operations',
  'Performance',
  'Backup & Recovery',
  'Upgrade Issues',
  'Authentication',
  'Hardware Configuration',
  'Licensing',
  'Monitoring',
  'Disaster Recovery',
];

const tags = [
  ['networking', 'firmware', 'connectivity'],
  ['storage', 'migration', 'vm'],
  ['prism-central', 'performance', 'ui'],
  ['backup', 'permissions', 'scheduled-tasks'],
  ['alerts', 'monitoring', 'disk'],
  ['licensing', 'deployment'],
  ['maintenance', 'node', 'unexpected'],
  ['replication', 'dr', 'performance'],
  ['protection-domain', 'api', 'error'],
  ['gpu', 'upgrade', 'passthrough'],
];

/**
 * Generate mock reports
 */
export function generateMockReport(count = 1) {
  const reports = [];
  
  for (let i = 0; i < count; i++) {
    const caseCount = randomInt(30, 200);
    const openCases = randomInt(10, Math.floor(caseCount * 0.4));
    const resolvedCases = randomInt(20, Math.floor(caseCount * 0.5));
    const closedCases = caseCount - openCases - resolvedCases - randomInt(5, 15);
    const criticalCases = randomInt(3, 15);
    
    const createdAt = new Date(Date.now() - randomInt(1, 60) * 24 * 60 * 60 * 1000);
    
    reports.push({
      id: `demo-report-${i + 1}`,
      name: `${randomItem(['Q4 2025', 'Weekly', 'Monthly', 'Critical'])} Case Review ${i + 1}`,
      fileName: `report_${Date.now()}_${i}.csv`,
      caseCount,
      status: randomItem(['completed', 'completed', 'completed', 'processing']),
      createdAt: createdAt.toISOString(),
      updatedAt: new Date(createdAt.getTime() + randomInt(1, 6) * 60 * 60 * 1000).toISOString(),
      summary: {
        totalCases: caseCount,
        openCases,
        resolvedCases,
        closedCases: Math.max(0, closedCases),
        criticalCases,
        avgResolutionTime: `${(Math.random() * 4 + 2).toFixed(1)} hours`,
      },
    });
  }
  
  return reports;
}

/**
 * Generate mock cases
 */
export function generateMockCases(count = 10) {
  const cases = [];
  const baseDate = new Date();
  
  for (let i = 0; i < count; i++) {
    const createdAt = new Date(baseDate.getTime() - randomInt(1, 30) * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(createdAt.getTime() + randomInt(1, 48) * 60 * 60 * 1000);
    
    cases.push({
      id: `case-${String(i + 1).padStart(3, '0')}`,
      caseNumber: `CS-2025-${String(randomInt(100, 999)).padStart(5, '0')}`,
      title: randomItem(issueTitles),
      description: randomItem(issueDescriptions),
      priority: randomItem(priorities),
      status: randomItem(statuses),
      assignee: randomItem(assignees),
      customer: randomItem(customers),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      tags: randomItem(tags),
      analysis: {
        category: randomItem(categories),
        similarCount: randomInt(1, 10),
        recommendation: 'Review configuration settings and check for known issues in the knowledge base.',
      },
    });
  }
  
  return cases;
}

/**
 * Generate mock clusters
 */
export function generateMockClusters() {
  const clusterNames = [
    { name: 'Network Issues', color: '#ef4444' },
    { name: 'Storage Operations', color: '#f97316' },
    { name: 'Performance', color: '#eab308' },
    { name: 'Backup & Recovery', color: '#22c55e' },
    { name: 'Upgrade Issues', color: '#3b82f6' },
    { name: 'Authentication', color: '#8b5cf6' },
    { name: 'Other', color: '#6b7280' },
  ];
  
  let remaining = 100;
  
  return clusterNames.map((cluster, index) => {
    const isLast = index === clusterNames.length - 1;
    const percentage = isLast ? remaining : randomInt(8, 25);
    remaining -= percentage;
    
    return {
      id: `cluster-${index + 1}`,
      name: cluster.name,
      description: `Cases related to ${cluster.name.toLowerCase()} issues and configurations`,
      count: Math.floor(156 * (percentage / 100)),
      percentage,
      color: cluster.color,
      keywords: cluster.name.toLowerCase().split(' '),
    };
  });
}

/**
 * Generate mock analysis
 */
export function generateMockAnalysis() {
  return {
    summary: {
      overview: 'This report contains cases from the current review period, with the majority relating to storage and network operations. There is a notable pattern of issues following configuration changes.',
      keyFindings: [
        'Storage operation issues increased compared to the previous period',
        'Network connectivity problems often correlate with firmware updates',
        '35% of cases could potentially be resolved with knowledge base articles',
        'Average resolution time has improved compared to previous quarter',
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
    },
    clusters: generateMockClusters(),
  };
}

/**
 * Generate mock chart data
 */
export function generateMockChartData(chartType) {
  switch (chartType) {
    case 'priority':
      return [
        { label: 'Critical', value: randomInt(8, 15), color: '#ef4444' },
        { label: 'High', value: randomInt(25, 40), color: '#f97316' },
        { label: 'Medium', value: randomInt(40, 70), color: '#eab308' },
        { label: 'Low', value: randomInt(30, 50), color: '#22c55e' },
      ];
    
    case 'status':
      return [
        { label: 'Open', value: randomInt(30, 50), color: '#3b82f6' },
        { label: 'In Progress', value: randomInt(25, 45), color: '#eab308' },
        { label: 'Resolved', value: randomInt(40, 60), color: '#22c55e' },
        { label: 'Closed', value: randomInt(15, 30), color: '#6b7280' },
      ];
    
    case 'timeline':
      const timelineData = [];
      const baseDate = new Date();
      for (let i = 14; i >= 0; i--) {
        const date = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
        timelineData.push({
          date: date.toISOString().split('T')[0],
          count: randomInt(3, 20),
        });
      }
      return timelineData;
    
    case 'assignee':
      return assignees
        .filter((a) => a !== null)
        .map((name) => ({
          name,
          open: randomInt(3, 10),
          inProgress: randomInt(2, 8),
          resolved: randomInt(8, 20),
        }));
    
    default:
      return [];
  }
}

export default {
  generateMockReport,
  generateMockCases,
  generateMockClusters,
  generateMockAnalysis,
  generateMockChartData,
};
