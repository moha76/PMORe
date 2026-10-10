import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle, CheckCircle2, ChevronDown,
  ChevronUp, ClipboardList, RefreshCw,
} from "lucide-react"
import { apiGet } from "../../api/client"

type DocumentState =
  | "NO_DOCUMENT"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "ACCEPTED"

type PreparationState =
  | "TO_QUALIFY"
  | "NOT_APPLICABLE"
  | "MISSING"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "ACCEPTED"

type SummaryItem = {
  source_requirement_id: number
  management_type: "DOCUMENT" | "OTHER_CONDITION"
  scope_status: "LOT" | "COMMON_CANDIDATE" | "LOT_TO_VERIFY"
  label: string
  requirement_group: string
  requirement_type: string
  source_mandatory: number | null
  source_page: number | null
  qualification: string
  qualification_revision: number
  state: PreparationState
  document_state: DocumentState
  scope_uncertain: boolean
  needs_scope_review: boolean
  version_count: number
  accepted_version_exists: boolean
}

type Summary = {
  total: number
  ready: boolean
  counters: Record<string, number>
  items: SummaryItem[]
}

type Props = {
  refConsultation: string
  orgAcronyme: string
  lotNumber: string
  sourceRequirementId: number | null
  onSelectRequirement?: (id: number, tab?: "qualification" | "documents") => void
}

const qualificationLabels: Record<string, string> = {
  TO_QUALIFY: "À qualifier",
  REQUIRED: "Obligatoire",
  OPTIONAL: "Facultative",
  NOT_APPLICABLE: "Non applicable",
}

const documentLabels: Record<DocumentState, string> = {
  NO_DOCUMENT: "Aucun PDF",
  PENDING_REVIEW: "À contrôler",
  REJECTED: "Rejeté",
  ACCEPTED: "Accepté",
}

function nextAction(item: SummaryItem): string {
  if (item.management_type === "OTHER_CONDITION") {
    return "Examiner la condition et sa portée dans le DCE"
  }
  if (item.needs_scope_review) {
    return "Réexaminer l'exclusion au regard du DCE"
  }
  if (item.scope_uncertain) {
    return "Vérifier la portée du lot dans le DCE"
  }
  if (item.qualification === "TO_QUALIFY") {
    return "Qualifier l'exigence"
  }
  if (item.qualification === "NOT_APPLICABLE") {
    return "Exclusion enregistrée — vérifier sa justification"
  }
  if (item.document_state === "REJECTED") {
    return "Remplacer ou faire réexaminer le document"
  }
  if (item.document_state === "PENDING_REVIEW") {
    return "Contrôler le PDF déposé"
  }
  if (item.document_state === "NO_DOCUMENT") {
    return item.qualification === "OPTIONAL"
      ? "Dépôt facultatif selon qualification"
      : "Déposer un document"
  }
  return "Vérifier la validité avant soumission"
}

export function PrepareDocumentSummary({
  refConsultation,
  orgAcronyme,
  lotNumber,
  sourceRequirementId,
  onSelectRequirement,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showFullTable, setShowFullTable] = useState(false)


  const path = sourceRequirementId
    ? `/api/v5/prepare/${encodeURIComponent(refConsultation)}` +
      `/${encodeURIComponent(orgAcronyme)}` +
      `/lots/${encodeURIComponent(lotNumber)}` +
      `/requirements/${sourceRequirementId}/summary`
    : null

  const query = useQuery({
    queryKey: [
      "v5-document-summary",
      refConsultation,
      orgAcronyme,
      lotNumber,
      sourceRequirementId,
    ],
    queryFn: () => apiGet<{ data: Summary }>(path!),
    enabled: !!path,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const summary = query.data?.data

  const items = useMemo(
    () => summary?.items ?? [],
    [summary],
  )

  // M03_F87_GROUPED_CONDITIONS
  const managed = items.filter(
    item => item.management_type === "DOCUMENT",
  )
  const otherConditions = items.filter(
    item => item.management_type === "OTHER_CONDITION",
  )

  const pending = items.filter(
    item => item.state === "TO_QUALIFY",
  ).length
  const missing = items.filter(
    item => item.state === "MISSING",
  ).length
  const rejected = items.filter(
    item => item.document_state === "REJECTED",
  ).length
  const accepted = items.filter(
    item => item.document_state === "ACCEPTED",
  ).length
  const alerts = items.filter(
    item => item.scope_uncertain || item.needs_scope_review,
  ).length


  // M03_F89_PRIORITY_CENTER
  // Priorités calculées uniquement sur les pièces effectivement gérées.
  const priorityActions = useMemo(() => {
    return items
      .filter(item => item.management_type === "DOCUMENT")
      .map(item => {
        let rank = 99
        let action = ""
        let reason = ""
        let tab: "qualification" | "documents" = "qualification"

        if (item.needs_scope_review) {
          rank = 1
          action = "Réexaminer la qualification"
          reason = "L'exclusion enregistrée contredit une obligation extraite du DCE."
        } else if (
          item.qualification === "REQUIRED" &&
          item.document_state === "REJECTED" &&
          !item.accepted_version_exists
        ) {
          rank = 2
          action = "Remplacer le document rejeté"
          reason = "Pièce qualifiée obligatoire, sans version acceptée."
          tab = "documents"
        } else if (
          item.qualification === "REQUIRED" &&
          item.document_state === "NO_DOCUMENT"
        ) {
          rank = 3
          action = "Déposer la pièce requise"
          reason = "Aucun PDF déposé pour cette pièce obligatoire."
          tab = "documents"
        } else if (item.qualification === "TO_QUALIFY") {
          rank = 4
          action = "Examiner l'exigence"
          reason = "Qualification humaine encore nécessaire."
        } else if (
          item.qualification === "REQUIRED" &&
          item.document_state === "PENDING_REVIEW"
        ) {
          rank = 5
          action = "Contrôler le document"
          reason = "Un PDF est déposé, mais n'a pas encore été contrôlé."
          tab = "documents"
        }

        return { item, rank, action, reason, tab }
      })
      .filter(entry => entry.rank < 99)
      .sort(
        (a, b) =>
          a.rank - b.rank ||
          a.item.source_requirement_id - b.item.source_requirement_id
      )
      .slice(0, 3)
  }, [items])

  if (!sourceRequirementId) {
    return null
  }

  return (
    <section
      className="m5-summary"
      aria-label="Synthèse documentaire du lot"
    >
      <div className="m5-summary-heading">
        <div>
          <span className="m5-summary-eyebrow">
            PILOTAGE DOCUMENTAIRE
          </span>
          <h2>État de préparation du dossier</h2>
          <p>
            Synthèse des qualifications, dépôts et contrôles humains.
          </p>
        </div>

        <div className="m5-summary-actions">
          <span className="m5-summary-notready">
            <AlertTriangle size={15} />
            Dossier non prêt
          </span>
          <button
            type="button"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw size={15} />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => setExpanded(value => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? "Réduire la synthèse" : "Développer la synthèse"}
          >
            {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          </button>
        </div>
      </div>

      {query.isPending && (
        <p className="m5-summary-muted">Chargement de la synthèse…</p>
      )}

      {query.isError && (
        <div className="m5-summary-warning" role="alert">
          Impossible de charger la synthèse documentaire.
          <button type="button" onClick={() => void query.refetch()}>
            Réessayer
          </button>
        </div>
      )}

      {summary && (
        <>
          <div className="m5-summary-kpis">
            {[
              { number: summary.total, title: "Conditions candidates" },
              { number: managed.length, title: "Pièces gérées" },
              { number: otherConditions.length, title: "Autres conditions" },
              { number: pending, title: "À qualifier" },
              { number: missing, title: "Pièces manquantes" },
              { number: rejected, title: "PDF rejetés" },
              { number: accepted, title: "PDF acceptés" },
              { number: alerts, title: "Alertes de portée" },
            ].map(kpi => (
              <div className="m5-summary-kpi" key={kpi.title}>
                <strong>{kpi.number}</strong>
                <span>{kpi.title}</span>
              </div>
            ))}
          </div>

          {expanded && (
            <>
              <div className="m5-summary-warning">
                <AlertTriangle size={17} />
                <span>
                  Les exigences sans lot explicite sont des candidates
                  à vérifier dans le DCE. Les documents acceptés ne
                  prouvent pas, à eux seuls, que le dossier est prêt.
                </span>
              </div>


              <section
                className="m5-priority"
                aria-label="Actions documentaires prioritaires"
              >
                <div className="m5-priority-heading">
                  <div>
                    <span className="m5-summary-eyebrow">
                      PLAN D'ACTION
                    </span>
                    <h3>À traiter en priorité</h3>
                    <p>
                      Trois actions au maximum, calculées à partir du dossier.
                    </p>
                  </div>
                </div>

                {priorityActions.length === 0 ? (
                  <p className="m5-summary-muted">
                    Aucune action prioritaire identifiée dans les
                    pièces gérées. Les autres vérifications restent nécessaires.
                  </p>
                ) : (
                  <div className="m5-priority-list">
                    {priorityActions.map((entry, index) => (
                      <article
                        className="m5-priority-item"
                        key={entry.item.source_requirement_id}
                      >
                        <span className="m5-priority-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="m5-priority-content">
                          <strong>{entry.item.label}</strong>
                          <p>{entry.reason}</p>
                          <span>{entry.action}</span>
                        </div>
                        {onSelectRequirement && (
                          <button
                            className="m5-priority-action"
                            type="button"
                            onClick={() => onSelectRequirement(
                              entry.item.source_requirement_id,
                              entry.tab
                            )}
                          >
                            Traiter
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <div className="m5-summary-full-heading">
                <div>
                  <strong>Registre de suivi complet</strong>
                  <small>
                    {items.length} conditions candidates,
                    dont {managed.length} pièces gérées
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullTable(value => !value)}
                  aria-expanded={showFullTable}
                >
                  {showFullTable
                    ? "Masquer le tableau"
                    : "Afficher toutes les conditions"}
                </button>
              </div>

              {showFullTable && (
              <div className="m5-summary-table-wrap">
                <table className="m5-summary-table">
                  <thead>
                    <tr>
                      <th>Exigence</th>
                      <th>Qualification</th>
                      <th>Document</th>
                      <th>Action recommandée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managed.length > 0 && (
                      <tr className="m5-summary-group-row">
                        <td colSpan={4}>
                          PIÈCES À PRÉPARER · {managed.length}
                        </td>
                      </tr>
                    )}
                    {managed.map(item => (
                      <tr key={item.source_requirement_id}>
                        <td>
                          <strong>
                            {item.label}
                          </strong>
                          <small>
                            {item.requirement_group}
                            {" · "}
                            ID {item.source_requirement_id}
                          </small>
                          {item.scope_uncertain && (
                            <span className="m5-summary-scope">
                              Portée du lot à vérifier
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="m5-summary-chip">
                            {qualificationLabels[item.qualification]
                              ?? item.qualification}
                          </span>
                          {item.needs_scope_review && (
                            <small className="m5-summary-risk">
                              Exclusion à réexaminer
                            </small>
                          )}
                        </td>
                        <td>
                          <span
                            className={`m5-summary-doc state-${item.document_state.toLowerCase()}`}
                          >
                            {item.document_state === "ACCEPTED" && (
                              <CheckCircle2 size={13} />
                            )}
                            {documentLabels[item.document_state]}
                          </span>
                          <small>{item.version_count} version(s)</small>
                        </td>
                        <td>
                          <span>{nextAction(item)}</span>
                          {onSelectRequirement && (
                            <button
                              type="button"
                              className="m5-summary-open"
                              onClick={() =>
                                onSelectRequirement(item.source_requirement_id)
                              }
                            >
                              <ClipboardList size={14} />
                              Ouvrir la fiche
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {otherConditions.length > 0 && (
                      <tr className="m5-summary-group-row">
                        <td colSpan={4}>
                          AUTRES CONDITIONS À EXAMINER · {otherConditions.length}
                        </td>
                      </tr>
                    )}
                    {otherConditions.map(item => (
                      <tr key={item.source_requirement_id}>
                        <td>
                          <strong>{item.label}</strong>
                          <small>
                            {item.requirement_group}
                            {" · "}
                            ID {item.source_requirement_id}
                          </small>
                        </td>
                        <td>
                          <span className="m5-summary-chip">
                            Portée à examiner
                          </span>
                        </td>
                        <td>
                          <span className="m5-summary-doc">
                            Hors registre documentaire
                          </span>
                        </td>
                        <td>
                          Examiner le DCE et confirmer si cette
                          condition concerne le lot sélectionné.
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
              <p className="m5-summary-footnote">
                Ce tableau est une aide au pilotage. Les qualifications
                et décisions de contrôle restent consultables dans
                chaque fiche d'exigence.
              </p>
            </>
          )}
        </>
      )}
    </section>
  )
}
