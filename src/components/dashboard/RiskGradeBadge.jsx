import TooltipInfo from "../ui/TooltipInfo";

/**
 * 🎯 Risk Grade Badge Component
 * Maps numeric risk score to letter grade with color coding
 * 
 * @param {number} score - Risk score (0-100)
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg'
 * @param {boolean} showTooltip - Show tooltip with explanation
 */
export default function RiskGradeBadge({ score = 0, size = "md", showTooltip = true }) {
  // Clamp score to 0-100 range
  const clampedScore = Math.max(0, Math.min(100, Number(score) || 0));

  // Determine grade and color
  let grade, color, bgColor, textColor;
  
  if (clampedScore <= 20) {
    grade = "A";
    color = "green";
    bgColor = "bg-green-500/20";
    textColor = "text-green-400";
  } else if (clampedScore <= 50) {
    grade = "B";
    color = "yellow";
    bgColor = "bg-yellow-500/20";
    textColor = "text-yellow-400";
  } else {
    grade = "C";
    color = "red";
    bgColor = "bg-red-500/20";
    textColor = "text-red-400";
  }

  // Size classes
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const tooltipText = showTooltip
    ? `Risk Grade ${grade}: Score ${clampedScore.toFixed(1)}/100. Grade A (0-20) = Low Risk, Grade B (21-50) = Medium Risk, Grade C (>50) = High Risk.`
    : null;

  return (
    <span className={`inline-flex items-center ${sizeClasses[size]} ${bgColor} ${textColor} rounded-md border border-current/30 font-semibold`}>
      Grade {grade}
      {showTooltip && tooltipText && (
        <TooltipInfo text={tooltipText} className="ml-1" />
      )}
    </span>
  );
}

