import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FlexLayout,
  TextLabel,
  Loader,
  StackingLayout,
} from '@nutanix-ui/prism-reactjs';
import { fetchReportById } from '../../redux/slices/reportsSlice';
import { mockReports } from '../../data/mockReports';

function AnalysisDashboard() {
  const { reportId } = useParams();
  const dispatch = useDispatch();
  const { currentReport, loading: reportLoading } = useSelector((state) => state.reports);

  useEffect(() => {
    if (reportId) {
      dispatch(fetchReportById(reportId));
    }
  }, [reportId, dispatch]);

  // Use mock data for demo
  const report = currentReport || mockReports.find((r) => r.id === reportId) || mockReports[0];

  if (reportLoading) {
    return (
      <FlexLayout 
        alignItems="center" 
        justifyContent="center"
        style={{ height: '100%', minHeight: '400px' }}
      >
        <StackingLayout alignItems="center" itemSpacing="16px">
          <Loader />
          <TextLabel>Loading analysis...</TextLabel>
        </StackingLayout>
      </FlexLayout>
    );
  }

  return <Outlet context={{ report, reportId }} />;
}

export default AnalysisDashboard;
