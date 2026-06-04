import React from "react";

export default function NeuroGridBackground() {
  try {
    return (
      <div className="neuro-root pointer-events-none overflow-hidden">
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
