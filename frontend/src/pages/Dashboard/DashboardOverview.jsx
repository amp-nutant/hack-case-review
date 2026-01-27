import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Title,
  TextLabel,
  Badge,
  Button,
  Link,
  Progress,
  FlexLayout,
  OrderedList,
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
                  label={action.priority.toUpperCase()}
                />
                <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{action.title}</TextLabel>
              </FlexLayout>
              <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>
                {action.count || Math.floor(Math.random() * 10) + 5}
              </TextLabel>
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
            <MiniCard title="JIRA Open" count={data.kbJiraIssues.jiraOpen} countColor="#22a5f7" />
          </FlexLayout>

          {/* Top Issues Section */}
          <FlexLayout flexDirection="column" itemGap="S">
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>Top Issues</TextLabel>
            {data.kbJiraIssues.topKBGaps.map((gap, idx) => (
              <FlexLayout key={idx} alignItems="center" itemGap="M">
                <Badge
                  color={gap.status === 'No Article' ? 'yellow' : 'blue'}
                  count={gap.status === 'No Article' ? 'KB' : 'JIRA'}
                />
                <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{gap.title}</TextLabel>
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
            // Assign different colors based on index
            const statusColors = [
              Progress.ProgressStatus.ACTIVE,    // Blue
              Progress.ProgressStatus.ACTIVE,    // Blue
              Progress.ProgressStatus.DANGER,    // Red
              Progress.ProgressStatus.SUCCESS,   // Green
            ];
            return (
              <Progress
                key={idx}
                labelPosition="top"
                percent={comp.percentage}
                status={statusColors[idx] || Progress.ProgressStatus.ACTIVE}
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

      {/* AI Banner */}
      <div className="ai-banner">
        <div className="ai-content">
          <span className="ai-icon">🤖</span>
          <div className="ai-text">
            <TextLabel className="ai-title">AI Analysis Complete</TextLabel>
            <TextLabel className="ai-desc">
              35% of cases relate to storage operations after AOS 6.5 upgrade. Pattern suggests documentation gap in migration procedures.
            </TextLabel>
          </div>
        </div>
        <Button onClick={() => navigate(`/dashboard/${reportId}/chat`)}>Ask AI Questions</Button>
      </div>
    </FlexLayout>
  );
}

export default DashboardOverview;
