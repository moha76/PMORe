import {
  matchingDateLabel,
  matchingFreshnessLabel,
  matchingFreshnessTone,
} from "../utils/matchingFreshness"

import {
  useState,
} from "react"

import {
  useMutation,
  useQuery,
} from "@tanstack/react-query"

import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom"

import {
  ApiError,
} from "../api/client"

import {
  getOpportunities,
  updateOpportunityDecision,
} from "../api/opportunities"

import {
  getPilotageOverview,
} from "../api/pilotage"





function opportunityWorkflowStatus(
  humanDecision: string,
  stage?: string | null,
) {
  switch (stage) {
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

    case "GO":
    case "IN_PREPARATION":
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
    case "WATCHING":
    case "ACTIVE":
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

    case "ARCHIVED":
    case "DISMISSED":
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


function matchingLabel(
  status: string,
  available: boolean,
) {
  if (!available) {
    return "Non analysé"
  }

  switch (status) {
    case "BLOCKING":
      return "Bloqué"

    case "PARTIAL":
      return "Partiellement compatible"

    case "VERIFY":
      return "À vérifier"

    case "OK":
      return "Conforme"

    default:
      return "Inconnu"
  }
}


function opportunityUrgency(
  deadline?: string | null,
) {
  if (!deadline) {
    return {
      label: "Date inconnue",
      className: "unknown",
    }
  }

  const date =
    new Date(
      deadline.replace(" ", "T"),
    )

  if (Number.isNaN(
    date.getTime(),
  )) {
    return {
      label: "Date inconnue",
      className: "unknown",
    }
  }

  const now =
    new Date()

  const diffDays =
    Math.ceil(
      (
        date.getTime()
        - now.getTime()
      )
      / (
        1000
        * 60
        * 60
        * 24
      ),
    )

  if (diffDays < 0) {
    return {
      label:
        `Expiré ${Math.abs(diffDays)} j`,
      className: "expired",
    }
  }

  if (diffDays === 0) {
    return {
      label: "Aujourd’hui",
      className: "critical",
    }
  }

  if (diffDays <= 2) {
    return {
      label: `J-${diffDays}`,
      className: "critical",
    }
  }

  if (diffDays <= 7) {
    return {
      label: `J-${diffDays}`,
      className: "urgent",
    }
  }

  if (diffDays <= 15) {
    return {
      label: `J-${diffDays}`,
      className: "soon",
    }
  }

  return {
    label: `J-${diffDays}`,
    className: "normal",
  }
}


function opportunityPriority(
  status: string,
  deadline?: string | null,
) {
  const urgency =
    opportunityUrgency(deadline)

  if (
    urgency.className === "expired"
  ) {
    return {
      label: "Hors délai",
      className: "overdue",
    }
  }

  if (
    status === "BLOCKING"
    || urgency.className === "critical"
  ) {
    return {
      label: "Critique",
      className: "critical",
    }
  }

  if (
    urgency.className === "urgent"
  ) {
    return {
      label: "Haute",
      className: "high",
    }
  }

  if (
    status === "PARTIAL"
    || status === "VERIFY"
    || status === "UNKNOWN"
    || urgency.className === "soon"
  ) {
    return {
      label: "À surveiller",
      className: "watch",
    }
  }

  return {
    label: "Normale",
    className: "normal",
  }
}


function opportunityPath(
  refConsultation: string | null | undefined,
  orgAcronyme: string | null | undefined,
): string | null {
  if (
    !refConsultation
    || !orgAcronyme
  ) {
    return null
  }

  return `/opportunities/${encodeURIComponent(
    refConsultation,
  )}/${encodeURIComponent(
    orgAcronyme,
  )}`
}


function workspacePath(
  refConsultation: string | null | undefined,
  orgAcronyme: string | null | undefined,
): string | null {
  if (
    !refConsultation
    || !orgAcronyme
  ) {
    return null
  }

  return `/workspace/${encodeURIComponent(
    refConsultation,
  )}/${encodeURIComponent(
    orgAcronyme,
  )}`
}


function paginationPages(
  current: number,
  total: number,
) {
  const pages:
    Array<number | "ellipsis"> = []

  if (total <= 7) {
    for (
      let value = 1;
      value <= total;
      value += 1
    ) {
      pages.push(value)
    }

    return pages
  }

  pages.push(1)

  if (current > 4) {
    pages.push("ellipsis")
  }

  const start =
    Math.max(
      2,
      current - 1,
    )

  const end =
    Math.min(
      total - 1,
      current + 1,
    )

  for (
    let value = start;
    value <= end;
    value += 1
  ) {
    pages.push(value)
  }

  if (current < total - 3) {
    pages.push("ellipsis")
  }

  pages.push(total)

  return pages
}


export function OpportunitiesPage() {
  const navigate =
    useNavigate()

  const location =
    useLocation()

  const initialParams =
    new URLSearchParams(
      location.search,
    )

  const initialQ =
    initialParams.get("q")
    ?? ""

  const [q, setQ] =
    useState(initialQ)

  const [submittedQ, setSubmittedQ] =
    useState(initialQ)

  const [category, setCategory] =
    useState(
      initialParams.get("category")
      ?? "",
    )

  const [
    filterLocation,
    setFilterLocation,
  ] = useState(
    initialParams.get("location")
    ?? "",
  )

  const [decision, setDecision] =
    useState("")

  const [matchingStatus, setMatchingStatus] =
    useState<
      ""
      | "OK"
      | "VERIFY"
      | "PARTIAL"
      | "BLOCKING"
      | "STALE"
      | "UNKNOWN"
    >("")

  const [sort, setSort] =
    useState<
      "mor_priority"
      | "deadline_asc"
      | "deadline_desc"
      | "newest"
      | "updated"
    >("mor_priority")

  const [page, setPage] =
    useState(1)

  const [localSort, setLocalSort] =
    useState<
      ""
      | "buyer"
    >("")

  const query = useQuery({
    queryKey: [
      "opportunities",
      submittedQ,
      category,
      filterLocation,
      decision,
      matchingStatus,
      sort,
      page,
    ],

    queryFn: () =>
      getOpportunities({
        q:
          submittedQ
          || undefined,

        status: "OPEN",

        category:
          category
          || undefined,

        location:
          filterLocation
          || undefined,

        decision:
          decision
          || undefined,

        matching_status:
          matchingStatus
          || undefined,

        sort,
        page,
        page_size: 25,
      }),
  })

  const followMutation =
    useMutation({
      mutationFn: (
        item: {
          ref_consultation: string
          org_acronyme: string
        },
      ) =>
        updateOpportunityDecision(
          item.ref_consultation,
          item.org_acronyme,
          "ACTIVE",
        ),

      onSuccess: async () => {
        await query.refetch()
      },
    })


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


  const pilotageStageByOpportunity =
    new Map<string, string>()

  const pilotagePipeline =
    pilotageQuery
      .data
      ?.data
      .pipeline

  if (pilotagePipeline) {
    Object.entries(
      pilotagePipeline,
    ).forEach(
      ([stage, stageItems]) => {
        stageItems.forEach(
          (pilotageItem) => {
            pilotageStageByOpportunity.set(
              `${pilotageItem.ref_consultation}|${pilotageItem.org_acronyme}`,
              stage,
            )
          },
        )
      },
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

  function openOpportunity(
    refConsultation?: string | null,
    orgAcronyme?: string | null,
  ) {
    const path =
      opportunityPath(
        refConsultation,
        orgAcronyme,
      )

    if (!path) {
      console.error(
        "Opportunity identity missing",
        {
          refConsultation,
          orgAcronyme,
        },
      )

      return
    }

    navigate(path)
  }


  const data =
    query.data?.data ?? []

  const visibleData =
    localSort === "buyer"
      ? [...data].sort(
          (a, b) =>
            (
              a.buyer
              ?? ""
            ).localeCompare(
              b.buyer
              ?? "",
              "fr",
            ),
        )
      : data


  const pagination =
    query.data?.meta.pagination

  const portfolioSummary =
    query.data?.meta.portfolio_summary

  return (
    <main className="page-shell opportunities-page">
      <section className="opportunities-heading">
        <div>
          <span className="eyebrow">
            RADAR
          </span>

          <h1>
            Opportunités
          </h1>

          <p>
            Détectez, filtrez et ouvrez
            rapidement les appels d'offres
            pertinents pour votre entreprise.
          </p>
        </div>

        {pagination && (
          <div className="opportunity-total">
            <strong>
              {pagination.total}
            </strong>

            <span>
              opportunités
            </span>
          </div>
        )}
      </section>

      {portfolioSummary && (
        <section className="opportunity-portfolio-summary">

          <button
            type="button"
            className={
              "opportunity-portfolio-card ok"
              + (matchingStatus === "OK" ? " active" : "")
            }
            onClick={() => {
              setMatchingStatus(
                matchingStatus === "OK" ? "" : "OK"
              )
              setPage(1)
            }}
          >
            <span>CONFORMES</span>
            <strong>{portfolioSummary.ok}</strong>
            <small>Matching MOR actuel</small>
          </button>

          <button
            type="button"
            className={
              "opportunity-portfolio-card verify"
              + (matchingStatus === "VERIFY" ? " active" : "")
            }
            onClick={() => {
              setMatchingStatus(
                matchingStatus === "VERIFY" ? "" : "VERIFY"
              )
              setPage(1)
            }}
          >
            <span>À VÉRIFIER</span>
            <strong>{portfolioSummary.verify}</strong>
            <small>Points à confirmer</small>
          </button>

          <button
            type="button"
            className={
              "opportunity-portfolio-card partial"
              + (matchingStatus === "PARTIAL" ? " active" : "")
            }
            onClick={() => {
              setMatchingStatus(
                matchingStatus === "PARTIAL" ? "" : "PARTIAL"
              )
              setPage(1)
            }}
          >
            <span>PARTIELS</span>
            <strong>{portfolioSummary.partial}</strong>
            <small>Certains lots exploitables</small>
          </button>

          <button
            type="button"
            className={
              "opportunity-portfolio-card blocking"
              + (matchingStatus === "BLOCKING" ? " active" : "")
            }
            onClick={() => {
              setMatchingStatus(
                matchingStatus === "BLOCKING" ? "" : "BLOCKING"
              )
              setPage(1)
            }}
          >
            <span>BLOQUÉS</span>
            <strong>{portfolioSummary.blocking}</strong>
            <small>Blocage connu</small>
          </button>

          <button
            type="button"
            className={
              "opportunity-portfolio-card stale"
              + (matchingStatus === "STALE" ? " active" : "")
            }
            onClick={() => {
              setMatchingStatus(
                matchingStatus === "STALE" ? "" : "STALE"
              )
              setPage(1)
            }}
          >
            <span>OBSOLÈTES</span>
            <strong>{portfolioSummary.stale}</strong>
            <small>Profil modifié depuis l’analyse</small>
          </button>

          <button
            type="button"
            className={
              "opportunity-portfolio-card unknown"
              + (matchingStatus === "UNKNOWN" ? " active" : "")
            }
            onClick={() => {
              setMatchingStatus(
                matchingStatus === "UNKNOWN" ? "" : "UNKNOWN"
              )
              setPage(1)
            }}
          >
            <span>NON ANALYSÉS</span>
            <strong>{portfolioSummary.unknown}</strong>
            <small>Aucune conclusion MOR</small>
          </button>

        </section>
      )}

      {(category || filterLocation) && (
        <section className="opportunity-intelligence-context">
          <div>
            <span>
              FILTRE INTELLIGENCE
            </span>

            <strong>
              Opportunités ciblées
            </strong>
          </div>

          <div className="opportunity-intelligence-filters">
            {category && (
              <button
                type="button"
                onClick={() => {
                  setCategory("")
                  setPage(1)
                }}
              >
                Catégorie : {category}
                <b>×</b>
              </button>
            )}

            {filterLocation && (
              <button
                type="button"
                onClick={() => {
                  setFilterLocation("")
                  setPage(1)
                }}
              >
                Zone : {filterLocation}
                <b>×</b>
              </button>
            )}
          </div>
        </section>
      )}

      <section className="opportunity-toolbar opportunity-toolbar-pro">
        <form
          className="opportunity-search-pro"
          onSubmit={(event) => {
            event.preventDefault()

            setSubmittedQ(
              q.trim(),
            )

            setPage(1)
          }}
        >
          <label>
            <span>
              Recherche
            </span>

            <div className="opportunity-search-field">
              <input
                type="search"
                placeholder="Référence, objet, acheteur…"
                value={q}
                onChange={(event) =>
                  setQ(
                    event.target.value,
                  )
                }
              />

              {q && (
                <button
                  type="button"
                  className="opportunity-search-clear"
                  onClick={() => {
                    setQ("")
                    setSubmittedQ("")
                    setPage(1)
                  }}
                  aria-label="Effacer la recherche"
                >
                  ×
                </button>
              )}
            </div>
          </label>

          <button
            type="submit"
            className="opportunity-search-submit"
          >
            Rechercher
          </button>
        </form>


        <div className="opportunity-control-group">
          <label>
            <span>
              Mon statut
            </span>

            <select
              value={decision}
              onChange={(event) => {
                setDecision(
                  event.target.value,
                )
                setPage(1)
              }}
            >
              <option value="">
                Toutes
              </option>

              <option value="UNDECIDED">
                À décider
              </option>

              <option value="WATCHING">
                À surveiller
              </option>

              <option value="GO">
                GO
              </option>

              <option value="NO_GO">
                NO-GO
              </option>

              <option value="ARCHIVED">
                Archivées
              </option>
            </select>
          </label>


          <label>
            <span>
              Trier par
            </span>

            <select
              value={sort}
              onChange={(event) => {
                setSort(
                  event.target.value as typeof sort
                )
                setPage(1)
              }}
            >
              <option value="mor_priority">
                Priorité MOR
              </option>

              <option value="deadline_asc">
                Échéance proche
              </option>

              <option value="deadline_desc">
                Échéance lointaine
              </option>

              <option value="newest">
                Nouveaux d'abord
              </option>

              <option value="updated">
                Dernières mises à jour
              </option>
            </select>
          </label>


          {(
            submittedQ
            || decision
            || matchingStatus
            || category
            || filterLocation
            || sort !== "mor_priority"
          ) && (
            <button
              type="button"
              className="opportunity-reset"
              onClick={() => {
                setQ("")
                setSubmittedQ("")
                setDecision("")
                setMatchingStatus("")
                setCategory("")
                setFilterLocation("")
                setSort("mor_priority")
                setPage(1)
              }}
            >
              Réinitialiser
            </button>
          )}
        </div>
      </section>


      {query.isLoading && (
        <div className="state-card">
          Chargement des opportunités…
        </div>
      )}

      {query.isError && (
        <div className="state-card error">
          Impossible de charger les opportunités.
        </div>
      )}

      {!query.isLoading
        && !query.isError
        && data.length === 0 && (
        <div className="state-card">
          Aucune opportunité trouvée.
        </div>
      )}

      {data.length > 0 && (
        <section className="opportunity-table-card">
          <div className="opportunity-table-head">
            <span>
              Opportunité
            </span>

            <button
              type="button"
              className={
                "opportunity-head-sort"
                + (
                  localSort === "buyer"
                    ? " active"
                    : ""
                )
              }
              onClick={() =>
                setLocalSort(
                  localSort === "buyer"
                    ? ""
                    : "buyer",
                )
              }
            >
              Acheteur
              <b>↕</b>
            </button>

            <span>
              Statut MOR
            </span>

            <button
              type="button"
              className={
                "opportunity-head-sort"
                + (
                  sort === "mor_priority"
                    ? " active"
                    : ""
                )
              }
              onClick={() => {
                setSort("mor_priority")
                setLocalSort("")
                setPage(1)
              }}
            >
              Priorité
              <b>↕</b>
            </button>

            <button
              type="button"
              className={
                "opportunity-head-sort"
                + (
                  sort === "deadline_asc"
                    ? " active"
                    : ""
                )
              }
              onClick={() => {
                setSort(
                  sort === "deadline_asc"
                    ? "deadline_desc"
                    : "deadline_asc",
                )
                setLocalSort("")
                setPage(1)
              }}
            >
              Échéance
              <b>
                {sort === "deadline_desc"
                  ? "↓"
                  : "↑"}
              </b>
            </button>

            <span>
              Décision
            </span>

            <span />
          </div>

          <div className="opportunity-table-body">
            {visibleData.map(
              (item) => {
                const effectiveMatchingStatus =
                  item.matching.available
                    ? item.matching.computed_status
                    : "UNKNOWN"

                const priority =
                  opportunityPriority(
                    effectiveMatchingStatus,
                    item.deadline_iso
                      ?? item.deadline,
                  )

                const urgency =
                  opportunityUrgency(
                    item.deadline_iso
                      ?? item.deadline,
                  )

                const businessStage =
                  pilotageStageByOpportunity.get(
                    `${item.ref_consultation}|${item.org_acronyme}`,
                  ) ?? null

                const workflowStatus =
                  opportunityWorkflowStatus(
                    item.human_decision,
                    businessStage,
                  )

                const hasOperationalDossier =
                  businessStage === "GO"
                  || businessStage === "IN_PREPARATION"
                  || businessStage === "BLOCKED"
                  || businessStage === "READY"

                const followingThis =
                  followMutation.isPending
                  && followMutation
                    .variables
                    ?.ref_consultation
                    === item.ref_consultation
                  && followMutation
                    .variables
                    ?.org_acronyme
                    === item.org_acronyme

                return (
                  <article
                    className="opportunity-row opportunity-row-clickable"
                    key={
                      `${item.ref_consultation}-${item.org_acronyme}`
                    }
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      openOpportunity(
                        item.ref_consultation,
                        item.org_acronyme,
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter"
                        || event.key === " "
                      ) {
                        event.preventDefault()

                        openOpportunity(
                          item.ref_consultation,
                          item.org_acronyme,
                        )
                      }
                    }}
                  >
                    <div className="opportunity-main-cell">
                      <div className="opportunity-ref">
                        {item.reference
                          ?? item.ref_consultation}
                      </div>

                      <strong>
                        {item.title
                          ?? "Sans titre"}
                      </strong>

                      <div className="opportunity-tags">
                        {item.category && (
                          <span>
                            {item.category}
                          </span>
                        )}

                        {item.location && (
                          <span>
                            {item.location}
                          </span>
                        )}
                      </div>

                      {item.matching.available && (
                        <div className="opportunity-row-mini">
                          <span>
                            {item.matching.blocking_count} bloc.
                          </span>

                          <span>
                            {item.matching.verify_count} vérif.
                          </span>

                          <span>
                            {item.matching.ok_count} OK
                          </span>
                        </div>
                      )}
                    </div>


                    <div className="opportunity-secondary-cell">
                      {item.buyer
                        ?? "Acheteur non renseigné"}
                    </div>


                    <div className="opportunity-status-cell">
                      <span
                        className={
                          "mor-status-chip "
                          + (
                            item.matching.available
                              ? item.matching.computed_status.toLowerCase()
                              : "unknown"
                          )
                        }
                      >
                        {matchingLabel(
                          item.matching.computed_status,
                          item.matching.available,
                        )}
                      </span>

                      {item.matching.available && (
                        <span
                          className={
                            "mor-freshness-chip "
                            + matchingFreshnessTone(
                              item.matching.freshness,
                            )
                          }
                          title={
                            "Matching calculé : "
                            + matchingDateLabel(
                              item.matching.analyzed_at,
                            )
                          }
                        >
                          {matchingFreshnessLabel(
                            item.matching.freshness,
                          )}
                        </span>
                      )}
                    </div>


                    <div className="opportunity-priority-cell">
                      <span
                        className={
                          "opportunity-priority-badge "
                          + priority.className
                        }
                      >
                        {priority.label}
                      </span>
                    </div>


                    <div className="opportunity-deadline-cell">
                      <strong>
                        {item.deadline
                          ?? item.deadline_iso
                          ?? "Non disponible"}
                      </strong>

                      <span
                        className={
                          "opportunity-urgency-badge "
                          + urgency.className
                        }
                      >
                        {urgency.label}
                      </span>
                    </div>


                    <div className="opportunity-decision-cell">
                      {item.human_decision
                        === "UNDECIDED" ? (
                        <button
                          type="button"
                          className="opportunity-follow-button"
                          disabled={followingThis}
                          onClick={(event) => {
                            event.stopPropagation()

                            followMutation.mutate(
                              item,
                            )
                          }}
                        >
                          {followingThis
                            ? "Ajout…"
                            : "+ Suivre"}
                        </button>
                      ) : (
                        <span
                          className={
                            "human-decision-chip workflow-"
                            + workflowStatus.tone
                          }
                        >
                          {workflowStatus.label}
                        </span>
                      )}
                    </div>


                    <div className="opportunity-open-cell">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()

                          if (hasOperationalDossier) {
                            const path =
                              workspacePath(
                                item.ref_consultation,
                                item.org_acronyme,
                              )

                            if (path) {
                              navigate(
                                path,
                                {
                                  state: {
                                    focusWorkflow: true,
                                  },
                                },
                              )
                            }

                            return
                          }

                          openOpportunity(
                            item.ref_consultation,
                            item.org_acronyme,
                          )
                        }}
                      >
                        {hasOperationalDossier
                          ? "Continuer →"
                          : "Ouvrir →"}
                      </button>
                    </div>
                  </article>
                )
              },
            )}
          </div>
        </section>
      )}

      {pagination
        && pagination.total_pages > 1 && (
        <footer className="opportunity-pagination-pro">
          <div className="opportunity-pagination-info">
            <strong>
              {
                (
                  pagination.page - 1
                )
                * 25
                + 1
              }
              –
              {
                Math.min(
                  pagination.page * 25,
                  pagination.total,
                )
              }
            </strong>

            <span>
              sur {pagination.total}
            </span>
          </div>


          <div className="opportunity-pagination-pages">
            <button
              type="button"
              className="pagination-arrow"
              disabled={page <= 1}
              onClick={() =>
                setPage(
                  Math.max(
                    1,
                    page - 1,
                  ),
                )
              }
              aria-label="Page précédente"
            >
              ←
            </button>

            {paginationPages(
              pagination.page,
              pagination.total_pages,
            ).map(
              (value, index) =>
                value === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="pagination-ellipsis"
                  >
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    key={value}
                    className={
                      "pagination-page"
                      + (
                        value
                        === pagination.page
                          ? " active"
                          : ""
                      )
                    }
                    onClick={() =>
                      setPage(value)
                    }
                  >
                    {value}
                  </button>
                ),
            )}

            <button
              type="button"
              className="pagination-arrow"
              disabled={
                page
                >= pagination.total_pages
              }
              onClick={() =>
                setPage(
                  Math.min(
                    pagination.total_pages,
                    page + 1,
                  ),
                )
              }
              aria-label="Page suivante"
            >
              →
            </button>
          </div>
        </footer>
      )}
    </main>
  )
}
