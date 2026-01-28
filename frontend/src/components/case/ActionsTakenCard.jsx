import React from 'react';
import {
  StackingLayout,
  Title,
  TextLabel,
  Divider,
  Paragraph,
} from '@nutanix-ui/prism-reactjs';
import { Card } from '../common';

/**
 * ActionsTakenCard Component
 * 
 * Displays a timeline of actions taken on the case.
 * Each action includes a timestamp and description.
 * 
 * @param {Object} props
 * @param {Array} props.actionsTaken - Array of action objects
 * @param {string} props.actionsTaken[].timestamp - ISO date string or formatted date
 * @param {string} props.actionsTaken[].description - Description of the action taken
 */
function ActionsTakenCard({ actionsTaken = [] }) {
  if (!actionsTaken || actionsTaken.length === 0) {
    return null;
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).replace(',', '');
    } catch {
      return timestamp;
    }
  };

  return (
    <Card>
      <StackingLayout itemGap="M" style={{ padding: '12px' }}>
        <Title size="h3">Actions Taken</Title>
        
        <StackingLayout itemGap="M">
          {actionsTaken.map((action, index) => (
            <React.Fragment key={index}>
              <StackingLayout itemGap="XS">
                <TextLabel 
                  type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}
                  style={{ fontStyle: 'italic', fontSize: '12px' }}
                >
                  {formatTimestamp(action.timestamp)}
                </TextLabel>
                <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {action.description}
                </Paragraph>
              </StackingLayout>
              {index < actionsTaken.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </StackingLayout>
      </StackingLayout>
    </Card>
  );
}

export default ActionsTakenCard;
