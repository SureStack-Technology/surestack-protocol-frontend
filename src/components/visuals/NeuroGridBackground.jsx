import React from "react";

export default function NeuroGridBackground() {
  try {
    return (
      <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        <div className="neuro-gradient" />
        <div className="neuro-grid" />
        <div className="neuro-glow" />
        <div className="neuro-vignettes" />
      </div>
    );
  } catch (err) {
    console.warn("[VisualLayer] Failed to render NeuroGridBackground", err);
    return null;
  }
}
