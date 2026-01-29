/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
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
  Loader,
} from '@nutanix-ui/prism-reactjs';
import { mockCases } from '../../data/mockCases';
import { fetchAllCases, fetchCaseDetailsByCaseNumber } from '../../redux/slices/casesSlice';
import { Card } from '../../components/common';
import { 
  KBJiraValidationCards, 
  IdentifiedActionsCard,
  AssociatedIssuesCard,
  ActionsTakenCard,
  DescriptionCard,
} from '../../components/case';

function CaseDetail() {
  const { reportId, caseId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get cases from Redux store
  const { items: casesFromDb, currentCase, loading } = useSelector((state) => state.cases);

  // Load cases list if not already loaded (for navigation)
  useEffect(() => {
    if (casesFromDb.length === 0) {
      dispatch(fetchAllCases());
    }
  }, [dispatch, casesFromDb.length]);

  // Use DB data if available, otherwise fall back to mock data
  const cases = useMemo(() => {
    return casesFromDb.length > 0 ? casesFromDb : mockCases;
  }, [casesFromDb]);

  // Find case and its index from the list
  const currentIndex = cases.findIndex((c) => c.id === caseId);
  const caseFromList = currentIndex !== -1 ? cases[currentIndex] : cases[0];
  const actualIndex = currentIndex !== -1 ? currentIndex : 0;

  // Fetch full case details by case number when we have a case
  useEffect(() => {
    if (caseFromList?.caseNumber) {
      dispatch(fetchCaseDetailsByCaseNumber(caseFromList.caseNumber));
    }
  }, [dispatch, caseFromList?.caseNumber]);

  // Use full case details from currentCase if available, otherwise use list data
  const caseData = useMemo(() => {
    if (currentCase && currentCase.caseNumber === caseFromList?.caseNumber) {
      return currentCase;
    }
    return caseFromList;
  }, [currentCase, caseFromList]);

  // Navigation helpers
  const hasPrevious = actualIndex > 0;
  const hasNext = actualIndex < cases.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      const prevCase = cases[actualIndex - 1];
      navigate(`/dashboard/${reportId}/cases/${prevCase.id}`);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      const nextCase = cases[actualIndex + 1];
      navigate(`/dashboard/${reportId}/cases/${nextCase.id}`);
    }
  };

  // Show loading state
  if (loading && !caseData) {
    return (
      <FlexLayout justifyContent="center" alignItems="center" style={{ height: '400px' }}>
        <Loader tip="Loading case details..." />
      </FlexLayout>
    );
  }

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

  // Callback handlers for validation card actions
  // These will be connected to backend API calls later
  const handleUpdateKB = useCallback((data) => {
    console.log('Update/Attach KB triggered:', data);
    // TODO: Implement API call to update/attach KB article
    // POST /api/cases/{caseId}/kb with { suggestedValue: data.suggestedValue, action: 'update' }
  }, []);

  const handleDraftKB = useCallback((data) => {
    console.log('Draft KB triggered:', data);
    // TODO: Implement API call to initiate KB draft workflow
    // POST /api/cases/{caseId}/kb/draft with case details for KB creation
  }, []);

  const handleReviewKB = useCallback((data) => {
    console.log('Review KB triggered:', data);
    // TODO: Implement API call to initiate KB review workflow
    // POST /api/cases/{caseId}/kb/review with { currentKB: data.currentValue }
  }, []);

  const handleUpdateJIRA = useCallback((data) => {
    console.log('Update JIRA triggered:', data);
    // TODO: Implement API call to update JIRA ticket
    // POST /api/cases/{caseId}/jira with { suggestedValue: data.suggestedValue }
  }, []);

  const handleFixTag = useCallback((data) => {
    console.log('Fix Tag triggered:', data);
    // TODO: Implement API call to fix closure tag
    // POST /api/cases/{caseId}/tag with { suggestedValue: data.suggestedValue }
  }, []);

  // Callback handlers for identified actions
  const handleApplyAction = useCallback((action) => {
    console.log('Apply action triggered:', action);
    // TODO: Implement API call to apply the action
    // POST /api/cases/{caseId}/actions/{actionId}/apply
  }, []);

  const handleRejectAction = useCallback((action) => {
    console.log('Reject action triggered:', action);
    // TODO: Implement API call to reject the action
    // POST /api/cases/{caseId}/actions/{actionId}/reject
  }, []);

  const handleMarkDoneAction = useCallback((action) => {
    console.log('Mark done action triggered:', action);
    // TODO: Implement API call to mark action as done
    // POST /api/cases/{caseId}/actions/{actionId}/done
  }, []);

  const handleApplyAllActions = useCallback((actions) => {
    console.log('Apply all actions triggered:', actions);
    // TODO: Implement API call to apply all pending actions
    // POST /api/cases/{caseId}/actions/apply-all
  }, []);

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

      {/* Main Content Grid - 70% left, 30% right */}
      <FlexLayout itemGap='M'>
        {/* Left Column - 70% */}
        <FlexItem style={{ width: '75%', minWidth: 0 }}>
          <StackingLayout itemGap='L'>
            {/* NXpert Analysis Card */}
            <Card highlight="blue">
              <StackingLayout itemGap='M' style={{ padding: '12px' }}>
                <FlexLayout justifyContent="space-between" alignItems="center">
                  <FlexLayout alignItems="center" itemGap='M'>
                    <AIIcon />
                    <Title size="h3">NXpert Summary</Title>
                  </FlexLayout>
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.INFO} style={{ fontStyle: 'italic' }} size={TextLabel.TEXT_LABEL_SIZE.SMALL}>Powered by NXpert</TextLabel>
                </FlexLayout>
                <Paragraph>{caseData.analysis?.summary || 
                    `This case involves a PE-PC connectivity issue caused by firewall rules blocking port 9440 after firmware upgrade. The root cause is a known issue with firewall configuration persistence during upgrades in AOS 6.5.x. Resolution involves re-applying firewall rules and verifying service status.`
                  }</Paragraph>
                  
              </StackingLayout>
            </Card>

            {/* KB, JIRA, and Closure Tag Validation Cards */}
            <KBJiraValidationCards
              kbArticle={caseData.kbArticle}
              jiraTicket={caseData.jiraTicket}
              closedTag={caseData.closedTag}
              onUpdateKB={handleUpdateKB}
              onDraftKB={handleDraftKB}
              onReviewKB={handleReviewKB}
              onUpdateJIRA={handleUpdateJIRA}
              onFixTag={handleFixTag}
            />

            {/* Identified Actions Table */}
            {caseData.identifiedActions && caseData.identifiedActions.length > 0 && (
              <IdentifiedActionsCard
                actions={caseData.identifiedActions}
                onApply={handleApplyAction}
                onReject={handleRejectAction}
                onMarkDone={handleMarkDoneAction}
                onApplyAll={handleApplyAllActions}
              />
            )}

            {/* Associated Issues Card */}
            <AssociatedIssuesCard issues={caseData.issues} />

            {/* Actions Taken Card */}
            <ActionsTakenCard actionsTaken={caseData.actionsTaken} />
          </StackingLayout>
        </FlexItem>

        {/* Right Column - 30% */}
        <FlexItem style={{ width: '25%', minWidth: 0 }}>
          <StackingLayout itemGap="L">
            {/* Description Card */}
            <DescriptionCard description={caseData.description} />

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
