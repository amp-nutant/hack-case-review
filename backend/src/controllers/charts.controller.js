import { Case, Analysis } from '../models/index.js';
import { generateMockChartData } from '../utils/dataSimulator.js';

/**
 * Get chart data for a report
 */
export const getData = async (req, res, next) => {
  try {
    const { reportId, chartType } = req.params;
    
    // Handle demo/mock IDs
    if (reportId?.startsWith('demo-')) {
      const mockData = generateMockChartData(chartType);
      return res.json(mockData);
    }
    
    // Get cases for this report
    const cases = await Case.find({ reportId });
    
    if (cases.length === 0) {
      const mockData = generateMockChartData(chartType);
      return res.json(mockData);
    }
    
    let chartData;
    
    switch (chartType) {
      case 'priority':
        chartData = generatePriorityChart(cases);
        break;
      case 'status':
        chartData = generateStatusChart(cases);
        break;
      case 'timeline':
        chartData = generateTimelineChart(cases);
        break;
      case 'assignee':
        chartData = generateAssigneeChart(cases);
        break;
      case 'category':
        chartData = generateCategoryChart(cases);
        break;
      case 'resolution':
        chartData = generateResolutionChart(cases);
        break;
      default:
        chartData = generateMockChartData(chartType);
    }
    
    res.json(chartData);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all chart data for a report
 */
export const getAllCharts = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    
    // Handle demo/mock IDs
    if (reportId?.startsWith('demo-')) {
      return res.json({
        priority: generateMockChartData('priority'),
        status: generateMockChartData('status'),
        timeline: generateMockChartData('timeline'),
        assignee: generateMockChartData('assignee'),
      });
    }
    
    const cases = await Case.find({ reportId });
    
    if (cases.length === 0) {
      return res.json({
        priority: generateMockChartData('priority'),
        status: generateMockChartData('status'),
        timeline: generateMockChartData('timeline'),
        assignee: generateMockChartData('assignee'),
      });
    }
    
    res.json({
      priority: generatePriorityChart(cases),
      status: generateStatusChart(cases),
      timeline: generateTimelineChart(cases),
      assignee: generateAssigneeChart(cases),
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions to generate chart data from cases

function generatePriorityChart(cases) {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  cases.forEach((c) => {
    if (counts[c.priority] !== undefined) {
      counts[c.priority]++;
    }
  });
  
  return [
    { label: 'Critical', value: counts.critical, color: '#ef4444' },
    { label: 'High', value: counts.high, color: '#f97316' },
    { label: 'Medium', value: counts.medium, color: '#eab308' },
    { label: 'Low', value: counts.low, color: '#22c55e' },
  ];
}

function generateStatusChart(cases) {
  const counts = {
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  };
  
  cases.forEach((c) => {
    if (counts[c.status] !== undefined) {
      counts[c.status]++;
    }
  });
  
  return [
    { label: 'Open', value: counts.open, color: '#3b82f6' },
    { label: 'In Progress', value: counts.in_progress, color: '#eab308' },
    { label: 'Resolved', value: counts.resolved, color: '#22c55e' },
    { label: 'Closed', value: counts.closed, color: '#6b7280' },
  ];
}

function generateTimelineChart(cases) {
  const dateMap = {};
  
  cases.forEach((c) => {
    const date = new Date(c.createdAt).toISOString().split('T')[0];
    dateMap[date] = (dateMap[date] || 0) + 1;
  });
  
  return Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

function generateAssigneeChart(cases) {
  const assigneeMap = {};
  
  cases.forEach((c) => {
    const assignee = c.assignee || 'Unassigned';
    if (!assigneeMap[assignee]) {
      assigneeMap[assignee] = { open: 0, inProgress: 0, resolved: 0 };
    }
    
    if (c.status === 'open') assigneeMap[assignee].open++;
    else if (c.status === 'in_progress') assigneeMap[assignee].inProgress++;
    else if (c.status === 'resolved' || c.status === 'closed') assigneeMap[assignee].resolved++;
  });
  
  return Object.entries(assigneeMap).map(([name, stats]) => ({
    name,
    ...stats,
  }));
}

function generateCategoryChart(cases) {
  const categoryMap = {};
  
  cases.forEach((c) => {
    const category = c.analysis?.category || 'Uncategorized';
    categoryMap[category] = (categoryMap[category] || 0) + 1;
  });
  
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#6b7280'];
  
  return Object.entries(categoryMap).map(([label, value], index) => ({
    label,
    value,
    color: colors[index % colors.length],
  }));
}

function generateResolutionChart(cases) {
  // Mock resolution time distribution
  return [
    { label: '<1 hour', value: Math.floor(Math.random() * 20) + 10 },
    { label: '1-4 hours', value: Math.floor(Math.random() * 30) + 20 },
    { label: '4-8 hours', value: Math.floor(Math.random() * 25) + 15 },
    { label: '8-24 hours', value: Math.floor(Math.random() * 15) + 10 },
    { label: '>24 hours', value: Math.floor(Math.random() * 10) + 5 },
  ];
}

export default {
  getData,
  getAllCharts,
};
