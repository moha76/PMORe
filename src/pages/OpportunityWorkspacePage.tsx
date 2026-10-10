import {
  useEffect,
  useMemo,
  useRef,
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
  useParams,
} from "react-router-dom"

import {
  ApiError,
} from "../api/client"

import {
  getOpportunityDetail,
} from "../api/opportunities"

import {
  cancelTenderSubmission,
  deleteTenderOutcome,
  getPilotageOverview,
  markTenderSubmitted,
  updateTenderOutcome,
} from "../api/pilotage"

import {
  getDossierActions,
} from "../api/dossiers"

import type {
  MatchCheck,
  MatchStatus,
} from "../api/types"

import type {
  PilotageItem,
} from "../api/pilotage"

import {
  DossierActionControl,
} from "../components/dossiers/DossierActionControl"

import "./workspace/workspace.css"


function isUnauthorized(
  error: unknown,
) {
  return (
    error instanceof ApiError
    && error.status === 401
  )
}


function statusLabel(
  status: MatchStatus,
) {
  switch (status) {
    case "OK":
      return "Conforme"

    case "PARTIAL":
      return "Partiel"

    case "BLOCKING":
      return "Bloquant"

    case "VERIFY":
      return "À vérifier"

    case "NOT_APPLICABLE":
      return "Non applicable"

    default:
      return "Inconnu"
  }
}


function decisionLabel(
  decision: string,
) {
  switch (
    decision
      .toUpperCase()
  ) {
    case "GO":
      return "GO"

    case "NO_GO":
    case "NO-GO":
      return "NO-GO"

    case "WATCHING":
      return "À surveiller"

    case "DISMISSED":
      return "Archivé"

    default:
      return "À décider"
  }
}


function deadlineInfo(
  raw?: string | null,
) {
  if (!raw) {
    return {
      label:
        "Échéance inconnue",
      days: null,
      className: "unknown",
    }
  }

  const date =
    new Date(
      raw.replace(
        " ",
        "T",
      ),
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return {
      label: raw,
      days: null,
      className: "unknown",
    }
  }

  const now =
    new Date()

  const days =
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

  if (days < 0) {
    return {
      label:
        `Échue depuis ${Math.abs(days)} j`,
      days,
      className: "expired",
    }
  }

  if (days === 0) {
    return {
      label:
        "Aujourd’hui",
      days,
      className: "critical",
    }
  }

  if (days === 1) {
    return {
      label:
        "Demain",
      days,
      className: "critical",
    }
  }

  return {
    label:
      `J-${days}`,
    days,
    className:
      days <= 3
        ? "critical"
        : days <= 7
          ? "warning"
          : "normal",
  }
}


function preparationPercent(
  item:
    PilotageItem
    | null,
) {
  if (
    !item
    || item.action_count <= 0
  ) {
    return null
  }

  return Math.round(
    item.ready_actions
    * 100
    / item.action_count,
  )
}


function nextAction(
  item:
    PilotageItem
    | null,
  decision: string,
) {
  if (!item) {
    if (
      decision
        .toUpperCase()
      === "GO"
    ) {
      return (
        "Démarrer la préparation"
      )
    }

    return (
      "Terminer l’étude et prendre une décision"
    )
  }

  switch (item.stage) {
    case "ACTIVE":
      return (
        "Étudier et décider GO / NO-GO"
      )

    case "GO":
      return (
        "Démarrer la préparation"
      )

    case "IN_PREPARATION":
      return item.pending_actions > 0
        ? `${item.pending_actions} action${
            item.pending_actions > 1
              ? "s"
              : ""
          } restante${
            item.pending_actions > 1
              ? "s"
              : ""
          }`
        : "Continuer la préparation"

    case "BLOCKED":
      return (
        "Lever les blocages du dossier"
      )

    case "READY":
      return (
        "Dossier prêt : procéder à la soumission"
      )

    case "SUBMITTED":
      return (
        "Suivre le résultat de la soumission"
      )

    case "WON":
      return "Marché gagné"

    case "LOST":
      return "Marché perdu"

    case "CANCELLED":
      return "Marché annulé"

    case "EXPIRED":
      return (
        "Enregistrer le résultat du marché"
      )

    default:
      return "Consulter le dossier"
  }
}


function currentStageLabel(
  item:
    PilotageItem
    | null,
  decision: string,
) {
  if (!item) {
    return decision
      .toUpperCase()
      === "GO"
        ? "Préparation"
        : "Étude"
  }

  switch (item.stage) {
    case "ACTIVE":
      return "À étudier"

    case "GO":
      return "GO · Préparation"

    case "IN_PREPARATION":
      return "En préparation"

    case "BLOCKED":
      return "Dossier bloqué"

    case "READY":
      return "Prêt à soumettre"

    case "SUBMITTED":
      return "Soumis · En suivi"

    case "WON":
      return "Marché gagné"

    case "LOST":
      return "Marché perdu"

    case "CANCELLED":
      return "Marché annulé"

    case "EXPIRED":
      return "Échéance dépassée"

    default:
      return "Dossier suivi"
  }
}


function workflowIndex(
  item:
    PilotageItem
    | null,
  decision: string,
) {
  if (!item) {
    return decision
      .toUpperCase()
      === "GO"
        ? 1
        : 0
  }

  switch (item.stage) {
    case "ACTIVE":
      return 0

    case "GO":
    case "IN_PREPARATION":
    case "BLOCKED":
      return 1

    case "READY":
      return 2

    case "SUBMITTED":
    case "WON":
    case "LOST":
    case "CANCELLED":
      return 3

    case "EXPIRED":
      return 3

    default:
      return 0
  }
}


function checkText(
  check: MatchCheck,
) {
  return (
    check.user_view
      ?.explanation
    || check.detail
    || check.label
    || check.code
    || "Contrôle MOR"
  )
}



function CheckDecisionSummary({
  check,
}: {
  check: MatchCheck
}) {
  const requirement =
    check.user_view
      ?.ao_requirement != null
      ? String(
          check.user_view
            .ao_requirement,
        )
      : ""

  const companyState =
    check.user_view
      ?.company_state != null
      ? String(
          check.user_view
            .company_state,
        )
      : ""

  const gap =
    check.user_view
      ?.gap != null
      ? String(
          check.user_view
            .gap,
        )
      : ""

  const hasBusinessView =
    Boolean(
      requirement
      || companyState
      || gap,
    )

  if (!hasBusinessView) {
    return (
      <p className="ao-check-summary-fallback">
        {checkText(check)}
      </p>
    )
  }

  return (
    <div className="ao-check-business-summary">

      {requirement && (
        <div>
          <small>
            AO
          </small>

          <p>
            {requirement}
          </p>
        </div>
      )}

      {companyState && (
        <div>
          <small>
            ENTREPRISE
          </small>

          <p>
            {companyState}
          </p>
        </div>
      )}

      {gap && (
        <div className="conclusion">
          <small>
            CONCLUSION
          </small>

          <strong>
            {gap}
          </strong>
        </div>
      )}

    </div>
  )
}


export function OpportunityWorkspacePage() {
  const location =
    useLocation()

  const navigate =
    useNavigate()

  const queryClient =
    useQueryClient()

  const [
    submissionReference,
    setSubmissionReference,
  ] = useState("")

  const [
    submissionNotes,
    setSubmissionNotes,
  ] = useState("")

  const [
    outcomeChoice,
    setOutcomeChoice,
  ] = useState<
    "WON" | "LOST" | "CANCELLED"
  >("WON")

  const [
    outcomeDate,
    setOutcomeDate,
  ] = useState("")

  const [
    outcomeAmount,
    setOutcomeAmount,
  ] = useState("")

  const [
    outcomeWinner,
    setOutcomeWinner,
  ] = useState("")

  const [
    outcomeLossReason,
    setOutcomeLossReason,
  ] = useState("")

  const [
    outcomeNotes,
    setOutcomeNotes,
  ] = useState("")

  const [
    focusedSection,
    setFocusedSection,
  ] = useState<
    | "decision"
    | "preparation"
    | "submission"
    | "outcome"
    | null
  >(null)


  const decisionRef =
    useRef<HTMLDivElement>(
      null,
    )

  const preparationRef =
    useRef<HTMLElement>(
      null,
    )

  const submissionRef =
    useRef<HTMLElement>(
      null,
    )

  const outcomeRef =
    useRef<HTMLElement>(
      null,
    )


  const {
    refConsultation,
    orgAcronyme,
  } = useParams()


  const detailQuery =
    useQuery({
      queryKey: [
        "opportunity",
        refConsultation,
        orgAcronyme,
      ],

      enabled:
        Boolean(
          refConsultation
          && orgAcronyme,
        ),

      queryFn: () =>
        getOpportunityDetail(
          refConsultation!,
          orgAcronyme!,
        ),
    })


  const pilotageQuery =
    useQuery({
      queryKey: [
        "pilotage-overview",
      ],

      queryFn:
        getPilotageOverview,

      staleTime:
        30 * 1000,
    })


  const submittedInPilotage = (() => {
    const data =
      pilotageQuery.data?.data

    if (!data) {
      return false
    }

    const items = [
      ...Object.values(
        data.pipeline,
      ).flat(),
      ...data.history,
    ]

    return items.some(
      (item) =>
        item.ref_consultation
          === refConsultation
        && item.org_acronyme
          === orgAcronyme
        && Boolean(
          item.submission,
        ),
    )
  })()


  const actionsQuery =
    useQuery({
      queryKey: [
        "dossier-actions",
        refConsultation,
        orgAcronyme,
      ],

      enabled:
        Boolean(
          refConsultation
          && orgAcronyme
          && pilotageQuery.isSuccess
          && !submittedInPilotage
        ),

      queryFn: () =>
        getDossierActions(
          refConsultation!,
          orgAcronyme!,
        ),

      retry:
        false,
    })


  const submitMutation =
    useMutation({
      mutationFn: () =>
        markTenderSubmitted(
          refConsultation!,
          orgAcronyme!,
          {
            submission_reference:
              submissionReference.trim()
                || null,

            submission_notes:
              submissionNotes.trim()
                || null,
          },
        ),

      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              "pilotage-overview",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "dossiers",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "today-opportunities",
            ],
          }),
        ])

        setFocusedSection(
          "outcome",
        )

        window.setTimeout(
          () => {
            outcomeRef.current
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
          },
          80,
        )
      },
    })


  const cancelSubmissionMutation =
    useMutation({
      mutationFn: () =>
        cancelTenderSubmission(
          refConsultation!,
          orgAcronyme!,
        ),

      onSuccess: async () => {
        setSubmissionReference("")
        setSubmissionNotes("")

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              "pilotage-overview",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "dossiers",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "today-opportunities",
            ],
          }),
        ])
      },
    })


  const outcomeMutation =
    useMutation({
      mutationFn: () =>
        updateTenderOutcome(
          refConsultation!,
          orgAcronyme!,
          {
            outcome:
              outcomeChoice,

            result_date:
              outcomeDate || null,

            awarded_amount:
              outcomeChoice === "WON"
              && outcomeAmount
                ? Number(outcomeAmount)
                : null,

            winner_name:
              outcomeChoice === "LOST"
                ? outcomeWinner.trim()
                  || null
                : null,

            loss_reason:
              outcomeChoice === "LOST"
                ? outcomeLossReason.trim()
                  || null
                : null,

            notes:
              outcomeNotes.trim()
                || null,
          },
        ),

      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              "pilotage-overview",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "today-opportunities",
            ],
          }),
        ])
      },
    })


  const deleteOutcomeMutation =
    useMutation({
      mutationFn: () =>
        deleteTenderOutcome(
          refConsultation!,
          orgAcronyme!,
        ),

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            "pilotage-overview",
          ],
        })
      },
    })


  const opportunity =
    detailQuery.data?.data


  const pilotageItem =
    useMemo(() => {
      const data =
        pilotageQuery
          .data?.data

      if (
        !data
        || !refConsultation
        || !orgAcronyme
      ) {
        return null
      }

      const all =
        [
          ...Object.values(
            data.pipeline,
          ).flat(),
          ...data.history,
        ]

      return (
        all.find(
          (item) =>
            item.ref_consultation
              === refConsultation
            && item.org_acronyme
              === orgAcronyme,
        )
        ?? null
      )
    }, [
      pilotageQuery.data,
      refConsultation,
      orgAcronyme,
    ])


  useEffect(() => {
    const shouldFocus =
      Boolean(
        (
          location.state as
            | {
                focusWorkflow?: boolean
              }
            | null
        )?.focusWorkflow,
      )

    if (
      !shouldFocus
      || !pilotageItem
    ) {
      return
    }

    let target:
      HTMLElement
      | HTMLDivElement
      | null = null

    let section:
      | "decision"
      | "preparation"
      | "submission"
      | "outcome"
      | null = null

    switch (pilotageItem.stage) {
      case "ACTIVE":
        target =
          decisionRef.current
        section =
          "decision"
        break

      case "GO":
      case "IN_PREPARATION":
      case "BLOCKED":
        target =
          preparationRef.current
        section =
          "preparation"
        break

      case "READY":
        target =
          submissionRef.current
        section =
          "submission"
        break

      case "SUBMITTED":
      case "WON":
      case "LOST":
      case "CANCELLED":
      case "EXPIRED":
        target =
          outcomeRef.current
          || submissionRef.current

        section =
          outcomeRef.current
            ? "outcome"
            : "submission"
        break
    }

    if (
      !target
      || !section
    ) {
      return
    }

    setFocusedSection(
      section,
    )

    window.requestAnimationFrame(
      () => {
        target?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      },
    )

    const timer =
      window.setTimeout(
        () => {
          setFocusedSection(
            null,
          )
        },
        3500,
      )

    return () => {
      window.clearTimeout(
        timer,
      )
    }
  }, [
    location.state,
    pilotageItem,
  ])


  const allChecks =
    useMemo(() => {
      if (!opportunity) {
        return []
      }

      return opportunity
        .matching
        .lots
        .flatMap(
          (lot) =>
            lot.checks,
        )
    }, [opportunity])


  const workspaceChecks =
    useMemo(() => {
      if (!opportunity) {
        return []
      }

      return opportunity
        .matching
        .lots
        .flatMap(
          (lot) =>
            lot.checks.map(
              (check) => ({
                check,
                lotNumber:
                  lot.lot_number
                  ?? null,
                lotTitle:
                  lot.lot_title
                  ?? null,
              }),
            ),
        )
    }, [opportunity])


  const blockingChecks =
    useMemo(
      () =>
        allChecks.filter(
          (check) =>
            check.status
              === "BLOCKING",
        ),
      [allChecks],
    )


  const verifyChecks =
    useMemo(
      () =>
        allChecks.filter(
          (check) =>
            check.status
              === "VERIFY"
            || check.status
              === "UNKNOWN",
        ),
      [allChecks],
    )


  const okChecks =
    useMemo(
      () =>
        allChecks.filter(
          (check) =>
            check.status
              === "OK",
        ),
      [allChecks],
    )


  const humanPreparation =
    useMemo(() => {
      const actions =
        actionsQuery.data?.data
        ?? []

      const actionable =
        workspaceChecks.filter(
          ({ check }) =>
            check.status
              !== "NOT_APPLICABLE"
            && Boolean(
              String(
                check.code || ""
              ).trim(),
            ),
        )

      let pending = 0
      let inProgress = 0
      let ready = 0
      let impossible = 0

      for (
        const {
          check,
          lotNumber,
        } of actionable
      ) {
        const requirementType =
          String(
            check.code || ""
          )
            .trim()
            .toUpperCase()

        const action =
          actions.find(
            (item) => {
              const sameRequirement =
                item.requirement_type
                  .trim()
                  .toUpperCase()
                === requirementType

              const left =
                item.lot_number == null
                || item.lot_number === ""
                  ? null
                  : String(
                      item.lot_number,
                    )

              const right =
                lotNumber == null
                || lotNumber === ""
                  ? null
                  : String(
                      lotNumber,
                    )

              return (
                sameRequirement
                && left === right
              )
            },
          )

        const status =
          action?.status
          ?? "PENDING"

        if (status === "READY") {
          ready += 1
        } else if (
          status === "IN_PROGRESS"
        ) {
          inProgress += 1
        } else if (
          status === "IMPOSSIBLE"
        ) {
          impossible += 1
        } else {
          pending += 1
        }
      }

      const total =
        actionable.length

      const percent =
        total > 0
          ? Math.round(
              ready
              * 100
              / total,
            )
          : 0

      return {
        total,
        pending,
        inProgress,
        ready,
        impossible,
        percent,
      }
    }, [
      actionsQuery.data,
      workspaceChecks,
    ])


  if (
    isUnauthorized(
      detailQuery.error,
    )
    || isUnauthorized(
      pilotageQuery.error,
    )
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    )
  }


  if (detailQuery.isLoading) {
    return (
      <main className="ao-workspace">
        <div className="ao-workspace-state">
          Chargement du marché…
        </div>
      </main>
    )
  }


  if (
    detailQuery.isError
    || !opportunity
  ) {
    return (
      <main className="ao-workspace">
        <div className="ao-workspace-state error">
          Impossible de charger ce marché.
        </div>
      </main>
    )
  }


  const {
    identity,
    matching,
    decision,
    financial_summary:
      financial,
  } = opportunity


  const deadline =
    deadlineInfo(
      opportunity
        .deadline.iso
      || opportunity
        .deadline.raw,
    )


  const preparation =
    humanPreparation.total > 0
      ? humanPreparation.percent
      : preparationPercent(
          pilotageItem,
        )


  const currentWorkflow =
    workflowIndex(
      pilotageItem,
      decision.human_decision,
    )


  const workflow = [
    {
      label: "Étude",
      description:
        "Comprendre et décider",
    },
    {
      label: "Préparation",
      description:
        "Construire le dossier",
    },
    {
      label: "Soumission",
      description:
        "Déposer l’offre",
    },
    {
      label: "Suivi",
      description:
        "Résultat du marché",
    },
  ]


  const openPreparation = () => {
    navigate(
      `/dossiers/${encodeURIComponent(
        identity
          .ref_consultation,
      )}/${encodeURIComponent(
        identity
          .org_acronyme,
      )}`,
    )
  }


  const currentStage =
    currentStageLabel(
      pilotageItem,
      decision.human_decision,
    )


  const currentAction =
    nextAction(
      pilotageItem,
      decision.human_decision,
    )


  const focusCurrentAction = () => {
    let target:
      HTMLElement
      | HTMLDivElement
      | null = null

    if (!pilotageItem) {
      target =
        decision.human_decision
          .toUpperCase()
          === "GO"
          ? preparationRef.current
          : decisionRef.current
    } else {
      switch (pilotageItem.stage) {
        case "ACTIVE":
          target =
            decisionRef.current
          break

        case "GO":
        case "IN_PREPARATION":
        case "BLOCKED":
          target =
            preparationRef.current
          break

        case "READY":
          target =
            submissionRef.current
          break

        case "SUBMITTED":
        case "WON":
        case "LOST":
        case "CANCELLED":
        case "EXPIRED":
          target =
            outcomeRef.current
            || submissionRef.current
          break
      }
    }

    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }


  return (
    <main className="ao-workspace">

      <button
        type="button"
        className="ao-workspace-back"
        onClick={() =>
          navigate("/next")
        }
      >
        ← Retour au cockpit
      </button>


      <header className="ao-workspace-hero">

        <div className="ao-workspace-title">

          <div className="ao-workspace-reference">
            {
              identity.reference
              || `AO ${identity.ref_consultation}`
            }
          </div>

          <h1>
            {
              identity.title
              || "Appel d’offres"
            }
          </h1>

          <p>
            {
              identity.buyer
              || "Acheteur non renseigné"
            }
          </p>


          <div className="ao-workspace-tags">

            {identity.category && (
              <span>
                {identity.category}
              </span>
            )}

            {identity.location && (
              <span>
                {identity.location}
              </span>
            )}

            {identity.procedure && (
              <span>
                {identity.procedure}
              </span>
            )}

          </div>

        </div>


        <div
          ref={decisionRef}
          className={
            `ao-workspace-decision ${
              focusedSection === "decision"
                ? "workflow-focus"
                : ""
            }`
          }
        >

          <span>
            DÉCISION
          </span>

          <strong>
            {
              decisionLabel(
                decision
                  .human_decision,
              )
            }
          </strong>

          {decision.reason && (
            <small>
              {decision.reason}
            </small>
          )}

        </div>

      </header>


      <section
        className={
          `ao-workspace-actionbar ${
            pilotageItem
              ? `stage-${pilotageItem.stage.toLowerCase()}`
              : "stage-study"
          }`
        }
      >

        <div className="ao-workspace-actionbar-stage">

          <span>
            ÉTAPE ACTUELLE
          </span>

          <strong>
            {currentStage}
          </strong>

        </div>


        <div className="ao-workspace-actionbar-next">

          <span>
            PROCHAINE ACTION
          </span>

          <strong>
            {currentAction}
          </strong>

          {pilotageItem?.stage === "BLOCKED"
            && pilotageItem.impossible_actions > 0
            && (
              <small className="danger">
                {
                  pilotageItem.impossible_actions
                } blocage{
                  pilotageItem.impossible_actions > 1
                    ? "s"
                    : ""
                } à traiter
              </small>
            )}

          {pilotageItem?.stage === "IN_PREPARATION"
            && pilotageItem.pending_actions > 0
            && (
              <small>
                {
                  pilotageItem.pending_actions
                } action{
                  pilotageItem.pending_actions > 1
                    ? "s"
                    : ""
                } restante{
                  pilotageItem.pending_actions > 1
                    ? "s"
                    : ""
                }
              </small>
            )}

        </div>


        <button
          type="button"
          className="ao-workspace-actionbar-button"
          onClick={
            focusCurrentAction
          }
        >
          {
            pilotageItem?.stage === "READY"
              ? "Aller à la soumission"
              : pilotageItem?.stage === "SUBMITTED"
                ? "Suivre le résultat"
                : pilotageItem?.stage === "BLOCKED"
                  ? "Traiter les blocages"
                  : pilotageItem?.stage === "IN_PREPARATION"
                    || pilotageItem?.stage === "GO"
                    ? "Continuer la préparation"
                    : pilotageItem?.stage === "WON"
                      || pilotageItem?.stage === "LOST"
                      || pilotageItem?.stage === "CANCELLED"
                      ? "Voir le résultat"
                      : "Continuer"
          }

          <span>
            →
          </span>
        </button>

      </section>


      <section className="ao-workspace-kpis">

        <article>
          <span>
            MATCHING MOR
          </span>

          <strong
            className={
              blockingChecks.length > 0
                ? "match-blocking"
                : verifyChecks.length > 0
                  ? "match-verify"
                  : "match-ok"
            }
          >
            {
              blockingChecks.length > 0
                ? "À écarter"
                : verifyChecks.length > 0
                  ? "À surveiller"
                  : "Conforme"
            }
          </strong>

          <small>
            {matching.summary
              ?.ok_count
              ?? 0} conforme
            {" · "}
            {matching.summary
              ?.verify_count
              ?? 0} à vérifier
          </small>
        </article>


        <article>
          <span>
            ÉCHÉANCE
          </span>

          <strong
            className={
              deadline.className
            }
          >
            {deadline.label}
          </strong>

          <small>
            {
              opportunity
                .deadline.raw
              || "Date non renseignée"
            }
          </small>
        </article>


        <article>
          <span>
            PRÉPARATION
          </span>

          <strong>
            {
              preparation !== null
                ? `${preparation}%`
                : "—"
            }
          </strong>

          <small>
            {pilotageItem
              ? `${pilotageItem.ready_actions}/${pilotageItem.action_count} actions prêtes`
              : "Pas encore démarrée"}
          </small>
        </article>


        <article>
          <span>
            BLOCAGES
          </span>

          <strong
            className={
              blockingChecks.length > 0
                ? "critical"
                : "success"
            }
          >
            {blockingChecks.length}
          </strong>

          <small>
            {
              blockingChecks.length > 0
                ? "À résoudre avant soumission"
                : "Aucun blocage identifié"
            }
          </small>
        </article>

      </section>


      <section className="ao-workspace-flow">

        {workflow.map(
          (
            step,
            index,
          ) => (
            <div
              key={step.label}
              className={
                "ao-flow-step "
                + (
                  index
                    < currentWorkflow
                    ? "done"
                    : index
                      === currentWorkflow
                      ? "active"
                      : ""
                )
              }
            >

              <div className="ao-flow-number">
                {index + 1}
              </div>

              <div>
                <strong>
                  {step.label}
                </strong>

                <span>
                  {step.description}
                </span>
              </div>

              {index
                < workflow.length
                  - 1 && (
                  <div className="ao-flow-line" />
                )}

            </div>
          ),
        )}

      </section>


      <section className="ao-workspace-action">

        <div>
          <span>
            PROCHAINE ACTION
          </span>

          <h2>
            {
              nextAction(
                pilotageItem,
                decision
                  .human_decision,
              )
            }
          </h2>

          <p>
            MOR vous présente ici
            l’action qui permet de faire
            avancer ce marché dans
            le circuit.
          </p>
        </div>


        {currentWorkflow <= 1 && (
          <button
            type="button"
            onClick={
              openPreparation
            }
          >
            Ouvrir la préparation
            <span>
              →
            </span>
          </button>
        )}


        {currentWorkflow === 2 && (
          <button
            type="button"
            onClick={() =>
              navigate(
                "/pilotage",
              )
            }
          >
            Préparer la soumission
            <span>
              →
            </span>
          </button>
        )}


        {currentWorkflow >= 3 && (
          <button
            type="button"
            onClick={() =>
              navigate(
                "/pilotage",
              )
            }
          >
            Suivre le marché
            <span>
              →
            </span>
          </button>
        )}

      </section>


            <section className="ao-v34-layout">

        <div className="ao-v34-primary">

<section
        ref={preparationRef}
        className={
          `ao-preparation ${
            focusedSection === "preparation"
              ? "workflow-focus"
              : ""
          }`
        }
      >

        <header className="ao-preparation-head">
          <div>
            <span>
              ANALYSE MOR
            </span>

            <h2>
              Analyse des critères MOR
            </h2>

            <p>
              Comparez les exigences de l’AO avec
              la situation réelle de votre entreprise.
            </p>
          </div>

          <div className="ao-preparation-progress">

            <strong>
              {
                preparation !== null
                  ? `${preparation}%`
                  : "—"
              }
            </strong>

            <span>
              avancement
            </span>

          </div>
        </header>


        <div className="ao-preparation-stats">

          <article className="danger">
            <strong>
              {blockingChecks.length}
            </strong>

            <span>
              Bloquants
            </span>
          </article>


          <article className="warning">
            <strong>
              {verifyChecks.length}
            </strong>

            <span>
              À traiter
            </span>
          </article>


          <article className="success">
            <strong>
              {okChecks.length}
            </strong>

            <span>
              Conformes
            </span>
          </article>


          <article>
            <strong>
              {
                humanPreparation.pending
                + humanPreparation.inProgress
              }
            </strong>

            <span>
              Actions restantes
            </span>
          </article>

        </div>


        <div className="ao-preparation-list">

          {workspaceChecks
            .filter(
              ({ check }) =>
                check.status
                !== "NOT_APPLICABLE",
            )
            .sort(
              (a, b) => {
                const rank = {
                  BLOCKING: 0,
                  VERIFY: 1,
                  UNKNOWN: 2,
                  PARTIAL: 3,
                  OK: 4,
                  NOT_APPLICABLE: 5,
                }

                return (
                  rank[a.check.status]
                  - rank[b.check.status]
                )
              },
            )
            .map(
              (
                {
                  check,
                  lotNumber,
                  lotTitle,
                },
                index,
              ) => {

                const aoRequirement =
                  check.user_view
                    ?.ao_requirement != null
                    ? String(
                        check.user_view
                          .ao_requirement,
                      )
                    : ""

                const companyState =
                  check.user_view
                    ?.company_state != null
                    ? String(
                        check.user_view
                          .company_state,
                      )
                    : ""

                const gap =
                  check.user_view
                    ?.gap != null
                    ? String(
                        check.user_view
                          .gap,
                      )
                    : ""

                const action =
                  check.user_view
                    ?.action != null
                    ? String(
                        check.user_view
                          .action,
                      )
                    : ""

                const impact =
                  check.user_view
                    ?.impact != null
                    ? String(
                        check.user_view
                          .impact,
                      )
                    : check.impact != null
                      ? String(
                          check.impact,
                        )
                      : ""

                return (
                  <article
                    className={
                      `ao-preparation-row status-${check.status.toLowerCase()}`
                    }
                    key={
                      `${check.code || "check"}-${index}`
                    }
                  >

                    <div className="ao-preparation-status">

                      <span>
                        {
                          check.status
                            === "OK"
                            ? "✓"
                            : check.status
                              === "BLOCKING"
                              ? "!"
                              : "?"
                        }
                      </span>

                    </div>


                    <div className="ao-preparation-content">

                      <div className="ao-preparation-title">

                        <strong>
                          {
                            check.label
                            || check.code
                            || "Exigence"
                          }
                        </strong>

                        <span>
                          {
                            statusLabel(
                              check.status,
                            )
                          }
                        </span>

                      </div>


                      {lotNumber && (
                        <div className="ao-preparation-lot">
                          Lot {lotNumber}
                          {lotTitle
                            ? ` · ${lotTitle}`
                            : ""}
                        </div>
                      )}

                      <div className="ao-business-comparison">

                        {aoRequirement && (
                          <div className="ao-business-comparison-block requirement">
                            <small>
                              EXIGENCE DE L'AO
                            </small>

                            <p>
                              {String(aoRequirement)}
                            </p>
                          </div>
                        )}


                        {companyState && (
                          <div className="ao-business-comparison-block company">
                            <small>
                              VOTRE ENTREPRISE
                            </small>

                            <p>
                              {String(companyState)}
                            </p>
                          </div>
                        )}


                        {gap && (
                          <div className="ao-business-comparison-block conclusion">
                            <small>
                              CONCLUSION / ÉCART
                            </small>

                            <strong>
                              {String(gap)}
                            </strong>
                          </div>
                        )}


                        {action && (
                          <div className="ao-business-comparison-block action">
                            <small>
                              ACTION À FAIRE
                            </small>

                            <strong>
                              {String(action)}
                            </strong>
                          </div>
                        )}


                        {impact && (
                          <div className="ao-business-comparison-block impact">
                            <small>
                              IMPACT SUR LA DÉCISION
                            </small>

                            <p>
                              {String(impact)}
                            </p>
                          </div>
                        )}

                      </div>


                      {!aoRequirement
                        && !companyState
                        && !gap
                        && checkText(check) && (
                        <p>
                          {
                            checkText(
                              check,
                            )
                          }
                        </p>
                      )}

                    </div>


                    <div className="ao-workspace-action-control">

                      {submittedInPilotage ? (
                        <div className="ao-preparation-readonly">
                          <span>✓</span>

                          <div>
                            <strong>
                              Préparation clôturée
                            </strong>

                            <small>
                              Offre déjà soumise ·
                              checklist en lecture seule
                            </small>
                          </div>
                        </div>
                      ) : decision.human_decision === "GO"
                        && pilotageQuery.isSuccess ? (
                        <DossierActionControl
                          check={check}
                          lotNumber={lotNumber}
                        />
                      ) : null}

                    </div>

                  </article>
                )
              },
            )}

          {workspaceChecks.length === 0 && (
            <div className="ao-preparation-empty">
              Aucune exigence de préparation
              disponible pour ce marché.
            </div>
          )}

        </div>


        <footer className="ao-preparation-footer">

          <div>
            <strong>
              Objectif
            </strong>

            <span>
              Lever tous les blocages
              avant la soumission.
            </span>
          </div>

          <button
            type="button"
            onClick={
              openPreparation
            }
          >
            Ouvrir la checklist complète
          </button>

        </footer>

      </section>

        </div>


        <aside className="ao-v34-rail">

<section className="ao-workspace-grid">

        <div className="ao-workspace-panel">

          <header>
            <div>
              <span>
                DÉCISION
              </span>

              <h2>
                Pourquoi ce marché ?
              </h2>
            </div>

            <small>
              Analyse MOR
            </small>
          </header>


          <div className="ao-decision-groups">

            {blockingChecks.length > 0 && (
              <div className="ao-decision-group blocking">

                <h3>
                  Blocages
                  <b>
                    {blockingChecks.length}
                  </b>
                </h3>

                {blockingChecks
                  .slice(0, 6)
                  .map(
                    (
                      check,
                      index,
                    ) => (
                      <div
                        className="ao-check"
                        key={
                          `${check.code}-${index}`
                        }
                      >
                        <span>
                          !
                        </span>

                        <div>
                          <strong>
                            {
                              check.label
                              || check.code
                              || "Blocage"
                            }
                          </strong>

                          <CheckDecisionSummary
                            check={check}
                          />
                        </div>
                      </div>
                    ),
                  )}

              </div>
            )}


            {verifyChecks.length > 0 && (
              <div className="ao-decision-group verify">

                <h3>
                  À vérifier
                  <b>
                    {verifyChecks.length}
                  </b>
                </h3>

                {verifyChecks
                  .slice(0, 6)
                  .map(
                    (
                      check,
                      index,
                    ) => (
                      <div
                        className="ao-check"
                        key={
                          `${check.code}-${index}`
                        }
                      >
                        <span>
                          ?
                        </span>

                        <div>
                          <strong>
                            {
                              check.label
                              || check.code
                              || "Vérification"
                            }
                          </strong>

                          <CheckDecisionSummary
                            check={check}
                          />
                        </div>
                      </div>
                    ),
                  )}

              </div>
            )}


            <div className="ao-decision-group success">

              <h3>
                Points conformes
                <b>
                  {okChecks.length}
                </b>
              </h3>

              {okChecks
                .slice(0, 6)
                .map(
                  (
                    check,
                    index,
                  ) => (
                    <div
                      className="ao-check"
                      key={
                        `${check.code}-${index}`
                      }
                    >
                      <span>
                        ✓
                      </span>

                      <div>
                        <strong>
                          {
                            check.label
                            || check.code
                            || "Conforme"
                          }
                        </strong>

                        <CheckDecisionSummary
                          check={check}
                        />
                      </div>

                    </div>
                  ),
                )}

            </div>

          </div>

        </div>


        <aside className="ao-workspace-panel ao-summary-panel">

          <header>
            <div>
              <span>
                SYNTHÈSE MOR
              </span>

              <h2>
                Décision en un coup d’œil
              </h2>
            </div>

            <strong
              className={
                blockingChecks.length > 0
                  ? "match-blocking"
                  : verifyChecks.length > 0
                    ? "match-verify"
                    : "match-ok"
              }
            >
              {
                blockingChecks.length > 0
                  ? "À écarter"
                  : verifyChecks.length > 0
                    ? "À surveiller"
                    : "Conforme"
              }
            </strong>
          </header>


          {(() => {

            const allChecks = [
              ...blockingChecks,
              ...verifyChecks,
              ...okChecks,
            ]

            const checkByCode = (
              code: string,
            ) =>
              allChecks.find(
                (check) =>
                  check.code === code,
              )

            const financeCheck =
              checkByCode(
                "ESTIMATION_CAPACITY",
              )

            const cautionCheck =
              checkByCode(
                "CAUTION",
              )

            const referencesCheck =
              checkByCode(
                "SIMILAR_REFERENCES",
              )

            const personnelCheck =
              checkByCode(
                "PERSONNEL_MINIMUM",
              )

            const viewText = (
              check:
                MatchCheck
                | undefined,
              field:
                "ao_requirement"
                | "company_state"
                | "gap",
            ) => {
              const value =
                check?.user_view?.[field]

              return value != null
                ? String(value)
                : ""
            }

            const decisionText = (
              check: MatchCheck,
            ) => {
              const gap =
                check.user_view?.gap != null
                  ? String(
                      check.user_view.gap,
                    ).trim()
                  : ""

              const label =
                String(
                  check.label
                  || check.code
                  || "Critère",
                ).trim()

              if (
                gap
                && gap.length <= 150
              ) {
                return gap
              }

              return label
            }

            const priorityItems = (
              checks: MatchCheck[],
              limit = 3,
            ) =>
              checks
                .slice(0, limit)
                .map(decisionText)
                .filter(Boolean)

            const joinPriorities = (
              items: string[],
            ) =>
              items.join(" ; ")


            const actionForCheck = (
              check: MatchCheck,
            ) => {
              const code =
                String(
                  check.code || "",
                )

              const actions:
                Record<
                  string,
                  string
                > = {
                  ESTIMATION_CAPACITY:
                    "Renseigner ou corriger la capacité financière",
                  CAUTION:
                    "Renseigner ou corriger la capacité de caution",
                  SIMILAR_REFERENCES:
                    "Ajouter ou compléter les références similaires",
                  PERSONNEL_MINIMUM:
                    "Compléter les moyens humains",
                  CORE_EXECUTION_INHOUSE:
                    "Renseigner la capacité d’exécution interne",
                  SUBCONTRACTING_LIMIT:
                    "Renseigner la politique de sous-traitance",
                  ATTESTATION_FISCALE:
                    "Vérifier l’attestation fiscale",
                  CNSS:
                    "Vérifier l’attestation CNSS",
                  DECLARATION_HONNEUR:
                    "Vérifier la déclaration sur l’honneur",
                  POUVOIR_SIGNATAIRE:
                    "Vérifier le pouvoir du signataire",
                  REGISTRE_COMMERCE:
                    "Vérifier le registre de commerce",
                }

              return (
                actions[code]
                || (
                  check.user_view
                    ?.action != null
                    ? String(
                        check.user_view.action,
                      )
                    : "Compléter les informations de l’entreprise"
                )
              )
            }

            const actionableChecks =
              (
                blockingChecks.length > 0
                  ? blockingChecks
                  : verifyChecks
              )
                .slice(0, 3)


            const targetForCheck = (
              check: MatchCheck,
            ) => {
              const code =
                String(
                  check.code || "",
                )

              if (
                code === "ESTIMATION_CAPACITY"
                || code === "CAUTION"
              ) {
                return (
                  "/company"
                  + "?tab=overview"
                  + "&focus=finance"
                )
              }

              if (
                code === "SIMILAR_REFERENCES"
              ) {
                return (
                  "/company"
                  + "?tab=references"
                )
              }

              if (
                code === "PERSONNEL_MINIMUM"
              ) {
                return (
                  "/company"
                  + "?tab=personnel"
                )
              }

              if (
                code === "SUBCONTRACTING_LIMIT"
                || code
                  === "CORE_EXECUTION_INHOUSE"
              ) {
                return (
                  "/company"
                  + "?tab=overview"
                  + "&focus=capabilities"
                )
              }

              if (
                [
                  "ATTESTATION_FISCALE",
                  "CNSS",
                  "DECLARATION_HONNEUR",
                  "POUVOIR_SIGNATAIRE",
                  "REGISTRE_COMMERCE",
                ].includes(code)
              ) {
                return (
                  "/company"
                  + "?tab=documents"
                )
              }

              return "/company"
            }


            const blockingPriorities =
              priorityItems(
                blockingChecks,
              )

            const verifyPriorities =
              priorityItems(
                verifyChecks,
              )

            const recommendation =
              blockingChecks.length > 0
                ? (
                    `STOP — ${
                      blockingChecks.length
                    } blocage${
                      blockingChecks.length > 1
                        ? "s"
                        : ""
                    } critique${
                      blockingChecks.length > 1
                        ? "s"
                        : ""
                    }.`
                    + (
                      blockingPriorities.length > 0
                        ? ` Priorités : ${
                            joinPriorities(
                              blockingPriorities,
                            )
                          }.`
                        : ""
                    )
                  )
                : verifyChecks.length > 0
                  ? (
                      "GO SOUS RÉSERVE — "
                      + "Aucun blocage identifié, mais "
                      + `${verifyChecks.length} point${
                        verifyChecks.length > 1
                          ? "s"
                          : ""
                      } ${
                        verifyChecks.length > 1
                          ? "restent"
                          : "reste"
                      } à confirmer.`
                      + (
                        verifyPriorities.length > 0
                          ? ` Priorités : ${
                              joinPriorities(
                                verifyPriorities,
                              )
                            }.`
                          : ""
                      )
                    )
                  : (
                      "GO — Aucun blocage ni point "
                      + "à vérifier identifié par MOR "
                      + "avec les données actuellement disponibles."
                    )

            return (
              <div className="ao-decision-summary">

                <div className="ao-decision-summary-counts">

                  <div className="danger">
                    <strong>
                      {blockingChecks.length}
                    </strong>

                    <span>
                      Blocages
                    </span>
                  </div>

                  <div className="warning">
                    <strong>
                      {verifyChecks.length}
                    </strong>

                    <span>
                      À vérifier
                    </span>
                  </div>

                  <div className="success">
                    <strong>
                      {okChecks.length}
                    </strong>

                    <span>
                      Conformes
                    </span>
                  </div>

                </div>


                <div className="ao-decision-summary-list">

                  <div>
                    <span>
                      FINANCE
                    </span>

                    <strong>
                      {
                        viewText(
                          financeCheck,
                          "company_state",
                        )
                        || financial.estimation_raw
                        || "Données insuffisantes"
                      }
                    </strong>

                    {viewText(
                      financeCheck,
                      "gap",
                    ) && (
                      <small>
                        {
                          viewText(
                            financeCheck,
                            "gap",
                          )
                        }
                      </small>
                    )}
                  </div>


                  <div>
                    <span>
                      CAUTION
                    </span>

                    <strong>
                      {
                        viewText(
                          cautionCheck,
                          "company_state",
                        )
                        || financial.caution_raw
                        || "Données insuffisantes"
                      }
                    </strong>

                    {viewText(
                      cautionCheck,
                      "gap",
                    ) && (
                      <small>
                        {
                          viewText(
                            cautionCheck,
                            "gap",
                          )
                        }
                      </small>
                    )}
                  </div>


                  <div>
                    <span>
                      RÉFÉRENCES
                    </span>

                    <strong>
                      {
                        viewText(
                          referencesCheck,
                          "company_state",
                        )
                        || "Aucune exigence structurée détectée"
                      }
                    </strong>

                    {viewText(
                      referencesCheck,
                      "gap",
                    ) && (
                      <small>
                        {
                          viewText(
                            referencesCheck,
                            "gap",
                          )
                        }
                      </small>
                    )}
                  </div>


                  <div>
                    <span>
                      PERSONNEL
                    </span>

                    <strong>
                      {
                        viewText(
                          personnelCheck,
                          "company_state",
                        )
                        || "Aucune exigence structurée détectée"
                      }
                    </strong>

                    {viewText(
                      personnelCheck,
                      "gap",
                    ) && (
                      <small>
                        {
                          viewText(
                            personnelCheck,
                            "gap",
                          )
                        }
                      </small>
                    )}
                  </div>

                </div>


                <div className="ao-decision-recommendation">

                  <span>
                    RECOMMANDATION MOR
                  </span>

                  <strong>
                    {recommendation}
                  </strong>


                  {actionableChecks.length > 0 && (
                    <div className="ao-priority-actions">

                      {actionableChecks.map(
                        (
                          check,
                          index,
                        ) => (
                          <div
                            className="ao-priority-action"
                            key={
                              `${check.code}-${index}`
                            }
                          >

                            <div>
                              <small>
                                PRIORITÉ {
                                  index + 1
                                }
                              </small>

                              <strong>
                                {
                                  check.label
                                  || check.code
                                  || "Critère MOR"
                                }
                              </strong>

                              <p>
                                {
                                  actionForCheck(
                                    check,
                                  )
                                }
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  targetForCheck(
                                    check,
                                  ),
                                )
                              }
                            >
                              Ouvrir la bonne section →
                            </button>

                          </div>
                        ),
                      )}

                    </div>
                  )}

                </div>


                <div className="ao-decision-context">

                  <div>
                    <span>
                      Estimation AO
                    </span>

                    <strong>
                      {
                        financial.estimation_raw
                        || "Non renseignée"
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Caution AO
                    </span>

                    <strong>
                      {
                        financial.caution_raw
                        || "Non renseignée"
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Localisation
                    </span>

                    <strong>
                      {
                        identity.location
                        || "Non renseignée"
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Documents analysés
                    </span>

                    <strong>
                      {
                        opportunity
                          .documents.length
                      }
                    </strong>
                  </div>

                </div>


                {identity.url && (
                  <a
                    href={identity.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Voir l’AO source ↗
                  </a>
                )}

              </div>
            )
          })()}

        </aside>

      </section>


<section
        ref={submissionRef}
        className={
          `ao-submission ${
            focusedSection === "submission"
              ? "workflow-focus"
              : ""
          }`
        }
      >

        <header className="ao-submission-head">

          <div>
            <span>
              SOUMISSION
            </span>

            <h2>
              Dépôt de l’offre
            </h2>

            <p>
              Finalisez la préparation puis
              enregistrez ici la soumission.
            </p>
          </div>

          <div
            className={
              `ao-submission-state ${
                pilotageItem?.submission
                  ? "submitted"
                  : ""
              }`
            }
          >
            {
              pilotageItem?.submission
                ? "Soumis"
                : "Non soumis"
            }
          </div>

        </header>


        {pilotageItem?.submission ? (

          <div className="ao-submission-success">

            <div className="ao-submission-success-icon">
              ✓
            </div>

            <div className="ao-submission-success-main">

              <span>
                OFFRE SOUMISE
              </span>

              <h3>
                Soumission enregistrée
              </h3>

              <div className="ao-submission-meta">

                <div>
                  <small>
                    Date de soumission
                  </small>

                  <strong>
                    {
                      new Intl.DateTimeFormat(
                        "fr-FR",
                        {
                          dateStyle:
                            "medium",
                          timeStyle:
                            "short",
                        },
                      ).format(
                        new Date(
                          pilotageItem
                            .submission
                            .submitted_at,
                        ),
                      )
                    }
                  </strong>
                </div>


                <div>
                  <small>
                    Référence
                  </small>

                  <strong>
                    {
                      pilotageItem
                        .submission
                        .submission_reference
                      || "Non renseignée"
                    }
                  </strong>
                </div>


                <div>
                  <small>
                    Notes
                  </small>

                  <strong>
                    {
                      pilotageItem
                        .submission
                        .submission_notes
                      || "Aucune note"
                    }
                  </strong>
                </div>

              </div>

            </div>


            {pilotageItem?.outcome ? (

              <div className="ao-submission-outcome-lock">

                <span>
                  Résultat enregistré
                </span>

                <p>
                  Retirez d’abord le résultat du marché
                  avant d’annuler la soumission.
                </p>

              </div>

            ) : (

              <button
                type="button"
                className="ao-submission-cancel"
                disabled={
                  cancelSubmissionMutation
                    .isPending
                }
                onClick={async () => {
                  const confirmed =
                    window.confirm(
                      "Annuler l’enregistrement de cette soumission ?",
                    )

                  if (!confirmed) {
                    return
                  }

                  try {
                    await cancelSubmissionMutation
                      .mutateAsync()
                  } catch (error) {
                    console.error(
                      "Erreur annulation soumission",
                      error,
                    )

                    window.alert(
                      "Impossible d’annuler la soumission.",
                    )
                  }
                }}
              >
                {
                  cancelSubmissionMutation
                    .isPending
                    ? "Annulation…"
                    : "Annuler la soumission"
                }
              </button>

            )}

          </div>

        ) : (

          <div className="ao-submission-form">

            <div className="ao-submission-readiness">

              <div>
                <span>
                  PRÉPARATION
                </span>

                <strong>
                  {
                    preparation !== null
                      ? `${preparation}%`
                      : "—"
                  }
                </strong>
              </div>


              <div>
                <span>
                  PRÊTES
                </span>

                <strong>
                  {
                    humanPreparation.ready
                  }
                  /
                  {
                    humanPreparation.total
                  }
                </strong>
              </div>


              <div>
                <span>
                  IMPOSSIBLES
                </span>

                <strong
                  className={
                    humanPreparation
                      .impossible > 0
                      ? "danger"
                      : ""
                  }
                >
                  {
                    humanPreparation
                      .impossible
                  }
                </strong>
              </div>

            </div>


            <div className="ao-submission-fields">

              <label>
                <span>
                  Référence de dépôt
                </span>

                <input
                  type="text"
                  value={
                    submissionReference
                  }
                  maxLength={250}
                  placeholder={
                    "Ex. dépôt électronique #12345"
                  }
                  onChange={(event) =>
                    setSubmissionReference(
                      event.target.value,
                    )
                  }
                />
              </label>


              <label>
                <span>
                  Note de soumission
                </span>

                <textarea
                  value={
                    submissionNotes
                  }
                  rows={3}
                  maxLength={4000}
                  placeholder={
                    "Informations utiles sur le dépôt…"
                  }
                  onChange={(event) =>
                    setSubmissionNotes(
                      event.target.value,
                    )
                  }
                />
              </label>

            </div>


            <div className="ao-submission-footer">

              <div>

                {humanPreparation
                  .impossible > 0 && (
                  <p className="danger">
                    Attention :
                    {" "}
                    {
                      humanPreparation
                        .impossible
                    }
                    {" "}
                    action
                    {
                      humanPreparation
                        .impossible > 1
                        ? "s"
                        : ""
                    }
                    {" "}
                    impossible
                    {
                      humanPreparation
                        .impossible > 1
                        ? "s"
                        : ""
                    }.
                  </p>
                )}

                {humanPreparation
                  .pending > 0 && (
                  <p>
                    {
                      humanPreparation
                        .pending
                    }
                    {" "}
                    action
                    {
                      humanPreparation
                        .pending > 1
                        ? "s restent"
                        : " reste"
                    }
                    {" "}
                    à faire.
                  </p>
                )}

              </div>


              <button
                type="button"
                disabled={
                  submitMutation.isPending
                  || !refConsultation
                  || !orgAcronyme
                }
                onClick={() => {
                  if (
                    window.confirm(
                      "Confirmer que cette offre a bien été soumise ?",
                    )
                  ) {
                    submitMutation.mutate()
                  }
                }}
              >
                {
                  submitMutation.isPending
                    ? "Enregistrement…"
                    : "Marquer comme soumis"
                }
              </button>

            </div>


            {submitMutation.isError && (
              <div className="ao-submission-error">
                Impossible d’enregistrer
                la soumission.
              </div>
            )}

          </div>

        )}

      </section>

        </aside>

      </section>


      


      {pilotageItem?.submission && (
        <section
          ref={outcomeRef}
          className={
            `ao-outcome ao-outcome-v46 ${
              pilotageItem?.outcome
                ?.outcome
                ?.toLowerCase()
              || "pending"
            } ${
              focusedSection === "outcome"
                ? "workflow-focus"
                : ""
            }`
          }
        >

          <header className="ao-outcome-header ao-outcome-v46-header">

            <div className="ao-outcome-v46-title">

              <span className="ao-outcome-eyebrow">
                SUIVI DU MARCHÉ
              </span>

              <h2>
                {
                  pilotageItem?.outcome
                    ?.outcome === "WON"
                    ? "Marché gagné"
                    : pilotageItem?.outcome
                        ?.outcome === "LOST"
                      ? "Marché perdu"
                      : pilotageItem?.outcome
                          ?.outcome === "CANCELLED"
                        ? "Marché annulé"
                        : "Résultat en attente"
                }
              </h2>

              <p>
                {
                  pilotageItem?.outcome
                    ? "Le résultat de ce marché a été enregistré."
                    : "La soumission est enregistrée. Suivez ici le résultat du marché."
                }
              </p>

            </div>


            <div className="ao-outcome-v46-side">

              <div
                className={
                  `ao-outcome-state ${
                    pilotageItem?.outcome
                      ?.outcome
                      ?.toLowerCase()
                    || "pending"
                  }`
                }
              >
                {
                  pilotageItem?.outcome
                    ?.outcome === "WON"
                    ? "Gagné"
                    : pilotageItem?.outcome
                        ?.outcome === "LOST"
                      ? "Perdu"
                      : pilotageItem?.outcome
                          ?.outcome === "CANCELLED"
                        ? "Annulé"
                        : "En attente"
                }
              </div>

            </div>

          </header>


          <div className="ao-outcome-v46-submission">

            <div>
              <span>
                SOUMISSION
              </span>

              <strong>
                Enregistrée
              </strong>
            </div>

            <div>
              <span>
                DATE DE DÉPÔT
              </span>

              <strong>
                {
                  pilotageItem.submission
                    .submitted_at
                    || "Non renseignée"
                }
              </strong>
            </div>

            <div>
              <span>
                RÉFÉRENCE
              </span>

              <strong>
                {
                  pilotageItem.submission
                    .submission_reference
                    || "Non renseignée"
                }
              </strong>
            </div>

            <div>
              <span>
                PROCHAINE ÉTAPE
              </span>

              <strong>
                {
                  pilotageItem?.outcome
                    ? "Résultat enregistré"
                    : "Attendre puis enregistrer le résultat"
                }
              </strong>
            </div>

          </div>


          {pilotageItem?.outcome ? (

            <div className="ao-outcome-result">

              <div className="ao-outcome-result-main">
                <strong>
                  {
                    pilotageItem.outcome.outcome
                      === "WON"
                      ? "Marché gagné"
                      : pilotageItem.outcome.outcome
                          === "LOST"
                        ? "Marché perdu"
                        : pilotageItem.outcome.outcome
                            === "CANCELLED"
                          ? "Marché annulé"
                          : "Résultat en attente"
                  }
                </strong>

                {pilotageItem.outcome.result_date && (
                  <small>
                    Date : {
                      pilotageItem
                        .outcome
                        .result_date
                    }
                  </small>
                )}

                {
                  pilotageItem
                    .outcome
                    .awarded_amount != null
                  && (
                    <small>
                      Montant attribué : {
                        new Intl.NumberFormat(
                          "fr-MA",
                          {
                            maximumFractionDigits: 2,
                          },
                        ).format(
                          pilotageItem
                            .outcome
                            .awarded_amount,
                        )
                      } MAD
                    </small>
                  )
                }

                {pilotageItem.outcome.winner_name && (
                  <small>
                    Attributaire : {
                      pilotageItem
                        .outcome
                        .winner_name
                    }
                  </small>
                )}

                {pilotageItem.outcome.loss_reason && (
                  <small>
                    Motif : {
                      pilotageItem
                        .outcome
                        .loss_reason
                    }
                  </small>
                )}

                {pilotageItem.outcome.notes && (
                  <small>
                    Notes : {
                      pilotageItem
                        .outcome
                        .notes
                    }
                  </small>
                )}
              </div>


              <details className="ao-outcome-edit">

                <summary
                  onClick={() => {
                    const current =
                      pilotageItem.outcome

                    if (!current) {
                      return
                    }

                    if (
                      current.outcome === "WON"
                      || current.outcome === "LOST"
                      || current.outcome === "CANCELLED"
                    ) {
                      setOutcomeChoice(
                        current.outcome,
                      )
                    }

                    setOutcomeDate(
                      current.result_date
                      || "",
                    )

                    setOutcomeAmount(
                      current.awarded_amount != null
                        ? String(
                            current.awarded_amount,
                          )
                        : "",
                    )

                    setOutcomeWinner(
                      current.winner_name
                      || "",
                    )

                    setOutcomeLossReason(
                      current.loss_reason
                      || "",
                    )

                    setOutcomeNotes(
                      current.notes
                      || "",
                    )
                  }}
                >
                  Modifier le résultat
                </summary>


                <div className="ao-outcome-edit-form">

                  <div className="ao-outcome-choices">
                    {(
                      [
                        ["WON", "Gagné"],
                        ["LOST", "Perdu"],
                        ["CANCELLED", "Annulé"],
                      ] as const
                    ).map(
                      ([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          className={
                            outcomeChoice === value
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setOutcomeChoice(
                              value,
                            )
                          }
                        >
                          {label}
                        </button>
                      ),
                    )}
                  </div>


                  <div className="ao-outcome-fields">

                    <label>
                      <span>
                        Date du résultat
                      </span>

                      <input
                        type="date"
                        value={outcomeDate}
                        onChange={(event) =>
                          setOutcomeDate(
                            event.target.value,
                          )
                        }
                      />
                    </label>


                    {outcomeChoice === "WON" && (
                      <label>
                        <span>
                          Montant attribué (MAD)
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={outcomeAmount}
                          onChange={(event) =>
                            setOutcomeAmount(
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    )}


                    {outcomeChoice === "LOST" && (
                      <>
                        <label>
                          <span>
                            Attributaire
                          </span>

                          <input
                            value={outcomeWinner}
                            placeholder="Si connu"
                            onChange={(event) =>
                              setOutcomeWinner(
                                event.target.value,
                              )
                            }
                          />
                        </label>

                        <label>
                          <span>
                            Motif de perte
                          </span>

                          <input
                            value={
                              outcomeLossReason
                            }
                            placeholder={
                              "Prix, technique, délai..."
                            }
                            onChange={(event) =>
                              setOutcomeLossReason(
                                event.target.value,
                              )
                            }
                          />
                        </label>
                      </>
                    )}


                    <label className="ao-outcome-notes">
                      <span>
                        Notes
                      </span>

                      <textarea
                        rows={3}
                        value={outcomeNotes}
                        onChange={(event) =>
                          setOutcomeNotes(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                  </div>


                  <button
                    type="button"
                    className="ao-outcome-save"
                    disabled={
                      outcomeMutation.isPending
                    }
                    onClick={async () => {
                      try {
                        await outcomeMutation
                          .mutateAsync()
                      } catch (error) {
                        console.error(
                          "Erreur modification résultat",
                          error,
                        )

                        window.alert(
                          "Impossible de modifier le résultat.",
                        )
                      }
                    }}
                  >
                    {
                      outcomeMutation.isPending
                        ? "Enregistrement…"
                        : "Enregistrer les modifications"
                    }
                  </button>

                </div>

              </details>


              <button
                type="button"
                className="ao-outcome-delete"
                disabled={
                  deleteOutcomeMutation
                    .isPending
                }
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Retirer le résultat enregistré ?",
                    )
                  ) {
                    return
                  }

                  try {
                    await deleteOutcomeMutation
                      .mutateAsync()
                  } catch (error) {
                    console.error(
                      "Erreur suppression résultat",
                      error,
                    )

                    window.alert(
                      "Impossible de retirer le résultat.",
                    )
                  }
                }}
              >
                {
                  deleteOutcomeMutation
                    .isPending
                    ? "Suppression…"
                    : "Retirer le résultat"
                }
              </button>

            </div>

          ) : (

            <div className="ao-outcome-form">

              <div className="ao-outcome-choices">
                {(
                  [
                    ["WON", "Gagné"],
                    ["LOST", "Perdu"],
                    ["CANCELLED", "Annulé"],
                  ] as const
                ).map(
                  ([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        outcomeChoice === value
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setOutcomeChoice(
                          value,
                        )
                      }
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>


              <div className="ao-outcome-fields">

                <label>
                  <span>
                    Date du résultat
                  </span>

                  <input
                    type="date"
                    value={outcomeDate}
                    onChange={(event) =>
                      setOutcomeDate(
                        event.target.value,
                      )
                    }
                  />
                </label>


                {outcomeChoice === "WON" && (
                  <label>
                    <span>
                      Montant attribué (MAD)
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={outcomeAmount}
                      onChange={(event) =>
                        setOutcomeAmount(
                          event.target.value,
                        )
                      }
                    />
                  </label>
                )}


                {outcomeChoice === "LOST" && (
                  <>
                    <label>
                      <span>
                        Attributaire
                      </span>

                      <input
                        value={outcomeWinner}
                        placeholder="Si connu"
                        onChange={(event) =>
                          setOutcomeWinner(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Motif de perte
                      </span>

                      <input
                        value={
                          outcomeLossReason
                        }
                        placeholder="Prix, technique, délai..."
                        onChange={(event) =>
                          setOutcomeLossReason(
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  </>
                )}


                <label className="ao-outcome-notes">
                  <span>
                    Notes
                  </span>

                  <textarea
                    rows={3}
                    value={outcomeNotes}
                    onChange={(event) =>
                      setOutcomeNotes(
                        event.target.value,
                      )
                    }
                  />
                </label>

              </div>


              <button
                type="button"
                className="ao-outcome-save"
                disabled={
                  outcomeMutation.isPending
                }
                onClick={async () => {
                  try {
                    await outcomeMutation
                      .mutateAsync()
                  } catch (error) {
                    console.error(
                      "Erreur résultat marché",
                      error,
                    )

                    window.alert(
                      "Impossible d’enregistrer le résultat.",
                    )
                  }
                }}
              >
                {
                  outcomeMutation.isPending
                    ? "Enregistrement…"
                    : "Enregistrer le résultat"
                }
              </button>

            </div>

          )}

        </section>
      )}


      


      <section className="ao-workspace-panel ao-details">

        <header>
          <div>
            <span>
              ANALYSE COMPLÈTE
            </span>

            <h2>
              Détails MOR
            </h2>
          </div>
        </header>


        <p className="ao-details-note">
          Consultez l’analyse technique complète
          du marché, les critères MOR et les
          éléments extraits du DCE.
        </p>


        <div className="ao-detail-links">

          <button
            type="button"
            onClick={() => {
              setFocusedSection(
                "decision",
              )

              requestAnimationFrame(
                () => {
                  decisionRef.current
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                },
              )
            }}
          >
            Revenir à l’analyse MOR
          </button>

        </div>

      </section>

    </main>
  )
}
