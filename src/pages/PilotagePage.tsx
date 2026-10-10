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
} from "react-router-dom"

import {
  ApiError,
} from "../api/client"

import {
  cancelTenderSubmission,
  getPilotageOverview,
  markTenderSubmitted,
} from "../api/pilotage"

import type {
  PilotageItem,
} from "../api/pilotage"


function isUnauthorized(
  error: unknown,
) {
  return (
    error instanceof ApiError
    && error.status === 401
  )
}


function morLabel(
  status: string,
) {
  switch (status) {
    case "OK":
      return "Conforme"

    case "VERIFY":
      return "À vérifier"

    case "PARTIAL":
      return "Partiel"

    case "BLOCKING":
      return "Bloquant"

    default:
      return "Inconnu"
  }
}


function deadlineUrgency(
  item: PilotageItem,
) {
  const raw =
    item.deadline_iso
    || item.deadline

  if (!raw) {
    return {
      label: "Date inconnue",
      className: "unknown",
    }
  }

  const deadline =
    new Date(
      raw.replace(" ", "T"),
    )

  if (Number.isNaN(
    deadline.getTime(),
  )) {
    return {
      label: "Date inconnue",
      className: "unknown",
    }
  }

  const now =
    new Date()

  const diffMs =
    deadline.getTime()
    - now.getTime()

  const diffDays =
    Math.ceil(
      diffMs
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
        `Expiré depuis ${Math.abs(
          diffDays,
        )} j`,
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


function pilotagePriority(
  item: PilotageItem,
) {
  const urgency =
    deadlineUrgency(item)

  if (
    urgency.className === "expired"
  ) {
    return {
      label: "Hors délai",
      className: "overdue",
    }
  }

  if (
    item.mor_status === "BLOCKING"
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
    item.mor_status === "PARTIAL"
    || item.mor_status === "VERIFY"
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


function priorityFilterLabel(
  value:
    | "critical"
    | "high"
    | "watch"
    | "normal"
    | "overdue",
) {
  switch (value) {
    case "critical":
      return "Critique"

    case "high":
      return "Haute"

    case "watch":
      return "À surveiller"

    case "overdue":
      return "Hors délai"

    default:
      return "Normale"
  }
}


function deadlineLabel(
  item: PilotageItem,
) {
  if (item.deadline) {
    return item.deadline
  }

  if (!item.deadline_iso) {
    return "Échéance inconnue"
  }

  const d =
    new Date(
      item.deadline_iso.replace(
        " ",
        "T",
      ),
    )

  if (Number.isNaN(d.getTime())) {
    return item.deadline_iso
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(d)
}


function nextAction(
  item: PilotageItem,
) {
  if (item.stage === "SUBMITTED") {
    return "Soumission enregistrée"
  }

  if (item.stage === "EXPIRED") {
    return "Clôturer ou archiver la décision"
  }

  if (item.impossible_actions > 0) {
    return "Traiter le point impossible"
  }

  if (item.progress_actions > 0) {
    return "Continuer la préparation"
  }

  if (item.pending_actions > 0) {
    return "Traiter les actions restantes"
  }

  if (item.stage === "ACTIVE") {
    return "Examiner puis décider GO / NO-GO"
  }

  if (item.stage === "GO") {
    return "Démarrer la préparation"
  }

  if (item.stage === "READY") {
    return "Vérifier avant dépôt"
  }

  return "Ouvrir le dossier"
}


function PilotageCard({
  item,
  onOpen,
  onSubmit,
  onCancelSubmission,
  submissionPending,
}: {
  item: PilotageItem
  onOpen: () => void
  onSubmit: () => void
  onCancelSubmission: () => void
  submissionPending: boolean
}) {
  const actionTotal =
    item.action_count

  const done =
    item.ready_actions

  const progress =
    actionTotal > 0
      ? Math.round(
          done * 100 / actionTotal,
        )
      : 0

  return (
    <article
      className={
        "pilotage-row "
        + item.stage.toLowerCase()
      }
    >
      <div className="pilotage-row-main">
        <div className="pilotage-row-ref">
          <strong>
            {item.reference
              || item.ref_consultation}
          </strong>

          <span>
            {item.category || "Non classé"}
          </span>
        </div>

        <div className="pilotage-row-opportunity">
          <strong>
            {item.title
              || "Appel d’offres"}
          </strong>

          <span>
            {item.buyer
              || "Acheteur non renseigné"}
          </span>

          {item.location && (
            <small>
              {item.location}
            </small>
          )}
        </div>
      </div>


      <div className="pilotage-row-status">
        <span
          className={
            "pilotage-row-mor "
            + item.mor_status.toLowerCase()
          }
        >
          {morLabel(item.mor_status)}
        </span>

        <small>
          Statut MOR
        </small>
      </div>


      <div className="pilotage-row-priority">
        <small>
          Priorité
        </small>

        <span
          className={
            "pilotage-priority-badge "
            + pilotagePriority(
              item,
            ).className
          }
        >
          {pilotagePriority(
            item,
          ).label}
        </span>
      </div>


      <div className="pilotage-row-deadline">
        <small>
          Échéance
        </small>

        <strong>
          {deadlineLabel(item)}
        </strong>

        <span
          className={
            "pilotage-deadline-badge "
            + deadlineUrgency(
              item,
            ).className
          }
        >
          {deadlineUrgency(
            item,
          ).label}
        </span>
      </div>


      <div className="pilotage-row-preparation">
        <div className="pilotage-row-prep-head">
          <small>
            Préparation
          </small>

          <strong>
            {actionTotal > 0
              ? `${progress}%`
              : "—"}
          </strong>
        </div>

        {actionTotal > 0 ? (
          <>
            <div className="pilotage-row-track">
              <div
                style={{
                  width:
                    `${Math.min(
                      progress,
                      100,
                    )}%`,
                }}
              />
            </div>

            <span>
              {done}/{actionTotal} prêtes
            </span>
          </>
        ) : (
          <span>
            Aucune action
          </span>
        )}
      </div>


      <div className="pilotage-row-next">
        <small>
          Prochaine action
        </small>

        <strong>
          {nextAction(item)}
        </strong>
      </div>


      {item.stage === "SUBMITTED"
        && item.submission && (
        <div className="pilotage-submission-info">
          <small>
            Soumission
          </small>

          <strong>
            Soumis le {
              new Intl.DateTimeFormat(
                "fr-FR",
                {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              ).format(
                new Date(
                  item.submission.submitted_at
                    .replace(" ", "T"),
                ),
              )
            }
          </strong>

          {item.submission
            .submission_reference && (
            <span>
              Réf. dépôt : {
                item.submission
                  .submission_reference
              }
            </span>
          )}
        </div>
      )}


      <div className="pilotage-row-action">
        {item.stage === "READY" && (
          <button
            type="button"
            className="pilotage-submit-button"
            disabled={submissionPending}
            onClick={onSubmit}
          >
            {submissionPending
              ? "Enregistrement…"
              : "Marquer comme soumis"}
          </button>
        )}

        {item.stage === "SUBMITTED" && (
          <button
            type="button"
            className="pilotage-cancel-submission"
            disabled={submissionPending}
            onClick={onCancelSubmission}
          >
            Annuler la soumission
          </button>
        )}

        <button
          type="button"
          onClick={onOpen}
          aria-label="Ouvrir"
        >
          Ouvrir
          <span>→</span>
        </button>
      </div>
    </article>
  )
}

export function PilotagePage() {
  const location =
    useLocation()

  const [activeStage, setActiveStage] =
    useState<
      "ACTIVE"
      | "IN_PREPARATION"
      | "BLOCKED"
      | "READY"
      | "SUBMITTED"
    >("ACTIVE")

  const [searchTerm, setSearchTerm] =
    useState("")

  const [sortMode, setSortMode] =
    useState<
      "deadline"
      | "buyer"
      | "title"
    >("deadline")

  const [priorityFilter, setPriorityFilter] =
    useState<
      "ALL"
      | "critical"
      | "high"
      | "watch"
      | "normal"
      | "overdue"
    >("ALL")

  const [buyerFilter, setBuyerFilter] =
    useState("ALL")

  const [categoryFilter, setCategoryFilter] =
    useState("ALL")

  const [locationFilter, setLocationFilter] =
    useState("ALL")

  const navigate =
    useNavigate()

  const queryClient =
    useQueryClient()


  const submitMutation =
    useMutation({
      mutationFn: (
        item: PilotageItem,
      ) => {
        const reference =
          window.prompt(
            "Référence ou numéro de dépôt (facultatif) :",
            "",
          )

        if (reference === null) {
          throw new Error(
            "SUBMISSION_CANCELLED",
          )
        }

        return markTenderSubmitted(
          item.ref_consultation,
          item.org_acronyme,
          {
            submission_reference:
              reference.trim()
              || null,
          },
        )
      },

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            "pilotage-overview",
          ],
        })

        await queryClient.invalidateQueries({
          queryKey: [
            "opportunities",
          ],
        })

        await queryClient.invalidateQueries({
          queryKey: [
            "opportunity",
          ],
        })
      },
    })


  const cancelSubmissionMutation =
    useMutation({
      mutationFn: (
        item: PilotageItem,
      ) =>
        cancelTenderSubmission(
          item.ref_consultation,
          item.org_acronyme,
        ),

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            "pilotage-overview",
          ],
        })
      },
    })


  const query =
    useQuery({
      queryKey: [
        "pilotage-overview",
      ],

      queryFn:
        getPilotageOverview,

      refetchInterval:
        60_000,
    })


  if (
    query.isError
    && isUnauthorized(
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
      <main className="pilotage-page">
        <div className="pilotage-loading">
          Chargement du pilotage…
        </div>
      </main>
    )
  }


  if (
    query.isError
    || !query.data
  ) {
    return (
      <main className="pilotage-page">
        <div className="pilotage-error">
          Impossible de charger le pilotage.
        </div>
      </main>
    )
  }


  const data =
    query.data.data

  const k =
    data.kpis

  const stages: {
    key:
      | "ACTIVE"
      | "IN_PREPARATION"
      | "BLOCKED"
      | "READY"
      | "SUBMITTED"
    label: string
    description: string
  }[] = [
    {
      key: "ACTIVE",
      label: "Suivi",
      description:
        "Appels d'offres conservés dans votre portefeuille actif.",
    },
    {
      key: "IN_PREPARATION",
      label: "En préparation",
      description:
        "Décision GO prise ou préparation opérationnelle démarrée.",
    },
    {
      key: "BLOCKED",
      label: "Bloqué",
      description:
        "Un blocage MOR ou une action impossible doit être traité.",
    },
    {
      key: "READY",
      label: "Prêt",
      description:
        "Préparation terminée, dossier à vérifier avant dépôt.",
    },
    {
      key: "SUBMITTED",
      label: "Soumissionné",
      description:
        "Offres effectivement déposées auprès de l'acheteur public.",
    },
  ]


  function itemsForStage(
    stage:
      | "ACTIVE"
      | "IN_PREPARATION"
      | "BLOCKED"
      | "READY"
      | "SUBMITTED",
  ): PilotageItem[] {
    if (stage === "IN_PREPARATION") {
      return [
        ...data.pipeline.GO,
        ...data.pipeline.IN_PREPARATION,
      ]
    }

    return data.pipeline[stage]
  }


  const allPipelineItems = [
    ...data.pipeline.ACTIVE,
    ...data.pipeline.GO,
    ...data.pipeline.IN_PREPARATION,
    ...data.pipeline.BLOCKED,
    ...data.pipeline.READY,
    ...data.pipeline.SUBMITTED,
  ]

  const buyers =
    Array.from(
      new Set(
        allPipelineItems
          .map((item) => item.buyer)
          .filter(
            (value): value is string =>
              Boolean(value),
          ),
      ),
    ).sort((a, b) =>
      a.localeCompare(b, "fr"),
    )

  const categories =
    Array.from(
      new Set(
        allPipelineItems
          .map((item) => item.category)
          .filter(
            (value): value is string =>
              Boolean(value),
          ),
      ),
    ).sort((a, b) =>
      a.localeCompare(b, "fr"),
    )

  const locations =
    Array.from(
      new Set(
        allPipelineItems
          .map((item) => item.location)
          .filter(
            (value): value is string =>
              Boolean(value),
          ),
      ),
    ).sort((a, b) =>
      a.localeCompare(b, "fr"),
    )


  const hasActiveFilters =
    Boolean(searchTerm.trim())
    || priorityFilter !== "ALL"
    || buyerFilter !== "ALL"
    || categoryFilter !== "ALL"
    || locationFilter !== "ALL"


  function resetFilters() {
    setSearchTerm("")
    setPriorityFilter("ALL")
    setBuyerFilter("ALL")
    setCategoryFilter("ALL")
    setLocationFilter("ALL")
    setSortMode("deadline")
  }


  function prepareItems(
    items: PilotageItem[],
  ) {
    const q =
      searchTerm
        .trim()
        .toLowerCase()

    const searched =
      q
        ? items.filter((item) => {
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

            return haystack.includes(q)
          })
        : items

    const byPriority =
      priorityFilter === "ALL"
        ? searched
        : searched.filter(
            (item) =>
              pilotagePriority(
                item,
              ).className
              === priorityFilter,
          )

    const byBuyer =
      buyerFilter === "ALL"
        ? byPriority
        : byPriority.filter(
            (item) =>
              item.buyer === buyerFilter,
          )

    const byCategory =
      categoryFilter === "ALL"
        ? byBuyer
        : byBuyer.filter(
            (item) =>
              item.category
              === categoryFilter,
          )

    const filtered =
      locationFilter === "ALL"
        ? byCategory
        : byCategory.filter(
            (item) =>
              item.location
              === locationFilter,
          )

    return [...filtered].sort(
      (a, b) => {
        if (sortMode === "buyer") {
          return (
            a.buyer || ""
          ).localeCompare(
            b.buyer || "",
            "fr",
          )
        }

        if (sortMode === "title") {
          return (
            a.title || ""
          ).localeCompare(
            b.title || "",
            "fr",
          )
        }

        const normalizeDate = (
          value?: string | null,
        ) => {
          if (!value) {
            return Number.MAX_SAFE_INTEGER
          }

          const timestamp =
            new Date(
              value.replace(" ", "T"),
            ).getTime()

          return Number.isNaN(timestamp)
            ? Number.MAX_SAFE_INTEGER
            : timestamp
        }

        return (
          normalizeDate(
            a.deadline_iso
            || a.deadline,
          )
          -
          normalizeDate(
            b.deadline_iso
            || b.deadline,
          )
        )
      },
    )
  }


  function openItem(
    item: PilotageItem,
  ) {
    if (
      item.decision === "GO"
      || item.stage === "GO"
      || item.stage === "IN_PREPARATION"
      || item.stage === "BLOCKED"
      || item.stage === "READY"
      || item.stage === "SUBMITTED"
    ) {
      navigate(
        `/dossiers/${encodeURIComponent(
          item.ref_consultation,
        )}/${encodeURIComponent(
          item.org_acronyme,
        )}`,
      )

      return
    }

    navigate(
      `/opportunities/${encodeURIComponent(
        item.ref_consultation,
      )}/${encodeURIComponent(
        item.org_acronyme,
      )}`,
    )
  }


  return (
    <main className="pilotage-page">
      <header className="pilotage-hero">
        <div>
          <span className="pilotage-eyebrow">
            COCKPIT OPÉRATIONNEL
          </span>

          <h1>
            Pilotage
          </h1>

          <p>
            Suivez les opportunités engagées,
            les dossiers en préparation,
            les blocages et les échéances
            depuis un seul écran.
          </p>
        </div>

        <div className="pilotage-total">
          <span>
            Portefeuille actif
          </span>

          <strong>
            {allPipelineItems.length}
          </strong>
        </div>
      </header>


      <section className="pilotage-readable-tabs">
        {stages.map((stage) => {
          const items =
            prepareItems(
              itemsForStage(stage.key),
            )

          return (
            <button
              key={stage.key}
              type="button"
              className={
                "pilotage-readable-tab "
                + (
                  activeStage === stage.key
                    ? "active "
                    : ""
                )
                + "stage-"
                + stage.key.toLowerCase()
                + (
                  items.length === 0
                    ? " empty"
                    : ""
                )
              }
              onClick={() =>
                setActiveStage(
                  stage.key
                )
              }
            >
              <span className="pilotage-tab-dot" />

              <span className="pilotage-tab-label">
                {stage.label}
              </span>

              <span className="pilotage-tab-count">
                {items.length}
              </span>
            </button>
          )
        })}
      </section>


      <section className="pilotage-list-toolbar">
        <div className="pilotage-search">
          <span>
            Rechercher
          </span>

          <input
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value,
              )
            }
            placeholder="Référence, objet, acheteur, ville…"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() =>
                setSearchTerm("")
              }
              aria-label="Effacer la recherche"
            >
              ×
            </button>
          )}
        </div>

        <div className="pilotage-business-filter">
          <span>
            Acheteur
          </span>

          <select
            value={buyerFilter}
            onChange={(event) =>
              setBuyerFilter(
                event.target.value,
              )
            }
          >
            <option value="ALL">
              Tous
            </option>

            {buyers.map((buyer) => (
              <option
                key={buyer}
                value={buyer}
              >
                {buyer}
              </option>
            ))}
          </select>
        </div>


        <div className="pilotage-business-filter">
          <span>
            Catégorie
          </span>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(
                event.target.value,
              )
            }
          >
            <option value="ALL">
              Toutes
            </option>

            {categories.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>
        </div>


        <div className="pilotage-business-filter">
          <span>
            Localisation
          </span>

          <select
            value={locationFilter}
            onChange={(event) =>
              setLocationFilter(
                event.target.value,
              )
            }
          >
            <option value="ALL">
              Toutes
            </option>

            {locations.map((location) => (
              <option
                key={location}
                value={location}
              >
                {location}
              </option>
            ))}
          </select>
        </div>


        <div className="pilotage-priority-filter">
          <span>
            Priorité
          </span>

          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(
                event.target.value as
                  | "ALL"
                  | "critical"
                  | "high"
                  | "watch"
                  | "normal"
                  | "overdue",
              )
            }
          >
            <option value="ALL">
              Toutes
            </option>

            <option value="critical">
              Critique
            </option>

            <option value="high">
              Haute
            </option>

            <option value="watch">
              À surveiller
            </option>

            <option value="normal">
              Normale
            </option>

            <option value="overdue">
              Hors délai
            </option>
          </select>
        </div>


        {hasActiveFilters && (
          <button
            type="button"
            className="pilotage-reset-filters"
            onClick={resetFilters}
          >
            Réinitialiser
          </button>
        )}


        <div className="pilotage-sort">
          <span>
            Trier par
          </span>

          <select
            value={sortMode}
            onChange={(event) =>
              setSortMode(
                event.target.value as
                  | "deadline"
                  | "buyer"
                  | "title",
              )
            }
          >
            <option value="deadline">
              Échéance
            </option>

            <option value="buyer">
              Acheteur
            </option>

            <option value="title">
              Intitulé
            </option>
          </select>
        </div>
      </section>


      {hasActiveFilters && (
        <section className="pilotage-active-filters">
          <span className="pilotage-active-filters-title">
            Filtres actifs
          </span>

          {searchTerm.trim() && (
            <button
              type="button"
              onClick={() =>
                setSearchTerm("")
              }
            >
              Recherche : {searchTerm.trim()}
              <strong>×</strong>
            </button>
          )}

          {priorityFilter !== "ALL" && (
            <button
              type="button"
              onClick={() =>
                setPriorityFilter("ALL")
              }
            >
              Priorité : {
                priorityFilterLabel(
                  priorityFilter,
                )
              }
              <strong>×</strong>
            </button>
          )}

          {buyerFilter !== "ALL" && (
            <button
              type="button"
              onClick={() =>
                setBuyerFilter("ALL")
              }
            >
              Acheteur : {buyerFilter}
              <strong>×</strong>
            </button>
          )}

          {categoryFilter !== "ALL" && (
            <button
              type="button"
              onClick={() =>
                setCategoryFilter("ALL")
              }
            >
              Catégorie : {categoryFilter}
              <strong>×</strong>
            </button>
          )}

          {locationFilter !== "ALL" && (
            <button
              type="button"
              onClick={() =>
                setLocationFilter("ALL")
              }
            >
              Localisation : {locationFilter}
              <strong>×</strong>
            </button>
          )}
        </section>
      )}


      <section className="pilotage-stage-panel">
        {stages
          .filter(
            (stage) =>
              stage.key === activeStage
          )
          .map((stage) => {
            const items =
              prepareItems(
                itemsForStage(stage.key),
              )

            return (
              <div key={stage.key}>
                <header className="pilotage-stage-header">
                  <div>
                    <span>
                      {stage.label}
                    </span>

                    <h2>
                      {stage.description}
                    </h2>
                  </div>

                  <div className="pilotage-stage-count">
                    <strong>
                      {items.length}
                    </strong>

                    <span>
                      résultat
                      {items.length > 1 ? "s" : ""}
                      {" "}visible
                      {items.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </header>

                {items.length > 0 && (
                  <div className="pilotage-list-head">
                    <span>Opportunité</span>
                    <span>Statut MOR</span>
                    <span>Priorité</span>
                    <span>Échéance</span>
                    <span>Préparation</span>
                    <span>Prochaine action</span>
                    <span />
                  </div>
                )}

                {items.length === 0 ? (
                  <div className="pilotage-stage-empty">
                    Aucun élément dans cette étape.
                  </div>
                ) : (
                  <div className="pilotage-stage-list">
                    {items.map(
                      (item) => (
                        <PilotageCard
                          key={
                            item.ref_consultation
                            + ":"
                            + item.org_acronyme
                          }
                          item={item}
                          onOpen={() =>
                            openItem(item)
                          }
                          submissionPending={
                            (
                              submitMutation.isPending
                              && submitMutation
                                .variables
                                ?.ref_consultation
                                === item.ref_consultation
                              && submitMutation
                                .variables
                                ?.org_acronyme
                                === item.org_acronyme
                            )
                            || (
                              cancelSubmissionMutation
                                .isPending
                              && cancelSubmissionMutation
                                .variables
                                ?.ref_consultation
                                === item.ref_consultation
                              && cancelSubmissionMutation
                                .variables
                                ?.org_acronyme
                                === item.org_acronyme
                            )
                          }
                          onSubmit={() => {
                            const confirmed =
                              window.confirm(
                                "Confirmer que cette offre a réellement été déposée ?",
                              )

                            if (confirmed) {
                              submitMutation.mutate(
                                item,
                              )
                            }
                          }}
                          onCancelSubmission={() => {
                            const confirmed =
                              window.confirm(
                                "Annuler le statut Soumissionné pour cette offre ?",
                              )

                            if (confirmed) {
                              cancelSubmissionMutation
                                .mutate(item)
                            }
                          }}
                        />
                      ),
                    )}
                  </div>
                )}
              </div>
            )
          })}
      </section>


      {(data.pipeline.EXPIRED.length > 0
        || k.no_go > 0
        || k.dismissed > 0) && (
        <section className="pilotage-history-summary">
          <div>
            <span>
              Hors portefeuille actif
            </span>

            <strong>
              {
                data.pipeline.EXPIRED.length
                + k.no_go
                + k.dismissed
              }
            </strong>
          </div>

          <p>
            {data.pipeline.EXPIRED.length} expiré
            {data.pipeline.EXPIRED.length > 1 ? "s" : ""}
            {" · "}
            {k.no_go} NO-GO
            {" · "}
            {k.dismissed} écarté
            {k.dismissed > 1 ? "s" : ""}
          </p>
        </section>
      )}
    </main>
  )
}
