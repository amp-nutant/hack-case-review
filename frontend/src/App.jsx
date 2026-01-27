import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/Layout';
import { UploadData } from './pages/Upload';
import { MyReports } from './pages/Reports';
import {
  AnalysisDashboard,
  DashboardOverview,
  ActionCenter,
  CaseList,
  CaseDetail,
  ClusterView,
  NLPChat,
  GraphView,
} from './pages/Dashboard';

function App() {
  return (
    <Routes>
      {/* Main Layout wraps all routes */}
      <Route element={<MainLayout />}>
        {/* Landing Page - Upload Data */}
        <Route path="/" element={<UploadData />} />

        {/* My Reports Page */}
        <Route path="/reports" element={<MyReports />} />

        {/* Analysis Dashboard with nested routes */}
        <Route path="/dashboard/:reportId" element={<AnalysisDashboard />}>
          {/* Dashboard Overview as default */}
          <Route index element={<DashboardOverview />} />
          
          {/* Dashboard sub-pages */}
          <Route path="overview" element={<DashboardOverview />} />
          <Route path="action-center" element={<ActionCenter />} />
          <Route path="cases" element={<CaseList />} />
          <Route path="cases/:caseId" element={<CaseDetail />} />
          <Route path="clusters" element={<ClusterView />} />
          <Route path="chat" element={<NLPChat />} />
          <Route path="graphs" element={<GraphView />} />
        </Route>

        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
