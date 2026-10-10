import {
  matchingDateLabel,
  matchingFreshnessLabel,
  matchingFreshnessTone,
} from "../utils/matchingFreshness"

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  useState,
} from "react"

import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom"

import {
  ApiError,
} from "../api/client"

import {
  getOpportunityDetail,
  updateOpportunityDecision,
} from "../api/opportunities"


import {
  getPilotageOverview,
} from "../api/pilotage"


import type {
  OpportunityDecisionValue,
} from "../api/opportunities"

import {
  EvidenceDrawer,
} from "../components/opportunity/EvidenceDrawer"

import type {
  Evidence,
  MatchCheck,
  MatchLot,
  MatchStatus,
} from "../api/types"


function statusLabel(
  status: MatchStatus,
) {
  switch (status) {
    case "BLOCKING":
      return "Bloqué"

    case "PARTIAL":
      return "Partiellement compatible"

    case "VERIFY":
      return "À vérifier"

    case "OK":
      return "Conforme"

    case "NOT_APPLICABLE":
      return "Non applicable"

    default:
      return "Inconnu"
  }
}


function humanDecisionLabel(
  decision: string,
) {
  switch (decision) {
    case "GO":
      return "GO"

    case "NO_GO":
      return "NO-GO"

    case "ACTIVE":
    case "WATCHING":
      return "Suivi"

    case "DISMISSED":
    case "ARCHIVED":
      return "Écarté"

    case "UNDECIDED":
    default:
      return "Non suivi"
  }
}


function opportunityWorkflowStatus(
  humanDecision: string,
  businessStage?: string | null,
) {
  switch (businessStage) {
    case "BLOCKED":
      return {
        label: "Bloqué",
        tone: "blocked",
      }

    case "READY":
      return {
        label: "Prêt",
        tone: "ready",
      }

    case "IN_PREPARATION":
    case "GO":
      return {
        label: "En préparation",
        tone: "preparation",
      }

    case "ACTIVE":
      return {
        label: "Suivi",
        tone: "watching",
      }

    case "EXPIRED":
      return {
        label: "Expiré",
        tone: "expired",
      }

    default:
      break
  }

  switch (humanDecision) {
    case "ACTIVE":
    case "WATCHING":
      return {
        label: "Suivi",
        tone: "watching",
      }

    case "GO":
      return {
        label: "En préparation",
        tone: "preparation",
      }

    case "NO_GO":
      return {
        label: "NO-GO",
        tone: "no-go",
      }

    case "DISMISSED":
    case "ARCHIVED":
      return {
        label: "Écarté",
        tone: "archived",
      }

    default:
      return {
        label: "Non suivi",
        tone: "untracked",
      }
  }
}


function OpportunityWorkflowBar({
  humanDecision,
  businessStage,
  pending,
  error,
  onFollow,
  onGo,
  onNoGo,
  onOpenDossier,
}: {
  humanDecision: string
  businessStage?: string | null
  pending: boolean
  error: boolean
  onFollow: () => void
  onGo: () => void
  onNoGo: () => void
  onOpenDossier: () => void
}) {
  const status =
    opportunityWorkflowStatus(
      humanDecision,
      businessStage,
    )

  const untracked =
    humanDecision === "UNDECIDED"

  const followed =
    humanDecision === "ACTIVE"
    || humanDecision === "WATCHING"

  const operational =
    humanDecision === "GO"
    || businessStage === "GO"
    || businessStage === "IN_PREPARATION"
    || businessStage === "BLOCKED"
    || businessStage === "READY"

  return (
    <div className="mor-human-decision-bar">
      <div className="mor-human-decision-label">
        <span>
          MON STATUT
        </span>

        <strong
          className={
            "mor-workflow-status "
            + status.tone
          }
        >
          {status.label}
        </strong>
      </div>

      <div className="mor-human-decision-actions">
        {untracked && (
          <button
            type="button"
            className="watching"
            disabled={pending}
            onClick={onFollow}
          >
            + Suivre cet AO
          </button>
        )}

        {followed && (
          <>
            <button
              type="button"
              className="go"
              disabled={pending}
              onClick={onGo}
            >
              GO
            </button>

            <button
              type="button"
              className="no-go"
              disabled={pending}
              onClick={onNoGo}
            >
              NO-GO
            </button>
          </>
        )}

        {operational && (
          <button
            type="button"
            className="open-dossier"
            onClick={onOpenDossier}
          >
            Ouvrir le dossier →
          </button>
        )}
      </div>

      {pending && (
        <span className="mor-decision-saving">
          Enregistrement…
        </span>
      )}

      {error && (
        <span className="mor-decision-error">
          Impossible d'enregistrer le statut.
        </span>
      )}
    </div>
  )
}


function readableCheckName(
  check: MatchCheck,
) {
  const code =
    check.code ?? ""

  const labels:
    Record<string, string> = {
      SIMILAR_REFERENCES:
        "Références similaires",
      PERSONNEL_MINIMUM:
        "Personnel minimum",
      ACTIVITY_MATCH:
        "Compatibilité d'activité",
      COMPANY_QUALIFICATION:
        "Qualification de l'entreprise",
      COMPANY_AGREMENT:
        "Agrément requis",
      COMPANY_EQUIPMENT:
        "Moyens matériels",
      COMPANY_ISO:
        "Certifications ISO",
      PERSONNEL_EXIGE:
        "Personnel exigé",
      VISITE_SITE:
        "Visite des lieux",
      ECHANTILLON:
        "Échantillon requis",
      CONVENTION_GROUPEMENT:
        "Convention de groupement",
    }

  return (
    labels[code]
    ?? check.label
    ?? code
    ?? "Contrôle"
  )
}


function readableValue(
  value: unknown,
) {
  if (
    value === null
    || value === undefined
    || value === ""
  ) {
    return "Non disponible"
  }

  if (Array.isArray(value)) {
    return value.length > 0
      ? value.join(", ")
      : "Aucun élément"
  }

  if (
    typeof value === "object"
  ) {
    try {
      return JSON.stringify(value)
    } catch {
      return "Donnée structurée"
    }
  }

  return String(value)
}


function matchCheckSignature(
  check: MatchCheck,
) {
  const requirement =
    check.user_view?.ao_requirement
    ?? check.required

  const companyState =
    check.user_view?.company_state
    ?? check.matched

  const gap =
    check.user_view?.gap
    ?? check.missing

  const action =
    check.user_view?.action

  return [
    check.code ?? check.label ?? "CHECK",
    check.status,
    readableValue(requirement),
    readableValue(companyState),
    readableValue(gap),
    action ? String(action) : "",
  ].join("||")
}


function CheckItem({
  check,
  onEvidence,
  lotNumber,
}: {
  check: MatchCheck
  onEvidence: (
    evidence: Evidence,
  ) => void
  lotNumber?: string | null
}) {
  const navigate =
    useNavigate()

  const {
    refConsultation,
    orgAcronyme,
  } = useParams()
  const source =
    check.source

  const requirement =
    check.user_view?.ao_requirement
    ?? check.required

  const companyState =
    check.user_view?.company_state
    ?? check.matched

  const gap =
    check.user_view?.gap
    ?? check.missing

  const explanation =
    check.user_view?.explanation
    ?? check.detail

  const impact =
    check.user_view?.impact
    ?? check.impact

  const action =
    check.user_view?.action

  return (
    <details
      className={
        "mor-check-row "
        + check.status.toLowerCase()
      }
      open={
        check.status === "BLOCKING"
      }
    >
      <summary className="mor-check-summary">
        <div className="mor-check-main">
          <span
            className={
              "business-status "
              + check.status.toLowerCase()
            }
          >
            {statusLabel(check.status)}
          </span>

          <div className="mor-check-title">
            <strong>
              {readableCheckName(check)}
            </strong>

            <span>
              {check.code ?? "CHECK"}
            </span>
          </div>
        </div>

        <div className="mor-check-summary-right">
          {gap != null
            && gap !== "" && (
            <span className="mor-check-gap-preview">
              {readableValue(gap)}
            </span>
          )}

          {source?.filename && (
            <span className="mor-check-has-proof">
              Preuve DCE
            </span>
          )}

          <span className="mor-check-chevron">
            ›
          </span>
        </div>
      </summary>


      <div className="mor-check-body">
        <div className="mor-check-decision-grid">
          <div className="mor-check-decision-block gap">
            <span>
              Écart détecté
            </span>

            <strong>
              {gap != null
                && gap !== ""
                ? readableValue(gap)
                : "Aucun écart explicite"}
            </strong>
          </div>

          <div className="mor-check-decision-block action">
            <span>
              Action recommandée
            </span>

            <strong>
              {action
                ? String(action)
                : check.status === "OK"
                  ? "Aucune action corrective nécessaire."
                  : "Vérification manuelle recommandée."}
            </strong>
          </div>

          {source?.filename && (
            <button
              type="button"
              className="mor-check-proof-primary"
              onClick={() =>
                onEvidence(source)
              }
            >
              <span>
                Preuve DCE
              </span>

              <strong>
                {source.filename}
              </strong>

              <small>
                {source.page != null
                  ? `Page ${source.page}`
                  : "Page non précisée"}
              </small>

              <b>
                Voir →
              </b>
            </button>
          )}
        </div>

        {(check.status === "BLOCKING"
          || check.status === "VERIFY") && (
          <div className="mor-check-dossier-action">
            <button
              type="button"
              onClick={() => {
                if (
                  !refConsultation
                  || !orgAcronyme
                  || !check.code
                ) {
                  return
                }

                const params =
                  new URLSearchParams()

                params.set(
                  "requirement",
                  String(check.code),
                )

                if (
                  lotNumber !== null
                  && lotNumber !== undefined
                  && lotNumber !== ""
                ) {
                  params.set(
                    "lot",
                    String(lotNumber),
                  )
                }

                navigate(
                  `/dossiers/${encodeURIComponent(
                    refConsultation,
                  )}/${encodeURIComponent(
                    orgAcronyme,
                  )}?${params.toString()}`,
                )
              }}
            >
              Traiter dans le dossier
              <span>→</span>
            </button>
          </div>
        )}

        {impact && (
          <div className="mor-check-impact">
            <span>
              Impact
            </span>

            <p>
              {String(impact)}
            </p>
          </div>
        )}

        <details className="mor-check-detail">
          <summary>
            Voir le détail de l'analyse
          </summary>

          {explanation && (
            <p className="business-explanation">
              {String(explanation)}
            </p>
          )}

          <div className="business-comparison">
            <div className="comparison-column">
              <span>
                Exigence DCE
              </span>

              <strong>
                {readableValue(
                  requirement,
                )}
              </strong>
            </div>

            <div className="comparison-arrow">
              →
            </div>

            <div className="comparison-column">
              <span>
                Situation entreprise
              </span>

              <strong>
                {readableValue(
                  companyState,
                )}
              </strong>
            </div>
          </div>
        </details>
      </div>
    </details>
  )
}

function LotCard({
  lot,
  onEvidence,
}: {
  lot: MatchLot
  onEvidence: (
    evidence: Evidence,
  ) => void
}) {
  const blocking =
    lot.checks.filter(
      (check) =>
        check.status === "BLOCKING",
    )

  const verify =
    lot.checks.filter(
      (check) =>
        check.status === "VERIFY",
    )

  const ok =
    lot.checks.filter(
      (check) =>
        check.status === "OK",
    )

  const unknown =
    lot.checks.filter(
      (check) =>
        check.status === "UNKNOWN",
    )

  const notApplicable =
    lot.checks.filter(
      (check) =>
        check.status === "NOT_APPLICABLE",
    )

  return (
    <article className="decision-lot-card">
      <header className="decision-lot-header">
        <div>
          <span className="lot-kicker">
            LOT {lot.lot_number ?? "—"}
          </span>

          <h3>
            Lot {lot.lot_number ?? "—"}
          </h3>
        </div>

        <span
          className={
            "decision-status-pill "
            + lot.computed_status
              .toLowerCase()
          }
        >
          {statusLabel(
            lot.computed_status,
          )}
        </span>
      </header>

      <div className="decision-counts">
        <div className="count-box blocking">
          <strong>
            {blocking.length}
          </strong>

          <span>
            Blocages
          </span>
        </div>

        <div className="count-box verify">
          <strong>
            {verify.length}
          </strong>

          <span>
            À vérifier
          </span>
        </div>

        <div className="count-box ok">
          <strong>
            {ok.length}
          </strong>

          <span>
            Conformes
          </span>
        </div>

        {unknown.length > 0 && (
          <div className="count-box unknown">
            <strong>
              {unknown.length}
            </strong>

            <span>
              Inconnus
            </span>
          </div>
        )}
      </div>

      {blocking.length > 0 && (
        <section className="decision-section">
          <div className="decision-section-title">
            <div>
              <span className="section-dot blocking" />
              <strong>
                Pourquoi ce lot est bloqué ?
              </strong>
            </div>

            <span>
              {blocking.length}
            </span>
          </div>

          <div className="decision-check-list">
            {blocking.map(
              (check, index) => (
                <CheckItem
                  key={
                    check.code
                    ?? `${check.label}-${index}`
                  }
                  check={check}
                  onEvidence={onEvidence}
                  lotNumber={lot.lot_number}
                />
              ),
            )}
          </div>
        </section>
      )}

      {verify.length > 0 && (
        <details className="verify-details">
          <summary>
            <span>
              Points à vérifier
            </span>

            <strong>
              {verify.length}
            </strong>
          </summary>

          <div className="decision-check-list">
            {verify.map(
              (check, index) => (
                <CheckItem
                  key={
                    check.code
                    ?? `${check.label}-${index}`
                  }
                  check={check}
                  onEvidence={onEvidence}
                  lotNumber={lot.lot_number}
                />
              ),
            )}
          </div>
        </details>
      )}

      {ok.length > 0 && (
        <details className="verify-details ok-details">
          <summary>
            <span>
              Points conformes
            </span>

            <strong>
              {ok.length}
            </strong>
          </summary>

          <div className="decision-check-list">
            {ok.map(
              (check, index) => (
                <CheckItem
                  key={
                    check.code
                    ?? `${check.label}-${index}`
                  }
                  check={check}
                  onEvidence={onEvidence}
                  lotNumber={lot.lot_number}
                />
              ),
            )}
          </div>
        </details>
      )}


      {notApplicable.length > 0 && (
        <details className="verify-details neutral-details">
          <summary>
            <span>
              Non applicables
            </span>

            <strong>
              {notApplicable.length}
            </strong>
          </summary>

          <div className="decision-check-list">
            {notApplicable.map(
              (check, index) => (
                <CheckItem
                  key={
                    check.code
                    ?? `${check.label}-${index}`
                  }
                  check={check}
                  onEvidence={onEvidence}
                  lotNumber={lot.lot_number}
                />
              ),
            )}
          </div>
        </details>
      )}
    </article>
  )
}


function focusCheckByLabel(
  label: string,
) {
  const targetLabel =
    label
      .trim()
      .toLowerCase()

  const rows =
    Array.from(
      document.querySelectorAll(
        ".mor-check-row",
      ),
    )

  const target =
    rows.find(
      (row) =>
        (
          row.textContent
          || ""
        )
          .toLowerCase()
          .includes(
            targetLabel,
          ),
    )

  if (!(target instanceof HTMLElement)) {
    return
  }

  if (
    target
    instanceof HTMLDetailsElement
  ) {
    target.open = true
  }

  target.classList.add(
    "mor-check-focus",
  )

  target.scrollIntoView({
    behavior: "smooth",
    block: "center",
  })

  window.setTimeout(
    () => {
      target.classList.remove(
        "mor-check-focus",
      )
    },
    2200,
  )
}


export function OpportunityDetailPage() {
  const location =
    useLocation()


  const navigate =
    useNavigate()

  const [
    selectedEvidence,
    setSelectedEvidence,
  ] = useState<Evidence | null>(
    null,
  )

  const [
    selectedLotIndex,
    setSelectedLotIndex,
  ] = useState(0)

  const {
    refConsultation,
    orgAcronyme,
  } = useParams()


  const queryClient =
    useQueryClient()

  const pilotageQuery =
    useQuery({
      queryKey: [
        "pilotage-overview",
      ],

      queryFn:
        getPilotageOverview,

      refetchInterval:
        60_000,
    })


  const currentPilotageStage =
    (() => {
      if (
        !refConsultation
        || !orgAcronyme
      ) {
        return null
      }

      const pipeline =
        pilotageQuery
          .data
          ?.data
          .pipeline

      if (!pipeline) {
        return null
      }

      for (
        const [
          stage,
          stageItems,
        ]
        of Object.entries(pipeline)
      ) {
        const found =
          stageItems.some(
            (item) =>
              item.ref_consultation
                === refConsultation
              && item.org_acronyme
                === orgAcronyme,
          )

        if (found) {
          return stage
        }
      }

      return null
    })()


  const decisionMutation =
    useMutation({
      mutationFn: (
        decision:
          OpportunityDecisionValue,
      ) => {
        if (
          !refConsultation
          || !orgAcronyme
        ) {
          throw new Error(
            "Opportunity identifiers missing",
          )
        }

        return updateOpportunityDecision(
          refConsultation,
          orgAcronyme,
          decision,
        )
      },

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            "opportunity",
            refConsultation,
            orgAcronyme,
          ],
        })

        await queryClient.invalidateQueries({
          queryKey: [
            "opportunities",
          ],
        })

        await queryClient.invalidateQueries({
          queryKey: [
            "dossiers",
          ],
        })

        await queryClient.invalidateQueries({
          queryKey: [
            "pilotage",
          ],
        })
      },
    })

  const query =
    useQuery({
      queryKey: [
        "opportunity",
        refConsultation,
        orgAcronyme,
      ],

      queryFn: () =>
        getOpportunityDetail(
          refConsultation!,
          orgAcronyme!,
        ),

      enabled:
        Boolean(refConsultation)
        && Boolean(orgAcronyme),
    })

  if (query.isLoading) {
    return (
      <main className="page-shell">
        <div className="state-card">
          Chargement de l'analyse…
        </div>
      </main>
    )
  }

  if (
    query.error instanceof ApiError
    && query.error.status === 401
  ) {
    const next =
      encodeURIComponent(
        location.pathname,
      )

    return (
      <Navigate
        to={`/login?next=${next}`}
        replace
      />
    )
  }

  if (query.isError) {
    return (
      <main className="page-shell">
        <div className="state-card error">
          Impossible de charger
          l'opportunité.
        </div>
      </main>
    )
  }

  const opportunity =
    query.data!.data

  const matching =
    opportunity.matching

  /*
   * Un AO peut être détecté avant que le pipeline DCE
   * et le moteur de matching aient produit un résultat.
   *
   * UNKNOWN n'est jamais interprété comme conforme.
   */
  if (!matching.is_available) {
    return (
      <main className="page-shell opportunity-page">

        <section className="opportunity-hero">
          <div className="hero-main">

            <div className="hero-reference-row">
              <span className="reference-chip">
                {opportunity.identity.reference
                  ?? opportunity.identity
                    .ref_consultation}
              </span>

              {opportunity.identity.procedure && (
                <span className="neutral-chip">
                  {opportunity.identity.procedure}
                </span>
              )}
            </div>

            <h1>
              {opportunity.identity.title
                ?? "Appel d'offres"}
            </h1>

            <div className="hero-meta">
              {opportunity.identity.buyer && (
                <span>
                  {opportunity.identity.buyer}
                </span>
              )}

              {opportunity.identity.location && (
                <span>
                  {opportunity.identity.location}
                </span>
              )}

              {opportunity.identity.category && (
                <span>
                  {opportunity.identity.category}
                </span>
              )}
            </div>

          </div>

          <aside className="hero-decision">
            <span>
              Analyse MOR
            </span>

            <strong
              className="hero-computed-status unknown"
            >
              Non analysé
            </strong>

            <small>
              Matching non calculé
            </small>
          </aside>
        </section>


        <OpportunityWorkflowBar
          humanDecision={
            opportunity.decision
              .human_decision
          }
          businessStage={
            currentPilotageStage
          }
          pending={
            decisionMutation.isPending
          }
          error={
            decisionMutation.isError
          }
          onFollow={() =>
            decisionMutation.mutate(
              "ACTIVE",
            )
          }
          onGo={() =>
            decisionMutation.mutate(
              "GO",
            )
          }
          onNoGo={() => {
            const confirmed =
              window.confirm(
                "Confirmer la décision NO-GO pour cet appel d'offres ?",
              )

            if (confirmed) {
              decisionMutation.mutate(
                "NO_GO",
              )
            }
          }}
          onOpenDossier={() => {
            if (
              !refConsultation
              || !orgAcronyme
            ) {
              return
            }

            navigate(
              `/dossiers/${encodeURIComponent(
                refConsultation,
              )}/${encodeURIComponent(
                orgAcronyme,
              )}`,
            )
          }}
        />


        <section className="decision-summary-grid">

          <article className="decision-summary-card">
            <span>
              Échéance
            </span>

            <strong>
              {opportunity.deadline.raw
                ?? "Non disponible"}
            </strong>

            <small>
              {opportunity.deadline.status
                ?? "Statut inconnu"}
            </small>
          </article>


          <article className="decision-summary-card">
            <span>
              Estimation
            </span>

            <strong>
              {opportunity.financial_summary
                .estimation_raw
                || "Non disponible"}
            </strong>

            <small>
              Information issue de l'avis
            </small>
          </article>


          <article className="decision-summary-card">
            <span>
              Caution
            </span>

            <strong>
              {opportunity.financial_summary
                .caution_raw
                || "Non disponible"}
            </strong>

            <small>
              À confirmer dans le DCE
            </small>
          </article>


          <article className="decision-summary-card">
            <span>
              Données DCE
            </span>

            <strong>
              {
                opportunity
                  .analysis_quality
                  .coverage_status
              }
            </strong>

            <small>
              Pipeline{" "}
              {
                opportunity
                  .analysis_quality
                  .pipeline_status
              }
            </small>
          </article>

        </section>


        <section className="mor-analysis-pending">

          <div className="mor-analysis-pending-icon">
            !
          </div>

          <div>
            <span>
              ANALYSE MOR NON DISPONIBLE
            </span>

            <h2>
              Cet appel d'offres n'a pas encore
              été qualifié
            </h2>

            <p>
              MOR a détecté cet appel d'offres,
              mais le DCE et le matching entreprise
              ne disposent pas encore de données
              suffisantes pour produire une
              qualification fiable.
            </p>

            <div className="mor-analysis-pending-facts">

              <span>
                Matching : non calculé
              </span>

              <span>
                Lots analysés : {
                  matching.lots.length
                }
              </span>

              <span>
                Documents : {
                  opportunity
                    .analysis_quality
                    .observed
                    .documents_count
                }
              </span>

              <span>
                Exigences : {
                  opportunity
                    .analysis_quality
                    .observed
                    .requirements_count
                }
              </span>

            </div>

            <small>
              MOR ne considère pas l'absence de
              données comme une conformité.
            </small>
          </div>

        </section>


        {opportunity.identity.url && (
          <section className="mor-analysis-source">
            <a
              href={opportunity.identity.url}
              target="_blank"
              rel="noreferrer"
            >
              Consulter l'avis officiel
              <span aria-hidden="true">
                →
              </span>
            </a>
          </section>
        )}

      </main>
    )
  }

  const blockingTotal =
    matching.lots.reduce(
      (total, lot) =>
        total
        + lot.checks.filter(
          (check) =>
            check.status === "BLOCKING",
        ).length,
      0,
    )

  const verifyTotal =
    matching.lots.reduce(
      (total, lot) =>
        total
        + lot.checks.filter(
          (check) =>
            check.status === "VERIFY",
        ).length,
      0,
    )

  const okTotal =
    matching.lots.reduce(
      (total, lot) =>
        total
        + lot.checks.filter(
          (check) =>
            check.status === "OK",
        ).length,
      0,
    )


  /*
   * Contrôles réellement communs à tous
   * les lots.
   *
   * Un contrôle n'est factorisé que si
   * son contenu métier est identique
   * dans chaque lot.
   */
  const commonCheckSignatures =
    new Set<string>()

  const commonChecks: MatchCheck[] = []

  if (matching.lots.length > 1) {
    const firstLot =
      matching.lots[0]

    firstLot.checks.forEach(
      (check) => {
        const signature =
          matchCheckSignature(check)

        const presentInEveryLot =
          matching.lots.every(
            (lot) =>
              lot.checks.some(
                (candidate) =>
                  matchCheckSignature(
                    candidate,
                  ) === signature,
              ),
          )

        if (presentInEveryLot) {
          commonCheckSignatures.add(
            signature,
          )

          commonChecks.push(check)
        }
      },
    )
  }

  const commonBlocking =
    commonChecks.filter(
      (check) =>
        check.status === "BLOCKING",
    )

  const commonVerify =
    commonChecks.filter(
      (check) =>
        check.status === "VERIFY",
    )

  const commonOk =
    commonChecks.filter(
      (check) =>
        check.status === "OK",
    )

  const commonNeutral =
    commonChecks.filter(
      (check) =>
        check.status === "UNKNOWN"
        || check.status === "NOT_APPLICABLE",
    )

  return (
    <main className="page-shell opportunity-page">
      <section className="mor-ao-header">
        <div className="mor-ao-header-main">
          <div className="mor-ao-reference-line">
            <span className="reference-chip">
              {opportunity.identity.reference
                ?? opportunity.identity
                  .ref_consultation}
            </span>

            {opportunity.identity.procedure && (
              <span className="neutral-chip">
                {opportunity.identity.procedure}
              </span>
            )}

            {opportunity.identity.category && (
              <span className="mor-ao-category">
                {opportunity.identity.category}
              </span>
            )}
          </div>

          <h1>
            {opportunity.identity.title}
          </h1>

          <div className="mor-ao-context">
            {opportunity.identity.buyer && (
              <div>
                <span>
                  Acheteur
                </span>

                <strong>
                  {opportunity.identity.buyer}
                </strong>
              </div>
            )}

            {opportunity.identity.location && (
              <div>
                <span>
                  Lieu
                </span>

                <strong>
                  {opportunity.identity.location}
                </strong>
              </div>
            )}
          </div>
        </div>


        <aside className="mor-ao-verdict">
          <span>
            VERDICT MOR
          </span>

          <strong
            className={
              "mor-ao-verdict-status "
              + matching.computed_status
                .toLowerCase()
            }
          >
            {statusLabel(
              matching.computed_status,
            )}
          </strong>

          <small>
            Moteur{" "}
            {matching.engine_version ?? "—"}
          </small>

          <div
            className={
              "mor-detail-freshness "
              + matchingFreshnessTone(
                matching.freshness,
              )
            }
          >
            <strong>
              {matchingFreshnessLabel(
                matching.freshness,
              )}
            </strong>

            <span>
              Calcul MOR{" "}
              {matchingDateLabel(
                matching.analyzed_at,
              )}
            </span>
          </div>
        </aside>


        <div className="mor-ao-keyfacts">
          <div className="mor-ao-keyfact">
            <span>
              Échéance
            </span>

            <strong>
              {opportunity.deadline.raw
                ?? "Non disponible"}
            </strong>

            <small>
              {opportunity.deadline.status
                ?? "Statut inconnu"}
            </small>
          </div>

          <div className="mor-ao-keyfact">
            <span>
              Décision humaine
            </span>

            <strong>
              {humanDecisionLabel(
                opportunity.decision
                  .human_decision,
              )}
            </strong>

            <small>
              Indépendante du calcul MOR
            </small>
          </div>

          <div className="mor-ao-keyfact">
            <span>
              Lots
            </span>

            <strong>
              {matching.lots.length}
            </strong>

            <small>
              Analysés séparément
            </small>
          </div>

          <div className="mor-ao-keyfact">
            <span>
              Données DCE
            </span>

            <strong>
              {opportunity.analysis_quality
                .coverage_status
                === "DATA_PRESENT"
                ? "Disponibles"
                : opportunity
                  .analysis_quality
                  .coverage_status}
            </strong>

            <small>
              {
                opportunity
                  .analysis_quality
                  .pipeline_status
              }
            </small>
          </div>
        </div>

        <OpportunityWorkflowBar
          humanDecision={
            opportunity.decision
              .human_decision
          }
          businessStage={
            currentPilotageStage
          }
          pending={
            decisionMutation.isPending
          }
          error={
            decisionMutation.isError
          }
          onFollow={() =>
            decisionMutation.mutate(
              "ACTIVE",
            )
          }
          onGo={() =>
            decisionMutation.mutate(
              "GO",
            )
          }
          onNoGo={() => {
            const confirmed =
              window.confirm(
                "Confirmer la décision NO-GO pour cet appel d'offres ?",
              )

            if (confirmed) {
              decisionMutation.mutate(
                "NO_GO",
              )
            }
          }}
          onOpenDossier={() => {
            if (
              !refConsultation
              || !orgAcronyme
            ) {
              return
            }

            navigate(
              `/dossiers/${encodeURIComponent(
                refConsultation,
              )}/${encodeURIComponent(
                orgAcronyme,
              )}`,
            )
          }}
        />
      </section>


      {(() => {
        const blockedLots =
          matching.lots.filter(
            (lot) =>
              lot.computed_status === "BLOCKING",
          ).length

        const partialLots =
          matching.lots.filter(
            (lot) =>
              lot.computed_status === "PARTIAL",
          ).length

        const exploitableLots =
          matching.lots.length
          - blockedLots

        const blockingCauses =
          new Map<
            string,
            {
              label: string
              lots: Set<string>
              count: number
            }
          >()

        matching.lots.forEach(
          (lot, lotIndex) => {
            lot.checks
              .filter(
                (check) =>
                  check.status === "BLOCKING",
              )
              .forEach((check) => {
                const key =
                  check.code
                  ?? check.label
                  ?? "BLOCKING"

                const existing =
                  blockingCauses.get(key)
                  ?? {
                    label:
                      readableCheckName(
                        check,
                      ),
                    lots:
                      new Set<string>(),
                    count: 0,
                  }

                existing.count += 1

                existing.lots.add(
                  String(
                    lot.lot_number
                    ?? lotIndex + 1,
                  ),
                )

                blockingCauses.set(
                  key,
                  existing,
                )
              })
          },
        )

        const mainCauses =
          Array.from(
            blockingCauses.values(),
          )
            .sort(
              (a, b) =>
                b.lots.size
                - a.lots.size
                || b.count - a.count,
            )
            .slice(0, 3)

        return (
          <section className="mor-decision-overview">
            <div className="mor-decision-overview-main">
              <span className="eyebrow">
                SYNTHÈSE DE QUALIFICATION
              </span>

              <div className="mor-decision-headline">
                <div>
                  <strong>
                    {blockedLots}/{
                      matching.lots.length
                    }
                  </strong>

                  <span>
                    lots bloqués
                  </span>
                </div>

                <h2>
                  {blockedLots ===
                    matching.lots.length
                    ? "Aucun lot n'est actuellement qualifié sans blocage"
                    : blockedLots > 0
                      ? `${exploitableLots} lot${
                          exploitableLots > 1
                            ? "s"
                            : ""
                        } reste${
                          exploitableLots > 1
                            ? "nt"
                            : ""
                        } à étudier`
                      : "Aucun blocage éliminatoire détecté"}
                </h2>
              </div>

              {mainCauses.length > 0 && (
                <div className="mor-main-blockers">
                  <span>
                    Causes principales
                  </span>

                  <div>
                    {mainCauses.map(
                      (cause) => (
                        <span
                          className="mor-blocker-chip"
                          key={cause.label}
                        >
                          <strong>
                            {cause.label}
                          </strong>

                          <small>
                            {cause.lots.size}
                            {" "}
                            lot{
                              cause.lots.size > 1
                                ? "s"
                                : ""
                            }
                          </small>
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              {blockedLots > 0
                && mainCauses.length > 0 && (
                <div className="mor-decision-next-step">
                  <span>
                    ACTION RECOMMANDÉE MAINTENANT
                  </span>

                  <button
                    type="button"
                    className="mor-next-action-primary"
                    onClick={() =>
                      focusCheckByLabel(
                        mainCauses[0].label,
                      )
                    }
                  >
                    <span>
                      <strong>
                        {mainCauses[0].label}
                      </strong>

                      <small>
                        Blocage présent sur
                        {" "}
                        {mainCauses[0].lots.size}
                        {" "}
                        lot{
                          mainCauses[0].lots.size > 1
                            ? "s"
                            : ""
                        }.
                      </small>
                    </span>

                    <em>
                      Examiner →
                    </em>
                  </button>

                  {mainCauses.length > 1 && (
                    <button
                      type="button"
                      className="mor-next-action-secondary"
                      onClick={() =>
                        focusCheckByLabel(
                          mainCauses[1].label,
                        )
                      }
                    >
                      <span>
                        Ensuite :
                        {" "}
                        <strong>
                          {mainCauses[1].label}
                        </strong>
                        {" "}
                        — {mainCauses[1].lots.size}
                        {" "}
                        lot{
                          mainCauses[1].lots.size > 1
                            ? "s"
                            : ""
                        }
                        {" "}
                        concerné{
                          mainCauses[1].lots.size > 1
                            ? "s"
                            : ""
                        }.
                      </span>

                      <em>
                        Examiner →
                      </em>
                    </button>
                  )}
                </div>
              )}
            </div>

            <aside className="mor-decision-overview-metrics">
              <div className="blocking">
                <strong>
                  {blockingTotal}
                </strong>

                <span>
                  Blocages
                </span>
              </div>

              <div className="verify">
                <strong>
                  {verifyTotal}
                </strong>

                <span>
                  À vérifier
                </span>
              </div>

              <div className="ok">
                <strong>
                  {okTotal}
                </strong>

                <span>
                  Conformes
                </span>
              </div>

              {partialLots > 0 && (
                <div className="partial">
                  <strong>
                    {partialLots}
                  </strong>

                  <span>
                    Lots partiels
                  </span>
                </div>
              )}
            </aside>
          </section>
        )
      })()}

      <section className="lots-section lots-section-pro">
        <header className="lots-section-header">
          <div>
            <span className="eyebrow">
              QUALIFICATION PAR LOT
            </span>

            <h2>
              Quel lot est réellement exploitable ?
            </h2>

            <p>
              Sélectionnez un lot pour examiner
              ses blocages, les vérifications
              nécessaires, les conformités et
              les preuves issues du DCE.
            </p>
          </div>

          <div className="lots-overview-count">
            <strong>
              {matching.lots.length}
            </strong>

            <span>
              lots analysés
            </span>
          </div>
        </header>


        {commonChecks.length > 0 && (
          <section className="mor-common-requirements">
            <header className="mor-common-requirements-header">
              <div>
                <span className="eyebrow">
                  EXIGENCES COMMUNES
                </span>

                <h3>
                  Valables pour les {
                    matching.lots.length
                  } lots
                </h3>

                <p>
                  Ces contrôles produisent
                  exactement la même conclusion
                  MOR pour tous les lots. Ils ne
                  sont donc affichés qu'une seule
                  fois.
                </p>
              </div>

              <strong>
                {commonChecks.length}
              </strong>
            </header>

            <div className="mor-common-summary">
              {commonBlocking.length > 0 && (
                <span className="blocking">
                  {commonBlocking.length}
                  {" "}
                  blocage{
                    commonBlocking.length > 1
                      ? "s"
                      : ""
                  }
                </span>
              )}

              {commonVerify.length > 0 && (
                <span className="verify">
                  {commonVerify.length}
                  {" "}
                  à vérifier
                </span>
              )}

              {commonOk.length > 0 && (
                <span className="ok">
                  {commonOk.length}
                  {" "}
                  conforme{
                    commonOk.length > 1
                      ? "s"
                      : ""
                  }
                </span>
              )}

              {commonNeutral.length > 0 && (
                <span className="neutral">
                  {commonNeutral.length}
                  {" "}
                  autre{
                    commonNeutral.length > 1
                      ? "s"
                      : ""
                  }
                </span>
              )}
            </div>

            {commonBlocking.length > 0 && (
              <div className="decision-check-list mor-common-blockers">
                {commonBlocking.map(
                  (check, index) => (
                    <CheckItem
                      key={
                        check.code
                        ?? `common-blocking-${index}`
                      }
                      check={check}
                      onEvidence={
                        setSelectedEvidence
                      }
                    />
                  ),
                )}
              </div>
            )}

            {(commonVerify.length > 0
              || commonOk.length > 0
              || commonNeutral.length > 0) && (
              <details className="mor-common-other">
                <summary>
                  Voir les autres exigences
                  communes

                  <strong>
                    {
                      commonVerify.length
                      + commonOk.length
                      + commonNeutral.length
                    }
                  </strong>
                </summary>

                <div className="decision-check-list">
                  {[
                    ...commonVerify,
                    ...commonOk,
                    ...commonNeutral,
                  ].map(
                    (check, index) => (
                      <CheckItem
                        key={
                          check.code
                          ?? `common-${index}`
                        }
                        check={check}
                        onEvidence={
                          setSelectedEvidence
                        }
                      />
                    ),
                  )}
                </div>
              </details>
            )}
          </section>
        )}


        <nav
          className="mor-lot-tabs"
          aria-label="Lots de l'appel d'offres"
        >
          {matching.lots.map(
            (lot, index) => {
              const blocking =
                lot.checks.filter(
                  (check) =>
                    check.status === "BLOCKING",
                ).length

              const verify =
                lot.checks.filter(
                  (check) =>
                    check.status === "VERIFY",
                ).length

              const ok =
                lot.checks.filter(
                  (check) =>
                    check.status === "OK",
                ).length

              return (
                <button
                  type="button"
                  key={
                    lot.lot_number
                    ?? `lot-tab-${index}`
                  }
                  className={
                    "mor-lot-tab "
                    + lot.computed_status
                      .toLowerCase()
                    + (
                      selectedLotIndex === index
                        ? " active"
                        : ""
                    )
                  }
                  onClick={() =>
                    setSelectedLotIndex(index)
                  }
                >
                  <div className="mor-lot-tab-top">
                    <span>
                      LOT
                    </span>

                    <strong>
                      {lot.lot_number
                        ?? index + 1}
                    </strong>
                  </div>

                  <div
                    className={
                      "mor-lot-tab-status "
                      + lot.computed_status
                        .toLowerCase()
                    }
                  >
                    {statusLabel(
                      lot.computed_status,
                    )}
                  </div>

                  <div className="mor-lot-tab-metrics">
                    <span className="blocking">
                      {blocking} bloc.
                    </span>

                    <span className="verify">
                      {verify} vérif.
                    </span>

                    <span className="ok">
                      {ok} OK
                    </span>
                  </div>
                </button>
              )
            },
          )}
        </nav>


        {matching.lots[
          Math.min(
            selectedLotIndex,
            matching.lots.length - 1,
          )
        ] && (
          <div className="mor-selected-lot">
            <div className="mor-selected-lot-heading">
              <div>
                <span className="eyebrow">
                  LOT SÉLECTIONNÉ
                </span>

                <h2>
                  Lot {
                    matching.lots[
                      Math.min(
                        selectedLotIndex,
                        matching.lots.length - 1,
                      )
                    ].lot_number
                    ?? selectedLotIndex + 1
                  }
                </h2>
              </div>

              <span
                className={
                  "decision-status-pill "
                  + matching.lots[
                    Math.min(
                      selectedLotIndex,
                      matching.lots.length - 1,
                    )
                  ].computed_status
                    .toLowerCase()
                }
              >
                {statusLabel(
                  matching.lots[
                    Math.min(
                      selectedLotIndex,
                      matching.lots.length - 1,
                    )
                  ].computed_status,
                )}
              </span>
            </div>

            <LotCard
              lot={{
                ...matching.lots[
                  Math.min(
                    selectedLotIndex,
                    matching.lots.length - 1,
                  )
                ],

                checks:
                  matching.lots[
                    Math.min(
                      selectedLotIndex,
                      matching.lots.length - 1,
                    )
                  ].checks.filter(
                    (check) =>
                      !commonCheckSignatures.has(
                        matchCheckSignature(
                          check,
                        ),
                      ),
                  ),
              }}
              onEvidence={
                setSelectedEvidence
              }
            />
          </div>
        )}
      </section>


      <EvidenceDrawer
        evidence={selectedEvidence}
        onClose={() =>
          setSelectedEvidence(null)
        }
      />
    </main>
  )
}
