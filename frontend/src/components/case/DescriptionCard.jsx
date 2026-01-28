import React from 'react';
import {
  StackingLayout,
  Title,
  Paragraph,
} from '@nutanix-ui/prism-reactjs';
import { Card } from '../common';

/**
 * DescriptionCard Component
 * 
 * Displays the case description in a card format.
 * 
 * @param {Object} props
 * @param {string} props.description - The case description text
 */
function DescriptionCard({ description }) {
  if (!description) {
    return null;
  }

  return (
    <Card>
      <StackingLayout itemGap="M" style={{ padding: '12px' }}>
        <Title size="h3">Description</Title>
        <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {description}
        </Paragraph>
      </StackingLayout>
    </Card>
  );
}

export default DescriptionCard;
