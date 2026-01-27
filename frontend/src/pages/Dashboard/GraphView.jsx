import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FlexLayout,
  FlexItem,
  Title,
  TextLabel,
  Button,
  StackingLayout,
  DashboardWidgetLayout,
  DashboardWidgetHeader,
  Tabs,
} from '@nutanix-ui/prism-reactjs';
import styles from './GraphView.module.css';

const chartTypes = [
  { key: 'priority', label: 'Priority Distribution' },
  { key: 'status', label: 'Status Overview' },
  { key: 'timeline', label: 'Cases Over Time' },
  { key: 'assignee', label: 'By Assignee' },
  { key: 'category', label: 'Category Breakdown' },
  { key: 'resolution', label: 'Resolution Time' },
];

// Mock chart data
const mockChartData = {
  priority: [
    { label: 'Critical', value: 12, color: '#ef4444' },
    { label: 'High', value: 28, color: '#f97316' },
    { label: 'Medium', value: 45, color: '#eab308' },
    { label: 'Low', value: 71, color: '#22c55e' },
  ],
  status: [
    { label: 'Open', value: 45, color: '#3b82f6' },
    { label: 'In Progress', value: 38, color: '#eab308' },
    { label: 'Resolved', value: 52, color: '#22c55e' },
    { label: 'Closed', value: 21, color: '#6b7280' },
  ],
};

function GraphView() {
  const { reportId } = useOutletContext();
  const [selectedChart, setSelectedChart] = useState('priority');

  const currentData = mockChartData[selectedChart] || mockChartData.priority;
  const maxValue = Math.max(...currentData.map((d) => d.value));

  const handleTabClick = (key) => {
    setSelectedChart(key);
  };

  return (
    <StackingLayout itemSpacing="24px" className={styles.graphView}>
      <FlexLayout flexDirection="column" itemSpacing="4px">
        <Title size="h3">Charts & Graphs</Title>
        <TextLabel type="secondary">
          Visual analytics and insights from your case data
        </TextLabel>
      </FlexLayout>

      {/* Chart Type Selector using Tabs */}
      <Tabs
        data={chartTypes}
        defaultActiveKey={selectedChart}
        onTabClick={handleTabClick}
        adaptive
      />

      {/* Main Chart Area */}
      <DashboardWidgetLayout
        header={
          <DashboardWidgetHeader
            title={chartTypes.find((c) => c.key === selectedChart)?.label || 'Chart'}
            showCloseIcon={false}
            selectProps={null}
          />
        }
        bodyContent={
          <FlexLayout className={styles.chartArea} itemSpacing="40px">
            {/* Bar Chart */}
            <FlexItem flexGrow="1">
              <StackingLayout itemSpacing="16px" className={styles.barChart}>
                {currentData.map((item, index) => (
                  <FlexLayout key={index} alignItems="center" itemSpacing="16px">
                    <TextLabel className={styles.barLabel}>{item.label}</TextLabel>
                    <FlexItem flexGrow="1">
                      <div className={styles.barContainer}>
                        <div
                          className={styles.bar}
                          style={{
                            width: `${(item.value / maxValue) * 100}%`,
                            backgroundColor: item.color,
                          }}
                        >
                          <span className={styles.barValue}>{item.value}</span>
                        </div>
                      </div>
                    </FlexItem>
                  </FlexLayout>
                ))}
              </StackingLayout>
            </FlexItem>

            {/* Donut Chart */}
            <FlexItem>
              <FlexLayout flexDirection="column" alignItems="center" itemSpacing="24px">
                <div className={styles.donutPlaceholder}>
                  <svg viewBox="0 0 200 200" className={styles.donutSvg}>
                    {currentData.map((item, index) => {
                      const total = currentData.reduce((sum, d) => sum + d.value, 0);
                      const percentage = (item.value / total) * 100;
                      const offset = currentData
                        .slice(0, index)
                        .reduce((sum, d) => sum + (d.value / total) * 100, 0);
                      
                      return (
                        <circle
                          key={index}
                          cx="100"
                          cy="100"
                          r="80"
                          fill="transparent"
                          stroke={item.color}
                          strokeWidth="30"
                          strokeDasharray={`${percentage * 5.02} ${502 - percentage * 5.02}`}
                          strokeDashoffset={-offset * 5.02}
                          transform="rotate(-90 100 100)"
                        />
                      );
                    })}
                  </svg>
                  <div className={styles.donutCenter}>
                    <Title size="h2">
                      {currentData.reduce((sum, d) => sum + d.value, 0)}
                    </Title>
                    <TextLabel type="secondary">Total Cases</TextLabel>
                  </div>
                </div>

                {/* Legend */}
                <FlexLayout flexWrap="wrap" justifyContent="center" itemSpacing="16px">
                  {currentData.map((item, index) => (
                    <FlexLayout key={index} alignItems="center" itemSpacing="8px">
                      <span
                        className={styles.legendColor}
                        style={{ backgroundColor: item.color }}
                      />
                      <TextLabel>{item.label}</TextLabel>
                      <TextLabel type="secondary">{item.value}</TextLabel>
                    </FlexLayout>
                  ))}
                </FlexLayout>
              </FlexLayout>
            </FlexItem>
          </FlexLayout>
        }
      />

      {/* Quick Stats */}
      <FlexLayout itemSpacing="16px" flexWrap="wrap">
        {[
          { label: 'Total Cases', value: '156' },
          { label: 'Avg. Resolution', value: '4.2h' },
          { label: 'SLA Compliance', value: '94%' },
          { label: 'Escalation Rate', value: '8%' },
        ].map((stat, index) => (
          <FlexItem key={index} className={styles.statCardWrapper}>
            <DashboardWidgetLayout
              className={styles.statCard}
              bodyContent={
                <StackingLayout padding="20px" alignItems="center">
                  <TextLabel type="secondary">{stat.label}</TextLabel>
                  <Title size="h2">{stat.value}</Title>
                </StackingLayout>
              }
            />
          </FlexItem>
        ))}
      </FlexLayout>
    </StackingLayout>
  );
}

export default GraphView;
