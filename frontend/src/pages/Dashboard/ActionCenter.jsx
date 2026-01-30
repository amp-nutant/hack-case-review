import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FlexLayout,
  Title,
  TextLabel,
  Button,
  AIIcon,
  Select,
  Badge,
  Loader,
  StackingLayout,
} from '@nutanix-ui/prism-reactjs';
import { ActionCard } from '../../components/common';
import { mockActionsData } from '../../data/mockActions';
import { reportsApi } from '../../services/reportsApi';
import './ActionCenter.module.css';

function ActionCenter() {
  const { reportId } = useOutletContext();
  const [actionsData, setActionsData] = useState(mockActionsData);
  const [actionsLoading, setActionsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    setActionsLoading(true);

    const request = reportId
      ? reportsApi.getById(reportId)
      : reportsApi.getByReportId('123');

    request
      .then((response) => {
        if (!isActive) {
          return;
        }

        const actionSummary = response?.data?.reviewSummary?.actionSummary;
        if (!actionSummary || typeof actionSummary !== 'object') {
          return;
        }

        const getRandomPatternMatch = () => Math.floor(70 + Math.random() * 29);
        const versions = ['AOS 6.5+', 'AOS 6.8+', 'PC 2024.1', 'PC 2024.3', 'AHV 20230302+', 'LCM 2.6+'];
        const getRandomVersion = (index) => versions[index % versions.length];

        const priorityToStatus = (priority) => {
          if (!priority) return 'pending_review';
          const normalized = String(priority).toLowerCase();
          if (normalized === 'high') return 'pending_review';
          if (normalized === 'medium') return 'completed';
          if (normalized === 'low') return 'rejected';
          return 'pending_review';
        };

        const getActionButtonLabel = ({ actionType, category, title, actionLabel, action }) => {
          const rawType = actionType || category || title || '';
          const normalized = String(rawType).toLowerCase();
          const normalizedTitle = String(title || '').toLowerCase();

          if (normalizedTitle.includes('incorrect closure tags')) {
            return 'Edit Close Tags';
          }

          if (normalizedTitle.includes('kb articles missing or not linked')) {
            return 'Create SR Ticket';
          }

          if (normalizedTitle.includes('open jiras to prioritize for fix')) {
            return 'Create JIRA';
          }

          if (normalizedTitle.includes('recommended kb articles to create')) {
            return 'Create SR Ticket';
          }

          if (normalizedTitle.includes('fixed jiras') && normalizedTitle.includes('version update')) {
            return 'Comment on Case';
          }

          if (normalizedTitle.includes('bugs/improvements without jira')) {
            return 'Create JIRA';
          }

          if (normalized.includes('wrong') && normalized.includes('close')) {
            return 'Edit Close Tags';
          }

          if (normalized.includes('kb')) {
            return 'Create SR Ticket';
          }

          if (normalized.includes('jira')) {
            return 'Comment on Case';
          }

          if (normalized.includes('issue') || normalized.includes('bug')) {
            return 'Create JIRA';
          }

          const fallbackLabel = actionLabel || action || category || title;
          if (!fallbackLabel || typeof fallbackLabel !== 'string') return 'Take Action';
          const cleaned = fallbackLabel.replace(/[_-]+/g, ' ').trim();
          if (!cleaned) return 'Take Action';
          return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
        };

        let actions = Object.entries(actionSummary)
          .filter(([key, value]) => key !== 'topPriorityActions' && value && typeof value === 'object')
          .map(([, value], index) => {
            const casesAffected =
              value.count ??
              value.totalCasesAddressed ??
              value.summary?.total ??
              value.caseCount ??
              0;

            return {
              id: index + 1,
              casesAffected,
              actionType: value.category || 'other',
              component: value.category || 'General',
              status: priorityToStatus(value.priority),
              title: value.title || value.category || 'Action Required',
              description: value.actionRequired || value.summary?.actionRequired || '',
              patternMatch: getRandomPatternMatch(),
              version: getRandomVersion(index),
              primaryActionLabel: getActionButtonLabel({
                actionType: value.actionType,
                category: value.category,
                title: value.title,
                actionLabel: value.actionLabel,
                action: value.action,
              }),
            };
          });
        actions = actions.filter((action) => action.casesAffected > 0);

        setActionsData((prev) => ({
          ...prev,
          actions,
        }));
      })
      .catch(() => {})
      .finally(() => {
        if (isActive) {
          setActionsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [reportId]);

  const data = actionsData;

  // Filter states
  const [selectedActionType, setSelectedActionType] = useState({ key: 'all', label: 'All Actions' });
  const [selectedCriticality, setSelectedCriticality] = useState('all');

  const actionLabelOptions = useMemo(() => {
    const labels = Array.from(
      new Set(
        data.actions
          .map((action) => action.primaryActionLabel)
          .filter((label) => typeof label === 'string' && label.trim().length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return [{ key: 'all', label: 'All Actions' }, ...labels.map((label) => ({ key: label, label }))];
  }, [data.actions]);

  // Filter and rank the actions based on all criteria
  const filteredActions = useMemo(() => {
    // First sort all actions by casesAffected (descending) to determine ranks
    const sortedActions = [...data.actions].sort((a, b) => b.casesAffected - a.casesAffected);
    
    // Assign ranks based on sorted order
    const rankedActions = sortedActions.map((action, index) => ({
      ...action,
      rank: index + 1,
    }));

    // Now filter
    return rankedActions.filter((action) => {
      // Action type filter
      if (selectedActionType.key !== 'all' && action.primaryActionLabel !== selectedActionType.key) {
        return false;
      }

      // Criticality filter based on rank
      if (selectedCriticality !== 'all') {
        const critConfig = data.criticalities.find(c => c.key === selectedCriticality);
        if (critConfig) {
          if (critConfig.maxRank && action.rank > critConfig.maxRank) return false;
          if (critConfig.minRank && action.rank < critConfig.minRank) return false;
        }
      }

      return true;
    });
  }, [selectedActionType, selectedCriticality, data.actions, data.criticalities]);

  // Calculate summary based on filtered actions
  const filteredSummary = useMemo(() => {
    const critical = filteredActions.filter(a => a.rank <= 2).length;
    const high = filteredActions.filter(a => a.rank >= 3 && a.rank <= 4).length;
    const medium = filteredActions.filter(a => a.rank >= 5 && a.rank <= 8).length;
    return {
      total: filteredActions.length,
      critical,
      high,
      medium,
    };
  }, [filteredActions]);

  // Handler functions
  const handlePrimaryAction = (action) => {
    console.log('Primary action clicked:', action.title);
  };

  const handleThumbsUp = (action) => {
    console.log('Thumbs up:', action.title);
  };

  const handleThumbsDown = (action) => {
    console.log('Thumbs down:', action.title);
  };

  const clearFilters = () => {
    setSelectedActionType({ key: 'all', label: 'All Actions' });
    setSelectedCriticality('all');
  };

  const hasActiveFilters = selectedActionType.key !== 'all' || selectedCriticality !== 'all';

  if (actionsLoading) {
    return (
      <FlexLayout
        alignItems="center"
        justifyContent="center"
        style={{ height: '100%', minHeight: '400px' }}
      >
        <StackingLayout alignItems="center" itemSpacing="16px">
          <Loader />
          <TextLabel>Loading actions...</TextLabel>
        </StackingLayout>
      </FlexLayout>
    );
  }

  return (
    <FlexLayout flexDirection="column" itemGap="L" style={{ padding: '24px' }}>
      {/* Page Header */}
      <FlexLayout justifyContent="space-between" alignItems="center">
        <FlexLayout alignItems="center" itemGap="L">
          <Title size="h2">Action Center</Title>
          <FlexLayout alignItems="center" itemGap="S">
            <Badge color="gray" count={`${filteredSummary.total} total`} />
            {filteredSummary.critical > 0 && <Badge color="red" count={`${filteredSummary.critical} critical`} />}
            {filteredSummary.high > 0 && <Badge color="orange" count={`${filteredSummary.high} high`} />}
            {filteredSummary.medium > 0 && <Badge color="yellow" count={`${filteredSummary.medium} medium`} />}
          </FlexLayout>
        </FlexLayout>
        {hasActiveFilters && (
          <Button type={Button.ButtonTypes.BORDERLESS} onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </FlexLayout>

      {/* Filter Row */}
      <FlexLayout alignItems="center" itemGap="M" style={{ flexWrap: 'wrap' }}>
        {/* Criticality Pills */}
        <FlexLayout itemGap="XS">
          {data.criticalities.map((crit) => (
            <Button
              key={crit.key}
              type={selectedCriticality === crit.key ? Button.ButtonTypes.PRIMARY : Button.ButtonTypes.SECONDARY}
              onClick={() => setSelectedCriticality(crit.key)}
              style={{ minWidth: '70px' }}
            >
              {crit.label}
            </Button>
          ))}
        </FlexLayout>

        {/* Dropdown Filter */}
        <FlexLayout itemGap="S" alignItems="center">
          <Select
            rowsData={actionLabelOptions}
            selectedRow={selectedActionType}
            onSelectedChange={(row) => setSelectedActionType(row)}
            style={{ minWidth: '200px' }}
          />
        </FlexLayout>
      </FlexLayout>

      {/* AI Insight Banner */}
      <FlexLayout
        justifyContent="space-between"
        alignItems="center"
        style={{
          background: 'linear-gradient(90deg, #e9f6fe 0%, #f0f9ff 100%)',
          border: '1px solid #bde4fd',
          borderRadius: '8px',
          padding: '16px 20px',
        }}
      >
        <FlexLayout alignItems="center" itemGap="S">
          <AIIcon color="#1b6dc6" />
          <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>
            {data.aiInsight.message}
          </TextLabel>
        </FlexLayout>
        <FlexLayout itemGap="S">
          <Button type={Button.ButtonTypes.PRIMARY}>Export Report</Button>
          <Button type={Button.ButtonTypes.SECONDARY}>Schedule Review</Button>
        </FlexLayout>
      </FlexLayout>

      {/* Action Cards */}
      <FlexLayout flexDirection="column" itemGap="M">
        {filteredActions.length > 0 ? (
          filteredActions.map((action) => (
            <ActionCard
              key={action.id}
              rank={action.rank}
              actionType={action.actionType}
              component={action.component}
              status={action.status}
              title={action.title}
              description={action.description}
              casesAffected={action.casesAffected}
              patternMatch={action.patternMatch}
              version={action.version}
              primaryActionLabel={action.primaryActionLabel}
              onPrimaryAction={() => handlePrimaryAction(action)}
              onThumbsUp={() => handleThumbsUp(action)}
              onThumbsDown={() => handleThumbsDown(action)}
            />
          ))
        ) : (
          <FlexLayout 
            justifyContent="center" 
            alignItems="center" 
            style={{ padding: '48px', background: '#f9fafb', borderRadius: '8px' }}
          >
            <FlexLayout flexDirection="column" alignItems="center" itemGap="S">
              <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>No actions match your filters</TextLabel>
              <Button type={Button.ButtonTypes.SECONDARY} onClick={clearFilters}>
                Clear Filters
              </Button>
            </FlexLayout>
          </FlexLayout>
        )}
      </FlexLayout>
    </FlexLayout>
  );
}

export default ActionCenter;
