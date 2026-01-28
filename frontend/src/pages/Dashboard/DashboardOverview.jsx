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
} from '@nutanix-ui/prism-reactjs';
import { MiniCard, BigCard } from '../../components/common';
import { mockDashboardData } from '../../data/mockDashboard';
import './DashboardOverview.css';

function DashboardOverview() {
  const { reportId } = useOutletContext();
  const navigate = useNavigate();
  const data = mockDashboardData;

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
                  backgroundColor: bucket.fill,
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
                  color={action.priority === 'critical' ? 'red' : 'orange'}
                  count={action.priority.toUpperCase()}
                />
                <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{action.title}</TextLabel>
              </FlexLayout>
              <Badge color="gray" count={`${action.affectedCases} cases`} />
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
                    {gap.id}: {gap.title}
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
