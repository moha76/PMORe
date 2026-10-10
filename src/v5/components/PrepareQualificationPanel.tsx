import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, History, Save } from "lucide-react"

import {
  getPrepareQualificationHistory,
  savePrepareQualification,
  type PrepareQualification,
  type PrepareRequirement,
} from "../../api/prepare"

type Props = {
  refConsultation: string
  orgAcronyme: string
  lotNumber: string
  requirement: PrepareRequirement
}

const OPTIONS: { value: PrepareQualification; label: string }[] = [
  { value: "TO_QUALIFY", label: "À qualifier" },
  { value: "REQUIRED", label: "Pièce exigée" },
  { value: "OPTIONAL", label: "Pièce facultative" },
  { value: "NOT_APPLICABLE", label: "Non applicable" },
]

function errorMessage(error: unknown): string {
  const e = error as {
    status?: number
    statusCode?: number
    response?: { status?: number }
  } | null

  const status = e?.status ?? e?.statusCode ?? e?.response?.status

  if (status === 409) {
    return "Cette exigence a été modifiée entre-temps. Rechargez le registre avant de réessayer."
  }
  if (status === 401 || status === 403) {
    return "Votre session ou vos autorisations ne permettent pas cet enregistrement."
  }
  if (status === 422) {
    return "Qualification refusée : vérifiez la portée du lot, la source DCE et les informations fournies."
  }
  return "Enregistrement impossible. Vérifiez la connexion et réessayez."
}

export function PrepareQualificationPanel({
  refConsultation,
  orgAcronyme,
  lotNumber,
  requirement,
}: Props) {
  const client = useQueryClient()
  const [status, setStatus] = useState<PrepareQualification>(
    requirement.qualification,
  )
  const [justification, setJustification] = useState("")
  const [excerpt, setExcerpt] = useState(
    requirement.source.snippet?.trim() ?? "",
  )
  const [scopeReviewed, setScopeReviewed] = useState(
    requirement.scope_reviewed,
  )
  const [success, setSuccess] = useState(false)

  const sourceId = requirement.source_requirement_id
  const qualified = requirement.qualification_recorded

  const historyKey = [
    "v5-prepare-history",
    refConsultation,
    orgAcronyme,
    lotNumber,
    sourceId,
  ]

  const history = useQuery({
    queryKey: historyKey,
    queryFn: () => getPrepareQualificationHistory(
      refConsultation,
      orgAcronyme,
      lotNumber,
      sourceId,
    ),
    enabled: qualified,
    retry: false,
  })

  const save = useMutation({
    mutationFn: () => savePrepareQualification(
      refConsultation,
      orgAcronyme,
      lotNumber,
      sourceId,
      {
        status,
        expected_revision: requirement.qualification_revision,
        scope_reviewed: scopeReviewed,
        source_document_id: requirement.source.document_id,
        source_page: requirement.source.page,
        reviewed_excerpt: status === "TO_QUALIFY"
          ? null
          : excerpt.trim(),
        justification: justification.trim(),
      },
    ),
    onSuccess: async () => {
      setSuccess(true)
      setJustification("")
      await client.invalidateQueries({
        queryKey: [
          "v5-prepare-register",
          refConsultation,
          orgAcronyme,
          lotNumber,
        ],
      })
      await client.invalidateQueries({ queryKey: historyKey })
    },
    onError: () => setSuccess(false),
  })

  const sourceAvailable =
    requirement.source.document_id !== null &&
    Boolean(requirement.source.snippet?.trim())

  const needsProof = status !== "TO_QUALIFY"
  const commonScopeNeedsReview =
    needsProof &&
    requirement.scope === "COMMON_CANDIDATE" &&
    !scopeReviewed

  const canSave =
    justification.trim().length >= 10 &&
    !commonScopeNeedsReview &&
    (!needsProof || (
      sourceAvailable &&
      excerpt.trim().length > 0 &&
      (requirement.source.snippet ?? "")
        .replace(/\s+/g, " ").toLocaleLowerCase()
        .includes(
          excerpt.trim()
            .replace(/\s+/g, " ")
            .toLocaleLowerCase(),
        )
    )) &&
    !save.isPending

  const excerptMatches = (
    (requirement.source.snippet ?? "")
      .replace(/\s+/g, " ")
      .toLocaleLowerCase()
      .includes(
        excerpt.trim()
          .replace(/\s+/g, " ")
          .toLocaleLowerCase(),
      )
  )

  const blockers: string[] = []

  if (justification.trim().length < 10) {
    blockers.push("Renseignez une justification d'au moins 10 caractères.")
  }

  if (commonScopeNeedsReview) {
    blockers.push("Confirmez que l'exigence concerne le lot sélectionné.")
  }

  if (needsProof && !sourceAvailable) {
    blockers.push("La référence documentaire doit être disponible.")
  } else if (needsProof && !excerpt.trim()) {
    blockers.push("Renseignez le passage vérifié dans le DCE.")
  } else if (needsProof && !excerptMatches) {
    blockers.push("Le passage doit correspondre à l'extrait source.")
  }

  const hasUnsavedChanges =
    status !== requirement.qualification ||
    scopeReviewed !== requirement.scope_reviewed ||
    justification.trim().length > 0 ||
    excerpt.trim() !== (requirement.source.snippet?.trim() ?? "")

  return (
    <section className="m5-prep-qualification">
      <div className="m5-prep-qualification-heading">
        <h3>Qualifier cette exigence</h3>
        <p>
          Une qualification documentée n'est pas une validation
          du fichier correspondant.
        </p>
      </div>

      <form onSubmit={event => {
        event.preventDefault()
        if (canSave) {
          setSuccess(false)
          save.mutate()
        }
      }}>
        <label className="m5-prep-field">
          <span>Décision documentaire</span>
          <select
            value={status}
            onChange={event => {
              setStatus(event.target.value as PrepareQualification)
              setSuccess(false)
            }}
          >
            {OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {requirement.scope === "COMMON_CANDIDATE" && needsProof && (
          <label className="m5-prep-check">
            <input
              type="checkbox"
              checked={scopeReviewed}
              onChange={event => setScopeReviewed(event.target.checked)}
            />
            <span>
              J'ai vérifié que cette exigence commune au marché
              concerne bien le lot sélectionné.
            </span>
          </label>
        )}

        {needsProof && (
          <label className="m5-prep-field">
            <span>Passage vérifié dans le DCE</span>
            <textarea
              rows={4}
              value={excerpt}
              onChange={event => setExcerpt(event.target.value)}
              placeholder="Sélectionnez un passage exact du document source."
            />
            <small>
              Le passage doit être présent dans l'extrait
              documentaire enregistré. Vérifiez son sens
              avant de qualifier.
            </small>
          </label>
        )}

        <label className="m5-prep-field">
          <span>Justification de la décision *</span>
          <textarea
            rows={3}
            value={justification}
            onChange={event => {
              setJustification(event.target.value)
              setSuccess(false)
            }}
            maxLength={4000}
            placeholder="Indiquez pourquoi cette pièce est exigée, facultative ou non applicable."
          />
          <small>Au moins 10 caractères. Décision tracée dans l'historique.</small>
        </label>

        {needsProof && !sourceAvailable && (
          <p className="m5-prep-form-warning">
            <AlertTriangle size={16} />
            La source documentaire n'est pas suffisamment renseignée.
            Cette qualification ne peut pas être enregistrée.
          </p>
        )}

        {save.isError && (
          <p role="alert" className="m5-prep-form-warning">
            <AlertTriangle size={16} />
            {errorMessage(save.error)}
          </p>
        )}

        {success && !save.isError && (
          <p role="status" className="m5-prep-form-success">
            <CheckCircle2 size={16} />
            Qualification enregistrée. Le registre a été actualisé.
          </p>
        )}

        {hasUnsavedChanges && !save.isPending && !success && (
          <p className="m5-prep-unsaved">
            Modifications non enregistrées
          </p>
        )}

        {blockers.length > 0 && (
          <div className="m5-prep-validation" role="status">
            <strong>Pour enregistrer :</strong>
            <ul>
              {blockers.map(message => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          className="m5-prep-save"
          type="submit"
          disabled={!canSave}
        >
          <Save size={17} />
          {save.isPending ? "Enregistrement…" : "Enregistrer la qualification"}
        </button>
      </form>

      <div className="m5-prep-history">
        <h3><History size={17} /> Historique des décisions</h3>

        {!qualified && (
          <p>Aucune qualification enregistrée pour cette exigence.</p>
        )}

        {qualified && history.isPending && (
          <p>Chargement de l'historique…</p>
        )}

        {qualified && history.isError && (
          <p role="alert">
            Historique indisponible.
            <button
              type="button"
              className="m5-prep-history-retry"
              onClick={() => void history.refetch()}
            >
              Réessayer
            </button>
          </p>
        )}

        {history.data?.data.events.map(event => (
          <article className="m5-prep-history-event" key={event.id}>
            <div>
              <strong>Révision {event.new_revision}</strong>
              <span>
                {event.recorded_at
                  ? new Date(event.recorded_at).toLocaleString("fr-FR")
                  : "Date non disponible"}
              </span>
            </div>
            <p>
              {OPTIONS.find(o => o.value === event.new_status)?.label
                ?? event.new_status}
            </p>
            <small>{event.justification}</small>
          </article>
        ))}

        {history.data?.data.pagination.has_more && (
          <p>
            Historique partiel : seules les 50 dernières
            entrées sont actuellement affichées.
          </p>
        )}
      </div>
    </section>
  )
}
