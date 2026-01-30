import { useOutletContext } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  FlexLayout,
  Title,
  TextLabel,
  StackingLayout,
  Badge,
  HeaderFooterLayout,
  Select,
  Button,
} from '@nutanix-ui/prism-reactjs';
import { Doughnut, Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { mockDashboardData } from '../../data/mockDashboard';
import styles from './GraphView.module.css';
import reportsApi from '../../services/reportsApi';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// Horizontal Bar Chart Widget Component - good for many items
function HorizontalBarWidget({ title, subtitle, data, total }) {
  const chartData = {
    labels: data.map(d => d.name),
    datasets: [{
      data: data.map(d => d.value),
      backgroundColor: data.map(d => d.fill),
      borderWidth: 0,
      borderRadius: 4,
      barThickness: 20,
    }],
  };

  const options = {
    indexAxis: 'y', // Makes it horizontal
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        callbacks: {
          title: () => '',
          label: (ctx) => `${ctx.raw} cases (${((ctx.raw / total) * 100).toFixed(1)}%)`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0,0,0,0.05)',
        },
        ticks: {
          stepSize: 5,
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
    layout: { padding: { right: 10 } },
  };

  // Calculate dynamic height based on number of items (30px per item + padding)
  const chartHeight = Math.max(300, data.length * 35 + 40);

  return (
    <div className={styles.widgetCard} style={{ width: '100%' }}>
      <HeaderFooterLayout
        header={
          <FlexLayout justifyContent="space-between" alignItems="center" padding="0px-20px">
            <Title size="h3">{title}</Title>
            <FlexLayout alignItems="center" itemSpacing="10px">
              <TextLabel size={TextLabel.TEXT_LABEL_SIZE.SMALL}>{subtitle}</TextLabel>
              <Badge color="blue" count={`${total} total cases`} />
            </FlexLayout>
          </FlexLayout>
        }
        bodyContent={
          <div style={{ padding: '20px', height: chartHeight, width: '100%' }}>
            <Bar data={chartData} options={options} />
          </div>
        }
      />
    </div>
  );
}

// Donut Chart Widget Component
function DonutWidget({ title, subtitle, data, total, centerLabel }) {
  const chartData = {
    labels: data.map(d => d.name),
    datasets: [{
      data: data.map(d => d.value),
      backgroundColor: data.map(d => d.fill),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const options = {
    cutout: '55%',
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        callbacks: {
          title: () => '',
          label: (ctx) => `${ctx.label}: ${ctx.raw} cases (${((ctx.raw / total) * 100).toFixed(1)}%)`,
        },
      },
    },
    layout: { padding: 8 },
  };

  return (
    <div className={styles.widgetCard}>
      <HeaderFooterLayout
        header={
          <FlexLayout justifyContent="space-between" alignItems="center" padding="0px-20px">
            <Title size="h3">{title}</Title>
            <TextLabel size={TextLabel.TEXT_LABEL_SIZE.SMALL}>{subtitle}</TextLabel>
          </FlexLayout>
        }
        bodyContent={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '20px', gap: '40px' }}>
            {/* Donut Chart */}
            <div style={{ width: '180px', height: '180px', position: 'relative', flexShrink: 0 }}>
              <Doughnut data={chartData} options={options} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}>
                <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} style={{ fontSize: '11px' }}>{centerLabel}</TextLabel>
                <Title size="h2">{total}</Title>
              </div>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '2px', 
                      backgroundColor: item.fill,
                      flexShrink: 0,
                    }} />
                    <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{item.name}</TextLabel>
                  </div>
                  <Badge color="gray" count={`${item.value} cases`} />
                </div>
              ))}
            </div>
          </div>
        }
      />
    </div>
  );
}

const actionCategoryMap = {
  'wrong_closed_tags': 'Wrong Closed Tags',
  'open_jiras': 'Open JIRAs',
  'jira_creation': 'JIRA Creation',
  'kb_creation': 'KB Creation',
  'customer_update': 'Customer Update',
  'fixed_jiras': 'Fixed JIRAs',
  'missing_kb': 'Missing KB',
  'kb_creation_recommendations': 'KB Creation Recommendations',
  'jira_creation_needed': 'JIRA Creation Needed',
};

const getColorBasedOnBucketName = (name) => {
  const colorMap = {
    'Bug/Improvement': '#e67e5a',
    'Customer Assistance': '#f59e42',
    'Wrong Closure Tags': '#eab308',
    'RCA-Inconclusive': '#eab308',
    'RCA not done': '#ea5b08',
    'Cx Environment': '#34a88f',
    'Issue Self-Resolved': '#1b6dc6',
    'Documentation Gap': '#8b5cf6',
    'Duplicate/Invalid': '#9aa5b5',
  };

  const colorKey = Object.keys(colorMap).find((key) => key.toLowerCase().includes(name.toLowerCase()));
  return colorMap[colorKey] || '#9aa5b5';
};

const getColorForClosedTag = (index) => {
  const colors = ['#e67e5a', '#eab308', '#06b6d4', '#34a88f', '#1b6dc6', '#8b5cf6', '#f59e42', '#ec4899', '#84cc16', '#f43f5e'];
  return colors[index % colors.length];
};

const convertBucketData = (bucketData) => {
  return bucketData.sort((a, b) => b.count - a.count).slice(0, 5).map((bucketObj) => ({
    name: bucketObj.name,
    value: bucketObj.count,
    fill: getColorBasedOnBucketName(bucketObj.name),
  }));
};

const convertClosedTagsData = (closedTagsData) => {
  return closedTagsData.sort((a, b) => b.count - a.count).slice(0, 5).map((closedTagObj, index) => ({
    name: closedTagObj.name,
    value: closedTagObj.count,
    fill: getColorForClosedTag(index),
  }));
};

const convertTopPriorityActionsData = (topPriorityActions) => {
  return topPriorityActions.map((topPriorityAction, index) => ({
    name: actionCategoryMap[topPriorityAction.category],
    value: topPriorityAction.cases,
    fill: getColorForClosedTag(index),
  }));
};

// Chart filter options
const CHART_FILTER_OPTIONS = [
  { key: 'all', label: 'All Charts' },
  { key: 'buckets', label: 'Case Buckets' },
  { key: 'actions', label: 'Top Actions' },
  { key: 'closed_tags', label: 'Closed Tags' },
];

function GraphView() {
  const { reportId } = useOutletContext();
  const [reportSummary, setReportSummary] = useState(null);
  const [selectedChart, setSelectedChart] = useState('all');

  const fetchReportSummary = async (id) => {
    const reportDetails = await reportsApi.getById(id);
    setReportSummary(reportDetails.data);
  };

  useEffect(() => {
    if (reportId) {
      fetchReportSummary(reportId);
    }
  }, [reportId]);

  const handleChartFilterChange = (value) => {
    setSelectedChart(value);
  };

  const handleExportCharts = () => {
    // TODO: Implement chart export functionality
    alert('Export functionality coming soon!');
  };

  // Filter visibility based on selected chart
  const showBuckets = selectedChart === 'all' || selectedChart === 'buckets';
  const showActions = selectedChart === 'all' || selectedChart === 'actions';
  const showClosedTags = selectedChart === 'all' || selectedChart === 'closed_tags';

  // All 7 buckets
  let bucketData = reportSummary?.reviewSummary?.buckets || [];
  bucketData = convertBucketData(bucketData);
  const totalCases = reportSummary?.caseCount;

  // All closed tags
  let closedTagsData = reportSummary?.reviewSummary?.closedTags || [];
  closedTagsData = convertClosedTagsData(closedTagsData);
  const totalClosedTagCases = closedTagsData.reduce((sum, t) => sum + t.value, 0);

  let topPriorityActions = reportSummary?.reviewSummary?.actionSummary?.topPriorityActions || [];
  topPriorityActions = convertTopPriorityActionsData(topPriorityActions);

  return (
    <FlexLayout flexDirection="column" itemGap="L" className={styles.graphView} style={{ padding: '24px' }}>
      {/* Page Header */}
      <FlexLayout justifyContent="space-between" alignItems="center">
        <FlexLayout alignItems="center" itemGap="L">
          <Title size="h2">Charts & Graphs</Title>
          <FlexLayout alignItems="center" itemGap="S">
            <Badge color="blue" count={`${totalCases} cases`} />
          </FlexLayout>
        </FlexLayout>

        {/* Filter and Export Controls */}
        <FlexLayout alignItems="center" itemGap="M">
          <FlexLayout alignItems="center" itemGap="S">
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>Filter by:</TextLabel>
            <Select
              style={{ width: '180px' }}
              value={selectedChart}
              onChange={handleChartFilterChange}
              rowsData={CHART_FILTER_OPTIONS.map((option) => ({
                key: option.key,
                label: option.label,
              }))}
            />
          </FlexLayout>
          <Button
            type={Button.ButtonTypes.SECONDARY}
            onClick={handleExportCharts}
          >
            Export Charts
          </Button>
        </FlexLayout>
      </FlexLayout>

      {/* Donut Charts Row */}
      {(showBuckets || showActions) && (
        <FlexLayout alignItems="flex-start" itemGap="L">
          {/* Case Buckets - Donut Chart */}
          {showBuckets && (
            <DonutWidget 
              title="Case Buckets"
              subtitle="Top 5 Buckets"
              data={bucketData}
              total={totalCases}
              centerLabel="Total Cases"
            />
          )}

          {/* Create a donut chart for top issues */}
          {showActions && (
            <DonutWidget 
              title="Top Actions"
              subtitle="Top 3 Actions"
              data={topPriorityActions}
              total={topPriorityActions.length}
              centerLabel="Top Actions"
            />
          )}
        </FlexLayout>
      )}

      {/* Closed Tags - Horizontal Bar Chart (better for many items) */}
      {showClosedTags && (
        <HorizontalBarWidget 
          title="Closed Tags"
          subtitle={`Top 5 Closed Tags`}
          data={closedTagsData}
          total={totalClosedTagCases}
        />
      )}
    </FlexLayout>
  );
}

export default GraphView;
