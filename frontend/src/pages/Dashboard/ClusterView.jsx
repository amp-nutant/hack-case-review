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
} from '@nutanix-ui/prism-reactjs';
import { mockClusters } from '../../data/mockAnalysis';
import styles from './ClusterView.module.css';

function ClusterView() {
  const { reportId } = useOutletContext();

  return (
    <StackingLayout itemSpacing="24px" className={styles.clusterView} padding="24px">
      <FlexLayout flexDirection="column" itemSpacing="4px">
        <Title size="h3">Clusters / Similar Issues</Title>
        <TextLabel type="secondary">
          AI-detected patterns and grouped similar issues for efficient resolution
        </TextLabel>
      </FlexLayout>

      {/* Balloon Chart Visualization */}
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
              {mockClusters.map((cluster, index) => (
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
                >
                  <span className={styles.bubbleCount}>{cluster.count}</span>
                  <span className={styles.bubbleLabel}>{cluster.name}</span>
                </div>
              ))}
            </div>
          </div>
        }
      />

      {/* Top Issues List */}
      <DashboardWidgetLayout
        header={
          <DashboardWidgetHeader
            title="Top Issue Categories"
            showCloseIcon={false}
          />
        }
        bodyContent={
          <StackingLayout itemSpacing="16px" padding="16px">
            {mockClusters.map((cluster, index) => (
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
                    <TextLabel type="secondary">{cluster.description}</TextLabel>
                    <Progress percent={cluster.percentage} />
                  </StackingLayout>
                </FlexItem>
              </FlexLayout>
            ))}
          </StackingLayout>
        }
      />

      {/* Insights Section */}
      <FlexLayout itemSpacing="16px" flexWrap="wrap">
        <FlexItem className={styles.insightCardWrapper}>
          <DashboardWidgetLayout
            className={styles.insightCard}
            header={
              <DashboardWidgetHeader
                title="🔍 Pattern Detected"
                showCloseIcon={false}
              />
            }
            bodyContent={
              <StackingLayout padding="16px">
                <TextLabel>
                  35% of network-related issues occur within 2 hours of configuration changes
                </TextLabel>
              </StackingLayout>
            }
          />
        </FlexItem>
        <FlexItem className={styles.insightCardWrapper}>
          <DashboardWidgetLayout
            className={styles.insightCard}
            header={
              <DashboardWidgetHeader
                title="💡 Recommended Action"
                showCloseIcon={false}
              />
            }
            bodyContent={
              <StackingLayout padding="16px">
                <TextLabel>
                  Consider implementing pre-change validation checks to reduce configuration errors
                </TextLabel>
              </StackingLayout>
            }
          />
        </FlexItem>
        <FlexItem className={styles.insightCardWrapper}>
          <DashboardWidgetLayout
            className={styles.insightCard}
            header={
              <DashboardWidgetHeader
                title="📈 Trend Alert"
                showCloseIcon={false}
              />
            }
            bodyContent={
              <StackingLayout padding="16px">
                <TextLabel>
                  Storage-related issues have increased by 15% compared to last month
                </TextLabel>
              </StackingLayout>
            }
          />
        </FlexItem>
      </FlexLayout>
    </StackingLayout>
  );
}

export default ClusterView;
