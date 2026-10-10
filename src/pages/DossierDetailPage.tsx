import {
  getDossierActions,
  updateDossierAction,
} from "../api/dossiers"

import {
  useEffect,
  useState,
} from "react"

import {
  useQuery,
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
  getCompanyWorkspace,
} from "../api/company"

import type {
  CompanyDocument,
} from "../api/company"

import type {
  Evidence,
  MatchCheck,
} from "../api/types"

import {
  DossierActionControl,
} from "../components/dossiers/DossierActionControl"


type FilterValue =
  | "PENDING"
  | "IN_PROGRESS"
  | "READY"
  | "IMPOSSIBLE"
  | "ALL"


function isUnauthorized(
  error: unknown,
) {
  return (
    error instanceof ApiError
    && error.status === 401
  )
}


function statusLabel(
  status: string,
) {
  switch (status) {
    case "OK":
      return "Satisfait"

    case "VERIFY":
      return "À vérifier"

    case "BLOCKING":
      return "Bloquant"

    case "PARTIAL":
      return "Partiel"

    case "NOT_APPLICABLE":
      return "Non applicable"

    default:
      return "Inconnu"
  }
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
    return value.length
      ? value.join(", ")
      : "Aucun élément"
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return "Donnée structurée"
    }
  }

  return String(value)
}


function checkName(
  check: MatchCheck,
) {
  return (
    check.label
    || check.code
    || "Contrôle MOR"
  )
}


function deadlineLabel(
  raw?: string | null,
  iso?: string | null,
) {
  if (raw) {
    return raw
  }

  if (!iso) {
    return "Échéance inconnue"
  }

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return iso
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
  ).format(date)
}


function EvidenceBlock({
  evidence,
}: {
  evidence: Evidence
}) {
  return (
    <div className="dossier-evidence">
      <div>
        <span>
          Preuve DCE
        </span>

        <strong>
          {evidence.filename
            || evidence.document
            || evidence.document_type
            || "Source DCE"}
        </strong>
      </div>

      <div className="dossier-evidence-meta">
        {evidence.page != null && (
          <span>
            Page {evidence.page}
          </span>
        )}

        {evidence.article && (
          <span>
            Article {evidence.article}
          </span>
        )}

        {evidence.section && (
          <span>
            {evidence.section}
          </span>
        )}
      </div>

      {evidence.snippet && (
        <p>
          {evidence.snippet}
        </p>
      )}
    </div>
  )
}



const V60_DOCUMENT_TYPES:
  Record<string, string> = {
    ATTESTATION_FISCALE:
      "ATTESTATION_FISCALE",

    CNSS:
      "CNSS",

    DECLARATION_HONNEUR:
      "DECLARATION_HONNEUR",

    POUVOIR_SIGNATAIRE:
      "POUVOIR_SIGNATAIRE",

    REGISTRE_COMMERCE:
      "REGISTRE_COMMERCE",

    FICHE_TECHNIQUE:
      "FICHE_TECHNIQUE",

    CAUTION_PROVISOIRE_DOCUMENT:
      "CAUTION_PROVISOIRE_DOCUMENT",
  }


const V60_LABEL_HINTS:
  Record<string, string[]> = {
    ATTESTATION_FISCALE:
      ["fiscal"],

    CNSS:
      ["cnss"],

    DECLARATION_HONNEUR:
      ["honneur"],

    POUVOIR_SIGNATAIRE:
      ["pouvoir", "signataire"],

    REGISTRE_COMMERCE:
      ["registre", "commerce"],

    FICHE_TECHNIQUE:
      ["fiche", "technique"],

    CAUTION_PROVISOIRE_DOCUMENT:
      ["caution"],
  }


function normalizeV60Text(
  value?: string | null,
) {
  return String(value || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
}



function validatedCompanyDocumentData(
  document: CompanyDocument,
) {
  if (
    !document.validated_json
    || ![
      "VALIDATED",
      "CORRECTED",
    ].includes(
      String(
        document.validation_status
        || "",
      ).toUpperCase(),
    )
  ) {
    return null
  }

  try {
    const value =
      JSON.parse(
        document.validated_json,
      )

    if (
      !value
      || typeof value !== "object"
      || Array.isArray(value)
    ) {
      return null
    }

    return value as Record<
      string,
      unknown
    >
  } catch {
    return null
  }
}


function normalizedValidatedDocumentType(
  document: CompanyDocument,
) {
  const data =
    validatedCompanyDocumentData(
      document,
    )

  if (!data) {
    return null
  }

  const raw =
    String(
      data.document_type || "",
    )
      .trim()
      .toUpperCase()

  const aliases:
    Record<string, string> = {
      ATTESTATION_CNSS: "CNSS",
      CNSS: "CNSS",
      FISCAL: "ATTESTATION_FISCALE",
      ATTESTATION_FISCALE:
        "ATTESTATION_FISCALE",
      RC: "REGISTRE_COMMERCE",
      REGISTRE_COMMERCE:
        "REGISTRE_COMMERCE",
    }

  return aliases[raw] || raw || null
}


function companyDocumentForCheck(
  check: MatchCheck,
  documents: CompanyDocument[],
) {
  const code =
    String(check.code || "")
      .trim()
      .toUpperCase()

  const documentType =
    V60_DOCUMENT_TYPES[code]

  if (!documentType) {
    return null
  }

  const candidates =
    documents.filter(
      (document) =>
        String(
          document.document_type || "",
        )
          .trim()
          .toUpperCase()
        === documentType,
    )

  if (!candidates.length) {
    return {
      documentType,
      document: null,
    }
  }

  const hints =
    V60_LABEL_HINTS[code] ?? []

  const scored =
    candidates
      .map(
        (document) => {
          const label =
            normalizeV60Text(
              document.label,
            )

          const labelMatches =
            hints.some(
              (hint) =>
                label.includes(hint),
            )

          let score = 0

          // Un vrai fichier reste prioritaire,
          // même si le label humain est mauvais.
          if (document.has_file) {
            score += 100
          }

          if (
            document.original_filename
          ) {
            score += 50
          }

          if (labelMatches) {
            score += 20
          }

          if (document.available) {
            score += 5
          }

          if (
            document.analysis_status
            === "ANALYZED"
          ) {
            score += 4
          }

          if (
            document.validation_status
            && document.validation_status
              !== "NOT_ANALYZED"
          ) {
            score += 3
          }

          return {
            document,
            score,
          }
        },
      )
      .sort(
        (a, b) =>
          b.score - a.score,
      )

  return {
    documentType,
    document:
      scored[0]?.document
      ?? null,
  }
}


function isCompanyDocumentExpired(
  document: CompanyDocument,
) {
  if (!document.valid_until) {
    return false
  }

  const expiration =
    new Date(
      `${document.valid_until}T23:59:59`,
    )

  if (
    Number.isNaN(
      expiration.getTime(),
    )
  ) {
    return false
  }

  return expiration.getTime()
    < Date.now()
}


function companyDocumentDateLabel(
  value?: string | null,
) {
  if (!value) {
    return null
  }

  const date =
    new Date(
      `${value}T12:00:00`,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date)
}


function DossierCheck({
  check,
  lotNumber,
  canPrepare,
  companyDocuments,
  onManageDocuments,
}: {
  check: MatchCheck
  lotNumber?: string | null
  canPrepare: boolean
  companyDocuments: CompanyDocument[]
  onManageDocuments: (
    documentId?: number | null,
  ) => void
}) {
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


  const companyDocumentMatch =
    companyDocumentForCheck(
      check,
      companyDocuments,
    )

  const companyDocument =
    companyDocumentMatch?.document
    ?? null

  const companyDocumentExpired =
    companyDocument
      ? isCompanyDocumentExpired(
          companyDocument,
        )
      : false

  const expectedDocumentType =
    companyDocumentMatch
      ?.documentType
    ?? null

  const validatedDocumentType =
    companyDocument
      ? normalizedValidatedDocumentType(
          companyDocument,
        )
      : null

  const validatedForRequirement =
    Boolean(
      companyDocument
      && expectedDocumentType
      && validatedDocumentType
      === expectedDocumentType
      && [
        "VALIDATED",
        "CORRECTED",
      ].includes(
        String(
          companyDocument
            .validation_status
          || "",
        ).toUpperCase(),
      ),
    )

  const validatedAsOtherType =
    Boolean(
      companyDocument
      && validatedDocumentType
      && expectedDocumentType
      && validatedDocumentType
        !== expectedDocumentType,
    )

  return (
    <article
      className={
        "dossier-check "
        + check.status.toLowerCase()
      }
      data-requirement-type={
        String(check.code || "")
          .trim()
          .toUpperCase()
      }
      data-lot-number={
        lotNumber == null
          ? ""
          : String(lotNumber)
      }
    >
      <header className="dossier-v641-task-head">

        <div className="dossier-v641-title">

          <div className="dossier-v641-title-meta">

            <span className="dossier-v641-kind">
              {
                companyDocumentMatch
                  ? "DOCUMENT"
                  : "ACTION"
              }
            </span>

            <span className="dossier-v641-code">
              {check.code || "CHECK"}
            </span>

          </div>

          <h3>
            {checkName(check)}
          </h3>

        </div>


        <span
          className={
            "dossier-check-status "
            + check.status.toLowerCase()
          }
        >
          {statusLabel(check.status)}
        </span>

      </header>


      <div className="dossier-v641-action">

        <span>
          À FAIRE
        </span>

        <strong>
          {
            action
              ? String(action)
              : explanation
                ? String(explanation)
                : "Traiter ce point avant la soumission."
          }
        </strong>

        {impact && (
          <p>
            {String(impact)}
          </p>
        )}

      </div>


      <div className="dossier-v641-context">

        <div className="dossier-v641-requirement">

          <span>
            EXIGENCE AO
          </span>

          <strong>
            {readableValue(
              requirement,
            )}
          </strong>

        </div>


        <div
          className={
            "dossier-v641-source "
            + (
              check.source
                ? "found"
                : "missing"
            )
          }
        >

          <span>
            SOURCE
          </span>

          <strong>
            {check.source ? (
              <>
                <b aria-hidden="true">
                  ↗
                </b>

                {
                  check.source.filename
                  || check.source.document
                  || check.source.document_type
                  || "Source DCE"
                }

                {check.source.page != null
                  ? ` · p.${check.source.page}`
                  : ""}
              </>
            ) : (
              <>
                <b aria-hidden="true">
                  ○
                </b>

                Non localisée
              </>
            )}
          </strong>

        </div>

      </div>


      {companyDocumentMatch && (
        <div
          className={
            "dossier-v60-company-document "
            + (
              !companyDocument
                ? "missing"
                : validatedForRequirement
                  ? "available"
                  : validatedAsOtherType
                    ? "mismatch"
                    : companyDocumentExpired
                      ? "expired"
                      : companyDocument.has_file
                        ? "review"
                        : companyDocument.available
                          ? "declared"
                          : "missing"
            )
          }
        >

          <div>
            <span>
              DOCUMENT ENTREPRISE
            </span>

            {!companyDocument ? (
              <strong>
                ✕ Document absent
              </strong>
            ) : validatedForRequirement ? (
              <strong>
                ✓ Preuve validée pour cette exigence
              </strong>
            ) : validatedAsOtherType ? (
              <strong>
                ⚠ Fichier validé comme un autre document
              </strong>
            ) : companyDocumentExpired ? (
              <strong>
                ⚠ Document expiré
              </strong>
            ) : companyDocument.has_file ? (
              <strong>
                ○ Fichier présent — validation requise
              </strong>
            ) : companyDocument.available ? (
              <strong>
                ○ Déclaré disponible — fichier non ajouté
              </strong>
            ) : (
              <strong>
                ✕ Document absent
              </strong>
            )}
          </div>


          <div className="dossier-v60-document-meta">

            {companyDocument?.original_filename && (
              <span
                title={
                  companyDocument
                    .original_filename
                }
              >
                {
                  companyDocument
                    .original_filename
                }
              </span>
            )}

            {validatedAsOtherType && (
              <span className="dossier-v62-mismatch-type">
                MOR l’a identifié comme : {
                  validatedDocumentType
                }
              </span>
            )}

            {validatedForRequirement
              && companyDocument?.validation_status && (
              <span>
                Validation MOR : {
                  companyDocument
                    .validation_status
                }
              </span>
            )}

            {companyDocument?.valid_until && (
              <span>
                {
                  companyDocumentExpired
                    ? "Expiré le "
                    : "Validité déclarée : "
                }

                {
                  companyDocumentDateLabel(
                    companyDocument
                      .valid_until,
                  )
                }
              </span>
            )}

          </div>


          {
            (
              !validatedForRequirement
            ) && (
              <button
                type="button"
                onClick={() =>
                  onManageDocuments(
                    companyDocument?.id
                    ?? null,
                  )
                }
              >
                Vérifier dans Entreprise →
              </button>
            )
          }

        </div>
      )}


      {canPrepare && (
        <div className="dossier-v641-work-control">

          <DossierActionControl
            check={check}
            lotNumber={lotNumber}
          />

        </div>
      )}


      <details className="dossier-v40-analysis-details">

        <summary>
          Détails MOR
        </summary>

        {explanation && (
          <p className="dossier-check-explanation">
            {String(explanation)}
          </p>
        )}

        <div className="dossier-check-comparison">

          <div>
            <span>
              Exigence AO
            </span>

            <strong>
              {readableValue(
                requirement,
              )}
            </strong>
          </div>

          <div className="dossier-check-arrow">
            →
          </div>

          <div>
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


        {gap !== null
          && gap !== undefined
          && gap !== "" && (
          <div className="dossier-check-gap">

            <span>
              Écart identifié par MOR
            </span>

            <strong>
              {readableValue(gap)}
            </strong>

          </div>
        )}


        {check.source && (
          <EvidenceBlock
            evidence={check.source}
          />
        )}

      </details>
    </article>
  )
}


export function DossierDetailPage() {
  const navigate =
    useNavigate()

  const location =
    useLocation()


  const {
    refConsultation,
    orgAcronyme,
  } = useParams()

  const [filter, setFilter] =
    useState<FilterValue>("PENDING")

  const [
    startingNextAction,
    setStartingNextAction,
  ] = useState(false)

  const [
    nextActionError,
    setNextActionError,
  ] = useState<string | null>(null)


  const query =
    useQuery({
      queryKey: [
        "dossier-detail",
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
          && orgAcronyme,
        ),

      queryFn: () =>
        getDossierActions(
          refConsultation!,
          orgAcronyme!,
        ),
    })


  const companyWorkspaceQuery =
    useQuery({
      queryKey: [
        "company-workspace",
      ],

      queryFn:
        getCompanyWorkspace,
    })


  useEffect(
    () => {
      const params =
        new URLSearchParams(
          location.search,
        )

      const requirement =
        (
          params.get("requirement")
          || ""
        )
          .trim()
          .toUpperCase()

      const lot =
        params.get("lot")

      if (!requirement) {
        return
      }

      const timer =
        window.setTimeout(
          () => {
            const rows =
              Array.from(
                document.querySelectorAll<HTMLElement>(
                  ".dossier-check",
                ),
              )

            const target =
              rows.find(
                (row) => {
                  const sameRequirement =
                    row.dataset
                      .requirementType
                    === requirement

                  if (!sameRequirement) {
                    return false
                  }

                  if (!lot) {
                    return true
                  }

                  return (
                    row.dataset
                      .lotNumber
                    === lot
                  )
                },
              )

            if (!target) {
              return
            }

            target.classList.add(
              "dossier-check-focus",
            )

            const actionTarget =
              target.querySelector<HTMLElement>(
                ".dossier-human-action",
              )

            if (actionTarget) {
              actionTarget.classList.add(
                "dossier-human-action-focus",
              )
            }

            target.scrollIntoView({
              behavior: "smooth",
              block: "center",
            })

            window.setTimeout(
              () => {
                target.classList.remove(
                  "dossier-check-focus",
                )

                actionTarget?.classList.remove(
                  "dossier-human-action-focus",
                )
              },
              2400,
            )
          },
          250,
        )

      return () =>
        window.clearTimeout(timer)
    },
    [
      location.search,
      query.data,
    ],
  )

  if (
    query.isError
    && isUnauthorized(query.error)
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
      <div className="dossier-detail-page">
        Chargement du dossier…
      </div>
    )
  }


  if (
    query.isError
    || !query.data
  ) {
    return (
      <div className="dossier-detail-page">
        Impossible de charger le dossier.
      </div>
    )
  }


  const opportunity =
    query.data.data

  const matching =
    opportunity.matching

  const allChecks =
    matching.lots.flatMap(
      (lot) =>
        lot.checks.map(
          (check) => ({
            ...check,
            lotNumber:
              lot.lot_number,
            lotTitle:
              lot.lot_title,
          }),
        ),
    )


  const dossierActions =
    actionsQuery.data?.data ?? []


  const companyDocuments =
    companyWorkspaceQuery
      .data?.data.documents
    ?? []


  const preparationAvailable =
    actionsQuery.isSuccess



  function normalizedLot(
    value:
      string
      | null
      | undefined,
  ) {
    if (
      value === null
      || value === undefined
      || value === ""
    ) {
      return null
    }

    return String(value)
  }


  function actionStatusForCheck(
    check: typeof allChecks[number],
  ) {
    const requirementType =
      String(
        check.code || "",
      )
        .trim()
        .toUpperCase()

    const lot =
      normalizedLot(
        check.lotNumber,
      )

    const action =
      dossierActions.find(
        (item) =>
          item.requirement_type
            .toUpperCase()
            === requirementType
          && normalizedLot(
            item.lot_number,
          ) === lot,
      )

    return action?.status
      ?? "PENDING"
  }


  const preparationChecks =
    allChecks.filter(
      (check) =>
        check.status !== "OK"
        && check.status
          !== "NOT_APPLICABLE",
    )


  const filteredPreparationChecks =
    preparationChecks.filter(
      (check) => {
        if (filter === "ALL") {
          return true
        }

        return (
          actionStatusForCheck(check)
          === filter
        )
      },
    )


  const workGroups = [
    {
      key: "PENDING",
      label: "À faire",
      description:
        "Actions qui doivent encore être traitées.",
      checks:
        filteredPreparationChecks.filter(
          (check) =>
            actionStatusForCheck(check)
            === "PENDING",
        ),
    },

    {
      key: "IN_PROGRESS",
      label: "En cours",
      description:
        "Actions actuellement prises en charge.",
      checks:
        filteredPreparationChecks.filter(
          (check) =>
            actionStatusForCheck(check)
            === "IN_PROGRESS",
        ),
    },

    {
      key: "READY",
      label: "Prêts",
      description:
        "Éléments terminés et prêts pour la soumission.",
      checks:
        filteredPreparationChecks.filter(
          (check) =>
            actionStatusForCheck(check)
            === "READY",
        ),
    },

    {
      key: "IMPOSSIBLE",
      label: "Impossible",
      description:
        "Éléments déclarés impossibles à préparer ou fournir.",
      checks:
        filteredPreparationChecks.filter(
          (check) =>
            actionStatusForCheck(check)
            === "IMPOSSIBLE",
        ),
    },
  ].filter(
    (group) =>
      group.checks.length > 0,
  )


  const preparationCounts =
    preparationChecks.reduce(
      (
        acc,
        check,
      ) => {
        const status =
          actionStatusForCheck(
            check,
          )

        acc.total += 1

        if (status === "READY") {
          acc.ready += 1
        } else if (
          status === "IN_PROGRESS"
        ) {
          acc.inProgress += 1
        } else if (
          status === "IMPOSSIBLE"
        ) {
          acc.impossible += 1
        } else {
          acc.pending += 1
        }

        return acc
      },
      {
        total: 0,
        pending: 0,
        inProgress: 0,
        ready: 0,
        impossible: 0,
      },
    )


  const preparationPercent =
    preparationCounts.total
      ? Math.round(
          preparationCounts.ready
          * 100
          / preparationCounts.total,
        )
      : 100



  const preparationFinished =
    preparationCounts.total > 0
    && preparationCounts.ready
      === preparationCounts.total


  const impossiblePreparationCheck =
    preparationChecks.find(
      (check) =>
        actionStatusForCheck(check)
        === "IMPOSSIBLE",
    )

  const inProgressPreparationCheck =
    preparationChecks.find(
      (check) =>
        actionStatusForCheck(check)
        === "IN_PROGRESS",
    )

  const pendingPreparationCheck =
    preparationChecks.find(
      (check) =>
        actionStatusForCheck(check)
        === "PENDING",
    )


  const nextPreparationCheck =
    impossiblePreparationCheck
    ?? inProgressPreparationCheck
    ?? pendingPreparationCheck
    ?? null


  const nextPreparationStatus =
    nextPreparationCheck
      ? actionStatusForCheck(
          nextPreparationCheck,
        )
      : null


  const nextPreparationActionText =
    nextPreparationCheck
      ? (
          nextPreparationCheck
            .user_view?.action
          || nextPreparationCheck
            .user_view?.explanation
          || nextPreparationCheck.detail
          || "Traiter ce point avant la soumission."
        )
      : ""


  function focusPreparationCheck(
    check: typeof allChecks[number],
    targetFilter: FilterValue,
  ) {
    const requirementType =
      String(
        check.code || "",
      )
        .trim()
        .toUpperCase()

    const lot =
      check.lotNumber == null
        ? ""
        : String(check.lotNumber)

    setFilter(targetFilter)

    window.setTimeout(
      () => {
        const cards =
          Array.from(
            document.querySelectorAll<HTMLElement>(
              ".dossier-check",
            ),
          )

        const element =
          cards.find(
            (card) =>
              (
                card.dataset
                  .requirementType
                || ""
              ) === requirementType
              && (
                card.dataset
                  .lotNumber
                || ""
              ) === lot,
          )

        if (!element) {
          return
        }

        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })

        element.classList.add(
          "dossier-v58-focus",
        )

        window.setTimeout(
          () => {
            element.classList.remove(
              "dossier-v58-focus",
            )
          },
          1800,
        )
      },
      100,
    )
  }


  async function handleNextPreparationAction() {
    if (!nextPreparationCheck) {
      return
    }

    setNextActionError(null)

    if (
      nextPreparationStatus
      === "IMPOSSIBLE"
    ) {
      focusPreparationCheck(
        nextPreparationCheck,
        "IMPOSSIBLE",
      )

      return
    }

    if (
      nextPreparationStatus
      === "IN_PROGRESS"
    ) {
      focusPreparationCheck(
        nextPreparationCheck,
        "IN_PROGRESS",
      )

      return
    }

    if (
      nextPreparationStatus
      !== "PENDING"
      || !refConsultation
      || !orgAcronyme
    ) {
      return
    }

    const requirementType =
      String(
        nextPreparationCheck.code
        || "",
      )
        .trim()
        .toUpperCase()

    if (!requirementType) {
      return
    }

    const lot =
      normalizedLot(
        nextPreparationCheck
          .lotNumber,
      )

    const existingAction =
      dossierActions.find(
        (item) =>
          item.requirement_type
            .toUpperCase()
            === requirementType
          && normalizedLot(
            item.lot_number,
          ) === lot,
      )

    const recommendedNote =
      nextPreparationCheck
        .user_view?.action
        ? String(
            nextPreparationCheck
              .user_view?.action,
          ).trim()
        : ""

    setStartingNextAction(true)

    try {
      await updateDossierAction(
        refConsultation,
        orgAcronyme,
        {
          lot_number:
            nextPreparationCheck
              .lotNumber
            ?? null,

          requirement_type:
            requirementType,

          status:
            "IN_PROGRESS",

          notes:
            existingAction?.notes
            || recommendedNote
            || null,
        },
      )

      await actionsQuery.refetch()

      focusPreparationCheck(
        nextPreparationCheck,
        "IN_PROGRESS",
      )
    } catch {
      setNextActionError(
        "Impossible de démarrer cette action.",
      )
    } finally {
      setStartingNextAction(false)
    }
  }



  return (
    <div className="dossier-detail-page">
      <div className="dossier-navigation-actions">
        <button
          type="button"
          className="dossier-analysis-button"
          onClick={() => {
            if (
              !refConsultation
              || !orgAcronyme
            ) {
              return
            }

            navigate(
              `/workspace/${encodeURIComponent(
                refConsultation,
              )}/${encodeURIComponent(
                orgAcronyme,
              )}`,
            )
          }}
        >
          ← Espace d’étude
        </button>
      </div>


      <section className="dossier-v65-command">

        <div className="dossier-v65-main">

          <div className="dossier-v65-heading">

            <span className="dossier-v65-eyebrow">
              PRÉPARATION
            </span>

            <h1>
              {opportunity.identity.title
                || "Appel d’offres"}
            </h1>

            <div className="dossier-v65-meta">

              <span>
                {opportunity.identity.reference
                  || opportunity.identity
                    .ref_consultation}
              </span>

              <i />

              <span>
                {opportunity.identity.buyer
                  || "Acheteur non renseigné"}
              </span>

              <i />

              <strong>
                Échéance{" "}
                {deadlineLabel(
                  opportunity.deadline.raw,
                  opportunity.deadline.iso,
                )}
              </strong>

            </div>

          </div>


          <div className="dossier-v65-progress">

            <div
              className="dossier-v65-ring"
              style={{
                background:
                  `conic-gradient(
                    #1780b7 ${preparationPercent}%,
                    #e5edf3 ${preparationPercent}% 100%
                  )`,
              }}
            >
              <div>
                <strong>
                  {preparationPercent}%
                </strong>

                <span>
                  PRÊT
                </span>
              </div>
            </div>

            <div className="dossier-v65-progress-copy">

              <strong>
                {preparationCounts.ready}
                {" / "}
                {preparationCounts.total}
              </strong>

              <span>
                éléments prêts
              </span>

            </div>

          </div>

        </div>


        <div className="dossier-v65-stats">

          <div>
            <strong>
              {preparationCounts.pending}
            </strong>

            <span>
              À traiter
            </span>
          </div>

          <div>
            <strong>
              {preparationCounts.inProgress}
            </strong>

            <span>
              En cours
            </span>
          </div>

          <div
            className={
              preparationCounts.impossible
                ? "danger"
                : ""
            }
          >
            <strong>
              {preparationCounts.impossible}
            </strong>

            <span>
              Bloqué
            </span>
          </div>

          <div className="ready">
            <strong>
              {preparationCounts.ready}
            </strong>

            <span>
              Prêts
            </span>
          </div>

        </div>

      </section>


      <section
        className={
          "dossier-v65-priority "
          + (
            !preparationAvailable
              ? "waiting"
              : preparationFinished
                ? "ready"
                : preparationCounts.impossible > 0
                  ? "danger"
                  : "active"
          )
        }
      >

        <div className="dossier-v65-priority-icon">
          {
            preparationFinished
              ? "✓"
              : preparationCounts.impossible > 0
                ? "!"
                : "→"
          }
        </div>


        <div className="dossier-v65-priority-copy">

          <span>
            {
              preparationFinished
                ? "DOSSIER PRÊT"
                : "PRIORITÉ"
            }
          </span>

          {!preparationAvailable ? (
            <>
              <strong>
                Décision GO requise
              </strong>

              <p>
                Revenez à l’étude pour ouvrir
                officiellement la préparation.
              </p>
            </>
          ) : preparationFinished ? (
            <>
              <strong>
                Tous les éléments sont prêts
              </strong>

              <p>
                Le dossier peut maintenant passer
                à la phase de soumission.
              </p>
            </>
          ) : nextPreparationCheck ? (
            <>
              <strong>
                {checkName(
                  nextPreparationCheck,
                )}
              </strong>

              <p>
                {String(
                  nextPreparationActionText,
                )}
              </p>

              {nextActionError && (
                <small className="dossier-v58-error">
                  {nextActionError}
                </small>
              )}
            </>
          ) : (
            <strong>
              Aucune action restante
            </strong>
          )}

        </div>


        <div className="dossier-v65-priority-action">

          {
            !preparationAvailable ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    !refConsultation
                    || !orgAcronyme
                  ) {
                    return
                  }

                  navigate(
                    `/workspace/${encodeURIComponent(
                      refConsultation,
                    )}/${encodeURIComponent(
                      orgAcronyme,
                    )}`,
                  )
                }}
              >
                Retour à l’étude
              </button>
            ) : preparationFinished ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    !refConsultation
                    || !orgAcronyme
                  ) {
                    return
                  }

                  navigate(
                    `/workspace/${encodeURIComponent(
                      refConsultation,
                    )}/${encodeURIComponent(
                      orgAcronyme,
                    )}`,
                    {
                      state: {
                        focusWorkflow: true,
                      },
                    },
                  )
                }}
              >
                Passer à la soumission
                <b>→</b>
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  startingNextAction
                  || !nextPreparationCheck
                }
                onClick={() => {
                  void handleNextPreparationAction()
                }}
              >
                {
                  startingNextAction
                    ? "Démarrage…"
                    : nextPreparationStatus
                        === "IMPOSSIBLE"
                      ? "Résoudre"
                      : nextPreparationStatus
                          === "IN_PROGRESS"
                        ? "Continuer"
                        : "Commencer"
                }

                <b>→</b>
              </button>
            )
          }

        </div>

      </section>


      <section className="dossier-v65-toolbar">

        <div className="dossier-v65-section-title">

          <span>
            DOSSIER DE PRÉPARATION
          </span>

          <strong>
            {
              preparationCounts.pending
              + preparationCounts.inProgress
              + preparationCounts.impossible
            }
            {" "}
            action{
              (
                preparationCounts.pending
                + preparationCounts.inProgress
                + preparationCounts.impossible
              ) === 1
                ? ""
                : "s"
            }
            {" "}
            restante{
              (
                preparationCounts.pending
                + preparationCounts.inProgress
                + preparationCounts.impossible
              ) === 1
                ? ""
                : "s"
            }
          </strong>

        </div>


        <div className="dossier-v65-filters">

          <button
            type="button"
            className={
              filter === "PENDING"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("PENDING")
            }
          >
            À traiter
            <b>
              {preparationCounts.pending}
            </b>
          </button>

          <button
            type="button"
            className={
              filter === "IN_PROGRESS"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("IN_PROGRESS")
            }
          >
            En cours
            <b>
              {preparationCounts.inProgress}
            </b>
          </button>

          <button
            type="button"
            className={
              filter === "READY"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("READY")
            }
          >
            Prêts
            <b>
              {preparationCounts.ready}
            </b>
          </button>

          {
            preparationCounts.impossible > 0 && (
              <button
                type="button"
                className={
                  filter === "IMPOSSIBLE"
                    ? "active danger"
                    : "danger"
                }
                onClick={() =>
                  setFilter("IMPOSSIBLE")
                }
              >
                Bloqués
                <b>
                  {
                    preparationCounts
                      .impossible
                  }
                </b>
              </button>
            )
          }

          <button
            type="button"
            className={
              filter === "ALL"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("ALL")
            }
          >
            Tous
            <b>
              {preparationCounts.total}
            </b>
          </button>

        </div>

      </section>


      <section className="dossier-worklist">
        {filteredPreparationChecks.length === 0 ? (
          <div className="dossier-checklist-empty">
            Aucun contrôle dans cette catégorie.
          </div>
        ) : (
          workGroups.map(
            (group) => {
              const lots =
                Array.from(
                  new Set(
                    group.checks.map(
                      (check) =>
                        check.lotNumber
                        || "GLOBAL",
                    ),
                  ),
                )

              return (
                <section
                  key={group.key}
                  className={
                    "dossier-work-group "
                    + group.key
                      .toLowerCase()
                  }
                >
                  <header className="dossier-work-group-head">
                    <div>
                      <span>
                        {group.label}
                      </span>

                      <p>
                        {group.description}
                      </p>
                    </div>

                    <strong>
                      {group.checks.length}
                    </strong>
                  </header>

                  <div className="dossier-work-group-body">
                    {lots.map(
                      (lot) => {
                        const lotChecks =
                          group.checks.filter(
                            (check) =>
                              (
                                check.lotNumber
                                || "GLOBAL"
                              ) === lot,
                          )

                        return (
                          <div
                            key={
                              group.key
                              + ":"
                              + lot
                            }
                            className="dossier-work-lot"
                          >
                            <div className="dossier-work-lot-head">
                              <span>
                                {lot === "GLOBAL"
                                  ? "Exigences communes"
                                  : `Lot ${lot}`}
                              </span>

                              <small>
                                {lotChecks.length}
                                {" "}
                                point
                                {lotChecks.length > 1
                                  ? "s"
                                  : ""}
                              </small>
                            </div>

                            <div className="dossier-checklist">
                              {lotChecks.map(
                                (
                                  check,
                                  index,
                                ) => (
                                  <DossierCheck
                                    key={
                                      (
                                        check.lotNumber
                                        || "global"
                                      )
                                      + ":"
                                      + (
                                        check.code
                                        || index
                                      )
                                      + ":"
                                      + index
                                    }
                                    check={check}
                                    lotNumber={
                                      check.lotNumber
                                    }
                                  canPrepare={preparationAvailable}
            companyDocuments={
              companyDocuments
            }
            onManageDocuments={(
              documentId,
            ) => {
              const destination =
                documentId
                  ? (
                    "/company?tab=documents"
                    + "&focus=company-document-"
                    + documentId
                  )
                  : "/company?tab=documents"

              navigate(destination)
            }}
                                  />
                                ),
                              )}
                            </div>
                          </div>
                        )
                      },
                    )}
                  </div>
                </section>
              )
            },
          )
        )}
      </section>
    </div>
  )
}
