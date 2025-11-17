import React from "react";

/**
 * 💀 Skeleton Loader Component
 * Provides visual feedback while data is loading
 */
export default function SkeletonLoader({ 
  variant = "text", 
  width = "100%", 
  height = "1rem",
  className = "",
  count = 1 
}) {
  const baseClasses = "animate-pulse bg-neutral-800 rounded";
  
  if (variant === "text") {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${className}`}
            style={{ width, height }}
          />
        ))}
      </>
    );
  }

  if (variant === "card") {
    return (
      <div className={`${baseClasses} p-4 ${className}`} style={{ width, height }}>
        <div className="h-4 bg-neutral-700 rounded w-3/4 mb-2" />
        <div className="h-4 bg-neutral-700 rounded w-1/2" />
      </div>
    );
  }

  if (variant === "circle") {
    return (
      <div
        className={`${baseClasses} ${className}`}
        style={{ width, height, borderRadius: "50%" }}
      />
    );
  }

  return (
    <div className={`${baseClasses} ${className}`} style={{ width, height }} />
  );
}

