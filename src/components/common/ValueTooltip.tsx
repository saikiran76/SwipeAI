import React, { useState } from 'react';

interface ValueTooltipProps {
  value: any;
  label: string;
  children: React.ReactNode;
}

const ValueTooltip: React.FC<ValueTooltipProps> = ({ value, label, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getMessage = () => {
    if (value === null || value === undefined || value === '') {
      return `${label} is not available`;
    }
    if (typeof value === 'number' && isNaN(value)) {
      return `Invalid ${label.toLowerCase()} value`;
    }
    return '';
  };

  const tooltipMessage = getMessage();

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => tooltipMessage && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={tooltipMessage ? 'cursor-help' : 'cursor-default'}
      >
        {children}
      </div>
      {showTooltip && tooltipMessage && (
        <div className="absolute z-10 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg -top-8 left-1/2 transform -translate-x-1/2">
          {tooltipMessage}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
        </div>
      )}
    </div>
  );
};

export default ValueTooltip; 