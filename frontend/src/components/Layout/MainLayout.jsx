import { Outlet, useLocation } from 'react-router-dom';
import { FlexLayout, FlexItem, StackingLayout } from '@nutanix-ui/prism-reactjs';
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
    <StackingLayout itemSpacing="0px" style={{ minHeight: '100vh' }}>
      {/* Header - fixed at top */}
      {layoutConfig.showHeader && <Header />}
      
      {/* Main Content Area */}
      <FlexLayout itemSpacing="0px" style={{ flex: 1, overflow: 'hidden' }}>
        {/* Sidebar - shown only on dashboard routes */}
        {shouldShowSidebar && <Sidebar />}
        
        {/* Page Content */}
        <FlexItem flexGrow="1" className="page-content">
          <Outlet />
        </FlexItem>
      </FlexLayout>
    </StackingLayout>
  );
}

export default MainLayout;
