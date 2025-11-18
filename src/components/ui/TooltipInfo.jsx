import { useState } from "react";

/**
 * ℹ️ Tooltip Info Component
 * Simple hover tooltip for displaying additional information
 * 
 * @param {string} text - Tooltip text to display
 * @param {string} className - Additional CSS classes
 */
export default function TooltipInfo({ text, className = "" }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!text) return null;

  return (
    <span className={`relative inline-block ${className}`}>
      <span
        className="ml-1 text-gray-400 cursor-pointer hover:text-gray-300 transition-colors"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={text}
      >
        ℹ️
      </span>
      
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md shadow-lg z-50 whitespace-nowrap max-w-xs"
          style={{ minWidth: "200px" }}
        >
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </span>
  );
}

