import {
  useMemo,
  useState,
} from "react"

import {
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
  getPilotageOverview,
} from "../api/pilotage"

import type {
  PilotageItem,
  PilotageStage,
} from "../api/pilotage"

import "./cockpit/cockpit.css"


function isUnauthorized(
  error: unknown,
) {
  return (
    error instanceof ApiError
    && error.status === 401
  )
}


type TrackingFilter =
  | "ALL"
  | "STUDY"
  | "PREPARATION"
  | "READY"
  | "SUBMITTED"
  | "WON"
  | "LOST"
  | "CANCELLED"
  | "EXPIRED"


function stageLabel(
  stage: PilotageStage,
) {
  switch (stage) {
    case "ACTIVE":
      return "À étudier"

    case "GO":
      return "GO"

    case "IN_PREPARATION":
      return "En préparation"

    case "BLOCKED":
      return "Bloqué"

    case "READY":
      return "Prêt à soumettre"

    case "SUBMITTED":
      return "En suivi"

    case "WON":
      return "Gagné"

    case "LOST":
      return "Perdu"

    case "CANCELLED":
      return "Annulé"

    case "EXPIRED":
      return "Échu"

    default:
      return "Suivi"
  }
}


function actionLabel(
  item: PilotageItem,
) {
  switch (item.stage) {
    case "ACTIVE":
      return "Étudier"

    case "GO":
      return "Préparer"

    case "IN_PREPARATION":
      return "Continuer"

    case "BLOCKED":
      return "Traiter le blocage"

    case "READY":
      return "Soumettre"

    case "SUBMITTED":
      return "Suivre"

    case "WON":
    case "LOST":
    case "CANCELLED":
      return "Ouvrir le dossier"

    case "EXPIRED":
      return "Vérifier"

    default:
      return "Ouvrir"
  }
}


function nextActionText(
  item: PilotageItem,
) {
  switch (item.stage) {
    case "ACTIVE":
      return "Étudier le marché et décider GO / NO-GO"

    case "GO":
      return "Démarrer la préparation du dossier"

    case "IN_PREPARATION":
      if (item.pending_actions > 0) {
        return `${item.pending_actions} action${
          item.pending_actions > 1
            ? "s"
            : ""
        } restante${
          item.pending_actions > 1
            ? "s"
            : ""
        } à traiter`
      }

      return "Continuer la préparation du dossier"

    case "BLOCKED":
      if (item.impossible_actions > 0) {
        return `Lever ${
          item.impossible_actions
        } blocage${
          item.impossible_actions > 1
            ? "s"
            : ""
        } avant de continuer`
      }

      return "Identifier et lever le blocage"

    case "READY":
      return "Dossier prêt : enregistrer la soumission"

    case "SUBMITTED":
      return "Suivre le marché et enregistrer son résultat"

    case "WON":
      return "Marché gagné · consulter le dossier"

    case "LOST":
      return "Marché perdu · consulter le résultat"

    case "CANCELLED":
      return "Marché annulé · dossier clôturé"

    case "EXPIRED":
      return "Vérifier la situation et classer le dossier"

    default:
      return "Consulter le dossier"
  }
}


function destination(
  item: PilotageItem,
) {
  return `/workspace/${encodeURIComponent(
    item.ref_consultation,
  )}/${encodeURIComponent(
    item.org_acronyme,
  )}`
}


function stageMatchesFilter(
  item: PilotageItem,
  filter: TrackingFilter,
) {
  if (filter === "ALL") {
    return true
  }

  if (filter === "STUDY") {
    return item.stage === "ACTIVE"
  }

  if (filter === "PREPARATION") {
    return (
      item.stage === "GO"
      || item.stage === "IN_PREPARATION"
      || item.stage === "BLOCKED"
    )
  }

  return item.stage === filter
}


function preparationPercent(
  item: PilotageItem,
) {
  if (item.action_count <= 0) {
    return null
  }

  return Math.round(
    item.ready_actions
    * 100
    / item.action_count,
  )
}


function itemDate(
  item: PilotageItem,
) {
  if (item.outcome?.result_date) {
    return item.outcome.result_date
  }

  if (item.submission?.submitted_at) {
    return item.submission.submitted_at
  }

  return (
    item.deadline
    || item.deadline_iso
    || null
  )
}


function itemDateLabel(
  item: PilotageItem,
) {
  if (item.outcome?.result_date) {
    return "Résultat"
  }

  if (item.submission?.submitted_at) {
    return "Soumis le"
  }

  return "Échéance"
}


export function NewCockpitPage() {
  const location =
    useLocation()

  const navigate =
    useNavigate()

  const [
    filter,
    setFilter,
  ] = useState<TrackingFilter>(
    "ALL",
  )

  const [
    search,
    setSearch,
  ] = useState("")


  const query =
    useQuery({
      queryKey: [
        "pilotage-overview",
      ],

      queryFn:
        getPilotageOverview,

      staleTime:
        30 * 1000,
    })


  const data =
    query.data?.data


  const trackedItems =
    useMemo(() => {
      if (!data) {
        return []
      }

      const stages = [
        data.pipeline.ACTIVE,
        data.pipeline.GO,
        data.pipeline.IN_PREPARATION,
        data.pipeline.BLOCKED,
        data.pipeline.READY,
        data.pipeline.SUBMITTED,
        data.pipeline.WON,
        data.pipeline.LOST,
        data.pipeline.CANCELLED,
        data.pipeline.EXPIRED,
      ]

      return stages.flat()
    }, [data])


  const filteredItems =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase()

      return trackedItems.filter(
        (item) => {
          if (
            !stageMatchesFilter(
              item,
              filter,
            )
          ) {
            return false
          }

          if (!term) {
            return true
          }

          const haystack = [
            item.reference,
            item.ref_consultation,
            item.title,
            item.buyer,
            item.category,
            item.location,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()

          return haystack.includes(
            term,
          )
        },
      )
    }, [
      trackedItems,
      filter,
      search,
    ])


  const filters =
    useMemo(() => {
      if (!data) {
        return []
      }

      return [
        {
          key: "ALL" as const,
          label: "Tous",
          count:
            trackedItems.length,
        },
        {
          key: "STUDY" as const,
          label: "À étudier",
          count:
            data.kpis.active,
        },
        {
          key: "PREPARATION" as const,
          label: "Préparation",
          count:
            data.kpis.go
            + data.kpis.in_preparation
            + data.kpis.blocked,
        },
        {
          key: "READY" as const,
          label: "Prêts",
          count:
            data.kpis.ready,
        },
        {
          key: "SUBMITTED" as const,
          label: "En suivi",
          count:
            data.kpis.submitted,
        },
        {
          key: "WON" as const,
          label: "Gagnés",
          count:
            data.kpis.won,
        },
        {
          key: "LOST" as const,
          label: "Perdus",
          count:
            data.kpis.lost,
        },
        {
          key: "CANCELLED" as const,
          label: "Annulés",
          count:
            data.kpis.cancelled,
        },
      ]
    }, [
      data,
      trackedItems.length,
    ])


  const operationalSummary =
    useMemo(() => {
      if (!data) {
        return []
      }

      return [
        {
          key: "PREPARATION" as const,
          label: "À préparer",
          value:
            data.kpis.go
            + data.kpis.in_preparation
            + data.kpis.blocked,
          hint: "GO, préparation ou blocage",
        },
        {
          key: "READY" as const,
          label: "Prêts",
          value: data.kpis.ready,
          hint: "Prêts à être soumis",
        },
        {
          key: "SUBMITTED" as const,
          label: "En suivi",
          value: data.kpis.submitted,
          hint: "Soumis, résultat attendu",
        },
        {
          key: "WON" as const,
          label: "Gagnés",
          value: data.kpis.won,
          hint: "Marchés remportés",
        },
        {
          key: "LOST" as const,
          label: "Perdus",
          value: data.kpis.lost,
          hint: "Marchés non remportés",
        },
      ]
    }, [data])


  if (
    isUnauthorized(
      query.error,
    )
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname
            + location.search,
        }}
      />
    )
  }


  if (query.isLoading) {
    return (
      <main className="mor-tracking">
        <div className="mor-tracking-state">
          Chargement de vos AO suivis…
        </div>
      </main>
    )
  }


  if (
    query.isError
    || !data
  ) {
    return (
      <main className="mor-tracking">
        <div className="mor-tracking-state error">
          Impossible de charger vos AO suivis.
        </div>
      </main>
    )
  }


  return (
    <main className="mor-tracking">

      <header className="mor-tracking-hero">

        <div>
          <span>
            MON ACTIVITÉ
          </span>

          <h1>
            Mes AO suivis
          </h1>

          <p>
            Retrouvez tous les appels d'offres
            que vous avez décidé de suivre et
            reprenez chaque dossier exactement
            à son étape actuelle.
          </p>
        </div>


        <div className="mor-tracking-total">
          <strong>
            {trackedItems.length}
          </strong>

          <span>
            AO suivis
          </span>
        </div>

      </header>


      <section
        className="mor-tracking-v47-summary"
        aria-label="Résumé de mon activité"
      >

        {operationalSummary.map(
          (item) => (

            <button
              key={item.key}
              type="button"
              className={
                `mor-tracking-v47-card ${
                  filter === item.key
                    ? "active"
                    : ""
                }`
              }
              onClick={() =>
                setFilter(item.key)
              }
            >

              <span>
                {item.label}
              </span>

              <strong>
                {item.value}
              </strong>

              <small>
                {item.hint}
              </small>

            </button>

          ),
        )}

      </section>


      <section className="mor-tracking-toolbar">

        <div className="mor-tracking-filters">

          {filters.map(
            (item) => (

              <button
                key={item.key}
                type="button"
                className={
                  filter === item.key
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(
                    item.key,
                  )
                }
              >
                <span>
                  {item.label}
                </span>

                <strong>
                  {item.count}
                </strong>
              </button>

            ),
          )}

        </div>


        <div className="mor-tracking-search">

          <input
            type="search"
            value={search}
            placeholder={
              "Rechercher un AO, acheteur, catégorie..."
            }
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
          />

        </div>

      </section>


      <section className="mor-tracking-list">

        {filteredItems.length === 0 && (
          <div className="mor-tracking-empty">
            Aucun AO dans cette catégorie.
          </div>
        )}


        {filteredItems.map(
          (item) => {
            const progress =
              preparationPercent(
                item,
              )

            return (
              <article
                className={
                  `mor-tracking-row stage-${
                    item.stage
                      .toLowerCase()
                  }`
                }
                key={
                  `${item.ref_consultation}:${item.org_acronyme}`
                }
              >

                <div className="mor-tracking-status">

                  <span>
                    {stageLabel(
                      item.stage,
                    )}
                  </span>

                </div>


                <div className="mor-tracking-main">

                  <div className="mor-tracking-top">

                    <div>
                      <small>
                        AO {
                          item.reference
                          || item.ref_consultation
                        }
                      </small>

                      <h2>
                        {
                          item.title
                          || `Appel d'offres ${item.ref_consultation}`
                        }
                      </h2>
                    </div>


                    {itemDate(item) && (
                      <span className="mor-tracking-date">
                        <small>
                          {itemDateLabel(item)}
                        </small>

                        <strong>
                          {itemDate(item)}
                        </strong>
                      </span>
                    )}

                  </div>


                  <p className="mor-tracking-buyer">
                    {
                      item.buyer
                      || "Acheteur non renseigné"
                    }
                  </p>


                  <div className="mor-tracking-meta">

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

                    {progress !== null && (
                      <span>
                        Préparation {
                          progress
                        }%
                      </span>
                    )}

                    {
                      item.pending_actions > 0
                      && (
                        <span>
                          {
                            item.pending_actions
                          } action{
                            item.pending_actions > 1
                              ? "s"
                              : ""
                          } restante{
                            item.pending_actions > 1
                              ? "s"
                              : ""
                          }
                        </span>
                      )
                    }

                    {
                      item.impossible_actions > 0
                      && (
                        <span className="danger">
                          {
                            item.impossible_actions
                          } blocage{
                            item.impossible_actions > 1
                              ? "s"
                              : ""
                          }
                        </span>
                      )
                    }

                    {
                      item.stage === "READY"
                      && (
                        <span className="success">
                          Dossier prêt
                        </span>
                      )
                    }

                    {
                      item.stage === "SUBMITTED"
                      && (
                        <span className="success">
                          Offre soumise
                        </span>
                      )
                    }

                    {
                      item.stage === "WON"
                      && item.outcome
                        ?.awarded_amount != null
                      && (
                        <span className="success">
                          {
                            new Intl.NumberFormat(
                              "fr-MA",
                              {
                                maximumFractionDigits:
                                  2,
                              },
                            ).format(
                              item.outcome
                                .awarded_amount,
                            )
                          } MAD
                        </span>
                      )
                    }

                    {
                      item.stage === "LOST"
                      && item.outcome
                        ?.winner_name
                      && (
                        <span>
                          Attributaire : {
                            item.outcome
                              .winner_name
                          }
                        </span>
                      )
                    }

                  </div>

                </div>


                <div
                  className={
                    `mor-tracking-action action-${
                      item.stage.toLowerCase()
                    }`
                  }
                >

                  <small>
                    PROCHAINE ACTION
                  </small>

                  <strong>
                    {nextActionText(item)}
                  </strong>

                  {item.stage === "BLOCKED" && (
                    <span className="mor-action-alert">
                      Action requise avant de continuer
                    </span>
                  )}

                  {item.stage === "READY" && (
                    <span className="mor-action-ready">
                      Le dossier peut passer à la soumission
                    </span>
                  )}

                  {item.stage === "SUBMITTED" && (
                    <span className="mor-action-followup">
                      En attente du résultat du marché
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        destination(item),
                        {
                          state: {
                            focusWorkflow: true,
                          },
                        },
                      )
                    }
                  >
                    {actionLabel(item)}
                    <span>
                      →
                    </span>
                  </button>

                </div>

              </article>
            )
          },
        )}

      </section>

    </main>
  )
}
