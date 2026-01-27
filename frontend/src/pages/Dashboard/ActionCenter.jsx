import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FlexLayout,
  Title,
  TextLabel,
  Button,
  Alert,
  AIIcon,
  Select,
  Badge,
} from '@nutanix-ui/prism-reactjs';
import { ActionCard } from '../../components/common';
import { mockActionsData } from '../../data/mockActions';
import './ActionCenter.module.css';

function ActionCenter() {
  const { reportId } = useOutletContext();
  const data = mockActionsData;

  // Filter states
  const [selectedActionType, setSelectedActionType] = useState({ key: 'all', label: 'All Action Types' });
  const [selectedComponent, setSelectedComponent] = useState({ key: 'all', label: 'All Components' });
  const [selectedCriticality, setSelectedCriticality] = useState('all');

  // Filter the actions based on all criteria
  const filteredActions = useMemo(() => {
    return data.actions.filter((action) => {
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
    }).sort((a, b) => a.rank - b.rank);
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

  return (
    <FlexLayout flexDirection="column" itemGap="L" style={{ padding: '24px' }}>
      {/* Page Header */}
      <FlexLayout justifyContent="space-between" alignItems="flex-start">
        <FlexLayout flexDirection="column" itemGap="XS">
          <Title size="h2">Action Center</Title>
          <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>
            Showing {filteredSummary.total} of {data.actions.length} actions • 
            {filteredSummary.critical > 0 && ` ${filteredSummary.critical} critical •`}
            {filteredSummary.high > 0 && ` ${filteredSummary.high} high •`}
            {filteredSummary.medium > 0 && ` ${filteredSummary.medium} medium`}
          </TextLabel>
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

      {/* AI Insight Alert */}
      <Alert
        type={Alert.AlertTypes.INFO}
        message={
          <FlexLayout justifyContent="space-between" alignItems="center" style={{ width: '100%' }}>
            <FlexLayout alignItems="center" itemGap="S">
              <AIIcon />
              <TextLabel>{data.aiInsight.message}</TextLabel>
            </FlexLayout>
            <FlexLayout itemGap="S">
              <Button type={Button.ButtonTypes.PRIMARY}>Export Report</Button>
              <Button type={Button.ButtonTypes.SECONDARY}>Schedule Review Meeting</Button>
            </FlexLayout>
          </FlexLayout>
        }
      />

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
