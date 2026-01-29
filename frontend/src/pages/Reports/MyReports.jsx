import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FlexLayout,
  FlexItem,
  Button,
  Loader,
  Input,
  Title,
  TextLabel,
  Badge,
  Select,
  MultiSelect,
  ReportIcon,
  RemoveIcon,
  DateIcon,
  DownloadIcon,
  Divider,
  Truncate,
  PlusIcon,
  ShowIcon,
  ExportIcon,
} from '@nutanix-ui/prism-reactjs';

// Create Truncate HOC for title - shows full text in tooltip on hover
const TruncateTitle = Truncate(Title);
import { fetchReports, deleteReport } from '../../redux/slices/reportsSlice';
import { mockReports, ALL_BUCKETS, ALL_COMPONENTS } from '../../data/mockReports';
import styles from './MyReports.module.css';

// Sort options
const SORT_OPTIONS = [
  { key: 'date_desc', label: 'Newest First' },
  { key: 'date_asc', label: 'Oldest First' },
  { key: 'name_asc', label: 'Name (A-Z)' },
  { key: 'name_desc', label: 'Name (Z-A)' },
  { key: 'cases_desc', label: 'Most Cases' },
  { key: 'cases_asc', label: 'Least Cases' },
];

const ReportCard = ({ report, onDelete, onView, onExport, isFetching, onFetchReport }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const reviewSummary = report?.reviewSummary || {};

  let topBuckets = reviewSummary.buckets || [];
  topBuckets = [...topBuckets].sort((a, b) => b.count - a.count);
  topBuckets = topBuckets.slice(0, 2);

  let topComponents = reviewSummary.closedTags || [];
  topComponents = [...topComponents].sort((a, b) => b.count - a.count);
  topComponents = topComponents.slice(0, 2);

  const totalCases =  report?.caseCount ?? 0;
  const createdAt = report?.createdAt ? formatDate(report.createdAt) : '—';
  const updatedAt = report?.updatedAt ? getRelativeTime(report.updatedAt) : '';

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this report?')) {
      onDelete(report.id);
    }
  };

  const handleExport = (e) => {
    e.stopPropagation();
    onExport(report);
  };

  const isProcessing = report?.status === 'processing';

  const handleCardClick = (e) => {
    // Don't navigate if clicking on buttons, if processing, or if already fetching
    if (e.target.closest(`.${styles.cardActions}`) || isProcessing || isFetching) {
      return;
    }
    onFetchReport(report);
  };

  return (
    <div
      className={`${styles.reportCard} ${isHovered ? styles.reportCardHovered : ''} ${isProcessing ? styles.reportCardProcessing : ''} ${isFetching ? styles.reportCardFetching : ''}`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Fetching Overlay */}
      {isFetching && (
        <div className={styles.fetchingOverlay}>
          <FlexLayout flexDirection="column" alignItems="center" justifyContent="center" itemGap="S">
            <Loader />
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY} style={{ fontWeight: 500 }}>
              Fetching report...
            </TextLabel>
          </FlexLayout>
        </div>
      )}
      <FlexLayout flexDirection="column" itemGap="M" style={{ padding: '10px' }}>
        {/* Card Header - Icon with Title and Cases beside it */}
        <FlexLayout justifyContent="space-between" alignItems="flex-start">
          <FlexLayout alignItems="center" itemGap="S" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div className={`${styles.reportIconWrapper} ${isProcessing ? styles.reportIconWrapperProcessing : ''}`} style={{ flexShrink: 0 }}>
              <ReportIcon />
            </div>
            <FlexLayout flexDirection="column" itemGap="XS" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <TruncateTitle size="h3" className={`${styles.reportName} ${isHovered ? styles.reportNameHovered : ''}`} style={{ lineHeight: '1.1' }}>
                {report.name || 'Untitled Report'}
              </TruncateTitle>
              <FlexLayout alignItems="center" itemGap="XS">
                <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY} style={{ fontWeight: 600, fontSize: '14px' }}>
                  {totalCases}
                </TextLabel>
                <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} style={{ fontSize: '12px' }}>
                  cases
                </TextLabel>
              </FlexLayout>
            </FlexLayout>
          </FlexLayout>

          <FlexLayout alignItems="center" itemGap="5px">
            <div className={styles.exportButton} onClick={handleExport} style={{ flexShrink: 0, marginLeft: '8px' }}>
              <DownloadIcon />
            </div>

            <div className={styles.deleteButton} onClick={handleDelete} style={{ flexShrink: 0, marginLeft: '8px' }}>
              <RemoveIcon />
            </div>
          </FlexLayout>
        </FlexLayout>

        {/* Processing State */}
        {isProcessing ? (
          <>
            {/* Processing Indicator - centered in available space */}
            <div className={styles.processingContentArea}>
              <FlexLayout alignItems="center" itemGap="S">
                <Loader />
                <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>
                  Processing...
                </TextLabel>
              </FlexLayout>
            </div>

            {/* Divider above date for alignment */}
            <Divider />

            {/* Date Info - aligned at bottom */}
            <FlexLayout justifyContent="space-between" alignItems="center">
              <FlexLayout alignItems="center" itemGap="XS">
                <DateIcon size="small" className={styles.dateIcon} />
                <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} style={{ fontSize: '12px' }}>
                  {createdAt}
                </TextLabel>
              </FlexLayout>
              {updatedAt && (
                <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} style={{ fontSize: '12px' }}>
                  {updatedAt}
                </TextLabel>
              )}
            </FlexLayout>
          </>
        ) : (
          <>
            {/* Top Buckets */}
            <FlexLayout flexDirection="column" itemGap="XS">
              <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} style={{ fontSize: '11px' }}>
                Top Buckets
              </TextLabel>
              <FlexLayout itemGap="XS" style={{ flexWrap: 'wrap' }}>
                {topBuckets.length > 0 ? (
                  topBuckets.slice(0, 2).map((bucket, idx) => (
                    <Badge key={idx} color="gray" count={bucket.name} />
                  ))
                ) : (
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>—</TextLabel>
                )}
              </FlexLayout>
            </FlexLayout>

            {/* Top Components */}
            <FlexLayout flexDirection="column" itemGap="XS">
              <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} style={{ fontSize: '11px' }}>
                Top Closed Tags
              </TextLabel>
              <FlexLayout itemGap="XS" style={{ flexWrap: 'wrap' }}>
                {topComponents.length > 0 ? (
                  topComponents.slice(0, 2).map((component, idx) => (
                    <Badge key={idx} color="blue" count={component.name} />
                  ))
                ) : (
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>—</TextLabel>
                )}
              </FlexLayout>
            </FlexLayout>

            {/* Divider above date */}
            <Divider />

            {/* Date Info */}
            <FlexLayout justifyContent="space-between" alignItems="center">
              <FlexLayout alignItems="center" itemGap="XS">
                <DateIcon size="small" className={styles.dateIcon} />
                <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} style={{ fontSize: '12px' }}>
                  {createdAt}
                </TextLabel>
              </FlexLayout>
              {updatedAt && (
                <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} style={{ fontSize: '12px' }}>
                  {updatedAt}
                </TextLabel>
              )}
            </FlexLayout>
          </>
        )}
      </FlexLayout>
    </div>
  );
};

// Filter options for buckets and components (with id for MultiSelect)
const BUCKET_FILTER_OPTIONS = ALL_BUCKETS.map((b) => ({ ...b, id: b.key }));
const COMPONENT_FILTER_OPTIONS = ALL_COMPONENTS.map((c) => ({ ...c, id: c.key }));

function MyReports() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.reports);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState(SORT_OPTIONS[0]);
  const [selectedBuckets, setSelectedBuckets] = useState([]);
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [fetchingReportId, setFetchingReportId] = useState(null);

  useEffect(() => {
    dispatch(fetchReports());
  }, [dispatch]);

  // Use mock data for demo if no items loaded
  const isDemoMode = items.length === 0;
  const reports = !isDemoMode ? items : mockReports;

  // Calculate summary counts
  const summary = useMemo(() => {
    const total = reports.length;
    const completed = reports.filter((r) => r.status === 'completed').length;
    const inProgress = reports.filter((r) => r.status === 'processing').length;
    return { total, completed, inProgress };
  }, [reports]);

  const handleDeleteReport = (reportId) => {
    dispatch(deleteReport(reportId));
  };

  const handleExportReport = (report) => {
    console.log('Export report:', report.name);
    // TODO: Implement export functionality
  };

  const handleViewReport = (report) => {
    navigate(`/dashboard/${report.id}/action-center`);
  };

  const handleFetchReport = (report) => {
    // Prevent multiple fetches
    if (fetchingReportId) return;
    
    setFetchingReportId(report.id);
    
    // TODO: Replace setTimeout with actual DB call to fetch report data
    // Example: const reportData = await api.getReportById(report.id);
    setTimeout(() => {
      setFetchingReportId(null);
      navigate(`/dashboard/${report.id}/action-center`);
    }, 3000);
  };

  // Filter and sort reports
  const filteredAndSortedReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    
    // Filter by search query (name, fileName)
    let filtered = reports;
    if (q) {
      filtered = reports.filter((r) => {
        const name = (r.name || '').toLowerCase();
        const fileName = (r.fileName || '').toLowerCase();
        return name.includes(q) || fileName.includes(q);
      });
    }

    // Filter by buckets (multiselect - show reports that have ANY of the selected buckets)
    if (selectedBuckets.length > 0) {
      // Get labels for selected bucket keys
      const selectedBucketLabels = BUCKET_FILTER_OPTIONS
        .filter((b) => selectedBuckets.includes(b.key))
        .map((b) => b.label.toLowerCase());
      
      filtered = filtered.filter((r) => {
        const buckets = r.topBuckets || [];
        return buckets.some((b) => 
          selectedBucketLabels.some((label) => b.name.toLowerCase().includes(label))
        );
      });
    }

    // Filter by components (multiselect - show reports that have ANY of the selected components)
    if (selectedComponents.length > 0) {
      // Get labels for selected component keys
      const selectedComponentLabels = COMPONENT_FILTER_OPTIONS
        .filter((c) => selectedComponents.includes(c.key))
        .map((c) => c.label.toLowerCase());
      
      filtered = filtered.filter((r) => {
        const components = r.topComponents || [];
        return components.some((c) => 
          selectedComponentLabels.some((label) => c.name.toLowerCase().includes(label))
        );
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (selectedSort.key) {
        case 'date_desc':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'date_asc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'cases_desc':
          return (b.caseCount || 0) - (a.caseCount || 0);
        case 'cases_asc':
          return (a.caseCount || 0) - (b.caseCount || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [reports, searchQuery, selectedSort, selectedBuckets, selectedComponents]);

  if (loading) {
    return (
      <FlexLayout justifyContent="center" alignItems="center" className={styles.loadingContainer}>
        <Loader tip="Loading reports..." />
      </FlexLayout>
    );
  }

  const showErrorBanner = Boolean(error) && !isDemoMode;

  return (
    <div className={styles.page}>
      <FlexLayout flexDirection="column" itemGap="L" className={styles.container} style={{ padding: '18px' }}>
        {/* Page Header */}
        <FlexLayout justifyContent="space-between" alignItems="center">
          <FlexLayout alignItems="center" itemGap="L">
            <Title size="h2">My Reports</Title>
            <FlexLayout alignItems="center" itemGap="S">
              <Badge color="gray" count={`${summary.total} total reports`} />
              <Badge color="green" count={`${summary.completed} completed`} />
              {summary.inProgress > 0 && (
                <Badge color="yellow" count={`${summary.inProgress} in progress`} />
              )}
            </FlexLayout>
          </FlexLayout>
          <Button type={Button.ButtonTypes.PRIMARY} onClick={() => navigate('/')}>
            <PlusIcon /> Create New Report
          </Button>
        </FlexLayout>

        {/* Search and Filter Row */}
        <FlexLayout alignItems="center" itemGap="M" flexWrap="wrap">
          <FlexItem style={{ flex: 1, minWidth: '200px', maxWidth: '300px' }}>
            <Input
              name="search-reports"
              placeholder="Search by name..."
              search={true}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              clearButtonProps={{ 'aria-label': 'Clear search' }}
            />
          </FlexItem>
          <div style={{ minWidth: '200px' }}>
            <MultiSelect
              placeholder="Bucket"
              rowsData={BUCKET_FILTER_OPTIONS}
              selectedRows={BUCKET_FILTER_OPTIONS.filter((b) => selectedBuckets.includes(b.key))}
              onSelectedChange={(rows) => setSelectedBuckets(rows.map((r) => r.key))}
              inputProps={{ placeholder: 'Search buckets...' }}
            />
          </div>
          <div style={{ minWidth: '200px' }}>
            <MultiSelect
              placeholder="Component"
              rowsData={COMPONENT_FILTER_OPTIONS}
              selectedRows={COMPONENT_FILTER_OPTIONS.filter((c) => selectedComponents.includes(c.key))}
              onSelectedChange={(rows) => setSelectedComponents(rows.map((r) => r.key))}
              inputProps={{ placeholder: 'Search Closed Tags...' }}
            />
          </div>
          <FlexLayout alignItems="center" itemGap="XS">
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>Sort:</TextLabel>
            <Select
              rowsData={SORT_OPTIONS.map((opt, idx) => ({ ...opt, key: idx, label: opt.label }))}
              selectedRow={selectedSort}
              onSelectedChange={(row) => setSelectedSort(SORT_OPTIONS.find(o => o.label === row.label) || SORT_OPTIONS[0])}
              style={{ minWidth: '180px' }}
            />
          </FlexLayout>
        </FlexLayout>

        {showErrorBanner && (
          <div className={styles.errorBanner}>
            Error loading reports: {error}
          </div>
        )}

        {/* Reports Grid */}
        {filteredAndSortedReports.length === 0 ? (
          <FlexLayout
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            itemGap="M"
            className={styles.emptyState}
            style={{ padding: '24px' }}
          >
            <ReportIcon style={{ fontSize: '48px', color: '#9ca3af' }} />
            <Title size="h3">No Reports Found</Title>
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>
              Create a new analysis report to get started!
            </TextLabel>
            {/* <Button type={Button.ButtonTypes.PRIMARY} onClick={() => navigate('/')}>
              <PlusIcon /> Create New Report
            </Button> */}
          </FlexLayout>
        ) : (
          <div className={styles.reportsGrid}>
            {filteredAndSortedReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onDelete={handleDeleteReport}
                onView={handleViewReport}
                onExport={handleExportReport}
                isFetching={fetchingReportId === report.id}
                onFetchReport={handleFetchReport}
              />
            ))}
          </div>
        )}
      </FlexLayout>
    </div>
  );
}

export default MyReports;
