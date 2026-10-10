import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, Clock3, History, XCircle } from "lucide-react"
import { apiGet, apiPost } from "../../api/client"

type Decision = "ACCEPTED" | "REJECTED"
type Review = {
  id: number
  review_revision: number
  decision: Decision
  justification: string
  reviewed_by: number
  reviewed_at: string
}
type ReviewData = {
  current_decision: Decision | "PENDING_REVIEW"
  current_revision: number
  history: Review[]
}
type Props = {
  base: string
  versionId: number
}

function errorText(error: unknown): string {
  const status = (error as { status?: number } | null)?.status
  if (status === 409) {
    return "Conflit de révision : une autre décision a été enregistrée. Actualisez avant de recommencer."
  }
  if (status === 401) return "Session expirée. Reconnectez-vous."
  if (status === 403) return "Vous n'avez pas l'autorisation de contrôler cette pièce."
  if (status === 404) return "Cette version n'est plus accessible."
  if (status === 422) return "Décision refusée. Vérifiez la justification."
  return "Enregistrement impossible. Vérifiez votre connexion."
}

export function PrepareDocumentReview({ base, versionId }: Props) {
  const client = useQueryClient()
  const path = `${base}/${versionId}/reviews`
  const queryKey = ["v5-document-reviews", base, versionId]
  const [decision, setDecision] = useState<Decision | null>(null)
  const [justification, setJustification] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const [success, setSuccess] = useState("")

  const reviews = useQuery({
    queryKey,
    queryFn: () => apiGet<{ data: ReviewData }>(path),
    retry: false,
  })

  const save = useMutation({
    mutationFn: (payload: {
      decision: Decision
      justification: string
      expected_revision: number
    }) => apiPost(path, payload),
    onSuccess: async () => {
      setDecision(null)
      setJustification("")
      setSuccess("Décision enregistrée dans l'historique.")
      await Promise.all([client.invalidateQueries({ queryKey }), client.invalidateQueries({ predicate: query => ["v5-document-summary", "v5-submit-preflight"].includes(String(query.queryKey[0])) })])
    },
    onError: async (error: unknown) => {
      setSuccess("")
      if ((error as { status?: number } | null)?.status === 409) {
        await Promise.all([client.invalidateQueries({ queryKey }), client.invalidateQueries({ predicate: query => ["v5-document-summary", "v5-submit-preflight"].includes(String(query.queryKey[0])) })])
      }
    },
  })

  const current = reviews.data?.data
  const valid = justification.trim().length >= 10
    && justification.trim().length <= 4000
  const canSubmit =
    !!decision && valid && !!current && !save.isPending && !reviews.isFetching

  function select(next: Decision) {
    setDecision(next)
    setSuccess("")
    save.reset()
  }

  return (
    <div className="m5-review">
      <div className="m5-review-head">
        <strong>Contrôle documentaire</strong>
        {reviews.isSuccess && current && (
          <span className={`m5-review-status status-${current.current_decision.toLowerCase()}`}>
            {current.current_decision === "ACCEPTED"
              ? "Accepté"
              : current.current_decision === "REJECTED"
                ? "Rejeté"
                : "À contrôler"}
          </span>
        )}
      </div>

      {reviews.isLoading && <p>Chargement du contrôle…</p>}

      {reviews.isError && (
        <div className="m5-review-alert" role="alert">
          Impossible de charger le contrôle.
          <button type="button" onClick={() => void reviews.refetch()}>
            Réessayer
          </button>
        </div>
      )}

      {reviews.isSuccess && current && (
        <>
          <p className="m5-review-caption">
            Révision actuelle : {current.current_revision}.
            Vérifiez le PDF et les exigences du DCE avant de décider.
          </p>

          <div className="m5-review-choices">
            <button
              type="button"
              className={decision === "ACCEPTED" ? "selected accept" : ""}
              aria-pressed={decision === "ACCEPTED"}
              disabled={save.isPending}
              onClick={() => select("ACCEPTED")}
            >
              <CheckCircle2 size={16} /> Accepter
            </button>
            <button
              type="button"
              className={decision === "REJECTED" ? "selected reject" : ""}
              aria-pressed={decision === "REJECTED"}
              disabled={save.isPending}
              onClick={() => select("REJECTED")}
            >
              <XCircle size={16} /> Rejeter
            </button>
          </div>

          {decision && (
            <div className="m5-review-decision">
              <label>
                Justification obligatoire
                <textarea
                  value={justification}
                  maxLength={4000}
                  rows={3}
                  disabled={save.isPending}
                  onChange={event => {
                    setJustification(event.target.value)
                    setSuccess("")
                  }}
                  placeholder={
                    decision === "ACCEPTED"
                      ? "Précisez les éléments vérifiés dans la pièce et leur correspondance avec le DCE."
                      : "Expliquez ce qui manque ou ne correspond pas à l'exigence."
                  }
                />
              </label>
              <small>{justification.trim().length} / 4 000 caractères · minimum 10</small>
              <p className="m5-review-warning">
                <AlertTriangle size={15} />
                Cette action inscrit une nouvelle décision définitive
                dans le journal. Une correction créera une autre révision.
              </p>
              <button
                type="button"
                className="m5-review-confirm"
                disabled={!canSubmit}
                onClick={() => {
                  if (!canSubmit || !decision || !current) return
                  save.mutate({
                    decision,
                    justification: justification.trim(),
                    expected_revision: current.current_revision,
                  })
                }}
              >
                {save.isPending
                  ? "Enregistrement…"
                  : `Confirmer : ${decision === "ACCEPTED" ? "Accepter" : "Rejeter"}`}
              </button>
            </div>
          )}

          {save.isError && (
            <p role="alert" className="m5-review-error">
              {errorText(save.error)}
            </p>
          )}

          {success && (
            <p role="status" className="m5-review-success">{success}</p>
          )}

          <div className="m5-review-history-head">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              aria-expanded={showHistory}
            >
              <History size={15} />
              {showHistory ? "Masquer" : "Afficher"} l'historique
              ({current.history.length})
            </button>
            <button
              type="button"
              disabled={reviews.isFetching || save.isPending}
              onClick={() => void reviews.refetch()}
            >
              Actualiser
            </button>
          </div>

          {showHistory && (
            <div className="m5-review-history">
              {current.history.length === 0 ? (
                <p>Aucune décision enregistrée.</p>
              ) : current.history.map(item => (
                <div key={item.id} className="m5-review-history-item">
                  <strong>
                    {item.decision === "ACCEPTED" ? "Accepté" : "Rejeté"}
                    {" · Révision "}{item.review_revision}
                  </strong>
                  <small><Clock3 size={13} /> {item.reviewed_at} · Utilisateur {item.reviewed_by}</small>
                  <p>{item.justification}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
