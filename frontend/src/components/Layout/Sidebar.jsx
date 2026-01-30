import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Menu,
  MenuItem,
  MenuGroup,
  StackingLayout,
  Title,
  TextLabel,
  Separator,
  DotIcon,
  Divider
} from '@nutanix-ui/prism-reactjs';
import { mockReports } from '../../data/mockReports';

const navigationItems = [
  { key: '1', label: 'Overview', path: '' },
  { key: '2', label: 'Action Center', path: 'action-center' },
  { key: '3', label: 'Case List', path: 'cases' },
  { key: '4', label: 'Issue Groups', path: 'issue-groups' },
  { key: '5', label: 'Servicability Bot', path: 'chat' },
  { key: '6', label: 'Charts & Graphs', path: 'graphs' },
];

function Sidebar() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get report from Redux or fallback to mock data
  const { currentReport } = useSelector((state) => state.reports);
  const report = currentReport || mockReports.find((r) => r.id === reportId) || mockReports[0];

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getActiveKeyPath = () => {
    const currentPath = location.pathname;
    if (currentPath === `/dashboard/${reportId}` || currentPath === `/dashboard/${reportId}/`) {
      return ['nav', '1'];
    }
    const item = navigationItems.find(item => item.path && currentPath.includes(`/${item.path}`));
    return item ? ['nav', item.key] : ['nav', '1'];
  };

  const handleMenuClick = (info) => {
    const clickedKey = info.key;
    const item = navigationItems.find(item => item.key === clickedKey);
    if (item) {
      if (item.path === '') {
        navigate(`/dashboard/${reportId}`);
      } else {
        navigate(`/dashboard/${reportId}/${item.path}`);
      }
    }
  };

  return (
    <Menu
      itemSpacing="10px"
      activeKeyPath={getActiveKeyPath()}
      onClick={handleMenuClick}
      style={{ width: '240px', minWidth: '240px', flexShrink: 0 }}
      role={Menu.MenuRole.MENUBAR}
    >
      <StackingLayout padding="0px-20px">
        <Title>{report?.name || 'Analysis Report'}</Title>
        <TextLabel>{formatDate(report?.createdAt)}</TextLabel>
        <Divider type="short" />
      </StackingLayout>
      <MenuGroup key="nav">
        {navigationItems.map((item) => (
          <MenuItem key={item.key}>{item.label}</MenuItem>
        ))}
      </MenuGroup>
    </Menu>
  );
}

export default Sidebar;
