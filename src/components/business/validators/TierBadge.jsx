export default function TierBadge({ tier }) {
  const classMap = {
    T1: "bg-emerald-600 text-white border-emerald-400",
    T2: "bg-blue-600 text-white border-blue-400",
    T3: "bg-slate-600 text-white border-slate-400",
  }

  const labelMap = {
    T1: "Tier 1",
    T2: "Tier 2",
    T3: "Tier 3",
  }

  const variant = tier ?? "T3"

  return (
    <span className={`px-3 py-1 text-xs rounded-full border ${classMap[variant] ?? classMap.T3}`}>
      {labelMap[variant] ?? labelMap.T3}
    </span>
  )
}
