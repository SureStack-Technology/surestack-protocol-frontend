/** Premium inline SVG marks for Market Intelligence strip (BTC · ETH · XRP). */
export default function MacroAssetLogo({ symbol, className = '' }) {
  const sym = String(symbol || '').toUpperCase()
  if (sym === 'BTC') {
    return (
      <svg className={className} viewBox="0 0 32 32" aria-hidden fill="none">
        <circle cx="16" cy="16" r="15" fill="url(#btc-g)" stroke="rgba(247,147,26,0.45)" strokeWidth="1" />
        <path
          fill="#F7931A"
          d="M18.2 14.1c.2-1.4-.9-2.1-2.4-2.6l.5-2-1.2-.3-.5 2c-.3-.1-.6-.2-.9-.3l.5-2-1.2-.3-.5 2c-.2 0-.4-.1-.6-.1l-1.7-.4-.3 1.2s.9.2.9.2c.5.1.6.4.6.7l-.6 2.4c0 .1.1.1.1.1l-.1.4-.9 3.6c-.1.2-.3.3-.6.2 0 0-.9-.2-.9-.2l-.6 1.4 1.6.4c.3.1.6.2.9.2l-.5 2 1.2.3.5-2c.3.1.6.2.9.3l-.5 2 1.2.3.5-2c2 .4 3.5.2 4.1-1.6.5-1.4 0-2.2-1-2.7.7-.2 1.3-.7 1.5-1.8zm-2.8 4.2c-.4 1.5-2.9.7-3.7.5l.7-2.7c.8.2 3.4.6 3 2.2zm.4-4.3c-.3 1.4-2.5.7-3.2.5l.6-2.5c.7.2 2.9.5 2.6 2z"
        />
        <defs>
          <radialGradient id="btc-g" cx="0.3" cy="0.2" r="0.9">
            <stop stopColor="rgba(247,147,26,0.35)" />
            <stop offset="1" stopColor="rgba(15,23,42,0.2)" />
          </radialGradient>
        </defs>
      </svg>
    )
  }
  if (sym === 'ETH') {
    return (
      <svg className={className} viewBox="0 0 32 32" aria-hidden fill="none">
        <circle cx="16" cy="16" r="15" fill="url(#eth-g)" stroke="rgba(98,126,234,0.45)" strokeWidth="1" />
        <path fill="#627EEA" d="M16 6 9 17.2 16 14.5 23 17.2 16 6zm0 5.2 5.8 8.6L16 17.8l-5.8 1.9L16 11.2z" opacity="0.95" />
        <path fill="#627EEA" d="M16 19.8 9 19.2 16 26l7-6.8-7 .6z" opacity="0.75" />
        <defs>
          <radialGradient id="eth-g" cx="0.35" cy="0.15" r="0.95">
            <stop stopColor="rgba(98,126,234,0.32)" />
            <stop offset="1" stopColor="rgba(15,23,42,0.15)" />
          </radialGradient>
        </defs>
      </svg>
    )
  }
  if (sym === 'XRP') {
    return (
      <svg className={className} viewBox="0 0 32 32" aria-hidden fill="none">
        <circle cx="16" cy="16" r="15" fill="url(#xrp-g)" stroke="rgba(35,182,208,0.4)" strokeWidth="1" />
        <path
          fill="#23B2D0"
          d="M8.5 11.2h2.1c.6 0 1.1.2 1.5.6l4.2 4.5c.3.3.7.5 1.1.5h.8c.4 0 .8-.2 1.1-.5l4.2-4.5c.4-.4.9-.6 1.5-.6h2.1c.9 0 1.4 1.1.7 1.8l-5.8 5.5c-.6.6-.6 1.5 0 2.1l5.8 5.5c.7.7.2 1.8-.7 1.8h-2.1c-.6 0-1.1-.2-1.5-.6l-4.2-4.5c-.3-.3-.7-.5-1.1-.5h-.8c-.4 0-.8.2-1.1.5l-4.2 4.5c-.4.4-.9.6-1.5.6H8.5c-.9 0-1.4-1.1-.7-1.8l5.8-5.5c.6-.6.6-1.5 0-2.1L7.8 13c-.7-.7-.2-1.8.7-1.8z"
        />
        <defs>
          <radialGradient id="xrp-g" cx="0.4" cy="0.2" r="0.9">
            <stop stopColor="rgba(35,182,208,0.28)" />
            <stop offset="1" stopColor="rgba(15,23,42,0.12)" />
          </radialGradient>
        </defs>
      </svg>
    )
  }
  return null
}
