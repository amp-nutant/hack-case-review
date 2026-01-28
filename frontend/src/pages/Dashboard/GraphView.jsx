import { useOutletContext } from 'react-router-dom';
import {
  FlexLayout,
  Title,
  TextLabel,
  StackingLayout,
  Badge,
  HeaderFooterLayout,
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
    <div className={styles.widgetCard} style={{ width: '100%' }}>
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

function GraphView() {
  const { reportId } = useOutletContext();

  // All 7 buckets
  const bucketData = mockDashboardData.buckets.items;
  const totalCases = bucketData.reduce((sum, b) => sum + b.value, 0);

  // All closed tags
  const closedTagsData = mockDashboardData.closedTags.items;
  const totalTaggedCases = closedTagsData.reduce((sum, t) => sum + t.value, 0);

  return (
    <FlexLayout flexDirection="column" itemGap="L" className={styles.graphView} style={{ padding: '24px' }}>
      {/* Page Header */}
      <FlexLayout justifyContent="space-between" alignItems="center">
        <FlexLayout alignItems="center" itemGap="L">
          <Title size="h2">Charts & Graphs</Title>
          <FlexLayout alignItems="center" itemGap="S">
            <Badge color="gray" count={`${totalCases} cases`} />
            <Badge color="blue" count={`${closedTagsData.length} tags`} />
          </FlexLayout>
        </FlexLayout>
      </FlexLayout>

      {/* Case Buckets - Donut Chart */}
      <DonutWidget 
        title="Case Buckets"
        subtitle="All 7 Buckets"
        data={bucketData}
        total={totalCases}
        centerLabel="Total Cases"
      />

      {/* Closed Tags - Horizontal Bar Chart (better for many items) */}
      <HorizontalBarWidget 
        title="Closed Tags"
        subtitle={`All ${closedTagsData.length} Tags`}
        data={closedTagsData}
        total={totalTaggedCases}
      />
    </FlexLayout>
  );
}

export default GraphView;
