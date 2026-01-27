import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  TextLabel,
  Badge,
  Progress,
  FlexLayout,
  OrderedList,
  Alert,
  AIIcon,
  Button,
} from '@nutanix-ui/prism-reactjs';
import { MiniCard, BigCard } from '../../components/common';
import { mockDashboardData } from '../../data/mockDashboard';
import './DashboardOverview.css';

function DashboardOverview() {
  const { reportId } = useOutletContext();
  const navigate = useNavigate();
  const data = mockDashboardData;

  return (
    <FlexLayout flexDirection="column" itemGap='L' style={{ padding: '12px' }} flexWrap='wrap'>

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
        <MiniCard title="Clusters Identified" count={data.clusters.total} />
        <MiniCard title="Actions Required" count={data.actions.total} />
        <MiniCard title="KB/JIRA Issues" count={data.kbJiraIssues.total} />
        <MiniCard title="Components Involved" count={data.components.total} />
      </FlexLayout>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Issue Clusters */}
        <BigCard
          title="Issue Clusters"
          linkTitle="View All"
          linkRoute={`/dashboard/${reportId}/clusters`}
        >
          <OrderedList
            data={data.clusters.topIssues.map((issue) => (
              <FlexLayout
                key={issue.id}
                justifyContent="space-between"
                alignItems="center"
                style={{ width: '100%'}}
              >
                <TextLabel type={ TextLabel.TEXT_LABEL_TYPE.PRIMARY} >{issue.name}</TextLabel>
                <Badge color="gray" count={`${issue.count} cases`} />
              </FlexLayout>
            ))}
          />
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

        {/* Top Components */}
        <BigCard
          title="Top Components"
          linkTitle="View Charts"
          linkRoute={`/dashboard/${reportId}/graphs`}
        >
          {data.components.topComponents.map((comp, idx) => {
            // Color based on percentage: high = danger (red), medium = warning, low = success (green)
            const getStatusByPercentage = (percent) => {
              if (percent >= 25) return Progress.ProgressStatus.DANGER;
              if (percent >= 20) return Progress.ProgressStatus.WARNING;
              return Progress.ProgressStatus.SUCCESS;
            };
            return (
              <Progress
                key={idx}
                labelPosition="top"
                percent={comp.percentage}
                status={getStatusByPercentage(comp.percentage)}
                label={
                  <FlexLayout justifyContent="space-between" alignItems="center">
                    <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{comp.name}</TextLabel>
                    <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>{comp.percentage}%</TextLabel>
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
