import PropTypes from 'prop-types';
import './Card.css';

/**
 * Reusable Card component with optional colored left border highlight
 * 
 * @param {string} highlight - Color of the left border: 'red', 'green', 'blue', 'orange', or null/undefined for no highlight
 * @param {React.ReactNode} children - Card content
 * @param {string} className - Additional CSS classes
 * @param {string} padding - Custom padding value (default: '20px')
 * @param {object} style - Additional inline styles
 */
function Card({ 
  highlight, 
  children, 
  className = '', 
  padding,
  style = {} 
}) {
  const getHighlightClass = () => {
    if (!highlight) return '';
    const highlightMap = {
      red: 'card--highlight-red',
      green: 'card--highlight-green',
      blue: 'card--highlight-blue',
      orange: 'card--highlight-orange',
    };
    return highlightMap[highlight] || '';
  };

  const cardStyle = {
    ...style,
    ...(padding && { padding }),
  };

  return (
    <div 
      className={`card ${getHighlightClass()} ${className}`.trim()}
      style={Object.keys(cardStyle).length > 0 ? cardStyle : undefined}
    >
      {children}
    </div>
  );
}

Card.propTypes = {
  highlight: PropTypes.oneOf(['red', 'green', 'blue', 'orange', null]),
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  padding: PropTypes.string,
  style: PropTypes.object,
};

export default Card;
