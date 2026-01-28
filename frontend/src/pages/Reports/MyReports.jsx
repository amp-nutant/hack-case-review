import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FlexLayout,
  FlexItem,
  Button,
  Loader,
  StackingLayout,
  DashboardWidgetLayout,
  DashboardWidgetHeader,
  Input,
  RemoveIcon,
  DateIcon,
} from '@nutanix-ui/prism-reactjs';
import { Card, Descriptions } from 'antd';
import { fetchReports, deleteReport } from '../../redux/slices/reportsSlice';
import { mockReports } from '../../data/mockReports';
import styles from './MyReports.module.css';

const ReportCard = ({ report, onDelete }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getReportTopIssues = (report) => {
    if (Array.isArray(report?.topIssues) && report.topIssues.length > 0) {
      return report.topIssues;
    }
    if (report?.status === 'processing') return ['In progress'];
    return [];
  };

  const totalCases = report?.summary?.totalCases ?? report?.caseCount ?? '—';
  const topIssues = getReportTopIssues(report);
  const createdAt = report?.createdAt ? formatDate(report.createdAt) : '—';

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this report?')) {
      onDelete(report.id);
    }
  };

  const isProcessing = report?.status === 'processing';

  // Show simplified card with loader for in-progress reports
  if (isProcessing) {
    return (
      <Card
        title={report.name || 'Untitled Report'}
        className={`${styles.reportCard} ${styles.processingCard}`}
        onClick={() => navigate(`/dashboard/${report.id}/action-center`)}
        extra={
          <div className={styles.cardExtra} onClick={handleDelete}>
            <RemoveIcon className={styles.deleteIcon} />
          </div>
        }
      >
        <div className={styles.processingContent}>
          <Loader data-test-id="report-processing-loader" />
          <span className={styles.processingText}>In Progress</span>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={report.name || 'Untitled Report'}
      className={styles.reportCard}
      onClick={() => navigate(`/dashboard/${report.id}/action-center`)}
      extra={
        <div className={styles.cardExtra} onClick={handleDelete}>
          <RemoveIcon className={styles.deleteIcon} />
        </div>
      }
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Total Cases">{totalCases}</Descriptions.Item>
        <Descriptions.Item label="Top Issues">
          {topIssues.length === 0 ? (
            '—'
          ) : (
            <div className={styles.issueChips}>
              {topIssues.slice(0, 2).map((issue) => {
                const colorVariants = [
                  styles.issueChipBlue,
                  styles.issueChipPurple,
                  styles.issueChipPink,
                  styles.issueChipOrange,
                  styles.issueChipGreen,
                  styles.issueChipTeal,
                  styles.issueChipIndigo,
                  styles.issueChipRed,
                ];
                const hash = issue.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const colorClass = colorVariants[hash % colorVariants.length];

                return (
                  <span key={issue} className={`${styles.issueChip} ${colorClass}`}>
                    {issue}
                  </span>
                );
              })}
            </div>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Created">
          <div className={styles.dateWrapper}>
            <DateIcon className={styles.dateIcon} />
            <span>{createdAt}</span>
          </div>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

function MyReports() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.reports);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchReports());
  }, [dispatch]);

  // Use mock data for demo if no items loaded
  const isDemoMode = items.length === 0;
  const reports = !isDemoMode ? items : mockReports;

  const handleDeleteReport = (reportId) => {
    dispatch(deleteReport(reportId));
  };

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => {
      const name = (r.name || '').toLowerCase();
      const fileName = (r.fileName || '').toLowerCase();
      const issues = (r.topIssues || []).join(' ').toLowerCase();
      return name.includes(q) || fileName.includes(q) || issues.includes(q);
    });
  }, [reports, searchQuery]);

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
      <div className={styles.container}>
        <StackingLayout itemSpacing="20px" className={styles.reportsPage}>
          {/* Sticky header wrapper */}
          <div className={styles.stickyHeader}>
            {/* Page header */}
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>My Reports</h1>
              <p className={styles.pageSubtitle}>
                Manage and access your active case review reports and analyses.
              </p>
            </div>

            {/* Top actions bar */}
            <FlexLayout justifyContent="space-between" alignItems="center" className={styles.topActions}>
              <FlexItem className={styles.searchWrap}>
                <Input
                  name="search-reports"
                  placeholder="Search reports..."
                  search={true}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  clearButtonProps={{ 'aria-label': 'Clear search' }}
                  className={styles.searchInput}
                />
              </FlexItem>
              <FlexItem>
                <Button type="primary" onClick={() => navigate('/')}>
                  + Create New Report
                </Button>
              </FlexItem>
            </FlexLayout>
          </div>

          {showErrorBanner && (
            <div className={styles.errorBanner}>
              Error loading reports: {error}
            </div>
          )}

          {filteredReports.length === 0 ? (
            <DashboardWidgetLayout
              header={
                <DashboardWidgetHeader title="No Reports Yet" showCloseIcon={false} />
              }
              bodyContent={
                <FlexLayout
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  itemSpacing="16px"
                  className={styles.emptyState}
                >
                  <span className={styles.emptyIcon}>📋</span>
                  <p>Upload your first case report to get started</p>
                  <Button type="primary" onClick={() => navigate('/')}>
                    Upload Report
                  </Button>
                </FlexLayout>
              }
            />
          ) : (
            <>
              <div className={styles.reportsGrid}>
                {filteredReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onDelete={handleDeleteReport}
                  />
                ))}
              </div>
            </>
          )}
        </StackingLayout>
      </div>
    </div>
  );
}

export default MyReports;
