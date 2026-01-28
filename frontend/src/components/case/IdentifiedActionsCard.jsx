/**
 * IdentifiedActionsCard Component
 * 
 * Displays a table of identified actions for a case with status and action buttons.
 * 
 * Action Types (based on case bucket mapping):
 * - Update KB Article: KB needs to be updated to a different/newer version
 * - Fix Closure Tag: Wrong closure tag needs to be corrected
 * - Attach JIRA: JIRA ticket should be attached
 * - Attach KB: KB article should be attached
 * - Draft KB: New KB article needs to be drafted
 * - Software Update: Customer should upgrade to fixed version
 * - In-Product Guardrails: Product needs guardrails for unsupported configs
 * - KB/Documentation Update: Documentation needs improvement
 * - RCA Needed: Root cause analysis required
 * - No Action on Nutanix: Issue is in customer environment
 * - No Action Needed: Issue self-resolved
 * 
 * Status:
 * - Pending: Action not yet taken
 * - Done: Action completed
 * - Rejected: Action was rejected/declined
 */

import { useState, useCallback } from 'react';
import {
  FlexLayout,
  StackingLayout,
  Title,
  TextLabel,
  Button,
  Badge,
  Link,
  Table,
} from '@nutanix-ui/prism-reactjs';
import { Card } from '../common';

// Action status types
export const ActionStatus = {
  PENDING: 'Pending',
  DONE: 'Done',
  REJECTED: 'Rejected',
};

// Action types based on bucket mapping
export const ActionType = {
  UPDATE_KB: 'update_kb',
  FIX_CLOSURE_TAG: 'fix_closure_tag',
  ATTACH_JIRA: 'attach_jira',
  ATTACH_KB: 'attach_kb',
  DRAFT_KB: 'draft_kb',
  SOFTWARE_UPDATE: 'software_update',
  IN_PRODUCT_GUARDRAILS: 'in_product_guardrails',
  KB_DOCUMENTATION_UPDATE: 'kb_documentation_update',
  RCA_NEEDED: 'rca_needed',
  NO_ACTION_NUTANIX: 'no_action_nutanix',
  NO_ACTION_NEEDED: 'no_action_needed',
};

// Human-readable action type labels
const ActionTypeLabels = {
  [ActionType.UPDATE_KB]: 'Update KB Article',
  [ActionType.FIX_CLOSURE_TAG]: 'Fix Closure Tag',
  [ActionType.ATTACH_JIRA]: 'Attach JIRA',
  [ActionType.ATTACH_KB]: 'Attach KB Article',
  [ActionType.DRAFT_KB]: 'Draft New KB',
  [ActionType.SOFTWARE_UPDATE]: 'Software Update',
  [ActionType.IN_PRODUCT_GUARDRAILS]: 'In-Product Guardrails',
  [ActionType.KB_DOCUMENTATION_UPDATE]: 'KB/Documentation Update',
  [ActionType.RCA_NEEDED]: 'RCA Needed',
  [ActionType.NO_ACTION_NUTANIX]: 'No Action on Nutanix',
  [ActionType.NO_ACTION_NEEDED]: 'No Action Needed',
};

// Status badge colors
const getStatusBadge = (status) => {
  switch (status) {
    case ActionStatus.PENDING:
      return <Badge color="orange" count="Pending" />;
    case ActionStatus.DONE:
      return <Badge color="green" count="Done" />;
    case ActionStatus.REJECTED:
      return <Badge color="red" count="Rejected" />;
    default:
      return <Badge color="gray" count={status} />;
  }
};

// URL configurations for external links
const URLS = {
  KB_BASE: 'https://portal.nutanix.com/kb/',
  JIRA_BASE: 'https://jira.nutanix.com/browse/',
};

/**
 * Render recommended change value with appropriate link if applicable
 */
const RenderRecommendedChange = ({ actionType, recommendedChange }) => {
  if (!recommendedChange) {
    return <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>-</TextLabel>;
  }

  // KB-related actions should link to KB portal
  if (
    actionType === ActionType.UPDATE_KB ||
    actionType === ActionType.ATTACH_KB ||
    actionType === ActionType.DRAFT_KB
  ) {
    if (recommendedChange.startsWith('KB-')) {
      return (
        <Link
          href={`${URLS.KB_BASE}${recommendedChange}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {recommendedChange}
        </Link>
      );
    }
  }

  // JIRA-related actions should link to JIRA
  if (actionType === ActionType.ATTACH_JIRA) {
    if (recommendedChange.startsWith('ENG-') || recommendedChange.startsWith('JIRA-')) {
      return (
        <Link
          href={`${URLS.JIRA_BASE}${recommendedChange}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {recommendedChange}
        </Link>
      );
    }
  }

  // Default: just show text (for tags, versions, etc.)
  return (
    <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>
      {recommendedChange}
    </TextLabel>
  );
};

/**
 * IdentifiedActionsCard Component
 * 
 * @param {Object} props
 * @param {Array} props.actions - Array of action objects
 * @param {Function} props.onApply - Callback when Apply is clicked for an action
 * @param {Function} props.onReject - Callback when Reject is clicked for an action
 * @param {Function} props.onMarkDone - Callback when Mark as Done is clicked for an action
 * @param {Function} props.onApplyAll - Callback when Apply All Fixes is clicked
 */
const IdentifiedActionsCard = ({
  actions = [],
  onApply,
  onReject,
  onMarkDone,
  onApplyAll,
}) => {
  const [localActions, setLocalActions] = useState(actions);

  // Handle Apply action
  const handleApply = useCallback((action) => {
    setLocalActions((prev) =>
      prev.map((a) =>
        a.id === action.id ? { ...a, status: ActionStatus.DONE } : a
      )
    );
    if (onApply) {
      onApply(action);
    }
  }, [onApply]);

  // Handle Reject action
  const handleReject = useCallback((action) => {
    setLocalActions((prev) =>
      prev.map((a) =>
        a.id === action.id ? { ...a, status: ActionStatus.REJECTED } : a
      )
    );
    if (onReject) {
      onReject(action);
    }
  }, [onReject]);

  // Handle Mark as Done action
  const handleMarkDone = useCallback((action) => {
    setLocalActions((prev) =>
      prev.map((a) =>
        a.id === action.id ? { ...a, status: ActionStatus.DONE } : a
      )
    );
    if (onMarkDone) {
      onMarkDone(action);
    }
  }, [onMarkDone]);

  // Handle Apply All
  const handleApplyAll = useCallback(() => {
    const pendingActions = localActions.filter(
      (a) => a.status === ActionStatus.PENDING
    );
    setLocalActions((prev) =>
      prev.map((a) =>
        a.status === ActionStatus.PENDING ? { ...a, status: ActionStatus.DONE } : a
      )
    );
    if (onApplyAll) {
      onApplyAll(pendingActions);
    }
  }, [localActions, onApplyAll]);

  // Check if there are any pending actions
  const hasPendingActions = localActions.some(
    (a) => a.status === ActionStatus.PENDING
  );

  // Table columns configuration
  const columns = [
    {
      title: 'Action Type',
      key: 'actionType',
      render: (actionType) => (
        <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>
          {ActionTypeLabels[actionType] || actionType}
        </TextLabel>
      ),
    },
    {
      title: 'Current State',
      key: 'currentState',
      render: (currentState) => (
        <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>
          {currentState || '-'}
        </TextLabel>
      ),
    },
    {
      title: 'Recommended Change',
      key: 'recommendedChange',
      render: (recommendedChange, rowData) => (
        <RenderRecommendedChange
          actionType={rowData.actionType}
          recommendedChange={recommendedChange}
        />
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (status) => getStatusBadge(status),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, rowData) => {
        if (rowData.status !== ActionStatus.PENDING) {
          return <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>-</TextLabel>;
        }

        // For informational actions (no action needed, RCA needed), show only Acknowledge
        const isInformational = [
          ActionType.NO_ACTION_NUTANIX,
          ActionType.NO_ACTION_NEEDED,
        ].includes(rowData.actionType);

        if (isInformational) {
          return (
            <FlexLayout itemGap="S">
              <Button
                type="secondary"
                onClick={() => handleMarkDone(rowData)}
              >
                Acknowledge
              </Button>
            </FlexLayout>
          );
        }

        return (
          <FlexLayout itemGap="S" flexWrap="wrap">
            <Button
              type="primary"
              onClick={() => handleApply(rowData)}
            >
              Apply
            </Button>
            <Button
              type="secondary"
              onClick={() => handleMarkDone(rowData)}
            >
              Done
            </Button>
            <Button
              type="tertiary"
              onClick={() => handleReject(rowData)}
            >
              Reject
            </Button>
          </FlexLayout>
        );
      },
    },
  ];

  // Table structure
  const tableStructure = {
    columnWidths: {
      actionType: '180px',
      currentState: '150px',
      recommendedChange: '200px',
      status: '100px',
      action: '220px',
    },
  };

  if (!localActions || localActions.length === 0) {
    return null;
  }

  return (
    <Card>
      <StackingLayout itemGap="M" style={{ padding: '16px' }}>
        {/* Header with Apply All button */}
        <FlexLayout justifyContent="space-between" alignItems="center">
          <Title size="h3">Identified Actions</Title>
          {hasPendingActions && (
            <Button type="primary" onClick={handleApplyAll}>
              Apply All Fixes
            </Button>
          )}
        </FlexLayout>

        {/* Actions Table */}
        <Table
          columns={columns}
          dataSource={localActions}
          rowKey="id"
          structure={tableStructure}
          showCustomScrollbar={true}
        />
      </StackingLayout>
    </Card>
  );
};

export default IdentifiedActionsCard;
