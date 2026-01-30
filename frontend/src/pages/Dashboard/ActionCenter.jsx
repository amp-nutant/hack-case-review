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
          if (normalized === 'medium') return 'draft_ready';
          if (normalized === 'low') return 'in_progress';
          return 'pending_review';
        };

        const actions = Object.entries(actionSummary)
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
              primaryActionLabel: 'See Details',
            };
          });

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
  const [selectedActionType, setSelectedActionType] = useState({ key: 'all', label: 'All Action Types' });
  const [selectedComponent, setSelectedComponent] = useState({ key: 'all', label: 'All Components' });
  const [selectedCriticality, setSelectedCriticality] = useState('all');

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
      if (selectedActionType.key !== 'all' && action.actionType !== selectedActionType.key) {
        return false;
      }

      // Component filter
      if (selectedComponent.key !== 'all' && action.component !== selectedComponent.key) {
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
  }, [selectedActionType, selectedComponent, selectedCriticality, data.actions, data.criticalities]);

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

  const handleSeeDetails = (action) => {
    console.log('See details clicked:', action.title);
  };

  const handleThumbsUp = (action) => {
    console.log('Thumbs up:', action.title);
  };

  const handleThumbsDown = (action) => {
    console.log('Thumbs down:', action.title);
  };

  const clearFilters = () => {
    setSelectedActionType({ key: 'all', label: 'All Action Types' });
    setSelectedComponent({ key: 'all', label: 'All Components' });
    setSelectedCriticality('all');
  };

  const hasActiveFilters = selectedActionType.key !== 'all' || 
                           selectedComponent.key !== 'all' || 
                           selectedCriticality !== 'all';

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

        {/* Dropdown Filters */}
        <FlexLayout itemGap="S" alignItems="center">
          <Select
            rowsData={data.actionTypes.map((item, idx) => ({ ...item, key: idx }))}
            selectedRow={selectedActionType}
            onSelectedChange={(row) => setSelectedActionType(row)}
            style={{ minWidth: '180px' }}
          />
          <Select
            rowsData={data.components.map((item, idx) => ({ ...item, key: idx }))}
            selectedRow={selectedComponent}
            onSelectedChange={(row) => setSelectedComponent(row)}
            style={{ minWidth: '180px' }}
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
              onSeeDetails={() => handleSeeDetails(action)}
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
