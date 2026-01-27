import { FlexLayout, TextLabel, Title } from '@nutanix-ui/prism-reactjs';
import './MiniCard.css';

/**
 * MiniCard - A reusable metric card component
 * @param {string} title - The label displayed at the top
 * @param {string|number} count - The value to display
 * @param {string} countColor - The color of the count value (default: '#22a5f7')
 */
function MiniCard({ title, count, countColor = '#22a5f7' }) {
  return (
    <FlexLayout
      flexDirection="column"
      itemGap="S"
      alignItems="center"
      className="mini-card"
      style={{ padding: '12px 12px' }}
    >
      {/* <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>{title}</TextLabel> */}
      <Title size="h3">{title}</Title>
      <span className="mini-card-count" style={{ color: countColor }}>
        {count}
      </span>
    </FlexLayout>
  );
}

export default MiniCard;
