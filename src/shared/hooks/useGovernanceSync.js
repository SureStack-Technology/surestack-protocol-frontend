import { useMemo } from "react"
import { usePocAnalytics } from "@shared/hooks/usePocAnalytics"

export function useGovernanceSync() {
  const { data } = usePocAnalytics()
  const governance = data?.governance ?? {}

  const proposals = useMemo(() => {
    const list = Array.isArray(governance.active) ? governance.active : []
    return list.map((item, index) => ({
      id: item.id ?? String(index + 1),
      proposer: item.proposer ?? "0x0000000000000000000000000000000000000000",
      description: item.description ?? "",
      state: item.state ?? 1,
      votes: item.votes ?? { forVotes: 0, againstVotes: 0, abstainVotes: 0 },
      timestamp: item.timestamp ?? Date.now(),
    }))
  }, [governance.active])

  return { proposals, connected: false, error: null }
}







