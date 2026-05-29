/**
 * Lightweight mesh backdrop for Explorer workspace — CSS only, no hero image.
 */
export default function ExplorerIntelligenceBackdrop({ className = '' }) {
  return (
    <div className={`explorer-mesh-layer h-full w-full min-h-[280px] ${className}`} aria-hidden>
      <div className="explorer-mesh-grain h-full w-full" />
    </div>
  )
}
