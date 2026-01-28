import React from 'react';
import {
  StackingLayout,
  FlexLayout,
  Title,
  Badge,
  TextLabel,
} from '@nutanix-ui/prism-reactjs';
import { Card } from '../common';

/**
 * AssociatedIssuesCard Component
 * 
 * Displays a card with associated issues identified during case review.
 * Each issue is shown as a badge/tag.
 * 
 * @param {Object} props
 * @param {string[]} props.issues - Array of issue strings to display
 */
function AssociatedIssuesCard({ issues = [] }) {
  if (!issues || issues.length === 0) {
    return null;
  }

  return (
    <Card>
      <StackingLayout itemGap="M" style={{ padding: '12px' }}>
        <Title size="h3">Associated Issues</Title>
        
        <FlexLayout itemGap="S" flexWrap="wrap">
          {issues.map((issue, index) => (
            <Badge
              key={index}
              color="gray"
              count={issue}
              style={{
                backgroundColor: '#f0f0f0',
                border: '1px solid #d0d0d0',
                borderRadius: '4px',
                padding: '4px 12px',
              }}
            />
          ))}
        </FlexLayout>
      </StackingLayout>
    </Card>
  );
}

export default AssociatedIssuesCard;
