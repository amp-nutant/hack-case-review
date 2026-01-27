import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FlexLayout,
  FlexItem,
  Title,
  TextLabel,
  Button,
  Table,
  Loader,
  StackingLayout,
  Badge,
  DashboardWidgetLayout,
  DashboardWidgetHeader,
} from '@nutanix-ui/prism-reactjs';
import { fetchReports, deleteReport } from '../../redux/slices/reportsSlice';
import { mockReports } from '../../data/mockReports';
import styles from './MyReports.module.css';

function MyReports() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchReports());
  }, [dispatch]);

  // Use mock data for demo if no items loaded
  const reports = items.length > 0 ? items : mockReports;

  const handleViewReport = (reportId) => {
    navigate(`/dashboard/${reportId}/action-center`);
  };

  const handleDeleteReport = (reportId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this report?')) {
      dispatch(deleteReport(reportId));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const colorMap = {
      completed: 'green',
      processing: 'yellow',
      failed: 'red',
      pending: 'gray',
    };
    return (
      <Badge
        color={colorMap[status] || 'gray'}
        label={status?.toUpperCase()}
      />
    );
  };

  const columns = [
    {
      title: 'Report Name',
      key: 'name',
      render: (name, record) => (
        <FlexLayout alignItems="center" itemSpacing="12px">
          <span className={styles.fileIcon}>📄</span>
          <FlexLayout flexDirection="column">
            <TextLabel className={styles.reportName}>{name}</TextLabel>
            <TextLabel type="secondary" className={styles.fileName}>
              {record.fileName}
            </TextLabel>
          </FlexLayout>
        </FlexLayout>
      ),
    },
    {
      title: 'Uploaded',
      key: 'createdAt',
      render: (createdAt) => formatDate(createdAt),
    },
    {
      title: 'Cases',
      key: 'caseCount',
      render: (caseCount) => `${caseCount} cases`,
    },
    {
      title: 'Status',
      key: 'status',
      render: (status) => getStatusBadge(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <FlexLayout itemSpacing="8px">
          <Button
            type="secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleViewReport(record.id);
            }}
          >
            View
          </Button>
          <Button
            type="borderless"
            onClick={(e) => handleDeleteReport(record.id, e)}
          >
            Delete
          </Button>
        </FlexLayout>
      ),
    },
  ];

  if (loading) {
    return (
      <FlexLayout justifyContent="center" alignItems="center" className={styles.loadingContainer}>
        <Loader tip="Loading reports..." />
      </FlexLayout>
    );
  }

  return (
    <StackingLayout itemSpacing="20px" className={styles.reportsPage}>
      <FlexLayout justifyContent="space-between" alignItems="center">
        <FlexItem>
          <Title size="h2">My Reports</Title>
          <TextLabel type="secondary">
            View and manage your uploaded case reports
          </TextLabel>
        </FlexItem>
        <FlexItem>
          <Button type="primary" onClick={() => navigate('/')}>
            Upload New Report
          </Button>
        </FlexItem>
      </FlexLayout>

      {error && (
        <DashboardWidgetLayout
          className={styles.errorBanner}
          bodyContent={
            <TextLabel>Error loading reports: {error}</TextLabel>
          }
        />
      )}

      {reports.length === 0 ? (
        <DashboardWidgetLayout
          header={
            <DashboardWidgetHeader
              title="No Reports Yet"
              showCloseIcon={false}
            />
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
              <TextLabel type="secondary">
                Upload your first case report to get started
              </TextLabel>
              <Button type="primary" onClick={() => navigate('/')}>
                Upload Report
              </Button>
            </FlexLayout>
          }
        />
      ) : (
        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          onRowClick={(record) => handleViewReport(record.id)}
          structure={{
            bodyMaxHeight: '65vh',
            columnWidths: {
              name: '350px',
              createdAt: '200px',
              caseCount: '120px',
              status: '120px',
              actions: '180px',
            },
          }}
        />
      )}
    </StackingLayout>
  );
}

export default MyReports;
