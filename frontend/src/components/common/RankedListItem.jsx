import { FlexLayout, TextLabel, Badge } from '@nutanix-ui/prism-reactjs';
import './RankedListItem.css';

/**
 * RankedListItem - A reusable row component for ranked/numbered lists
 * @param {number} rank - The rank number to display in the circle
 * @param {string} rankColor - Background color for the rank circle
 * @param {string} label - The main text label
 * @param {string} badgeText - Text to display in the badge (e.g., "35 cases")
 * @param {function} onClick - Click handler for the row
 */
function RankedListItem({ rank, rankColor, label, badgeText, onClick }) {
  return (
    <FlexLayout
      justifyContent="space-between"
      alignItems="center"
      className="ranked-list-item"
      onClick={onClick}
    >
      <FlexLayout alignItems="center" itemGap="M">
        <span className="rank-circle" style={{ backgroundColor: rankColor }}>
          {rank}
        </span>
        <TextLabel>{label}</TextLabel>
      </FlexLayout>
      {badgeText && (
        <Badge color="gray" count={badgeText} />
      )}
    </FlexLayout>
  );
}

export default RankedListItem;
