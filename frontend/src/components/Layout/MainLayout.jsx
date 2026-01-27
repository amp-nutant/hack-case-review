import { Outlet, useLocation } from 'react-router-dom';
import { FlexLayout, FlexItem } from '@nutanix-ui/prism-reactjs';
import Header from './Header';
import Sidebar from './Sidebar';
import './MainLayout.css';

// Config for microfrontend integration
const layoutConfig = {
  showHeader: true,
  showSidebar: true,
};

function MainLayout() {
  const location = useLocation();
  
  // Check if we're on the dashboard route (show sidebar)
  const isDashboardRoute = location.pathname.includes('/dashboard');
  const shouldShowSidebar = layoutConfig.showSidebar && isDashboardRoute;

  return (
    <div className="main-layout">
      {/* Header - fixed at top */}
      {layoutConfig.showHeader && <Header />}
      
      {/* Main Content Area */}
      <div className="content-area">
        {/* Sidebar - shown only on dashboard routes */}
        {shouldShowSidebar && (
          <div className="sidebar-container">
            <Sidebar />
          </div>
        )}
        
        {/* Page Content */}
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default MainLayout;
