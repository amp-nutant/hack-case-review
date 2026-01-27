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
} from '@nutanix-ui/prism-reactjs';
import styles from './ActionCenter.module.css';

const mockActions = [
  {
    id: 1,
    type: 'critical',
    title: 'High Priority Cases Need Attention',
    description: '5 cases marked as critical priority require immediate review',
    count: 5,
  },
  {
    id: 2,
    type: 'warning',
    title: 'Cases Approaching SLA',
    description: '12 cases are within 24 hours of SLA breach',
    count: 12,
  },
  {
    id: 3,
    type: 'info',
    title: 'Similar Issue Cluster Detected',
    description: 'AI detected 3 clusters of similar issues that may benefit from bulk resolution',
    count: 3,
  },
  {
    id: 4,
    type: 'success',
    title: 'Auto-Resolution Candidates',
    description: '8 cases match patterns that were previously resolved with known solutions',
    count: 8,
  },
];

const mockMetrics = [
  { label: 'Total Cases', value: '156', change: '+12%', positive: true },
  { label: 'Open Cases', value: '89', change: '-5%', positive: true },
  { label: 'Avg Resolution Time', value: '4.2h', change: '-18%', positive: true },
  { label: 'Customer Satisfaction', value: '94%', change: '+3%', positive: true },
];

function ActionCenter() {
  const { report } = useOutletContext();

  const getActionBadgeColor = (type) => {
    const colorMap = {
      critical: 'red',
      warning: 'orange',
      info: 'blue',
      success: 'green',
    };
    return colorMap[type] || 'gray';
  };

  return (
    <StackingLayout itemSpacing="24px" className={styles.actionCenter}>
      <FlexLayout flexDirection="column" itemSpacing="4px">
        <Title size="h3">Action Center</Title>
        <TextLabel type="secondary">
          AI-powered recommendations and action items for your case review
        </TextLabel>
      </FlexLayout>

      {/* Metrics Cards */}
      <FlexLayout itemSpacing="16px" flexWrap="wrap">
        {mockMetrics.map((metric, index) => (
          <FlexItem key={index} className={styles.metricCardWrapper}>
            <DashboardWidgetLayout
              className={styles.metricCard}
              bodyContent={
                <StackingLayout itemSpacing="8px" padding="20px">
                  <TextLabel type="secondary" className={styles.metricLabel}>
                    {metric.label}
                  </TextLabel>
                  <FlexLayout alignItems="flex-end" itemSpacing="8px">
                    <Title size="h2" className={styles.metricValue}>
                      {metric.value}
                    </Title>
                    <Badge
                      color={metric.positive ? 'green' : 'red'}
                      label={metric.change}
                    />
                  </FlexLayout>
                </StackingLayout>
              }
            />
          </FlexItem>
        ))}
      </FlexLayout>

      {/* Action Items */}
      <DashboardWidgetLayout
        header={
          <DashboardWidgetHeader
            title="Recommended Actions"
            showCloseIcon={false}
          />
        }
        bodyContent={
          <StackingLayout itemSpacing="12px" padding="16px">
            {mockActions.map((action) => (
              <FlexLayout
                key={action.id}
                className={`${styles.actionCard} ${styles[action.type]}`}
                justifyContent="space-between"
                alignItems="center"
                padding="16px"
              >
                <FlexItem flexGrow="1">
                  <FlexLayout alignItems="center" itemSpacing="12px">
                    <Badge
                      color={getActionBadgeColor(action.type)}
                      label={action.type.toUpperCase()}
                    />
                    <FlexLayout flexDirection="column" itemSpacing="4px">
                      <Title size="h5">{action.title}</Title>
                      <TextLabel type="secondary">{action.description}</TextLabel>
                    </FlexLayout>
                  </FlexLayout>
                </FlexItem>
                <FlexItem>
                  <div className={styles.actionCount}>{action.count}</div>
                </FlexItem>
              </FlexLayout>
            ))}
          </StackingLayout>
        }
      />
    </StackingLayout>
  );
}

export default ActionCenter;
