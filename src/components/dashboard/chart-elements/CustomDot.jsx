import React from 'react';

/**
 * Custom dot component to show which line is active
 * Only renders when the line is being hovered
 */
const CustomDot = (props) => {
  const { cx, cy, dataKey, payload, stroke, hoveredLine } = props;
  
  // Only show for the active line
  if (hoveredLine !== dataKey) {
    return null;
  }
  
  // Get the value for this key
  const value = payload[dataKey];
  if (value === undefined) {
    return null;
  }
  
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={stroke} />
      <circle cx={cx} cy={cy} r={8} fill="none" stroke={stroke} />
    </g>
  );
};

export default CustomDot;