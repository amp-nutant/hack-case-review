/**
 * CaseList Component
 * 
 * Displays a table of cases with validation indicators using Table cellAlerts.
 * - Closed Tags (wrong tag highlighted)
 * - KB Articles (missing, outdated, or wrong highlighted)
 * - JIRA Tickets (missing or wrong highlighted)
 * 
 * Alert Logic:
 * - RED: Closed tag wrong, KB/JIRA missing
 * - YELLOW: KB wrong/outdated, JIRA looks not related
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FlexLayout,
  FlexItem,
  Title,
  TextLabel,
  Table,
  Loader,
  StackingLayout,
  Badge,
  Link,
  Sorter,
  Truncate,
  MultiSelect,
  Button,
} from '@nutanix-ui/prism-reactjs';
import { mockCases, ValidationStatus } from '../../data/mockCases';
import { fetchAllCases, fetchCasesByReport } from '../../redux/slices/casesSlice';
import styles from './CaseList.module.css';

// Quick filter definitions
const QUICK_FILTERS = {
  NO_JIRA: 'no_jira',
  NO_KB: 'no_kb',
  WRONG_KB: 'wrong_kb',
  WRONG_TAG: 'wrong_tag',
  HAS_ISSUES: 'has_issues',
};

// Create Truncate HOC for text elements
const TruncateSpan = Truncate('span');

// Bucket color mappings
const bucketColors = {
  'Bug/Improvement': '#e67e5a',
  'Customer Assistance': '#f59e42',
  'RCA-Inconclusive': '#eab308',
  'Cx Environment': '#34a88f',
  'Issue Self-Resolved': '#1b6dc6',
  'Documentation Gap': '#8b5cf6',
  'Duplicate/Invalid': '#9aa5b5',
};

// Default pagination configuration
const defaultPagination = {
  currentPage: 1,
  pageSize: 10,
  pageSizeOptions: [5, 10, 20, 50],
  total: 0,
};

// Default sort configuration
const defaultSort = {
  order: Sorter.SORT_ORDER_CONST.DESCEND,
  column: 'caseNumber',
  sortable: ['caseNumber', 'title', 'bucket'],
};

// Table structure configuration
const tableStructure = {
  paginationPosition: {
    top: false,
    bottom: true,
  },
  columnWidths: {
    caseNumber: '110px',
    title: '260px',
    bucket: '140px',
    closedTag: '240px',
    kbArticle: '110px',
    jiraTicket: '110px',
  },
};

const KB_LINK_BASE = 'https://portal.nutanix.com/kb/';
const JIRA_LINK_BASE = 'https://jira.nutanix.com/browse/';

const formatKbDisplay = (kbValue) => {
  if (!kbValue) return '';
  const trimmed = `${kbValue}`.replace(/^0+/, '');
  return `KB-${trimmed || kbValue}`;
};

const splitValues = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return `${value}`
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

const buildClosedTagMessage = (status, suggestedValue) => {
  let message = '';

  if (suggestedValue.missingTags && suggestedValue.missingTags.length > 0) {
    message += `Missing Tags: ${suggestedValue.missingTags.map((tagObj) => tagObj.suggestedTag + ": " + tagObj.reason).join(', ')}`;
    message += '\n';
  }

  if (suggestedValue.inaccurateTags && suggestedValue.inaccurateTags.length > 0) {
    message += `Wrong Tags: ${suggestedValue.inaccurateTags.map((tagObj) => tagObj.tag + ": " + tagObj.reasoning).join(', ')}`;
    message += '\n';
  }

  if (suggestedValue.partiallyAccurateTags && suggestedValue.partiallyAccurateTags.length > 0) {
    message += `Partially Accurate Tags: ${suggestedValue.partiallyAccurateTags.map((tagObj) => tagObj.tag + ": " + tagObj.reasoning).join(', ')}`;
    message += '\n';
  }

  return message;
};

// Helper to build validation message
const buildValidationMessage = (field, status, suggestedValue, reason) => {
  let message = '';
  
  if (status === ValidationStatus.MISSING) {
    message = `Missing ${field}`;
  } else if (status === ValidationStatus.WRONG) {
    message = `Wrong ${field}`;
  } else if (status === ValidationStatus.OUTDATED) {
    message = `Outdated ${field}`;
  }
  
  if (reason) {
    message += `: ${reason}`;
  }
  
  if (suggestedValue) {
    message += ` → Suggested: ${suggestedValue}`;
  }
  
  return message;
};

function CaseList() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { reportId } = useOutletContext();
  const { items, loading } = useSelector((state) => state.cases);

  // State for pagination, sorting, and search
  const [pagination, setPagination] = useState({
    ...defaultPagination,
    total: 0,
  });
  const [sort, setSort] = useState(defaultSort);
  const [searchValue, setSearchValue] = useState('');

  // Filter state
  const [selectedBuckets, setSelectedBuckets] = useState([]);
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [activeQuickFilters, setActiveQuickFilters] = useState([]);

  // Always fetch all cases from case-details collection on mount
  useEffect(() => {
    dispatch(fetchAllCases());
  }, [dispatch]);

  // Prefer API data; fall back to mock only when explicitly in demo flow
  const cases = items.length > 0 ? items : (reportId?.startsWith('demo-') ? mockCases : []);

  // Extract unique bucket and component values for dropdowns from base data
  const filterOptions = useMemo(() => {
    const buckets = [...new Set(cases.map(c => c.bucket).filter(Boolean))].sort();
    const components = [...new Set(cases.map(c => c.closedTag?.value).filter(Boolean))].sort();
    
    return {
      buckets: buckets.map(b => ({ key: b, id: b, label: b })),
      components: components.map(c => ({ key: c, id: c, label: c })),
    };
  }, [cases]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return selectedBuckets.length > 0 || 
           selectedComponents.length > 0 || 
           activeQuickFilters.length > 0;
  }, [selectedBuckets, selectedComponents, activeQuickFilters]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSelectedBuckets([]);
    setSelectedComponents([]);
    setActiveQuickFilters([]);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  // Toggle quick filter
  const toggleQuickFilter = useCallback((filterKey) => {
    setActiveQuickFilters(prev => {
      const newFilters = prev.includes(filterKey)
        ? prev.filter(f => f !== filterKey)
        : [...prev, filterKey];
      return newFilters;
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  // Handle bucket filter change
  const handleBucketChange = useCallback((selectedRows) => {
    setSelectedBuckets(selectedRows.map(r => r.key));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  // Handle component filter change
  const handleComponentChange = useCallback((selectedRows) => {
    setSelectedComponents(selectedRows.map(r => r.key));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  // Handle case click navigation
  const handleCaseClick = useCallback((caseId) => {
    navigate(`/dashboard/${reportId}/cases/${caseId}`);
  }, [navigate, reportId]);

  // Handle pagination change
  const handleChangePagination = useCallback((newPagination) => {
    setPagination({
      ...newPagination,
      total: newPagination.total,
    });
  }, []);

  // Handle sort change
  const handleChangeSort = useCallback((sortCriteria) => {
    setSort(sortCriteria);
    setPagination((prev) => ({
      ...prev,
      currentPage: 1,
    }));
  }, []);

  // Handle search
  const handleSearch = useCallback((e) => {
    const value = e.target.value.trim().toLowerCase();
    setSearchValue(value);
    setPagination((prev) => ({
      ...prev,
      currentPage: 1,
    }));
  }, []);

  // Filter and sort data
  const processedData = useMemo(() => {
    let data = [...cases];

    // Filter by search
    if (searchValue) {
      data = data.filter((item) =>
        item.caseNumber?.toLowerCase().includes(searchValue) ||
        item.title?.toLowerCase().includes(searchValue) ||
        item.bucket?.toLowerCase().includes(searchValue) ||
        item.accountName?.toLowerCase().includes(searchValue) ||
        item.closedTag?.value?.toLowerCase().includes(searchValue)
      );
    }

    // Filter by bucket
    if (selectedBuckets.length > 0) {
      data = data.filter(item => selectedBuckets.includes(item.bucket));
    }

    // Filter by component (closedTag)
    if (selectedComponents.length > 0) {
      data = data.filter(item => selectedComponents.includes(item.closedTag?.value));
    }

    // Apply quick filters (OR logic within quick filters - show cases matching ANY active filter)
    if (activeQuickFilters.length > 0) {
      data = data.filter(item => {
        return activeQuickFilters.some(filter => {
          switch (filter) {
            case QUICK_FILTERS.NO_JIRA:
              return item.jiraTicket?.status === ValidationStatus.MISSING;
            case QUICK_FILTERS.NO_KB:
              return item.kbArticle?.status === ValidationStatus.MISSING;
            case QUICK_FILTERS.WRONG_KB:
              return item.kbArticle?.status === ValidationStatus.WRONG || 
                     item.kbArticle?.status === ValidationStatus.OUTDATED;
            case QUICK_FILTERS.WRONG_TAG:
              return item.closedTag?.status === ValidationStatus.WRONG;
            case QUICK_FILTERS.HAS_ISSUES:
              return (item.issues?.length || 0) > 0;
            default:
              return false;
          }
        });
      });
    }

    // Sort data
    const sortOrder = sort.order === Sorter.SORT_ORDER_CONST.ASCEND ? 1 : -1;
    data.sort((a, b) => {
      const aValue = a[sort.column] || '';
      const bValue = b[sort.column] || '';
      if (typeof aValue === 'string') {
        return sortOrder * aValue.localeCompare(bValue);
      }
      return sortOrder * (aValue - bValue);
    });

    return data;
  }, [cases, searchValue, sort, selectedBuckets, selectedComponents, activeQuickFilters]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return processedData.slice(startIndex, endIndex);
  }, [processedData, pagination.currentPage, pagination.pageSize]);

  // Generate cell alerts from validation data
  // RED: Closed tag wrong, KB/JIRA missing
  // YELLOW: KB wrong/outdated, JIRA wrong (not related)
  const cellAlerts = useMemo(() => {
    const alerts = [];
    
    paginatedData.forEach((caseItem) => {
      const rowKey = caseItem.id;
      
      // Check closed tag validation - RED if wrong
      if (caseItem.closedTag && caseItem.closedTag.status === ValidationStatus.WRONG) {
        const { suggestedValue } = caseItem.closedTag;
        alerts.push({
          column: 'closedTag',
          row: rowKey,
          type: Table.TABLE_ALERT.ERROR,
          message: buildClosedTagMessage(ValidationStatus.WRONG, suggestedValue),
          tooltipProps: {
            oldTooltip: false,
            placement: 'top',
            contentProps: { style: { maxWidth: 350 } },
          },
        });
      }
      
      // Check KB article validation
      if (caseItem.kbArticle) {
        const { status, suggestedValue, reason } = caseItem.kbArticle;
        
        if (status === ValidationStatus.MISSING) {
          // RED: KB is missing
          alerts.push({
            column: 'kbArticle',
            row: rowKey,
            type: Table.TABLE_ALERT.ERROR,
            message: buildValidationMessage('KB Article', status, suggestedValue, reason),
            tooltipProps: {
              oldTooltip: false,
              placement: 'top',
              contentProps: { style: { maxWidth: 350 } },
            },
          });
        } else if (status === ValidationStatus.WRONG || status === ValidationStatus.OUTDATED) {
          // YELLOW: KB attached but has issues
          alerts.push({
            column: 'kbArticle',
            row: rowKey,
            type: Table.TABLE_ALERT.WARNING,
            message: buildValidationMessage('KB Article', status, suggestedValue, reason),
            tooltipProps: {
              oldTooltip: false,
              placement: 'top',
              contentProps: { style: { maxWidth: 350 } },
            },
          });
        }
      }
      
      // Check JIRA ticket validation
      if (caseItem.jiraTicket) {
        const { status, suggestedValue, reason } = caseItem.jiraTicket;
        
        if (status === ValidationStatus.MISSING) {
          // RED: JIRA is missing
          alerts.push({
            column: 'jiraTicket',
            row: rowKey,
            type: Table.TABLE_ALERT.ERROR,
            message: buildValidationMessage('JIRA', status, suggestedValue, reason),
            tooltipProps: {
              oldTooltip: false,
              placement: 'top',
              contentProps: { style: { maxWidth: 350 } },
            },
          });
        } else if (status === ValidationStatus.WRONG) {
          // YELLOW: JIRA looks not related
          alerts.push({
            column: 'jiraTicket',
            row: rowKey,
            type: Table.TABLE_ALERT.WARNING,
            message: buildValidationMessage('JIRA', status, suggestedValue, reason),
            tooltipProps: {
              oldTooltip: false,
              placement: 'top',
              contentProps: { style: { maxWidth: 350 } },
            },
          });
        }
      }
    });
    
    return alerts;
  }, [paginatedData]);

  // Bucket badge renderer
  const renderBucketBadge = useCallback((bucket) => {
    //const color = bucketColors[bucket] || '#9aa5b5';
    return <Badge color="gray" count={bucket} type="tag" />;
  }, []);

  // Table columns configuration
  const columns = useMemo(() => [
    {
      title: 'Case Number',
      key: 'caseNumber',
      render: (caseNumber, rowData) => (
        <Link
          href="#"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCaseClick(rowData.id);
          }}
          className={styles.caseNumberLink}
        >
          {caseNumber}
        </Link>
      ),
    },
    {
      title: 'Subject',
      key: 'title',
      render: (title) => (
        <TruncateSpan className={styles.subjectCell}>{title}</TruncateSpan>
      ),
    },

    {
      title: 'Bucket',
      key: 'bucket',
      render: (bucket) => renderBucketBadge(bucket),
    },
    {
      title: 'Closed Tag',
      key: 'closedTag',
      render: (closedTag) => {
        if (!closedTag?.value) return <TextLabel type="secondary">-</TextLabel>;
        return <TruncateSpan className={styles.tagCell}>{closedTag.value}</TruncateSpan>;
      },
    },
    {
      title: 'KB',
      key: 'kbArticle',
      render: (kbArticle) => {
        const values = splitValues(kbArticle?.value);
        if (values.length === 0) return <TextLabel type="secondary">-</TextLabel>;
        return (
          <FlexLayout itemGap="XS" flexWrap="wrap">
            {values.map((v) => (
              <Link
                key={v}
                href={`${KB_LINK_BASE}${v}`}
                target="_blank"
                rel="noopener noreferrer"
                title={v}
              >
                {formatKbDisplay(v)}
              </Link>
            ))}
          </FlexLayout>
        );
      },
    },
    {
      title: 'JIRA',
      key: 'jiraTicket',
      render: (jiraTicket) => {
        const values = splitValues(jiraTicket?.value);
        if (values.length === 0) return <TextLabel type="secondary">-</TextLabel>;
        return (
          <FlexLayout itemGap="XS" flexWrap="wrap">
            {values.map((v) => (
              <Link
                key={v}
                href={`${JIRA_LINK_BASE}${v}`}
                target="_blank"
                rel="noopener noreferrer"
                title={v}
              >
                {v}
              </Link>
            ))}
          </FlexLayout>
        );
      },
    },
  ], [handleCaseClick, renderBucketBadge]);

  // Search configuration
  const search = {
    inputProps: {
      placeholder: 'Search cases...',
      'aria-label': 'Search cases',
      onChange: handleSearch,
    },
  };

  // Pagination configuration with total from processed data
  const paginationConfig = {
    ...pagination,
    total: processedData.length,
  };

  // Calculate issue summary from filtered data (for header badge)
  const issueSummary = useMemo(() => {
    const withIssues = processedData.filter(c => (c.issues?.length || 0) > 0).length;
    const closedTagIssues = processedData.filter(c => c.closedTag?.status === ValidationStatus.WRONG).length;
    const kbIssues = processedData.filter(c => 
      c.kbArticle?.status === ValidationStatus.MISSING || 
      c.kbArticle?.status === ValidationStatus.WRONG || 
      c.kbArticle?.status === ValidationStatus.OUTDATED
    ).length;
    const jiraIssues = processedData.filter(c => 
      c.jiraTicket?.status === ValidationStatus.MISSING || 
      c.jiraTicket?.status === ValidationStatus.WRONG
    ).length;
    return { withIssues, closedTagIssues, kbIssues, jiraIssues };
  }, [processedData]);

  // Calculate quick filter counts from unfiltered data (for consistent chip labels)
  const quickFilterCounts = useMemo(() => ({
    hasIssues: cases.filter(c => (c.issues?.length || 0) > 0).length,
    noJira: cases.filter(c => c.jiraTicket?.status === ValidationStatus.MISSING).length,
    noKb: cases.filter(c => c.kbArticle?.status === ValidationStatus.MISSING).length,
    wrongKb: cases.filter(c => c.kbArticle?.status === ValidationStatus.WRONG || c.kbArticle?.status === ValidationStatus.OUTDATED).length,
    wrongTag: cases.filter(c => c.closedTag?.status === ValidationStatus.WRONG).length,
  }), [cases]);

  if (loading) {
    return (
      <FlexLayout justifyContent="center" alignItems="center" className={styles.loadingContainer}>
        <Loader tip="Loading cases..." />
      </FlexLayout>
    );
  }

  return (
    <FlexLayout flexDirection="column" itemGap="L" className={styles.caseListContainer} style={{ padding: '18px' }}>
      {/* Page Header */}
      <FlexLayout justifyContent="space-between" alignItems="center">
        <FlexLayout alignItems="center" itemGap="L">
          <Title size="h2">Case List</Title>
          <FlexLayout alignItems="center" itemGap="S">
            {hasActiveFilters ? (
              <Badge color="blue" count={`${processedData.length} of ${cases.length} cases`} />
            ) : (
              <Badge color="gray" count={`${cases.length} cases`} />
            )}
            {issueSummary.withIssues > 0 && (
              <Badge color="red" count={`${issueSummary.withIssues} with issues`} />
            )}
          </FlexLayout>
        </FlexLayout>
      </FlexLayout>

      {/* Filter Section */}
      <FlexLayout 
        className={styles.filterSection}
        alignItems="center"
        itemGap="M"
        flexWrap="wrap"
      >
        {/* Bucket Dropdown */}
        <div className={styles.filterDropdown}>
          <MultiSelect
            placeholder="Bucket"
            rowsData={filterOptions.buckets}
            selectedRows={filterOptions.buckets.filter(b => selectedBuckets.includes(b.key))}
            onSelectedChange={handleBucketChange}
            inputProps={{ placeholder: 'Search buckets...' }}
          />
        </div>

        {/* Component Dropdown */}
        <div className={styles.filterDropdown}>
          <MultiSelect
            placeholder="Component"
            rowsData={filterOptions.components}
            selectedRows={filterOptions.components.filter(c => selectedComponents.includes(c.key))}
            onSelectedChange={handleComponentChange}
            inputProps={{ placeholder: 'Search components...' }}
          />
        </div>

        <span className={styles.divider} />

        {/* Quick Filters - Using Badge style chips */}
        <FlexLayout alignItems="center" itemGap="S">
          <span 
            className={styles.filterBadge} 
            onClick={() => toggleQuickFilter(QUICK_FILTERS.HAS_ISSUES)}
            role="button"
            tabIndex={0}
          >
            <Badge 
              color={activeQuickFilters.includes(QUICK_FILTERS.HAS_ISSUES) ? 'red' : 'gray'}
              count={`Has Issues (${quickFilterCounts.hasIssues})`}
              type="count"
            />
          </span>
          <span 
            className={styles.filterBadge} 
            onClick={() => toggleQuickFilter(QUICK_FILTERS.NO_JIRA)}
            role="button"
            tabIndex={0}
          >
            <Badge 
              color={activeQuickFilters.includes(QUICK_FILTERS.NO_JIRA) ? 'red' : 'gray'}
              count={`No JIRA (${quickFilterCounts.noJira})`}
              type="count"
            />
          </span>
          <span 
            className={styles.filterBadge} 
            onClick={() => toggleQuickFilter(QUICK_FILTERS.NO_KB)}
            role="button"
            tabIndex={0}
          >
            <Badge 
              color={activeQuickFilters.includes(QUICK_FILTERS.NO_KB) ? 'red' : 'gray'}
              count={`No KB (${quickFilterCounts.noKb})`}
              type="count"
            />
          </span>
          <span 
            className={styles.filterBadge} 
            onClick={() => toggleQuickFilter(QUICK_FILTERS.WRONG_KB)}
            role="button"
            tabIndex={0}
          >
            <Badge 
              color={activeQuickFilters.includes(QUICK_FILTERS.WRONG_KB) ? 'orange' : 'gray'}
              count={`Wrong KB (${quickFilterCounts.wrongKb})`}
              type="count"
            />
          </span>
          <span 
            className={styles.filterBadge} 
            onClick={() => toggleQuickFilter(QUICK_FILTERS.WRONG_TAG)}
            role="button"
            tabIndex={0}
          >
            <Badge 
              color={activeQuickFilters.includes(QUICK_FILTERS.WRONG_TAG) ? 'orange' : 'gray'}
              count={`Wrong Tag (${quickFilterCounts.wrongTag})`}
              type="count"
            />
          </span>
        </FlexLayout>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            type={Button.ButtonTypes.TEXT_SECONDARY}
            onClick={handleClearFilters}
            className={styles.clearButton}
          >
            Clear Filters
          </Button>
        )}
      </FlexLayout>

      {/* Table Container */}
        <Table
          showCustomScrollbar={true}
          columns={columns}
          dataSource={paginatedData}
          rowKey="id"
          search={search}
          sort={sort}
          pagination={paginationConfig}
          structure={tableStructure}
          cellAlerts={cellAlerts}
          onChangePagination={handleChangePagination}
          onChangeSort={handleChangeSort}
          onRowClick={(record) => handleCaseClick(record.id)}
        />
    </FlexLayout>
  );
}

export default CaseList;
