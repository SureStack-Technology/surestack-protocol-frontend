import toast from 'react-hot-toast'

/**
 * Compact contextual provider upgrade CTA — no billing wiring.
 */
export default function PrimeProviderFeedCta() {
  const handleActivate = () => {
    toast('Live provider feeds are available on Intelligence Pro — contact your account team.', {
      icon: '✦',
      duration: 4500,
    })
  }

  return (
    <div className="prime-provider-feed-cta">
      <p className="prime-provider-feed-cta__copy">
        Activate live feed to unlock real narrative anomalies, whale behavior, liquidity concentration, and
        smart-money movement.
      </p>
      <button type="button" onClick={handleActivate} className="prime-provider-feed-cta__btn">
        Activate live feed
      </button>
    </div>
  )
}
