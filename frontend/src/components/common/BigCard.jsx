import { FlexLayout, Title, Link } from '@nutanix-ui/prism-reactjs';
import { useNavigate } from 'react-router-dom';
import './BigCard.css';

/**
 * BigCard - A reusable container card component with header and link
 * @param {string} title - The card title displayed at the top left
 * @param {string} linkTitle - The link text displayed at the top right
 * @param {string} linkRoute - The route to navigate to when link is clicked
 * @param {React.ReactNode} children - The content to render inside the card
 */
function BigCard({ title, linkTitle, linkRoute, children }) {
  const navigate = useNavigate();

  const handleLinkClick = () => {
    if (linkRoute) {
      navigate(linkRoute);
    }
  };

  return (
    <FlexLayout flexDirection="column" className="big-card" itemGap="S">
      <FlexLayout
        justifyContent="space-between"
        alignItems="center"
        className="big-card-header"
        style={{ padding: '12px' }}
      >
        <Title size="h3">{title}</Title>
        {linkTitle && (
          <Link
            className="big-card-link"
            onClick={handleLinkClick}
          >
            {linkTitle} {'>'}
          </Link>
        )}
      </FlexLayout>
      <FlexLayout
        flexDirection="column"
        itemGap="M"
        style={{ padding: '12px 12px' }}
        className="big-card-content"
      >
        {children}
      </FlexLayout>
    </FlexLayout>
  );
}

export default BigCard;
