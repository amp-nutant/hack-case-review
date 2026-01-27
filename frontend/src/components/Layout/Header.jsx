import { useNavigate, useLocation } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import {
  FlexLayout,
  FlexItem,
  NavBarLayout,
  NutanixLogoIcon,
  PowerIcon,
  ThemeManager,
  StackingLayout,
  Link,
  VerticalSeparator,
} from '@nutanix-ui/prism-reactjs';
import styles from './Header.module.css';

// Mock user data - in production this would come from auth context/redux
const mockUser = {
  name: 'John Doe',
  email: 'john.doe@nutanix.com',
};

// Config for microfrontend integration
const config = {
  showHeader: true,
  appTitle: 'Case Review',
  environment: 'DEV', // Set to 'PROD' in production
};

function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    console.log('Logout clicked');
    navigate('/');
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  // Nutanix Logo with App Title - matching schooner/ubertower pattern
  const nutanixLogo = (
    <Link onClick={handleLogoClick} className={styles.nutanixLogoContainer}>
      <StackingLayout className={styles.nutanixLogo}>
        <NutanixLogoIcon className={styles.headerNtnxLogo} />
        <p className="ntnx-title">{config.appTitle}</p>
      </StackingLayout>
    </Link>
  );

  // Account info section with user name and logout
  const accountInfo = (
    <FlexLayout alignItems="center" itemSpacing="10px">
      <span className={styles.userName}>{mockUser.name}</span>
      <PowerIcon
        onClick={handleLogout}
        size="large"
        style={{ zoom: '120%', margin: '5px', cursor: 'pointer' }}
        color={ThemeManager.getVar('red-1')}
      />
    </FlexLayout>
  );

  // Don't render header if configured to be hidden (for microfrontend embedding)
  if (!config.showHeader) {
    return null;
  }

  return (
    <FlexItem>
      <NavBarLayout
        htmlTag="header"
        layout={NavBarLayout.NavBarLayoutTypes.LEFT}
        logoIcon={nutanixLogo}
        accountInfo={accountInfo}
      />
    </FlexItem>
  );
}

export default Header;
