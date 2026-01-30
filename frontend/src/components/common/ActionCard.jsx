import {
  FlexLayout,
  Title,
  TextLabel,
  Badge,
  Button,
  OpenFolderIcon,
  ReportIcon,
  RefreshIcon,
  ShareArrowIcon,
  EditIcon,
  BugIcon,
  StatusTickMiniIcon,
  CloseIcon,
} from '@nutanix-ui/prism-reactjs';
import './ActionCard.css';

/**
 * ActionCard - A card component for displaying action items in the Action Center
 * @param {number} rank - The priority rank number
 * @param {string} actionType - Type of action: 'kb_needed', 'reopen_jira', 'escalate', 'update_docs', 'file_bug'
 * @param {string} component - Component name (e.g., 'Cassandra', 'Prism Central')
 * @param {string} status - Status: 'draft_ready', 'pending_review', 'in_progress'
 * @param {string} title - Action title
 * @param {string} description - Action description
 * @param {number} casesAffected - Number of cases affected
 * @param {string} primaryActionLabel - Primary button label
 * @param {function} onPrimaryAction - Primary button click handler
 * @param {function} onThumbsUp - Thumbs up click handler
 * @param {function} onThumbsDown - Thumbs down click handler
 */
function ActionCard({
  rank,
  actionType,
  component,
  status,
  title,
  description,
  casesAffected,
  primaryActionLabel,
  onPrimaryAction,
  onThumbsUp,
  onThumbsDown,
}) {
  // Action type config
  const actionTypeConfig = {
    kb_needed: { label: 'KB NEEDED', color: 'red', icon: ReportIcon },
    reopen_jira: { label: 'REOPEN JIRA', color: 'orange', icon: RefreshIcon },
    escalate: { label: 'ESCALATE', color: 'green', icon: ShareArrowIcon },
    update_docs: { label: 'UPDATE DOCS', color: 'blue', icon: EditIcon },
    file_bug: { label: 'FILE BUG', color: 'red', icon: BugIcon },
  };

  // Status config
  const statusConfig = {
    pending_review: { label: 'Pending', color: 'blue' },
    completed: { label: 'Completed', color: 'green' },
    rejected: { label: 'Rejected', color: 'red' },
  };

  // Softer colors based on rank (1-2 = coral, 3-4 = orange, 5-8 = amber, 9+ = teal)
  const getRankColor = (rank) => {
    if (rank <= 2) return '#e67e5a'; // coral/salmon
    if (rank <= 4) return '#f59e42'; // soft orange  
    if (rank <= 8) return '#eab308'; // amber
    return '#34a88f'; // teal
  };

  const formatActionTypeLabel = (value) => {
    if (!value || typeof value !== 'string') return 'OTHER';
    const cleaned = value.replace(/[_-]+/g, ' ').trim();
    if (!cleaned) return 'OTHER';
    const titleCased = cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
    return titleCased.replace(/\bKb\b/g, 'KB');
  };

  const actionConfig = actionTypeConfig[actionType] || {
    label: formatActionTypeLabel(actionType),
    color: 'gray',
    icon: ReportIcon,
  };
  const ActionIcon = actionConfig.icon;
  const statusInfo = statusConfig[status] || statusConfig.pending_review;
  const normalizedActionLabel = formatActionTypeLabel(actionConfig.label).toLowerCase();
  const formattedComponentLabel = formatActionTypeLabel(component);
  const normalizedComponent = formattedComponentLabel.toLowerCase();
  const shouldShowComponentBadge =
    normalizedComponent && normalizedComponent !== normalizedActionLabel;

  return (
    <FlexLayout
      className="action-card"
      style={{ borderLeftColor: getRankColor(rank), padding: '10px' }}
      alignItems="flex-start"
      itemGap="L"
    >
      {/* Rank Circle */}
      <FlexLayout
        className="action-card-rank"
        alignItems="center"
        justifyContent="center"
        style={{ backgroundColor: getRankColor(rank) }}
      >
        {rank}
      </FlexLayout>

      {/* Card Content */}
      <FlexLayout flexDirection="column" itemGap="S" style={{ flex: 1 }}>
        {/* Top Row - Badges */}
        <FlexLayout alignItems="center" itemGap="S">
          <Badge color={actionConfig.color} count={actionConfig.label} />
          {shouldShowComponentBadge && <Badge color="gray" count={formattedComponentLabel} />}
          <FlexLayout alignItems="center" itemGap="XS">
            <Badge color={statusInfo.color} label={statusInfo.label} />
            <TextLabel
              type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}
              style={{
                color:
                  statusInfo.color === 'green'
                    ? '#22c55e'
                    : statusInfo.color === 'red'
                      ? '#ef4444'
                      : '#3b82f6',
              }}
            >
              {statusInfo.label}
            </TextLabel>
          </FlexLayout>
        </FlexLayout>

        {/* Title */}
        <Title size="h3">{title}</Title>

        {/* Description */}
        <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>
          {description}
        </TextLabel>

        {/* Metadata Row */}
        <FlexLayout alignItems="center" itemGap="L" style={{ marginTop: '4px', color: '#627386', fontSize: '13px' }}>
          <FlexLayout alignItems="center" itemGap="XS">
            <OpenFolderIcon size="small" />
            <span>{casesAffected} cases affected</span>
          </FlexLayout>
        </FlexLayout>
      </FlexLayout>

      {/* Action Buttons */}
      <FlexLayout flexDirection="column" alignItems="flex-end" itemGap="S">
        <Button type={Button.ButtonTypes.PRIMARY} onClick={onPrimaryAction}>
          <ActionIcon size="small" /> {primaryActionLabel}
        </Button>
        <FlexLayout itemGap="S">
          <Button type={Button.ButtonTypes.BORDERLESS} onClick={onThumbsUp}>
            <StatusTickMiniIcon />
          </Button>
          <Button type={Button.ButtonTypes.BORDERLESS} onClick={onThumbsDown}>
            <CloseIcon size="small" />
          </Button>
        </FlexLayout>
      </FlexLayout>
    </FlexLayout>
  );
}

export default ActionCard;
