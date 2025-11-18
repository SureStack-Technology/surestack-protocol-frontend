import { memo } from "react"

function NeuroGridOverlay() {
  return (
    <div className="neuro-root">
      <div className="neuro-grid-layer">
        <div className="neuro-gradient" />
        <div className="neuro-crossfade" />
        <div className="neuro-glow" />
        <div className="neuro-vignettes" />
      </div>
    </div>
  )
}

export default memo(NeuroGridOverlay)
