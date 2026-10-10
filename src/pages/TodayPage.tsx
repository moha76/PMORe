import {
  ArrowRight,
  Clock3,
  LoaderCircle,
  Plus,
} from "lucide-react"

import {
  useMemo,
  useState,
} from "react"

import {
  useMutation,
  useQuery,
  useQueryClient,
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
  getCompanyWorkspace,
} from "../api/company"

import {
  matchingDateLabel,
  matchingFreshnessLabel,
  matchingFreshnessTone,
} from "../utils/matchingFreshness"

import type {
  OpportunityListItem,
} from "../api/types"


type CompanyView =
  | "RECOMMENDED"
  | "STRONG"
  | "VERIFY"
  | "PARTIAL"


function isUnauthorized(
  error: unknown,
) {
  return (
    error instanceof ApiError
    && error.status === 401
  )
}


function parseAmount(
  value?: string | null,
): number | null {
  if (!value) {
    return null
  }

  const rawMatch =
    value
      .replace(/\u00a0/g, " ")
      .match(/\d[\d\s.,]*/)?.[0]

  if (!rawMatch) {
    return null
  }

  let raw =
    rawMatch
      .replace(/\s+/g, "")

  const comma =
    raw.lastIndexOf(",")

  const dot =
    raw.lastIndexOf(".")

  if (
    comma !== -1
    && dot !== -1
  ) {
    const decimal =
      comma > dot ? "," : "."

    const thousands =
      decimal === "," ? "." : ","

    raw =
      raw
        .replaceAll(thousands, "")
        .replace(decimal, ".")
  } else if (comma !== -1) {
    const decimals =
      raw.length - comma - 1

    raw =
      decimals === 2
        ? raw.replace(",", ".")
        : raw.replaceAll(",", "")
  } else if (dot !== -1) {
    const decimals =
      raw.length - dot - 1

    if (decimals !== 2) {
      raw =
        raw.replaceAll(".", "")
    }
  }

  const amount =
    Number(raw)

  return Number.isFinite(amount)
    ? amount
    : null
}


function parseDeadline(
  value?: string | null,
) {
  if (!value) {
    return null
  }

  const d =
    new Date(value)

  return Number.isNaN(
    d.getTime(),
  )
    ? null
    : d
}


function daysUntil(
  value?: string | null,
) {
  const deadline =
    parseDeadline(value)

  if (!deadline) {
    return null
  }

  return Math.ceil(
    (
      deadline.getTime()
      - Date.now()
    )
    / 86_400_000,
  )
}


function deadlineLabel(
  item: OpportunityListItem,
) {
  const days =
    daysUntil(
      item.deadline_iso,
    )

  if (days === null) {
    return "Échéance inconnue"
  }

  if (days < 0) {
    return "Échu"
  }

  if (days === 0) {
    return "Aujourd’hui"
  }

  if (days === 1) {
    return "Demain"
  }

  return `J-${days}`
}


function matchingLabel(
  item: OpportunityListItem,
) {
  if (!item.matching.available) {
    return "Non analysé"
  }

  switch (
    item.matching.computed_status
  ) {
    case "OK":
      return "Compatible"

    case "VERIFY":
      return "À vérifier"

    case "PARTIAL":
      return "Partiel"

    case "BLOCKING":
      return "Bloqué"

    default:
      return "Non analysé"
  }
}


function matchingTone(
  item: OpportunityListItem,
) {
  if (!item.matching.available) {
    return "unknown"
  }

  return item.matching
    .computed_status
    .toLowerCase()
}


export function TodayPage() {
  const navigate =
    useNavigate()

  const location =
    useLocation()

  const queryClient =
    useQueryClient()

  const [
    view,
    setView,
  ] = useState<CompanyView>(
    "STRONG",
  )

  const [
    search,
    setSearch,
  ] = useState("")


  const opportunitiesQuery =
    useQuery({
      queryKey: [
        "today-opportunities",
      ],

      queryFn: () =>
        getOpportunities({
          status: "OPEN",
          sort: "mor_priority",
          page: 1,
          page_size: 100,
        }),
    })


  const companyQuery =
    useQuery({
      queryKey: [
        "company-workspace",
      ],

      queryFn:
        getCompanyWorkspace,
    })


  const followMutation =
    useMutation({
      mutationFn: (
        item: OpportunityListItem,
      ) =>
        updateOpportunityDecision(
          item.ref_consultation,
          item.org_acronyme,
          "ACTIVE",
        ),

      onSuccess: async () => {
        await Promise.all([
          opportunitiesQuery.refetch(),

          queryClient.invalidateQueries({
            queryKey: [
              "pilotage-overview",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "opportunities",
            ],
          }),
        ])
      },
    })


  const items =
    opportunitiesQuery
      .data
      ?.data
    ?? []


  const maxContractCapacity =
    companyQuery
      .data
      ?.data
      .profile
      .max_contract_capacity
    ?? null

  const cautionCapacity =
    companyQuery
      .data
      ?.data
      .profile
      .caution_capacity
    ?? null


  const untracked =
    useMemo(
      () =>
        items.filter(
          (item) =>
            item.human_decision
            === "UNDECIDED",
        ),
      [items],
    )


  const recommended =
    useMemo(
      () =>
        untracked.filter(
          (item) =>
            item.matching.available
            && (
              item.matching.computed_status
                === "OK"
              || item.matching.computed_status
                === "VERIFY"
              || item.matching.computed_status
                === "PARTIAL"
            ),
        ),
      [untracked],
    )


  const strongCandidates =
    useMemo(
      () =>
        recommended.filter(
          (item) => {
            if (
              item.matching
                .computed_status
              !== "OK"
            ) {
              return false
            }

            const amount =
              parseAmount(
                item.estimation,
              )

            const caution =
              parseAmount(
                item.caution,
              )

            if (
              amount === null
              || maxContractCapacity === null
            ) {
              return false
            }

            if (
              amount
              > maxContractCapacity
            ) {
              return false
            }

            if (
              caution === null
              || cautionCapacity === null
            ) {
              return false
            }

            if (
              caution
              > cautionCapacity
            ) {
              return false
            }

            return true
          },
        ),
      [
        recommended,
        maxContractCapacity,
        cautionCapacity,
      ],
    )


  const verifyItems =
    useMemo(
      () =>
        recommended.filter(
          (item) =>
            item.matching
              .computed_status
            === "VERIFY",
        ),
      [recommended],
    )


  const partialItems =
    useMemo(
      () =>
        recommended.filter(
          (item) =>
            item.matching
              .computed_status
            === "PARTIAL",
        ),
      [recommended],
    )


  const sourceItems =
    view === "STRONG"
      ? strongCandidates
      : view === "VERIFY"
        ? verifyItems
        : view === "PARTIAL"
          ? partialItems
          : recommended


  const visibleItems =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase()

      const result =
        sourceItems.filter(
          (item) => {
            if (!term) {
              return true
            }

            const haystack = [
              item.reference,
              item.ref_consultation,
              item.title,
              item.buyer,
              item.location,
              item.category,
              item.activity_domains,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()

            return haystack.includes(
              term,
            )
          },
        )

      return [...result].sort(
        (a, b) => {
          const rank = (
            item: OpportunityListItem,
          ) => {
            switch (
              item.matching
                .computed_status
            ) {
              case "OK":
                return 0

              case "VERIFY":
                return 1

              case "PARTIAL":
                return 2

              default:
                return 3
            }
          }

          const diff =
            rank(a) - rank(b)

          if (diff !== 0) {
            return diff
          }

          return (
            (
              parseDeadline(
                a.deadline_iso,
              )?.getTime()
              ?? Number.MAX_SAFE_INTEGER
            )
            -
            (
              parseDeadline(
                b.deadline_iso,
              )?.getTime()
              ?? Number.MAX_SAFE_INTEGER
            )
          )
        },
      )
    }, [
      sourceItems,
      search,
    ])


  if (
    isUnauthorized(
      opportunitiesQuery.error,
    )
    || isUnauthorized(
      companyQuery.error,
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


  if (
    opportunitiesQuery.isLoading
    || companyQuery.isLoading
  ) {
    return (
      <main className="company-opps-page">
        <div className="company-opps-state">
          Recherche des opportunités adaptées…
        </div>
      </main>
    )
  }


  if (
    opportunitiesQuery.isError
    || companyQuery.isError
  ) {
    return (
      <main className="company-opps-page">
        <div className="company-opps-state error">
          Impossible de charger les recommandations.
        </div>
      </main>
    )
  }


  return (
    <main className="company-opps-page">

      <header className="company-opps-hero">

        <div>
          <span className="company-opps-eyebrow">
            MATCHING MOR
          </span>

          <h1>
            Pour mon entreprise
          </h1>

          <p>
            Les appels d'offres ouverts qui
            correspondent actuellement à votre
            activité et méritent votre attention.
          </p>
        </div>


        <div className="company-opps-summary">

          <div>
            <strong>
              {recommended.length}
            </strong>

            <span>
              opportunités adaptées
            </span>
          </div>

          <div>
            <strong>
              {strongCandidates.length}
            </strong>

            <span>
              candidats solides
            </span>
          </div>

        </div>

      </header>


      <section className="company-opps-controls">

        <div className="company-opps-tabs">

          <button
            type="button"
            className={
              view === "STRONG"
                ? "active"
                : ""
            }
            onClick={() =>
              setView(
                "STRONG",
              )
            }
          >
            Bons candidats
            <strong>
              {strongCandidates.length}
            </strong>
          </button>


          <button
            type="button"
            className={
              view === "RECOMMENDED"
                ? "active"
                : ""
            }
            onClick={() =>
              setView(
                "RECOMMENDED",
              )
            }
          >
            Tous adaptés
            <strong>
              {recommended.length}
            </strong>
          </button>


          <button
            type="button"
            className={
              view === "VERIFY"
                ? "active"
                : ""
            }
            onClick={() =>
              setView(
                "VERIFY",
              )
            }
          >
            À vérifier
            <strong>
              {verifyItems.length}
            </strong>
          </button>


          <button
            type="button"
            className={
              view === "PARTIAL"
                ? "active"
                : ""
            }
            onClick={() =>
              setView(
                "PARTIAL",
              )
            }
          >
            Partiels
            <strong>
              {partialItems.length}
            </strong>
          </button>

        </div>


        <input
          type="search"
          value={search}
          placeholder={
            "Rechercher référence, objet, acheteur..."
          }
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
        />

      </section>


      <section className="company-opps-info">

        <div>
          <strong>
            {visibleItems.length}
          </strong>

          <span>
            AO affichés
          </span>
        </div>

        <p>
          Les AO bloquants ou non analysés
          ne sont pas présentés ici.
          Ils restent accessibles dans
          Opportunités.
        </p>

      </section>


      <section className="company-opps-list">

        {visibleItems.length === 0 && (
          <div className="company-opps-empty">

            <strong>
              Aucune opportunité dans cette vue.
            </strong>

            <span>
              Consultez Opportunités pour voir
              l'ensemble des appels d'offres.
            </span>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/opportunities",
                )
              }
            >
              Voir toutes les opportunités
            </button>

          </div>
        )}


        {visibleItems.map(
          (item) => {
            const amount =
              parseAmount(
                item.estimation,
              )

            const caution =
              parseAmount(
                item.caution,
              )

            const strongCandidateReasons:
              string[] = []

            if (
              item.matching
                .computed_status
              !== "OK"
            ) {
              strongCandidateReasons.push(
                item.matching
                  .computed_status
                  === "VERIFY"
                  ? "Le matching MOR doit encore être vérifié."
                  : item.matching
                      .computed_status
                      === "PARTIAL"
                    ? "Le matching MOR est encore partiel."
                    : "Le matching MOR n'est pas validé.",
              )
            }

            if (amount === null) {
              strongCandidateReasons.push(
                "Le montant estimé du marché n'est pas disponible.",
              )
            } else if (
              maxContractCapacity === null
            ) {
              strongCandidateReasons.push(
                "Votre capacité maximale de marché n'est pas renseignée.",
              )
            } else if (
              amount > maxContractCapacity
            ) {
              strongCandidateReasons.push(
                "Le montant estimé dépasse votre capacité maximale de marché.",
              )
            }

            if (caution === null) {
              strongCandidateReasons.push(
                "La caution du marché n'est pas disponible.",
              )
            } else if (
              cautionCapacity === null
            ) {
              strongCandidateReasons.push(
                "Votre capacité de caution n'est pas renseignée.",
              )
            } else if (
              caution > cautionCapacity
            ) {
              strongCandidateReasons.push(
                "La caution demandée dépasse votre capacité de caution.",
              )
            }

            const capacityOk =
              maxContractCapacity === null
              || amount === null
              || amount
                <= maxContractCapacity

            const cautionOk =
              cautionCapacity === null
              || caution === null
              || caution
                <= cautionCapacity

            const overContractCapacity =
              amount !== null
              && maxContractCapacity !== null
              && amount > maxContractCapacity

            const overCautionCapacity =
              caution !== null
              && cautionCapacity !== null
              && caution > cautionCapacity

            const financialDataComplete =
              amount !== null
              && maxContractCapacity !== null
              && caution !== null
              && cautionCapacity !== null

            let confidenceLabel =
              "À analyser"

            let confidenceTone =
              "neutral"

            if (
              item.matching.computed_status
                === "OK"
              && financialDataComplete
              && !overContractCapacity
              && !overCautionCapacity
            ) {
              confidenceLabel =
                "Bon candidat"

              confidenceTone =
                "strong"
            } else if (
              item.matching.computed_status
                === "OK"
              && (
                overContractCapacity
                || overCautionCapacity
              )
            ) {
              confidenceLabel =
                "Hors capacité"

              confidenceTone =
                "danger"
            } else if (
              item.matching.computed_status
                === "OK"
            ) {
              confidenceLabel =
                "Potentiel incomplet"

              confidenceTone =
                "warning"
            } else if (
              item.matching.computed_status
                === "VERIFY"
            ) {
              confidenceLabel =
                "À vérifier"

              confidenceTone =
                "warning"
            } else if (
              item.matching.computed_status
                === "PARTIAL"
            ) {
              confidenceLabel =
                "Partiel"

              confidenceTone =
                "partial"
            }

            const following =
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
                key={
                  `${item.ref_consultation}:${item.org_acronyme}`
                }
                className="company-opps-row"
              >

                <div className="company-opps-main">

                  <div className="company-opps-ref">
                    AO {
                      item.reference
                      || item.ref_consultation
                    }
                  </div>

                  <h2>
                    {
                      item.title
                      || "Appel d'offres"
                    }
                  </h2>

                  <p>
                    {
                      item.buyer
                      || "Acheteur non renseigné"
                    }
                  </p>

                  <div className="company-opps-meta">

                    {item.location && (
                      <span>
                        {item.location}
                      </span>
                    )}

                    {item.category && (
                      <span>
                        {item.category}
                      </span>
                    )}

                    {item.activity_domains && (
                      <span>
                        {item.activity_domains}
                      </span>
                    )}

                  </div>

                  {strongCandidateReasons.length > 0 && (
                    <details className="company-opps-explanation">
                      <summary>
                        Pourquoi pas Bon candidat ?
                      </summary>

                      <ul>
                        {strongCandidateReasons.map(
                          (reason) => (
                            <li key={reason}>
                              {reason}
                            </li>
                          ),
                        )}
                      </ul>
                    </details>
                  )}

                </div>


                <div className="company-opps-checks">

                  <span
                    className={
                      `company-opps-confidence ${confidenceTone}`
                    }
                  >
                    {confidenceLabel}
                  </span>


                  <span
                    className={
                      `match ${matchingTone(
                        item,
                      )}`
                    }
                  >
                    MOR : {
                      matchingLabel(
                        item,
                      )
                    }
                  </span>


                  <span
                    className={
                      capacityOk
                        ? "ok"
                        : "danger"
                    }
                  >
                    {
                      amount === null
                        ? "Montant inconnu"
                        : capacityOk
                          ? "Capacité OK"
                          : "Au-dessus capacité"
                    }
                  </span>


                  <span
                    className={
                      cautionOk
                        ? "ok"
                        : "danger"
                    }
                  >
                    {
                      caution === null
                        ? "Caution à vérifier"
                        : cautionOk
                          ? "Caution OK"
                          : "Caution trop élevée"
                    }
                  </span>


                  {item.matching.available && (
                    <span
                      className={
                        "freshness "
                        + matchingFreshnessTone(
                          item.matching
                            .freshness,
                        )
                      }
                      title={
                        "Matching calculé : "
                        + matchingDateLabel(
                          item.matching
                            .analyzed_at,
                        )
                      }
                    >
                      {
                        matchingFreshnessLabel(
                          item.matching
                            .freshness,
                        )
                      }
                    </span>
                  )}

                </div>


                <div className="company-opps-deadline">

                  <strong>
                    <Clock3 size={14} />
                    <span>
                      {deadlineLabel(item)}
                    </span>
                  </strong>

                  <span>
                    {
                      item.deadline
                      || item.deadline_iso
                      || "Date indisponible"
                    }
                  </span>

                </div>


                <div className="company-opps-actions">

                  <button
                    type="button"
                    className="follow"
                    disabled={following}
                    onClick={() =>
                      followMutation.mutate(
                        item,
                      )
                    }
                  >
                    {following ? (
                      <>
                        <LoaderCircle
                          size={15}
                          className="mor-icon-spin"
                        />
                        <span>Ajout…</span>
                      </>
                    ) : (
                      <>
                        <Plus size={15} />
                        <span>Suivre</span>
                      </>
                    )}
                  </button>


                  <button
                    type="button"
                    className="open"
                    onClick={() =>
                      navigate(
                        `/workspace/${encodeURIComponent(
                          item.ref_consultation,
                        )}/${encodeURIComponent(
                          item.org_acronyme,
                        )}`,
                        {
                          state: {
                            focusWorkflow: true,
                          },
                        },
                      )
                    }
                  >
                    <span>
                      Étudier
                    </span>

                    <ArrowRight
                      size={15}
                      className="mor-action-arrow"
                    />
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
