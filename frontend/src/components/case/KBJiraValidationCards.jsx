/**
 * KBJiraValidationCards Component
 * 
 * Displays three validation cards for KB Article, JIRA Ticket, and Closure Tag.
 * Each card shows current value, validation status, and suggested fixes if applicable.
 * 
 * States handled:
 * - VALID: Green checkmark, no action needed
 * - WRONG: Red X, shows current vs suggested with action button
 * - OUTDATED: Red X, shows current vs suggested with action button (KB only)
 * - MISSING: Red X, shows "Not attached" with optional suggestion
 */

import { useCallback } from 'react';
import {
  FlexLayout,
  FlexItem,
  StackingLayout,
  Title,
  TextLabel,
  Link,
  Button,
  Alert,
  StatusTickMiniIcon,
  CloseIcon,
  UpdateIcon,
  RefreshIcon,
  EditIcon,
  ShareArrowIcon,
  PlusIcon,
  ReportIcon,
  LinkIcon,
  ToolsIcon,
  ToolIcon,
} from '@nutanix-ui/prism-reactjs';
import { Card } from '../common';
import { ValidationStatus, KBActionType } from '../../data/mockCases';

// URL configurations for external links
const URLS = {
  KB_BASE: 'https://portal.nutanix.com/kb/',
  JIRA_BASE: 'https://jira.nutanix.com/browse/',
};

/**
 * Status icon component - shows checkmark for valid, X for issues
 */
const StatusIcon = ({ status }) => {
  if (status === ValidationStatus.VALID) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: '24px', 
        height: '24px',
        borderRadius: '50%',
        backgroundColor: '#dcfce7',
      }}>
        <StatusTickMiniIcon style={{ color: '#22c55e' }} />
      </div>
    );
  }
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      width: '24px', 
      height: '24px',
      borderRadius: '50%',
      backgroundColor: '#fee2e2',
    }}>
      <CloseIcon style={{ color: '#ef4444', width: '8px', height: '8px' }}/>
    </div>
  );
};

/**
 * Alert message component based on validation status
 */
const ValidationAlert = ({ status, reason, fieldType }) => {
  if (status === ValidationStatus.VALID) {
    const messages = {
      kb: 'Valid KB article attached',
      jira: 'Valid JIRA ticket attached',
      tag: 'Correct closure tag applied',
    };
    return (
      <Alert
        type={Alert.AlertTypes.SUCCESS}
        message={messages[fieldType]}
        showCloseIcon={ false }
      />
    );
  }

  if (status === ValidationStatus.MISSING) {
    const messages = {
      kb: 'No KB article attached',
      jira: 'No JIRA ticket attached',
      tag: 'No closure tag applied',
    };
    return (
      <Alert
        type={Alert.AlertTypes.ERROR}
        message={reason || messages[fieldType]}
        showCloseIcon={ false }
      />
    );
  }

  if (status === ValidationStatus.OUTDATED) {
    return (
      <Alert
        type={Alert.AlertTypes.ERROR}
        message={reason || 'Outdated: This article is no longer current'}
        showCloseIcon={ false }
      />
    );
  }

  if (status === ValidationStatus.WRONG) {
    const defaultMessages = {
      kb: 'Wrong KB article attached',
      jira: 'Wrong JIRA ticket attached',
      tag: 'Wrong tag attached',
    };
    return (
      <Alert
        type={Alert.AlertTypes.ERROR}
        message={reason || defaultMessages[fieldType]}
        showCloseIcon={ false }
      />
    );
  }

  return null;
};

/**
 * KB Article Card
 */
const KBArticleCard = ({ kbArticle, onUpdateKB, onDraftKB, onReviewKB }) => {
  const { value, status, suggestedValue, reason, actionType } = kbArticle || {};
  const isValid = status === ValidationStatus.VALID;
  const hasIssue = status === ValidationStatus.WRONG || 
                   status === ValidationStatus.OUTDATED || 
                   status === ValidationStatus.MISSING;
  
  // Determine button icon and label based on actionType
  const getButtonConfig = () => {
    switch (actionType) {
      case KBActionType.DRAFT:
        return { Icon: ReportIcon, label: 'Draft KB' };
      case KBActionType.REVIEW:
        return { Icon: EditIcon, label: 'Review KB' };
      case KBActionType.ATTACH:
        return { Icon: PlusIcon, label: 'Attach KB' };
      case KBActionType.UPDATE:
      default:
        // Fallback logic for cases without actionType
        if (status === ValidationStatus.MISSING && suggestedValue) {
          return { Icon: PlusIcon, label: 'Attach KB' };
        }
        return { Icon: UpdateIcon, label: 'Update KB' };
    }
  };

  const { Icon: ButtonIcon, label: buttonLabel } = getButtonConfig();

  const handleActionClick = useCallback(() => {
    const actionData = {
      currentValue: value,
      suggestedValue,
      status,
      actionType,
    };
    
    if (actionType === KBActionType.DRAFT && onDraftKB) {
      onDraftKB(actionData);
    } else if (actionType === KBActionType.REVIEW && onReviewKB) {
      onReviewKB(actionData);
    } else if (onUpdateKB) {
      onUpdateKB(actionData);
    }
  }, [onUpdateKB, onDraftKB, onReviewKB, value, suggestedValue, status, actionType]);

  // Show button if there's an issue (and either has suggestion or has actionType for draft/review)
  const showButton = hasIssue && (suggestedValue || actionType === KBActionType.DRAFT || actionType === KBActionType.REVIEW);

  // Determine card highlight color based on status
  const getHighlight = () => {
    if (isValid) return 'green';
    if (hasIssue) return 'red';
    return undefined;
  };

  return (
    <Card highlight={getHighlight()} style={{ height: '100%' }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        padding: '16px',
        gap: '12px',
      }}>
        {/* Header */}
        <FlexLayout justifyContent="space-between" alignItems="center">
          <Title size="h3">KB Article</Title>
          <StatusIcon status={status} />
        </FlexLayout>

        {/* Current Value */}
        <FlexLayout alignItems="center" itemGap="XS">
          <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>Current:</TextLabel>
          {value ? (
            <Link 
              href={`${URLS.KB_BASE}${value}`} 
              target="_blank"
              rel="noopener noreferrer"
            >
              {value} <ShareArrowIcon style={{ width: '12px', height: '12px', marginLeft: '4px' }} />
            </Link>
          ) : (
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>Not attached</TextLabel>
          )}
        </FlexLayout>

        {/* Validation Alert */}
        <ValidationAlert status={status} reason={reason} fieldType="kb" />

        {/* Suggested Value (if applicable) */}
        {hasIssue && suggestedValue && (
          <FlexLayout alignItems="center" itemGap="XS">
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>Suggested:</TextLabel>
            <Link 
              href={`${URLS.KB_BASE}${suggestedValue}`} 
              target="_blank"
              rel="noopener noreferrer"
            >
              {suggestedValue} <ShareArrowIcon style={{ width: '12px', height: '12px', marginLeft: '4px' }} />
            </Link>
          </FlexLayout>
        )}

        {/* Spacer to push button to bottom */}
        <div style={{ flex: 1 }} />

        {/* Action Button - always at bottom */}
        {showButton && (
          <Button
            type="primary"
            fullWidth
            onClick={handleActionClick}
          >
            <ButtonIcon /> {buttonLabel}
          </Button>
        )}
      </div>
    </Card>
  );
};

/**
 * JIRA Ticket Card
 */
const JIRATicketCard = ({ jiraTicket, onUpdateJIRA }) => {
  const { value, status, suggestedValue, reason } = jiraTicket || {};
  const isValid = status === ValidationStatus.VALID;
  const hasIssue = status === ValidationStatus.WRONG || status === ValidationStatus.MISSING;

  // Determine button icon and label based on status
  const ButtonIcon = status === ValidationStatus.MISSING ? LinkIcon : ToolIcon;
  const buttonLabel = status === ValidationStatus.MISSING ? 'Attach JIRA' : 'Fix JIRA';

  const handleUpdateClick = useCallback(() => {
    if (onUpdateJIRA) {
      onUpdateJIRA({
        currentValue: value,
        suggestedValue,
        status,
      });
    }
  }, [onUpdateJIRA, value, suggestedValue, status]);

  // Determine card highlight color based on status
  const getHighlight = () => {
    if (isValid) return 'green';
    if (hasIssue) return 'red';
    return undefined;
  };

  return (
    <Card highlight={getHighlight()} style={{ height: '100%' }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        padding: '16px',
        gap: '12px',
      }}>
        {/* Header */}
        <FlexLayout justifyContent="space-between" alignItems="center">
          <Title size="h3">JIRA Ticket</Title>
          <StatusIcon status={status} />
        </FlexLayout>

        {/* Current Value */}
        <FlexLayout alignItems="center" itemGap="XS">
          <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>Current:</TextLabel>
          {value ? (
            <Link 
              href={`${URLS.JIRA_BASE}${value}`} 
              target="_blank"
              rel="noopener noreferrer"
            >
              {value} <ShareArrowIcon style={{ width: '12px', height: '12px', marginLeft: '4px' }} />
            </Link>
          ) : (
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>Not attached</TextLabel>
          )}
        </FlexLayout>

        {/* Validation Alert */}
        <ValidationAlert status={status} reason={reason} fieldType="jira" />

        {/* Suggested Value (if applicable) */}
        {hasIssue && suggestedValue && (
          <FlexLayout alignItems="center" itemGap="XS">
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>Suggested:</TextLabel>
            <Link 
              href={`${URLS.JIRA_BASE}${suggestedValue}`} 
              target="_blank"
              rel="noopener noreferrer"
            >
              {suggestedValue} <ShareArrowIcon style={{ width: '12px', height: '12px', marginLeft: '4px' }} />
            </Link>
          </FlexLayout>
        )}

        {/* Spacer to push button to bottom */}
        <div style={{ flex: 1 }} />

        {/* Action Button - always at bottom */}
        {hasIssue && suggestedValue && (
          <Button
            type="primary"
            fullWidth
            onClick={handleUpdateClick}
          >
            <ButtonIcon /> {buttonLabel}
          </Button>
        )}
      </div>
    </Card>
  );
};

/**
 * Closure Tag Card
 */
const ClosureTagCard = ({ closedTag, onFixTag }) => {
  const { value, status, suggestedValue } = closedTag || {};
  const isValid = status === ValidationStatus.VALID;
  const hasIssue = status === ValidationStatus.WRONG || status === ValidationStatus.MISSING;

  const ButtonIcon = EditIcon;
  const buttonLabel = 'Edit Tag';

  const handleFixClick = useCallback(() => {
    if (onFixTag) {
      onFixTag({
        currentValue: value,
        suggestedValue,
        status,
      });
    }
  }, [onFixTag, value, suggestedValue, status]);

  // Determine card highlight color based on status
  const getHighlight = () => {
    if (isValid) return 'green';
    if (hasIssue) return 'red';
    return undefined;
  };

  return (
    <Card highlight={getHighlight()} style={{ height: '100%' }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        padding: '16px',
        gap: '12px',
      }}>
        {/* Header */}
        <FlexLayout justifyContent="space-between" alignItems="center">
          <Title size="h3">Closure Tag</Title>
          <StatusIcon status={status} />
        </FlexLayout>

        {/* Current Value */}
        <FlexLayout itemGap="XS">
          <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} style={{ lineHeight: '1.2' }}>Current:</TextLabel>
          <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY} style={{ lineHeight: '1.2' }}>
            {value || 'Not set'}
          </TextLabel>
        </FlexLayout>

        {/* Validation Alert */}
        <ValidationAlert 
          status={status} 
          reason={hasIssue ? 'Wrong tag: Generic tag used instead of specific category' : null} 
          fieldType="tag" 
        />

        {/* Suggested Value (if applicable) */}
        {hasIssue && suggestedValue && (
          <FlexLayout itemGap="XS">
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} style={{ lineHeight: '1.2' }}>Suggested:</TextLabel>
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY} style={{ lineHeight: '1.2' }}>
              {typeof suggestedValue === 'object' ? JSON.stringify(suggestedValue) : suggestedValue}
            </TextLabel>
          </FlexLayout>
        )}

        {/* Spacer to push button to bottom */}
        <div style={{ flex: 1 }} />

        {/* Action Button - always at bottom */}
        {hasIssue && suggestedValue && (
          <Button
            type="primary"
            fullWidth
            onClick={handleFixClick}
          >
            <ButtonIcon /> {buttonLabel}
          </Button>
        )}
      </div>
    </Card>
  );
};

/**
 * Main KBJiraValidationCards Component
 * 
 * @param {Object} props
 * @param {Object} props.kbArticle - KB article validation data
 * @param {Object} props.jiraTicket - JIRA ticket validation data
 * @param {Object} props.closedTag - Closed tag validation data
 * @param {Function} props.onUpdateKB - Callback when Update/Attach KB is clicked
 * @param {Function} props.onDraftKB - Callback when Draft KB is clicked
 * @param {Function} props.onReviewKB - Callback when Review KB is clicked
 * @param {Function} props.onUpdateJIRA - Callback when Update JIRA is clicked
 * @param {Function} props.onFixTag - Callback when Fix Tag is clicked
 */
const KBJiraValidationCards = ({
  kbArticle,
  jiraTicket,
  closedTag,
  onUpdateKB,
  onDraftKB,
  onReviewKB,
  onUpdateJIRA,
  onFixTag,
}) => {
  return (
    <FlexLayout itemGap="M" alignItems="stretch">
      <FlexItem style={{ flex: 1 }}>
        <KBArticleCard 
          kbArticle={kbArticle} 
          onUpdateKB={onUpdateKB} 
          onDraftKB={onDraftKB}
          onReviewKB={onReviewKB}
        />
      </FlexItem>
      <FlexItem style={{ flex: 1 }}>
        <JIRATicketCard jiraTicket={jiraTicket} onUpdateJIRA={onUpdateJIRA} />
      </FlexItem>
      <FlexItem style={{ flex: 1 }}>
        <ClosureTagCard closedTag={closedTag} onFixTag={onFixTag} />
      </FlexItem>
    </FlexLayout>
  );
};

export default KBJiraValidationCards;
