/**
 * Aggregation Service
 * 
 * Computes buckets, clusters, and statistics from multiple case analyses.
 * Provides data for visualization and filtering.
 */

/**
 * Aggregate multiple case analyses into summary statistics and clusters
 * @param {Array} analyses - Array of analysis objects
 * @returns {Object} Aggregated summary with buckets and clusters
 */
export function aggregateAnalyses(analyses) {
  if (!analyses || analyses.length === 0) {
    return createEmptyAggregation();
  }

  const timestamp = new Date().toISOString();
  
  return {
    metadata: {
      totalCases: analyses.length,
      generatedAt: timestamp,
      analysisVersion: '1.0',
    },
    
    // Bucketing by different dimensions
    buckets: {
      byIssueType: bucketByField(analyses, 'analysis.tags.issueType'),
      byResolutionType: bucketByField(analyses, 'analysis.tags.resolutionType'),
      byTechnicalComplexity: bucketByField(analyses, 'analysis.tags.technicalComplexity'),
      byFaultAttribution: bucketByField(analyses, 'analysis.tags.faultAttribution'),
      byProductArea: bucketByArrayField(analyses, 'analysis.tags.productArea'),
      byProblemCategory: bucketByArrayField(analyses, 'analysis.tags.problemCategory'),
      byCustomerSentiment: bucketByField(analyses, 'analysis.sentimentAnalysis.customerSentiment.overall'),
      byResolutionQuality: bucketByScoreRange(analyses, 'analysis.qualityAssessment.overallHandling.score'),
    },
    
    // Issue classification breakdown
    classifications: {
      bugs: classifyByCriteria(analyses, 'analysis.issueClassification.isBug.verdict', true),
      configurationIssues: classifyByCriteria(analyses, 'analysis.issueClassification.isConfigurationIssue.verdict', true),
      customerErrors: classifyByCriteria(analyses, 'analysis.issueClassification.isCustomerError.verdict', true),
      nonNutanixIssues: classifyByCriteria(analyses, 'analysis.issueClassification.isNonNutanixIssue.verdict', true),
    },
    
    // Tag analysis
    tagAnalysis: {
      openTagsAccuracy: computeTagAccuracyStats(analyses, 'openTags'),
      closeTagsAccuracy: computeTagAccuracyStats(analyses, 'closeTags'),
      commonMissingTags: findCommonMissingTags(analyses),
      commonIncorrectTags: findCommonIncorrectTags(analyses),
    },
    
    // Clustering by topics
    clusters: computeClusters(analyses),
    
    // Quality metrics
    qualityMetrics: computeQualityMetrics(analyses),
    
    // RCA statistics
    rcaStats: computeRCAStats(analyses),
    
    // Resolution analysis
    resolutionStats: computeResolutionStats(analyses),
    
    // Filterable case list with key attributes
    cases: analyses.map(a => ({
      caseNumber: a.caseNumber,
      brief: a.analysis?.issueSummary?.brief || 'N/A',
      issueType: a.analysis?.tags?.issueType || 'Unknown',
      resolutionType: a.analysis?.tags?.resolutionType || 'Unknown',
      complexity: a.analysis?.tags?.technicalComplexity || 'Unknown',
      productAreas: a.analysis?.tags?.productArea || [],
      problemCategories: a.analysis?.tags?.problemCategory || [],
      overallScore: a.analysis?.qualityAssessment?.overallHandling?.score || 0,
      tagScore: a.analysis?.tagValidation?.overallScore || 0,
      sentiment: a.analysis?.sentimentAnalysis?.customerSentiment?.overall || 'Unknown',
      isBug: a.analysis?.issueClassification?.isBug?.verdict || false,
      isConfig: a.analysis?.issueClassification?.isConfigurationIssue?.verdict || false,
      keywords: a.analysis?.clusteringFeatures?.keywords || [],
      primaryTopic: a.analysis?.clusteringFeatures?.primaryTopic || 'Unknown',
    })),
  };
}

function createEmptyAggregation() {
  return {
    metadata: { totalCases: 0, generatedAt: new Date().toISOString() },
    buckets: {},
    classifications: {},
    tagAnalysis: {},
    clusters: [],
    qualityMetrics: {},
    rcaStats: {},
    resolutionStats: {},
    cases: [],
  };
}

/**
 * Get nested field value from object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Bucket analyses by a single-value field
 */
function bucketByField(analyses, fieldPath) {
  const buckets = {};
  
  analyses.forEach(analysis => {
    const value = getNestedValue(analysis, fieldPath) || 'Unknown';
    if (!buckets[value]) {
      buckets[value] = { count: 0, cases: [] };
    }
    buckets[value].count++;
    buckets[value].cases.push(analysis.caseNumber);
  });
  
  // Convert to sorted array
  return Object.entries(buckets)
    .map(([name, data]) => ({
      name,
      count: data.count,
      percentage: Math.round((data.count / analyses.length) * 100),
      cases: data.cases,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Bucket analyses by an array field (one case can appear in multiple buckets)
 */
function bucketByArrayField(analyses, fieldPath) {
  const buckets = {};
  
  analyses.forEach(analysis => {
    const values = getNestedValue(analysis, fieldPath) || [];
    const valueArray = Array.isArray(values) ? values : [values];
    
    valueArray.forEach(value => {
      if (!value) return;
      if (!buckets[value]) {
        buckets[value] = { count: 0, cases: [] };
      }
      buckets[value].count++;
      buckets[value].cases.push(analysis.caseNumber);
    });
  });
  
  return Object.entries(buckets)
    .map(([name, data]) => ({
      name,
      count: data.count,
      percentage: Math.round((data.count / analyses.length) * 100),
      cases: data.cases,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Bucket by score ranges
 */
function bucketByScoreRange(analyses, fieldPath) {
  const ranges = [
    { name: 'Excellent (9-10)', min: 9, max: 10 },
    { name: 'Good (7-8)', min: 7, max: 8 },
    { name: 'Average (5-6)', min: 5, max: 6 },
    { name: 'Below Average (3-4)', min: 3, max: 4 },
    { name: 'Poor (1-2)', min: 1, max: 2 },
  ];
  
  return ranges.map(range => {
    const matching = analyses.filter(a => {
      const score = getNestedValue(a, fieldPath) || 0;
      return score >= range.min && score <= range.max;
    });
    
    return {
      name: range.name,
      count: matching.length,
      percentage: Math.round((matching.length / analyses.length) * 100),
      cases: matching.map(a => a.caseNumber),
    };
  });
}

/**
 * Classify analyses by boolean criteria
 */
function classifyByCriteria(analyses, fieldPath, targetValue) {
  const matching = analyses.filter(a => getNestedValue(a, fieldPath) === targetValue);
  
  return {
    count: matching.length,
    percentage: Math.round((matching.length / analyses.length) * 100),
    cases: matching.map(a => ({
      caseNumber: a.caseNumber,
      brief: a.analysis?.issueSummary?.brief || 'N/A',
    })),
  };
}

/**
 * Compute topic-based clusters
 */
function computeClusters(analyses) {
  const topicClusters = {};
  
  analyses.forEach(analysis => {
    const primaryTopic = analysis.analysis?.clusteringFeatures?.primaryTopic;
    if (!primaryTopic) return;
    
    // Normalize topic for clustering
    const normalizedTopic = normalizeTopic(primaryTopic);
    
    if (!topicClusters[normalizedTopic]) {
      topicClusters[normalizedTopic] = {
        topic: normalizedTopic,
        originalTopics: [],
        cases: [],
        keywords: new Set(),
        productAreas: new Set(),
      };
    }
    
    topicClusters[normalizedTopic].originalTopics.push(primaryTopic);
    topicClusters[normalizedTopic].cases.push({
      caseNumber: analysis.caseNumber,
      brief: analysis.analysis?.issueSummary?.brief,
      similarity: 1.0, // Placeholder for actual similarity scoring
    });
    
    // Collect keywords
    (analysis.analysis?.clusteringFeatures?.keywords || []).forEach(kw => {
      topicClusters[normalizedTopic].keywords.add(kw);
    });
    
    // Collect product areas
    (analysis.analysis?.tags?.productArea || []).forEach(pa => {
      topicClusters[normalizedTopic].productAreas.add(pa);
    });
  });
  
  // Convert to array and finalize
  return Object.values(topicClusters)
    .map(cluster => ({
      id: generateClusterId(cluster.topic),
      name: cluster.topic,
      count: cluster.cases.length,
      percentage: Math.round((cluster.cases.length / analyses.length) * 100),
      keywords: Array.from(cluster.keywords).slice(0, 10),
      productAreas: Array.from(cluster.productAreas),
      cases: cluster.cases,
      color: getClusterColor(cluster.cases.length, analyses.length),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 clusters
}

function normalizeTopic(topic) {
  // Simple normalization - in production, use NLP/embedding similarity
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .filter(w => w.length > 2)
    .slice(0, 5)
    .join(' ')
    .trim() || 'other';
}

function generateClusterId(topic) {
  return 'cluster_' + topic.replace(/\s+/g, '_').substring(0, 30);
}

function getClusterColor(count, total) {
  const percentage = (count / total) * 100;
  if (percentage >= 20) return '#ef4444'; // Red - high concentration
  if (percentage >= 10) return '#f97316'; // Orange
  if (percentage >= 5) return '#eab308';  // Yellow
  return '#22c55e'; // Green - low concentration
}

/**
 * Compute tag accuracy statistics
 */
function computeTagAccuracyStats(analyses, tagType) {
  const scores = analyses
    .map(a => a.analysis?.tagValidation?.[tagType]?.score)
    .filter(s => s !== undefined && s !== null);
  
  if (scores.length === 0) return { avg: 0, min: 0, max: 0, distribution: [] };
  
  return {
    avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    min: Math.min(...scores),
    max: Math.max(...scores),
    distribution: [
      { range: '9-10', count: scores.filter(s => s >= 9).length },
      { range: '7-8', count: scores.filter(s => s >= 7 && s < 9).length },
      { range: '5-6', count: scores.filter(s => s >= 5 && s < 7).length },
      { range: '3-4', count: scores.filter(s => s >= 3 && s < 5).length },
      { range: '1-2', count: scores.filter(s => s < 3).length },
    ],
  };
}

function findCommonMissingTags(analyses) {
  const tagCounts = {};
  
  analyses.forEach(a => {
    const openMissing = a.analysis?.tagValidation?.openTags?.missingTags || [];
    const closeMissing = a.analysis?.tagValidation?.closeTags?.missingTags || [];
    
    [...openMissing, ...closeMissing].forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function findCommonIncorrectTags(analyses) {
  const tagCounts = {};
  
  analyses.forEach(a => {
    const openIncorrect = a.analysis?.tagValidation?.openTags?.incorrectlyApplied || [];
    const closeIncorrect = a.analysis?.tagValidation?.closeTags?.incorrectlyApplied || [];
    
    [...openIncorrect, ...closeIncorrect].forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Compute overall quality metrics
 */
function computeQualityMetrics(analyses) {
  const metrics = ['resolutionQuality', 'responseTimeliness', 'communicationQuality', 'technicalAccuracy', 'overallHandling'];
  const result = {};
  
  metrics.forEach(metric => {
    const scores = analyses
      .map(a => a.analysis?.qualityAssessment?.[metric]?.score)
      .filter(s => s !== undefined && s !== null);
    
    if (scores.length > 0) {
      result[metric] = {
        avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
        min: Math.min(...scores),
        max: Math.max(...scores),
      };
    }
  });
  
  return result;
}

/**
 * Compute RCA statistics
 */
function computeRCAStats(analyses) {
  const withRCA = analyses.filter(a => a.analysis?.rcaAssessment?.rcaPerformed === true);
  const rcaScores = analyses
    .map(a => a.analysis?.rcaAssessment?.rcaQuality?.score)
    .filter(s => s !== undefined && s !== null);
  
  return {
    rcaPerformedCount: withRCA.length,
    rcaPerformedPercentage: Math.round((withRCA.length / analyses.length) * 100),
    avgRCAQuality: rcaScores.length > 0 
      ? Math.round((rcaScores.reduce((a, b) => a + b, 0) / rcaScores.length) * 10) / 10 
      : 0,
    conclusiveRCAs: analyses.filter(a => a.analysis?.rcaAssessment?.rcaConclusive?.verdict === true).length,
    actionableRCAs: analyses.filter(a => a.analysis?.rcaAssessment?.rcaActionable?.verdict === true).length,
  };
}

/**
 * Compute resolution statistics
 */
function computeResolutionStats(analyses) {
  const resolvers = {};
  const methods = {};
  
  analyses.forEach(a => {
    const resolver = a.analysis?.resolutionAnalysis?.resolvedBy?.who || 'Unknown';
    const method = a.analysis?.resolutionAnalysis?.resolutionMethod || 'Unknown';
    
    resolvers[resolver] = (resolvers[resolver] || 0) + 1;
    methods[method] = (methods[method] || 0) + 1;
  });
  
  const selfResolved = analyses.filter(a => 
    a.analysis?.resolutionAnalysis?.wasSelfResolved?.verdict === true
  ).length;
  
  return {
    byResolver: Object.entries(resolvers)
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / analyses.length) * 100) }))
      .sort((a, b) => b.count - a.count),
    byMethod: Object.entries(methods)
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / analyses.length) * 100) }))
      .sort((a, b) => b.count - a.count),
    selfResolvedCount: selfResolved,
    selfResolvedPercentage: Math.round((selfResolved / analyses.length) * 100),
  };
}

export default {
  aggregateAnalyses,
};
