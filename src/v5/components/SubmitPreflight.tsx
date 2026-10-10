import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import {
  AlertTriangle, ArrowRight, ClipboardCheck,
  FileWarning, RefreshCw,
} from "lucide-react"

import { apiGet } from "../../api/client"
import { getPrepareRequirements } from "../../api/prepare"

type Item = {
  source_requirement_id: number
  management_type: "DOCUMENT" | "OTHER_CONDITION"
  label: string
  qualification: string
  document_state: string
  needs_scope_review: boolean
  scope_uncertain: boolean
  accepted_version_exists: boolean
}

type Summary = {
  total: number
  ready: boolean
  items: Item[]
}

type Props = {
  refConsultation: string
  orgAcronyme: string
  lotNumber: string
  prepareUrl: string
}

export function SubmitPreflight({
  refConsultation, orgAcronyme, lotNumber, prepareUrl,
}: Props) {
  const key = [
    "v5-submit-preflight",
    refConsultation,
    orgAcronyme,
    lotNumber,
  ]

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<Summary> => {
      // Le registre détermine un ID documentaire autorisé.
      // L'API M03 utilise cet ID pour contrôler l'accès.
      const register = await getPrepareRequirements(
        refConsultation, orgAcronyme, lotNumber,
      )

      const sourceId =
        register.data.requirements[0]?.source_requirement_id

      if (!sourceId) {
        throw new Error("Aucune pièce documentaire disponible.")
      }

      const path =
        `/api/v5/prepare/${encodeURIComponent(refConsultation)}` +
        `/${encodeURIComponent(orgAcronyme)}` +
        `/lots/${encodeURIComponent(lotNumber)}` +
        `/requirements/${sourceId}/summary`

      const response = await apiGet<{ data: Summary }>(path)
      return response.data
    },
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  if (query.isPending) {
    return (
      <section className="m5-preflight" role="status">
        <strong>Analyse du dossier documentaire…</strong>
      </section>
    )
  }

  if (query.isError) {
    return (
      <section className="m5-preflight">
        <div className="m5-preflight-top">
          <AlertTriangle size={20} />
          <div>
            <strong>Précontrôle indisponible</strong>
            <p>
              Les exigences ne peuvent pas être vérifiées actuellement.
              Cela ne signifie pas que le dossier est complet.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="m5-preflight-refresh"
          onClick={() => void query.refetch()}
        >
          <RefreshCw size={14} /> Réessayer
        </button>
      </section>
    )
  }

  const items = query.data.items
  const documents = items.filter(
    item => item.management_type === "DOCUMENT",
  )
  const otherConditions = items.filter(
    item => item.management_type === "OTHER_CONDITION",
  )

  const contradictions = documents.filter(
    item => item.needs_scope_review,
  )
  const unqualified = documents.filter(
    item => item.qualification === "TO_QUALIFY",
  )
  const missingRequired = documents.filter(
    item =>
      item.qualification === "REQUIRED" &&
      !item.accepted_version_exists &&
      item.document_state === "NO_DOCUMENT",
  )
  const rejectedRequired = documents.filter(
    item =>
      item.qualification === "REQUIRED" &&
      item.document_state === "REJECTED" &&
      !item.accepted_version_exists,
  )
  const pendingRequired = documents.filter(
    item =>
      item.qualification === "REQUIRED" &&
      item.document_state === "PENDING_REVIEW" &&
      !item.accepted_version_exists,
  )

  const actionable = [
    ...contradictions.map(item => ({
      id: item.source_requirement_id,
      label: item.label,
      reason: "Contradiction entre qualification et DCE",
    })),
    ...rejectedRequired.map(item => ({
      id: item.source_requirement_id,
      label: item.label,
      reason: "Document requis rejeté, sans version acceptée",
    })),
    ...missingRequired.map(item => ({
      id: item.source_requirement_id,
      label: item.label,
      reason: "Pièce requise sans PDF déposé",
    })),
    ...unqualified.map(item => ({
      id: item.source_requirement_id,
      label: item.label,
      reason: "Qualification à effectuer",
    })),
    ...pendingRequired.map(item => ({
      id: item.source_requirement_id,
      label: item.label,
      reason: "Contrôle documentaire en attente",
    })),
  ]

  const seen = new Set<number>()
  const priorities = actionable.filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  }).slice(0, 4)

  const scopeCandidates = items.filter(
    item => item.scope_uncertain,
  ).length

  // Il s'agit de réserves observées, pas d'une certification
  // automatique d'aptitude à soumissionner.
  const hasBlockingObservations =
    contradictions.length > 0 ||
    unqualified.length > 0 ||
    missingRequired.length > 0 ||
    rejectedRequired.length > 0 ||
    pendingRequired.length > 0

  return (
    <section className="m5-preflight">
      <header className="m5-preflight-header">
        <div>
          <span className="m5-preflight-eyebrow">
            CONTRÔLE AVANT DÉPÔT
          </span>
          <h2>Situation documentaire du lot</h2>
          <p>
            Données synchronisées avec la mission Préparer.
            Aucune conformité n'est certifiée automatiquement.
          </p>
        </div>
        <span className="m5-preflight-status">
          {hasBlockingObservations
            ? "Réserves à traiter"
            : "Vérification humaine requise"}
        </span>
      </header>

      <div className="m5-preflight-metrics">
        <div>
          <strong>{documents.length}</strong>
          <span>Pièces gérées</span>
        </div>
        <div>
          <strong>{contradictions.length}</strong>
          <span>Contradictions</span>
        </div>
        <div>
          <strong>{missingRequired.length}</strong>
          <span>Pièces requises absentes</span>
        </div>
        <div>
          <strong>{unqualified.length}</strong>
          <span>À qualifier</span>
        </div>
      </div>

      {priorities.length > 0 && (
        <div className="m5-preflight-actions">
          <h3>
            <FileWarning size={16} />
            Actions à examiner
          </h3>
          {priorities.map(item => (
            <div
              className="m5-preflight-action"
              key={item.id}
            >
              <div>
                <strong>{item.label}</strong>
                <small>{item.reason}</small>
              </div>
              <Link to={prepareUrl}>
                Préparer <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      )}

      <footer className="m5-preflight-footer">
        <div>
          <ClipboardCheck size={16} />
          <span>
            {otherConditions.length} autres conditions à examiner
            {" · "}
            {scopeCandidates} portées non explicitement
            attribuées au lot en base
          </span>
        </div>
        <Link to={prepareUrl}>
          Ouvrir le dossier documentaire
          <ArrowRight size={15} />
        </Link>
      </footer>

      <p className="m5-preflight-disclaimer">
        Une déclaration de dépôt externe dans MOR ne modifie pas
        les qualifications, les contrôles PDF ni les réserves M03.
      </p>
    </section>
  )
}
