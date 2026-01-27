import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FlexItem,
  Menu,
  MenuGroup,
  MenuItem,
  Button,
  StackingLayout,
} from '@nutanix-ui/prism-reactjs';
import './Sidebar.css';

const navigationItems = [
  { id: 'action-center', label: 'Action Center', path: 'action-center' },
  { id: 'cases', label: 'Case List', path: 'cases' },
  { id: 'clusters', label: 'Clusters / Similar Issues', path: 'clusters' },
  { id: 'chat', label: 'NLP Chat', path: 'chat' },
  { id: 'graphs', label: 'Charts & Graphs', path: 'graphs' },
];

function Sidebar() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for controlling which menu groups are open
  const [openKeyMap, setOpenKeyMap] = useState({ analysis: true });

  const handleNavigation = (path) => {
    navigate(`/dashboard/${reportId}/${path}`);
  };

  const getActiveKeyPath = () => {
    const currentPath = location.pathname;
    const item = navigationItems.find(item => currentPath.includes(`/${item.path}`));
    return item ? [item.id] : ['action-center'];
  };

  const handleMenuClick = (info) => {
    // Update open state for collapsible groups
    if (info.openKeyMap) {
      setOpenKeyMap(info.openKeyMap);
    }
    
    // Navigate if clicking a menu item (not a group header)
    if (!info.type) {
      const item = navigationItems.find(i => i.id === info.key);
      if (item) {
        handleNavigation(item.path);
      }
    }
  };

  return (
    <StackingLayout className="sidebar" itemSpacing="0px">
      {/* Navigation Menu */}
      <FlexItem flexGrow="1" className="menu-container">
        <Menu
          theme="light"
          activeKeyPath={getActiveKeyPath()}
          openKeyMap={openKeyMap}
          onClick={handleMenuClick}
          itemSpacing="5px"
        >
          <MenuGroup key="analysis" title="Analysis Views" type="collapsible">
            {navigationItems.map((item) => (
              <MenuItem key={item.id}>
                {item.label}
              </MenuItem>
            ))}
          </MenuGroup>
        </Menu>
      </FlexItem>

      {/* Footer */}
      <FlexItem className="sidebar-footer">
        <Button
          type="secondary"
          fullWidth
          onClick={() => navigate('/reports')}
        >
          ← Back to Reports
        </Button>
      </FlexItem>
    </StackingLayout>
  );
}

export default Sidebar;
