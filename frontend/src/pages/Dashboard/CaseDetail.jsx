import { useParams, useNavigate } from 'react-router-dom';
import {
  FlexLayout,
  FlexItem,
  Title,
  TextLabel,
  Button,
  StackingLayout,
  DashboardWidgetLayout,
  DashboardWidgetHeader,
  Badge,
} from '@nutanix-ui/prism-reactjs';
import { mockCases } from '../../data/mockCases';
import styles from './CaseDetail.module.css';

function CaseDetail() {
  const { reportId, caseId } = useParams();
  const navigate = useNavigate();

  // Find case from mock data
  const caseData = mockCases.find((c) => c.id === caseId) || mockCases[0];

  const getPriorityColor = (priority) => {
    const colorMap = {
      critical: 'red',
      high: 'orange',
      medium: 'yellow',
      low: 'green',
    };
    return colorMap[priority] || 'gray';
  };

  const getStatusColor = (status) => {
    const colorMap = {
      open: 'blue',
      in_progress: 'yellow',
      resolved: 'green',
      closed: 'gray',
    };
    return colorMap[status] || 'gray';
  };

  return (
    <StackingLayout itemSpacing="24px" className={styles.caseDetail}>
      {/* Breadcrumb */}
      <FlexItem>
        <Button
          type="borderless"
          onClick={() => navigate(`/dashboard/${reportId}/cases`)}
        >
          ← Back to Case List
        </Button>
      </FlexItem>

      {/* Case Header */}
      <DashboardWidgetLayout
        bodyContent={
          <FlexLayout justifyContent="space-between" alignItems="flex-start" padding="24px">
            <StackingLayout itemSpacing="12px">
              <FlexLayout alignItems="center" itemSpacing="12px">
                <Badge color="blue" label={caseData.caseNumber} />
                <Badge 
                  color={getPriorityColor(caseData.priority)} 
                  label={caseData.priority?.toUpperCase()} 
                />
                <Badge 
                  color={getStatusColor(caseData.status)} 
                  label={caseData.status?.replace('_', ' ').toUpperCase()} 
                />
              </FlexLayout>
              <Title size="h2">{caseData.title}</Title>
            </StackingLayout>
            <FlexLayout itemSpacing="12px">
              <Button type="secondary">Edit</Button>
              <Button type="primary">Resolve</Button>
            </FlexLayout>
          </FlexLayout>
        }
      />

      {/* Main Content Grid */}
      <FlexLayout itemSpacing="24px" className={styles.contentGrid}>
        {/* Left Column - Main Content */}
        <FlexItem flexGrow="1">
          <StackingLayout itemSpacing="24px">
            {/* Description */}
            <DashboardWidgetLayout
              header={
                <DashboardWidgetHeader title="Description" showCloseIcon={false} />
              }
              bodyContent={
                <StackingLayout padding="16px">
                  <TextLabel className={styles.description}>
                    {caseData.description}
                  </TextLabel>
                </StackingLayout>
              }
            />

            {/* AI Analysis */}
            <DashboardWidgetLayout
              header={
                <DashboardWidgetHeader title="AI Analysis" showCloseIcon={false} />
              }
              bodyContent={
                <StackingLayout padding="16px" itemSpacing="16px">
                  <FlexLayout itemSpacing="24px">
                    <StackingLayout itemSpacing="4px">
                      <TextLabel type="secondary">Suggested Category</TextLabel>
                      <TextLabel>{caseData.analysis?.category || 'Network Configuration'}</TextLabel>
                    </StackingLayout>
                    <StackingLayout itemSpacing="4px">
                      <TextLabel type="secondary">Similar Cases</TextLabel>
                      <TextLabel>{caseData.analysis?.similarCount || 5} similar cases found</TextLabel>
                    </StackingLayout>
                  </FlexLayout>
                  <StackingLayout itemSpacing="4px">
                    <TextLabel type="secondary">Recommended Action</TextLabel>
                    <TextLabel>{caseData.analysis?.recommendation || 'Check network configuration settings'}</TextLabel>
                  </StackingLayout>
                </StackingLayout>
              }
            />

            {/* Tags */}
            <DashboardWidgetLayout
              header={
                <DashboardWidgetHeader title="Tags" showCloseIcon={false} />
              }
              bodyContent={
                <FlexLayout padding="16px" itemSpacing="8px" flexWrap="wrap">
                  {(caseData.tags || ['hardware', 'network', 'urgent']).map((tag, index) => (
                    <Badge key={index} color="gray" label={tag} />
                  ))}
                </FlexLayout>
              }
            />
          </StackingLayout>
        </FlexItem>

        {/* Right Column - Sidebar */}
        <FlexItem className={styles.sidebarColumn}>
          <DashboardWidgetLayout
            header={
              <DashboardWidgetHeader title="Case Details" showCloseIcon={false} />
            }
            bodyContent={
              <StackingLayout padding="16px" itemSpacing="16px">
                <StackingLayout itemSpacing="4px">
                  <TextLabel type="secondary">Status</TextLabel>
                  <Badge 
                    color={getStatusColor(caseData.status)} 
                    label={caseData.status?.replace('_', ' ')} 
                  />
                </StackingLayout>
                
                <StackingLayout itemSpacing="4px">
                  <TextLabel type="secondary">Assignee</TextLabel>
                  <TextLabel>{caseData.assignee || 'Unassigned'}</TextLabel>
                </StackingLayout>
                
                <StackingLayout itemSpacing="4px">
                  <TextLabel type="secondary">Customer</TextLabel>
                  <TextLabel>{caseData.customer || 'Acme Corp'}</TextLabel>
                </StackingLayout>
                
                <StackingLayout itemSpacing="4px">
                  <TextLabel type="secondary">Created</TextLabel>
                  <TextLabel>{new Date(caseData.createdAt).toLocaleString()}</TextLabel>
                </StackingLayout>
                
                <StackingLayout itemSpacing="4px">
                  <TextLabel type="secondary">Updated</TextLabel>
                  <TextLabel>{new Date(caseData.updatedAt).toLocaleString()}</TextLabel>
                </StackingLayout>
              </StackingLayout>
            }
          />
        </FlexItem>
      </FlexLayout>
    </StackingLayout>
  );
}

export default CaseDetail;
