import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FlexLayout, Title, TextLabel, Loader } from '@nutanix-ui/prism-reactjs';
import { fetchReportById } from '../../redux/slices/reportsSlice';
import { fetchCasesByReport } from '../../redux/slices/casesSlice';
import { mockReports } from '../../data/mockReports';
import styles from './AnalysisDashboard.module.css';

function AnalysisDashboard() {
  const { reportId } = useParams();
  const dispatch = useDispatch();
  const { currentReport, loading: reportLoading } = useSelector((state) => state.reports);

  useEffect(() => {
    if (reportId) {
      dispatch(fetchReportById(reportId));
      dispatch(fetchCasesByReport(reportId));
    }
  }, [reportId, dispatch]);

  // Use mock data for demo
  const report = currentReport || mockReports.find((r) => r.id === reportId) || mockReports[0];

  if (reportLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader />
        <TextLabel>Loading analysis...</TextLabel>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}>
        <FlexLayout justifyContent="space-between" alignItems="center">
          <div>
            <Title size="h2">{report?.name || 'Analysis Dashboard'}</Title>
            <TextLabel type="secondary">
              {report?.caseCount || 0} cases analyzed
            </TextLabel>
          </div>
          <div className={styles.reportMeta}>
            <TextLabel type="secondary">
              Report ID: {reportId}
            </TextLabel>
          </div>
        </FlexLayout>
      </div>

      <div className={styles.dashboardContent}>
        <Outlet context={{ report, reportId }} />
      </div>
    </div>
  );
}

export default AnalysisDashboard;
