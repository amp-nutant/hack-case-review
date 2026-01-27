import { FlexLayout, TextLabel, Button, Title } from '@nutanix-ui/prism-reactjs';
import { useNavigate } from 'react-router-dom';
import './AIInsightBanner.css';

/**
 * AIInsightBanner - A banner component for AI insights and analysis summary
 * @param {string} title - The banner title (e.g., "AI Analysis Complete")
 * @param {string} description - The insight description text
 * @param {string} buttonText - Text for the action button
 * @param {string} buttonRoute - Route to navigate when button is clicked
 * @param {React.ReactNode} icon - Optional icon element (defaults to robot emoji)
 */
function AIInsightBanner({ 
  title = 'AI Analysis', 
  description, 
  buttonText = 'Ask AI Questions', 
  buttonRoute,
  icon = '🤖'
}) {
  const navigate = useNavigate();

  const handleButtonClick = () => {
    if (buttonRoute) {
      navigate(buttonRoute);
    }
  };

  return (
    <FlexLayout
      className="ai-insight-banner"
      justifyContent="space-between"
      alignItems="center"
      itemGap="L"
    >
      <FlexLayout alignItems="center" itemGap="M" className="ai-insight-content">
        <FlexLayout 
          alignItems="center" 
          justifyContent="center" 
          className="ai-insight-icon"
        >
          {typeof icon === 'string' ? <span>{icon}</span> : icon}
        </FlexLayout>
        <FlexLayout flexDirection="column" itemGap="XS">
          <Title size="h4">{title}</Title>
          <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>
            {description}
          </TextLabel>
        </FlexLayout>
      </FlexLayout>
      {buttonText && (
        <Button onClick={handleButtonClick} type={Button.ButtonTypes.PRIMARY}>
          {buttonText}
        </Button>
      )}
    </FlexLayout>
  );
}

export default AIInsightBanner;
