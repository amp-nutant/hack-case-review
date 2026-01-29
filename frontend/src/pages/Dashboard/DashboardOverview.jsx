import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  TextLabel,
  Badge,
  Progress,
  FlexLayout,
  Alert,
  AIIcon,
  Button,
  Title,
  Loader,
  StackingLayout,
} from '@nutanix-ui/prism-reactjs';
import { MiniCard, BigCard } from '../../components/common';
import { mockDashboardData } from '../../data/mockDashboard';
import overviewApi from '../../services/overviewApi';
import './DashboardOverview.css';

function DashboardOverview() {
  const { reportId } = useOutletContext();
  const navigate = useNavigate();
  const [overviewStats, setOverviewStats] = useState({
    totalCases: mockDashboardData.totalCases,
    bucketTotal: mockDashboardData.buckets.total,
    topIssues: mockDashboardData.buckets.topIssues,
    actionsTotal: mockDashboardData.actions.total,
    actionsItems: mockDashboardData.actions.items,
    kbJiraIssuesTotal: mockDashboardData.kbJiraIssues.total,
    kbMissingTotal: mockDashboardData.kbJiraIssues.kbMissing,
    jiraOpenTotal: mockDashboardData.kbJiraIssues.jiraOpen,
    closedTagsTotal: mockDashboardData.closedTags.total,
    closedTagsTopTags: mockDashboardData.closedTags.topTags,
    topKBGaps: mockDashboardData.kbJiraIssues.topKBGaps,
  });
  const [overviewLoading, setOverviewLoading] = useState(true);

  useEffect(() => {
    if (!reportId) {
      return;
    }

    let isActive = true;

    setOverviewLoading(true);
    overviewApi
      .getByReport(reportId)
      .then((response) => {
        if (!isActive) {
          return;
        }

        const totalCases = response?.data?.totalCases;
        const bucketTotal = response?.data?.buckets?.total;
        const topIssues = response?.data?.buckets?.topIssues;
        const actionsTotal = response?.data?.actions?.total;
        const actionsItems = response?.data?.actions?.items;
        const kbJiraIssuesTotal = response?.data?.kbJiraIssues?.total;
        const kbMissingTotal = response?.data?.kbJiraIssues?.kbMissing;
        const jiraOpenTotal = response?.data?.kbJiraIssues?.jiraOpen;
        const topKBGaps = response?.data?.kbJiraIssues?.topKBGaps;
        const closedTagsTotal = response?.data?.closedTags?.total;
        const closedTagsTopTags = response?.data?.closedTags?.topTags;

        setOverviewStats((prev) => ({
          totalCases: Number.isFinite(totalCases) ? totalCases : prev.totalCases,
          bucketTotal: Number.isFinite(bucketTotal) ? bucketTotal : prev.bucketTotal,
          topIssues: Array.isArray(topIssues) && topIssues.length > 0 ? topIssues : prev.topIssues,
          kbJiraIssuesTotal: Number.isFinite(kbJiraIssuesTotal)
            ? kbJiraIssuesTotal
            : prev.kbJiraIssuesTotal,
          actionsTotal: Number.isFinite(actionsTotal) ? actionsTotal : prev.actionsTotal,
          actionsItems: Array.isArray(actionsItems) && actionsItems.length > 0
            ? actionsItems
            : prev.actionsItems,
          kbMissingTotal: Number.isFinite(kbMissingTotal) ? kbMissingTotal : prev.kbMissingTotal,
          jiraOpenTotal: Number.isFinite(jiraOpenTotal) ? jiraOpenTotal : prev.jiraOpenTotal,
          topKBGaps: Array.isArray(topKBGaps) && topKBGaps.length > 0 ? topKBGaps : prev.topKBGaps,
          closedTagsTotal: Number.isFinite(closedTagsTotal)
            ? closedTagsTotal
            : prev.closedTagsTotal,
          closedTagsTopTags:
            Array.isArray(closedTagsTopTags) && closedTagsTopTags.length > 0
              ? closedTagsTopTags
              : prev.closedTagsTopTags,
        }));
      })
      .catch(() => {})
      .finally(() => {
        if (isActive) {
          setOverviewLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [reportId]);

  const data = useMemo(() => {
    const colorMap = new Map(
      mockDashboardData.buckets.items.map((bucket) => [bucket.name, bucket.fill])
    );
    const topIssues = overviewStats.topIssues.map((bucket, index) => ({
      id: bucket.id ?? index + 1,
      name: bucket.name,
      count: bucket.count,
      fill: bucket.fill || colorMap.get(bucket.name) || '#9aa5b5',
    }));

    const closedTagColorMap = new Map(
      mockDashboardData.closedTags.items.map((tag) => [tag.name, tag.fill])
    );
    const topTags = overviewStats.closedTagsTopTags.map((tag, index) => ({
      id: tag.id ?? index + 1,
      name: tag.name,
      count: tag.count,
      percentage: tag.percentage,
      fill: tag.fill || closedTagColorMap.get(tag.name) || '#9aa5b5',
    }));

    return {
      ...mockDashboardData,
      totalCases: overviewStats.totalCases,
      buckets: {
        ...mockDashboardData.buckets,
        total: overviewStats.bucketTotal,
        topIssues,
      },
      actions: {
        ...mockDashboardData.actions,
        total: overviewStats.actionsTotal,
        items: overviewStats.actionsItems,
      },
      kbJiraIssues: {
        ...mockDashboardData.kbJiraIssues,
        total: overviewStats.kbJiraIssuesTotal,
        kbMissing: overviewStats.kbMissingTotal,
        jiraOpen: overviewStats.jiraOpenTotal,
        topKBGaps: overviewStats.topKBGaps,
      },
      closedTags: {
        ...mockDashboardData.closedTags,
        total: overviewStats.closedTagsTotal,
        topTags,
      },
    };
  }, [overviewStats]);

  if (overviewLoading) {
    return (
      <FlexLayout
        alignItems="center"
        justifyContent="center"
        style={{ height: '100%', minHeight: '400px' }}
      >
        <StackingLayout alignItems="center" itemSpacing="16px">
          <Loader />
          <TextLabel>Loading overview...</TextLabel>
        </StackingLayout>
      </FlexLayout>
    );
  }

  return (
    <FlexLayout flexDirection="column" itemGap="M" style={{ padding: '16px 24px' }}>
      {/* Page Header */}
      <FlexLayout justifyContent="space-between" alignItems="center">
        <FlexLayout alignItems="center" itemGap="L">
          <Title size="h2">Overview</Title>
          <FlexLayout alignItems="center" itemGap="S">
            <Badge color="gray" count={`${data.totalCases} cases`} />
            <Badge color="blue" count={data.releaseVersion} />
          </FlexLayout>
        </FlexLayout>
      </FlexLayout>

      {/* AI Insight Alert */}
      <Alert
        type={Alert.AlertTypes.INFO}
        message={
          <FlexLayout justifyContent="space-between" alignItems="center" itemGap="S" style={{ padding: '5px' }}>
            <FlexLayout flexDirection="column" alignItems="center" itemGap="S">
              <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} style={{ lineHeight: '1.2' }}>
                {data.aiInsight.description}
              </TextLabel>
            </FlexLayout>
            <Button style={{ width: '150px' }} onClick={() => navigate(`/dashboard/${reportId}/chat`)}>
              <AIIcon /> Ask AI
            </Button>
          </FlexLayout>
        }
      />
      {/* Metrics Row */}
      <FlexLayout itemGap="S" flexWrap="wrap">
        <MiniCard title="Total Cases" count={data.totalCases} />
        <MiniCard title="Case Buckets Identified" count={data.buckets.total} />
        <MiniCard title="Actions Required" count={data.actions.total} />
        <MiniCard title="KB/JIRA Issues" count={data.kbJiraIssues.total} />
        <MiniCard title="Closed Tags" count={data.closedTags.total} />
      </FlexLayout>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Case Buckets - Ordered List */}
        <BigCard
          title="Top Case Buckets"
          linkTitle="View All Cases"
          linkRoute={`/dashboard/${reportId}/cases`}
        >
          {data.buckets.topIssues.map((bucket, idx) => (
            <FlexLayout
              key={bucket.id}
              justifyContent="space-between"
              alignItems="center"
              style={{ width: '100%' }}
            >
              <FlexLayout alignItems="center" itemGap="S">
                <span style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  backgroundColor: '#9aa5b5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '600',
                }} >
                  {idx + 1}
                </span>
                <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{bucket.name}</TextLabel>
              </FlexLayout>
              <Badge color="gray" count={`${bucket.count} cases`} />
            </FlexLayout>
          ))}
        </BigCard>

        {/* Actions Identified */}
        <BigCard
          title="Actions Identified"
          linkTitle="View All"
          linkRoute={`/dashboard/${reportId}/action-center`}
        >
          {data.actions.items.map((action) => (
            <FlexLayout
              key={action.id}
              justifyContent="space-between"
              alignItems="center"
              style={{ width: '100%' }}
            >
              <FlexLayout alignItems="center" itemGap="M">
                <Badge
                  color={action.priority === 'high' ? 'red' : 'orange'}
                  count={action.priority.toUpperCase()}
                />
                <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY} style={{ lineHeight: '1.2' }}>{action.title}</TextLabel>
              </FlexLayout>
              <Badge color="gray" style={{ width: '75px' }} count={`${action.affectedCases} cases`} />
            </FlexLayout>
          ))}
        </BigCard>

        {/* KB/JIRA Analysis */}
        <BigCard
          title="KB/JIRA Analysis"
          linkTitle="View Cases"
          linkRoute={`/dashboard/${reportId}/cases`}
        >
          {/* Stats Row using MiniCard */}
          <FlexLayout itemGap="S" style={{ marginBottom: '16px' }}>
            <MiniCard title="KB Missing" count={data.kbJiraIssues.kbMissing} countColor="#ef4444" />
            <MiniCard title="KB Outdated" count={data.kbJiraIssues.kbOutdated} countColor="#f97316" />
            <MiniCard title="JIRA Open" count={data.kbJiraIssues.jiraOpen} countColor="#8b5cf6" />
          </FlexLayout>

          {/* Most Frequent Section */}
          <FlexLayout flexDirection="column" itemGap="S">
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>Most Frequent</TextLabel>
            {data.kbJiraIssues.topKBGaps.map((gap, idx) => (
              <FlexLayout key={idx} justifyContent="space-between" alignItems="center" style={{ width: '100%' }}>
                <FlexLayout alignItems="center" itemGap="M">
                  <Badge
                    color={gap.status === 'No Article' ? 'yellow' : 'green'}
                    count={gap.status === 'No Article' ? 'KB' : 'JIRA'}
                  />
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>
                    {gap.label || `${gap.id}: ${gap.title}`}
                  </TextLabel>
                </FlexLayout>
                <Badge color="gray" count={`${gap.caseCount} cases (${gap.percentage}%)`} />
              </FlexLayout>
            ))}
          </FlexLayout>
        </BigCard>

        {/* Top Closed Tags */}
        <BigCard
          title="Top Closed Tags"
          linkTitle="View All Tags"
          linkRoute={`/dashboard/${reportId}/graphs`}
        >
          {data.closedTags.topTags.map((tag) => {
            // Color based on percentage: high = danger (red), medium = warning, low = success (green)
            const getStatusByPercentage = (percent) => {
              if (percent >= 20) return Progress.ProgressStatus.DANGER;
              if (percent >= 15) return Progress.ProgressStatus.WARNING;
              return Progress.ProgressStatus.SUCCESS;
            };
            return (
              <Progress
                key={tag.id}
                labelPosition="top"
                percent={tag.percentage}
                status={getStatusByPercentage(tag.percentage)}
                label={
                  <FlexLayout justifyContent="space-between" alignItems="center">
                    <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{tag.name}</TextLabel>
                    <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>{tag.percentage}%</TextLabel>
                  </FlexLayout>
                }
              />
            );
          })}
        </BigCard>
      </div>

      
    </FlexLayout>
  );
}

export default DashboardOverview;
