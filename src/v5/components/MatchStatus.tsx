import type { OpportunityMatchingSummary } from "../../api/types"

type MatchStatusProps = {
  matching: OpportunityMatchingSummary
}

export function MatchStatus({
  matching,
}: MatchStatusProps) {
  let label = "Non évalué"
  let tone = "neutral"

  if (matching.available) {
    if (matching.freshness === "STALE") {
      label = "Analyse à actualiser"
      tone = "neutral"
    } else {
      switch (matching.computed_status) {
        case "OK":
          label = "Conforme"
          tone = "success"
          break
        case "PARTIAL":
          label = "Partiellement conforme"
          tone = "warning"
          break
        case "VERIFY":
          label = "À vérifier"
          tone = "warning"
          break
        case "BLOCKING":
          label = "Blocage identifié"
          tone = "danger"
          break
      }
    }
  }

  return (
    <span className={`mor-v5-status mor-v5-status--${tone}`}>
      <span className="mor-v5-status-dot" aria-hidden="true" />
      {label}
    </span>
  )
}
