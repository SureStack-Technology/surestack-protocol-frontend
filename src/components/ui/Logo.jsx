const LOGO_SRC = '/assets/logo/surestack-logo.png'

export default function Logo({ className, withGlow = true, alt = 'SureStack' }) {
  const base = 'w-auto'
  const glowClass = withGlow ? 'drop-shadow-[0_0_18px_rgba(0,255,240,0.35)]' : ''
  const sizeClass = className ?? 'h-10'
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={`${base} ${glowClass} ${sizeClass}`}
    />
  )
}

