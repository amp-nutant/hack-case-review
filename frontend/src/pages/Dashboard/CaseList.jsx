import { useNavigate, useOutletContext } from 'react-router-dom';
import { useSelector } from 'react-redux';
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
} from '@nutanix-ui/prism-reactjs';
import { mockCases } from '../../data/mockCases';
import styles from './CaseList.module.css';

function CaseList() {
  const navigate = useNavigate();
  const { reportId } = useOutletContext();
  const { items, loading } = useSelector((state) => state.cases);

  // Use mock data for demo
  const cases = items.length > 0 ? items : mockCases;

  const handleCaseClick = (caseId) => {
    navigate(`/dashboard/${reportId}/cases/${caseId}`);
  };

  const getPriorityBadge = (priority) => {
    const colorMap = {
      critical: 'red',
      high: 'orange',
      medium: 'yellow',
      low: 'green',
    };
    return (
      <Badge
        color={colorMap[priority] || 'gray'}
        label={priority?.toUpperCase()}
      />
    );
  };

  const getStatusBadge = (status) => {
    const colorMap = {
      open: 'blue',
      in_progress: 'yellow',
      resolved: 'green',
      closed: 'gray',
    };
    return (
      <Badge
        color={colorMap[status] || 'gray'}
        label={status?.replace('_', ' ').toUpperCase()}
      />
    );
  };

  const columns = [
    {
      title: 'Case Number',
      key: 'caseNumber',
      render: (caseNumber) => (
        <span className={styles.caseNumber}>{caseNumber}</span>
      ),
    },
    {
      title: 'Title',
      key: 'title',
      render: (title) => (
        <TextLabel className={styles.caseTitle}>{title}</TextLabel>
      ),
    },
    {
      title: 'Priority',
      key: 'priority',
      render: (priority) => getPriorityBadge(priority),
    },
    {
      title: 'Status',
      key: 'status',
      render: (status) => getStatusBadge(status),
    },
    {
      title: 'Assignee',
      key: 'assignee',
      render: (assignee) => assignee || 'Unassigned',
    },
    {
      title: 'Created',
      key: 'createdAt',
      render: (createdAt) => new Date(createdAt).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="borderless"
          onClick={(e) => {
            e.stopPropagation();
            handleCaseClick(record.id);
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <FlexLayout justifyContent="center" alignItems="center" className={styles.loadingContainer}>
        <Loader tip="Loading cases..." />
      </FlexLayout>
    );
  }

  return (
    <StackingLayout itemSpacing="20px" className={styles.caseList}>
      <FlexLayout justifyContent="space-between" alignItems="center">
        <FlexItem>
          <Title size="h3">Case List</Title>
          <TextLabel type="secondary">
            {cases.length} cases in this report
          </TextLabel>
        </FlexItem>
        <FlexItem>
          <FlexLayout itemSpacing="10px">
            <Button type="secondary">Export</Button>
          </FlexLayout>
        </FlexItem>
      </FlexLayout>

      <Table
        columns={columns}
        dataSource={cases}
        rowKey="id"
        onRowClick={(record) => handleCaseClick(record.id)}
        search={{
          inputProps: {
            placeholder: 'Search cases...',
          },
        }}
        structure={{
          bodyMaxHeight: '60vh',
          columnWidths: {
            caseNumber: '150px',
            title: '300px',
            priority: '100px',
            status: '120px',
            assignee: '150px',
            createdAt: '120px',
            actions: '120px',
          },
        }}
      />
    </StackingLayout>
  );
}

export default CaseList;
