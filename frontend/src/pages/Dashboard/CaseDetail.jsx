import { useParams, useNavigate } from 'react-router-dom';
import {
  FlexLayout,
  FlexItem,
  Title,
  TextLabel,
  Button,
  StackingLayout,
  Badge,
  BackIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AIIcon,
  Paragraph,
  Divider,
} from '@nutanix-ui/prism-reactjs';
import { mockCases } from '../../data/mockCases';
import { Card } from '../../components/common';

function CaseDetail() {
  const { reportId, caseId } = useParams();
  const navigate = useNavigate();

  // Find case and its index from mock data
  const currentIndex = mockCases.findIndex((c) => c.id === caseId);
  const caseData = currentIndex !== -1 ? mockCases[currentIndex] : mockCases[0];
  const actualIndex = currentIndex !== -1 ? currentIndex : 0;

  // Navigation helpers
  const hasPrevious = actualIndex > 0;
  const hasNext = actualIndex < mockCases.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      const prevCase = mockCases[actualIndex - 1];
      navigate(`/dashboard/${reportId}/cases/${prevCase.id}`);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      const nextCase = mockCases[actualIndex + 1];
      navigate(`/dashboard/${reportId}/cases/${nextCase.id}`);
    }
  };

  const goBack = () => {
    navigate(`/dashboard/${reportId}/cases`);
  };

  const getPriorityLabel = () => {
    // Derive priority from issues count
    if (caseData.issues && caseData.issues.length >= 3) return 'P1';
    if (caseData.issues && caseData.issues.length >= 2) return 'P2';
    if (caseData.issues && caseData.issues.length >= 1) return 'P3';
    return 'P4';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      P1: 'red',
      P2: 'orange',
      P3: 'yellow',
      P4: 'gray',
    };
    return colors[priority] || 'gray';
  };

  const getStatusColor = (status) => {
    const statusColors = {
      open: 'blue',
      in_progress: 'yellow',
      resolved: 'green',
      closed: 'gray',
    };
    return statusColors[status] || 'gray';
  };

  const priority = getPriorityLabel();

  return (
    <StackingLayout itemGap='L' style={{ padding: '18px' }}>
      {/* Case Header */}
      <FlexLayout alignItems="flex-start" justifyContent="space-between">
        <FlexLayout alignItems="flex-start" itemGap="L">
          <Button
            type="tertiary"
            onClick={goBack}
            aria-label="Back to case list"
          >
            <BackIcon />
          </Button>
          <StackingLayout itemGap='M'>
            <FlexLayout alignItems="center" itemGap='M'>
              <Title size="h1">{caseData.caseNumber}</Title>
              <Badge color={getPriorityColor(priority)} count={priority} />
            </FlexLayout>
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{caseData.title}</TextLabel>
          </StackingLayout>
        </FlexLayout>
        
        <FlexLayout itemGap='M'>
          <Button
            type="secondary"
            onClick={goToPrevious}
            disabled={!hasPrevious}
          >
            <ChevronLeftIcon /> Previous
          </Button>
          <Button
            type="secondary"
            onClick={goToNext}
            disabled={!hasNext}
          >
            Next <ChevronRightIcon />
          </Button>
        </FlexLayout>
      </FlexLayout>

      {/* Main Content Grid - 80% left, 20% right */}
      <FlexLayout itemGap='M'>
        {/* Left Column - 80% */}
        <FlexItem style={{ flex: '0 0 75%' }}>
          <StackingLayout itemGap='L'>
            {/* NXpert Analysis Card */}
            <Card highlight="blue">
              <StackingLayout itemGap='M' style={{ padding: '12px' }}>
                <FlexLayout justifyContent="space-between" alignItems="center">
                  <FlexLayout alignItems="center" itemGap='M'>
                    <AIIcon />
                    <Title size="h3">NXpert Summary</Title>
                  </FlexLayout>
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.INFO}>Powered by NXpert</TextLabel>
                </FlexLayout>
                <Paragraph>{caseData.analysis?.summary || 
                    `This case involves a PE-PC connectivity issue caused by firewall rules blocking port 9440 after firmware upgrade. The root cause is a known issue with firewall configuration persistence during upgrades in AOS 6.5.x. Resolution involves re-applying firewall rules and verifying service status.`
                  }</Paragraph>
                  
              </StackingLayout>
            </Card>
          </StackingLayout>
        </FlexItem>

        {/* Right Column - 30% */}
        <FlexItem style={{ flex: '0 0 25%' }}>
          <StackingLayout itemGap="L">
            {/* Case Information Card */}
            <Card>
              <StackingLayout itemGap="M" style={{ padding: '12px' }}>
                <Title size="h3">Case Information</Title>
                
                <StackingLayout itemGap="S">
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.INFO}>Created</TextLabel>
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{new Date(caseData.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</TextLabel>
                 </StackingLayout>
                
                <StackingLayout itemGap="S">
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.INFO}>Closed</TextLabel>
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{caseData.closedAt ? new Date(caseData.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Open'}</TextLabel>
                </StackingLayout>
                
                <StackingLayout itemGap="S">
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.INFO}>Age</TextLabel>
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY} >{Math.ceil((new Date() - new Date(caseData.createdAt)) / (1000 * 60 * 60 * 24))} days</TextLabel>
                </StackingLayout>
                
                <Divider />
                
                <StackingLayout itemGap="S">
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.INFO}>Account</TextLabel>
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{caseData.accountName || 'Unknown'}</TextLabel>
                </StackingLayout>
                
                <StackingLayout itemGap="S">
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.INFO}>Owner</TextLabel>
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{caseData.owner || 'John Smith'}</TextLabel>
                </StackingLayout>
              </StackingLayout>
            </Card>

            {/* Technical Details Card */}
            <Card>
              <StackingLayout itemGap="M" style={{ padding: '12px' }}>
                <Title size="h3">Technical Details</Title>
                
                <StackingLayout itemGap="S">
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>AOS Version</TextLabel>
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{caseData.aosVersion || 'N/A'}</TextLabel>
                </StackingLayout>
                
                <StackingLayout itemGap="S">
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>Hypervisor</TextLabel>
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{caseData.hypervisorVersion || 'N/A'}</TextLabel>
                </StackingLayout>
                
                <StackingLayout itemGap="S">
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>PC Version</TextLabel>
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{caseData.pcVersion || 'pc.2024.1'}</TextLabel>
                </StackingLayout>
                
                <Divider />
                
                <StackingLayout itemGap="S">
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>Case Bucket</TextLabel>
                  <Badge color="orange" count={caseData.bucket || 'Unknown'} />
                </StackingLayout>
                
                <StackingLayout itemGap="S">
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>Closure Tag</TextLabel>
                  <Badge color="gray" count={caseData.closedTag?.value || 'N/A'} />
                </StackingLayout>
              </StackingLayout>
            </Card>
          </StackingLayout>
        </FlexItem>
      </FlexLayout>
    </StackingLayout>
  );
}

export default CaseDetail;
