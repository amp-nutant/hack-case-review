import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FlexLayout,
  FlexItem,
  Title,
  TextLabel,
  StackingLayout,
  DashboardWidgetLayout,
  DashboardWidgetHeader,
  Badge,
  Progress,
  Select,
  Input,
  Button,
  Loader,
  Table,
} from '@nutanix-ui/prism-reactjs';
import { mockClusters } from '../../data/mockAnalysis';
import { analysisApi } from '../../services/analysisApi';
import styles from './ClusterView.module.css';

function ClusterView() {
  const { reportId } = useOutletContext();
  
  // State for data
  const [aggregatedData, setAggregatedData] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    issueType: '',
    complexity: '',
    sentiment: '',
    isBug: '',
    keyword: '',
  });
  
  // Active view state
  const [activeView, setActiveView] = useState('clusters'); // clusters, buckets, cases
  const [selectedBucket, setSelectedBucket] = useState('byIssueType');

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await analysisApi.getAggregatedAnalysis();
      setAggregatedData(response.data);
      setClusters(response.data.clusters || []);
      setCases(response.data.cases || []);
    } catch (err) {
      console.error('Error fetching aggregated analysis:', err);
      setError('Failed to load analysis data. Using mock data.');
      // Fall back to mock data
      setClusters(mockClusters);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredCases = async () => {
    try {
      const response = await analysisApi.getCaseList(filters);
      setCases(response.data.cases || []);
    } catch (err) {
      console.error('Error fetching filtered cases:', err);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    fetchFilteredCases();
  };

  const clearFilters = () => {
    setFilters({
      issueType: '',
      complexity: '',
      sentiment: '',
      isBug: '',
      keyword: '',
    });
    if (aggregatedData) {
      setCases(aggregatedData.cases || []);
    }
  };

  // Get unique values for filter dropdowns
  const getUniqueValues = (field) => {
    if (!cases || cases.length === 0) return [];
    const values = [...new Set(cases.map(c => c[field]).filter(Boolean))];
    return values.map(v => ({ key: v, label: v }));
  };

  // Render loading state
  if (loading) {
    return (
      <StackingLayout itemSpacing="24px" className={styles.clusterView} padding="24px">
        <FlexLayout justifyContent="center" alignItems="center" style={{ minHeight: '400px' }}>
          <Loader />
        </FlexLayout>
      </StackingLayout>
    );
  }

  const bucketOptions = [
    { key: 'byIssueType', label: 'By Issue Type' },
    { key: 'byResolutionType', label: 'By Resolution Type' },
    { key: 'byTechnicalComplexity', label: 'By Complexity' },
    { key: 'byFaultAttribution', label: 'By Fault Attribution' },
    { key: 'byProductArea', label: 'By Product Area' },
    { key: 'byProblemCategory', label: 'By Problem Category' },
    { key: 'byCustomerSentiment', label: 'By Customer Sentiment' },
    { key: 'byResolutionQuality', label: 'By Quality Score' },
  ];

  const currentBucket = aggregatedData?.buckets?.[selectedBucket] || [];

  return (
    <StackingLayout itemSpacing="24px" className={styles.clusterView} padding="24px">
      {/* Header */}
      <FlexLayout justifyContent="space-between" alignItems="center">
        <FlexLayout flexDirection="column" itemSpacing="4px">
          <Title size="h3">Case Analysis Dashboard</Title>
          <TextLabel type="secondary">
            {aggregatedData?.metadata?.totalCases || 0} cases analyzed | 
            Generated: {aggregatedData?.metadata?.generatedAt ? new Date(aggregatedData.metadata.generatedAt).toLocaleString() : 'N/A'}
          </TextLabel>
        </FlexLayout>
        <FlexLayout itemSpacing="8px">
          <Button
            type={activeView === 'clusters' ? 'primary' : 'secondary'}
            onClick={() => setActiveView('clusters')}
          >
            Clusters
          </Button>
          <Button
            type={activeView === 'buckets' ? 'primary' : 'secondary'}
            onClick={() => setActiveView('buckets')}
          >
            Buckets
          </Button>
          <Button
            type={activeView === 'cases' ? 'primary' : 'secondary'}
            onClick={() => setActiveView('cases')}
          >
            Cases
          </Button>
        </FlexLayout>
      </FlexLayout>

      {error && (
        <DashboardWidgetLayout
          bodyContent={
            <FlexLayout padding="16px" alignItems="center" itemSpacing="8px">
              <TextLabel type="secondary">{error}</TextLabel>
              <Button type="secondary" onClick={fetchData}>Retry</Button>
            </FlexLayout>
          }
        />
      )}

      {/* Clusters View */}
      {activeView === 'clusters' && (
        <>
          {/* Bubble Chart */}
          <DashboardWidgetLayout
            header={
              <DashboardWidgetHeader
                title="Issue Clusters Visualization"
                showCloseIcon={false}
              />
            }
            bodyContent={
              <div className={styles.balloonChart}>
                <div className={styles.chartPlaceholder}>
                  {(clusters.length > 0 ? clusters : mockClusters).map((cluster, index) => (
                    <div
                      key={cluster.id}
                      className={styles.bubble}
                      style={{
                        width: `${Math.min(cluster.count * 15 + 60, 200)}px`,
                        height: `${Math.min(cluster.count * 15 + 60, 200)}px`,
                        left: `${15 + (index % 4) * 22}%`,
                        top: `${20 + Math.floor(index / 4) * 35}%`,
                        backgroundColor: cluster.color,
                      }}
                      title={`${cluster.name}: ${cluster.count} cases (${cluster.percentage}%)`}
                    >
                      <span className={styles.bubbleCount}>{cluster.count}</span>
                      <span className={styles.bubbleLabel}>{cluster.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            }
          />

          {/* Clusters List */}
          <DashboardWidgetLayout
            header={
              <DashboardWidgetHeader
                title="Top Issue Clusters"
                showCloseIcon={false}
              />
            }
            bodyContent={
              <StackingLayout itemSpacing="16px" padding="16px">
                {(clusters.length > 0 ? clusters : mockClusters).slice(0, 10).map((cluster, index) => (
                  <FlexLayout
                    key={cluster.id}
                    className={styles.issueCard}
                    alignItems="center"
                    itemSpacing="16px"
                  >
                    <div
                      className={styles.issueRank}
                      style={{ backgroundColor: cluster.color }}
                    >
                      {index + 1}
                    </div>
                    <FlexItem flexGrow="1">
                      <StackingLayout itemSpacing="8px">
                        <FlexLayout justifyContent="space-between" alignItems="center">
                          <FlexLayout alignItems="center" itemSpacing="12px">
                            <TextLabel className={styles.issueName}>{cluster.name}</TextLabel>
                            <Badge color="gray" label={`${cluster.count} cases`} />
                          </FlexLayout>
                          <TextLabel type="secondary">{cluster.percentage}%</TextLabel>
                        </FlexLayout>
                        {cluster.keywords && cluster.keywords.length > 0 && (
                          <FlexLayout itemSpacing="4px" flexWrap="wrap">
                            {cluster.keywords.slice(0, 5).map((kw, i) => (
                              <Badge key={i} color="blue" label={kw} />
                            ))}
                          </FlexLayout>
                        )}
                        <Progress percent={cluster.percentage} />
                      </StackingLayout>
                    </FlexItem>
                  </FlexLayout>
                ))}
              </StackingLayout>
            }
          />
        </>
      )}

      {/* Buckets View */}
      {activeView === 'buckets' && (
        <>
          {/* Bucket Selector */}
          <DashboardWidgetLayout
            header={
              <DashboardWidgetHeader
                title="Bucketing Analysis"
                showCloseIcon={false}
              />
            }
            bodyContent={
              <StackingLayout padding="16px" itemSpacing="16px">
                <FlexLayout alignItems="center" itemSpacing="16px">
                  <TextLabel>View by:</TextLabel>
                  <Select
                    style={{ width: '250px' }}
                    value={selectedBucket}
                    onChange={(value) => setSelectedBucket(value)}
                    rowsData={bucketOptions}
                  />
                </FlexLayout>
                
                {/* Bucket bars */}
                <StackingLayout itemSpacing="12px">
                  {currentBucket.map((bucket, index) => (
                    <FlexLayout key={index} alignItems="center" itemSpacing="16px">
                      <TextLabel style={{ width: '200px', textAlign: 'right' }}>
                        {bucket.name}
                      </TextLabel>
                      <FlexItem flexGrow="1">
                        <div style={{ 
                          height: '24px', 
                          backgroundColor: '#e5e7eb', 
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${bucket.percentage}%`,
                            backgroundColor: getBarColor(index),
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: '8px',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            minWidth: bucket.percentage > 5 ? 'auto' : '30px',
                          }}>
                            {bucket.count}
                          </div>
                        </div>
                      </FlexItem>
                      <TextLabel style={{ width: '50px' }}>{bucket.percentage}%</TextLabel>
                    </FlexLayout>
                  ))}
                </StackingLayout>
              </StackingLayout>
            }
          />

          {/* Statistics Cards */}
          {aggregatedData?.qualityMetrics && (
            <FlexLayout itemSpacing="16px" flexWrap="wrap">
              {Object.entries(aggregatedData.qualityMetrics).map(([key, value]) => (
                <DashboardWidgetLayout
                  key={key}
                  style={{ flex: '1 1 200px', minWidth: '200px' }}
                  header={
                    <DashboardWidgetHeader
                      title={formatMetricName(key)}
                      showCloseIcon={false}
                    />
                  }
                  bodyContent={
                    <StackingLayout padding="16px" alignItems="center">
                      <Title size="h2" style={{ color: getScoreColor(value.avg) }}>
                        {value.avg}/10
                      </Title>
                      <TextLabel type="secondary">
                        Range: {value.min} - {value.max}
                      </TextLabel>
                    </StackingLayout>
                  }
                />
              ))}
            </FlexLayout>
          )}
        </>
      )}

      {/* Cases View with Filtering */}
      {activeView === 'cases' && (
        <>
          {/* Filters */}
          <DashboardWidgetLayout
            header={
              <DashboardWidgetHeader
                title="Filter Cases"
                showCloseIcon={false}
              />
            }
            bodyContent={
              <FlexLayout padding="16px" itemSpacing="16px" flexWrap="wrap" alignItems="flex-end">
                <StackingLayout itemSpacing="4px">
                  <TextLabel type="secondary">Issue Type</TextLabel>
                  <Select
                    style={{ width: '150px' }}
                    placeholder="All"
                    value={filters.issueType}
                    onChange={(value) => handleFilterChange('issueType', value)}
                    rowsData={[
                      { key: '', label: 'All' },
                      { key: 'Bug', label: 'Bug' },
                      { key: 'Configuration', label: 'Configuration' },
                      { key: 'Performance', label: 'Performance' },
                      { key: 'Unknown', label: 'Unknown' },
                    ]}
                  />
                </StackingLayout>
                
                <StackingLayout itemSpacing="4px">
                  <TextLabel type="secondary">Complexity</TextLabel>
                  <Select
                    style={{ width: '150px' }}
                    placeholder="All"
                    value={filters.complexity}
                    onChange={(value) => handleFilterChange('complexity', value)}
                    rowsData={[
                      { key: '', label: 'All' },
                      { key: 'Low', label: 'Low' },
                      { key: 'Medium', label: 'Medium' },
                      { key: 'High', label: 'High' },
                    ]}
                  />
                </StackingLayout>
                
                <StackingLayout itemSpacing="4px">
                  <TextLabel type="secondary">Sentiment</TextLabel>
                  <Select
                    style={{ width: '150px' }}
                    placeholder="All"
                    value={filters.sentiment}
                    onChange={(value) => handleFilterChange('sentiment', value)}
                    rowsData={[
                      { key: '', label: 'All' },
                      { key: 'Positive', label: 'Positive' },
                      { key: 'Neutral', label: 'Neutral' },
                      { key: 'Negative', label: 'Negative' },
                      { key: 'Mixed', label: 'Mixed' },
                    ]}
                  />
                </StackingLayout>
                
                <StackingLayout itemSpacing="4px">
                  <TextLabel type="secondary">Is Bug?</TextLabel>
                  <Select
                    style={{ width: '100px' }}
                    placeholder="All"
                    value={filters.isBug}
                    onChange={(value) => handleFilterChange('isBug', value)}
                    rowsData={[
                      { key: '', label: 'All' },
                      { key: 'true', label: 'Yes' },
                      { key: 'false', label: 'No' },
                    ]}
                  />
                </StackingLayout>
                
                <StackingLayout itemSpacing="4px">
                  <TextLabel type="secondary">Keyword</TextLabel>
                  <Input
                    style={{ width: '200px' }}
                    placeholder="Search..."
                    value={filters.keyword}
                    onChange={(e) => handleFilterChange('keyword', e.target.value)}
                  />
                </StackingLayout>
                
                <Button type="primary" onClick={applyFilters}>Apply</Button>
                <Button type="secondary" onClick={clearFilters}>Clear</Button>
              </FlexLayout>
            }
          />

          {/* Cases Table */}
          <DashboardWidgetLayout
            header={
              <DashboardWidgetHeader
                title={`Cases (${cases.length})`}
                showCloseIcon={false}
              />
            }
            bodyContent={
              <div style={{ padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Case #</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Summary</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Complexity</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Score</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Sentiment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((caseItem, index) => (
                      <tr 
                        key={caseItem.caseNumber} 
                        style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                        }}
                      >
                        <td style={{ padding: '12px' }}>
                          <Badge color="blue" label={caseItem.caseNumber} />
                        </td>
                        <td style={{ padding: '12px', maxWidth: '300px' }}>
                          <TextLabel style={{ 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block'
                          }}>
                            {caseItem.brief}
                          </TextLabel>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Badge 
                            color={caseItem.isBug ? 'red' : 'gray'} 
                            label={caseItem.issueType} 
                          />
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Badge 
                            color={getComplexityColor(caseItem.complexity)} 
                            label={caseItem.complexity} 
                          />
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{ 
                            fontWeight: 'bold', 
                            color: getScoreColor(caseItem.overallScore) 
                          }}>
                            {caseItem.overallScore}/10
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Badge 
                            color={getSentimentColor(caseItem.sentiment)} 
                            label={caseItem.sentiment} 
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cases.length === 0 && (
                  <FlexLayout justifyContent="center" padding="40px">
                    <TextLabel type="secondary">No cases found matching filters</TextLabel>
                  </FlexLayout>
                )}
              </div>
            }
          />
        </>
      )}

      {/* Insights Section - Always visible */}
      <FlexLayout itemSpacing="16px" flexWrap="wrap">
        <FlexItem className={styles.insightCardWrapper} style={{ flex: '1 1 300px' }}>
          <DashboardWidgetLayout
            className={styles.insightCard}
            header={
              <DashboardWidgetHeader
                title="Classifications"
                showCloseIcon={false}
              />
            }
            bodyContent={
              <StackingLayout padding="16px" itemSpacing="8px">
                <FlexLayout justifyContent="space-between">
                  <TextLabel>Bugs:</TextLabel>
                  <Badge color="red" label={`${aggregatedData?.classifications?.bugs?.count || 0} cases`} />
                </FlexLayout>
                <FlexLayout justifyContent="space-between">
                  <TextLabel>Config Issues:</TextLabel>
                  <Badge color="orange" label={`${aggregatedData?.classifications?.configurationIssues?.count || 0} cases`} />
                </FlexLayout>
                <FlexLayout justifyContent="space-between">
                  <TextLabel>Customer Errors:</TextLabel>
                  <Badge color="yellow" label={`${aggregatedData?.classifications?.customerErrors?.count || 0} cases`} />
                </FlexLayout>
                <FlexLayout justifyContent="space-between">
                  <TextLabel>Non-Nutanix:</TextLabel>
                  <Badge color="gray" label={`${aggregatedData?.classifications?.nonNutanixIssues?.count || 0} cases`} />
                </FlexLayout>
              </StackingLayout>
            }
          />
        </FlexItem>
        
        <FlexItem className={styles.insightCardWrapper} style={{ flex: '1 1 300px' }}>
          <DashboardWidgetLayout
            className={styles.insightCard}
            header={
              <DashboardWidgetHeader
                title="RCA Statistics"
                showCloseIcon={false}
              />
            }
            bodyContent={
              <StackingLayout padding="16px" itemSpacing="8px">
                <FlexLayout justifyContent="space-between">
                  <TextLabel>RCA Performed:</TextLabel>
                  <TextLabel>{aggregatedData?.rcaStats?.rcaPerformedPercentage || 0}%</TextLabel>
                </FlexLayout>
                <FlexLayout justifyContent="space-between">
                  <TextLabel>Avg RCA Quality:</TextLabel>
                  <TextLabel>{aggregatedData?.rcaStats?.avgRCAQuality || 0}/10</TextLabel>
                </FlexLayout>
                <FlexLayout justifyContent="space-between">
                  <TextLabel>Conclusive RCAs:</TextLabel>
                  <TextLabel>{aggregatedData?.rcaStats?.conclusiveRCAs || 0}</TextLabel>
                </FlexLayout>
                <FlexLayout justifyContent="space-between">
                  <TextLabel>Actionable RCAs:</TextLabel>
                  <TextLabel>{aggregatedData?.rcaStats?.actionableRCAs || 0}</TextLabel>
                </FlexLayout>
              </StackingLayout>
            }
          />
        </FlexItem>
        
        <FlexItem className={styles.insightCardWrapper} style={{ flex: '1 1 300px' }}>
          <DashboardWidgetLayout
            className={styles.insightCard}
            header={
              <DashboardWidgetHeader
                title="Tag Accuracy"
                showCloseIcon={false}
              />
            }
            bodyContent={
              <StackingLayout padding="16px" itemSpacing="8px">
                <FlexLayout justifyContent="space-between">
                  <TextLabel>Open Tags Avg:</TextLabel>
                  <TextLabel style={{ color: getScoreColor(aggregatedData?.tagAnalysis?.openTagsAccuracy?.avg) }}>
                    {aggregatedData?.tagAnalysis?.openTagsAccuracy?.avg || 0}/10
                  </TextLabel>
                </FlexLayout>
                <FlexLayout justifyContent="space-between">
                  <TextLabel>Close Tags Avg:</TextLabel>
                  <TextLabel style={{ color: getScoreColor(aggregatedData?.tagAnalysis?.closeTagsAccuracy?.avg) }}>
                    {aggregatedData?.tagAnalysis?.closeTagsAccuracy?.avg || 0}/10
                  </TextLabel>
                </FlexLayout>
                {aggregatedData?.tagAnalysis?.commonMissingTags?.slice(0, 2).map((tag, i) => (
                  <FlexLayout key={i} justifyContent="space-between">
                    <TextLabel type="secondary">Missing: {tag.tag}</TextLabel>
                    <Badge color="red" label={`${tag.count}x`} />
                  </FlexLayout>
                ))}
              </StackingLayout>
            }
          />
        </FlexItem>
      </FlexLayout>
    </StackingLayout>
  );
}

// Helper functions
function getBarColor(index) {
  const colors = ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];
  return colors[index % colors.length];
}

function formatMetricName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function getScoreColor(score) {
  if (score >= 8) return '#22c55e';
  if (score >= 6) return '#eab308';
  if (score >= 4) return '#f97316';
  return '#ef4444';
}

function getComplexityColor(complexity) {
  switch (complexity?.toLowerCase()) {
    case 'low': return 'green';
    case 'medium': return 'yellow';
    case 'high': return 'red';
    default: return 'gray';
  }
}

function getSentimentColor(sentiment) {
  switch (sentiment?.toLowerCase()) {
    case 'positive': return 'green';
    case 'neutral': return 'gray';
    case 'negative': return 'red';
    case 'mixed': return 'yellow';
    default: return 'gray';
  }
}

export default ClusterView;
