import { Dialog } from "../../premium/Dialog"
import { dateLabel } from "../../premium/format"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, Clock3 } from "lucide-react"

import { ApiError } from "../../api/client"
import { getOpportunityDetail } from "../../api/opportunities"
import {
  getLotSubmissionV5,
  declareLotSubmissionV5,
  cancelLotSubmissionV5,
} from "../../api/submissionsV5"

// M04_F7_PREFLIGHT_INTEGRATION
import { SubmitPreflight } from "../components/SubmitPreflight"
import "../styles/submit.css"

function localDateTime(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "Le dossier a changé. Actualisez les données avant de recommencer."
    }
    if (error.status === 403) {
      return "Accès refusé ou vérification de sécurité CSRF échouée."
    }
    if (error.status === 422) {
      return "Certaines données sont invalides. Vérifiez les champs."
    }
    return `Erreur API HTTP ${error.status}.`
  }
  return "Impossible de terminer cette opération."
}

export function SubmitPage() {
  const { refConsultation, orgAcronyme, lotNumber } = useParams()
  const client = useQueryClient()

  const valid = Boolean(refConsultation && orgAcronyme && lotNumber)

  const key = [
    "v5-lot-submission",
    refConsultation,
    orgAcronyme,
    lotNumber,
  ]

  const dossier = useQuery({
    queryKey: key,
    queryFn: () => getLotSubmissionV5(
      refConsultation!,
      orgAcronyme!,
      lotNumber!,
    ),
    enabled: valid,
    retry: false,
  })

  // M04_P3_UNIFIED_MARKET_HERO
  const market = useQuery({
    queryKey: ["m04-market-header", refConsultation, orgAcronyme],
    queryFn: () => getOpportunityDetail(
      refConsultation!,
      orgAcronyme!,
    ),
    enabled: Boolean(refConsultation && orgAcronyme),
    retry: false,
  })

  const [reference, setReference] = useState("")
  const [date, setDate] = useState("")
  const [notes, setNotes] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [message, setMessage] = useState("")
  const [confirmCancel, setConfirmCancel] = useState(false)

  useEffect(() => {
    if (!dossier.data) return

    const current = dossier.data.submission
    setReference(current?.submission_reference ?? "")
    setDate(localDateTime(current?.declared_submitted_at ?? null))
    setNotes(current?.submission_notes ?? "")
    setConfirmed(false)
  }, [dossier.data])

  const refresh = async () => {
    await Promise.all([client.invalidateQueries({ queryKey: key }), client.invalidateQueries({ queryKey: ["m05-dossiers"] })])
  }

  const declare = useMutation({
    mutationFn: () => {
      const parsed = new Date(date)
      if (!date || Number.isNaN(parsed.getTime())) {
        throw new Error("Date invalide")
      }

      return declareLotSubmissionV5(
        refConsultation!,
        orgAcronyme!,
        lotNumber!,
        {
          expected_revision: dossier.data?.submission?.revision ?? 0,
          submission_reference: reference.trim(),
          declared_submitted_at: parsed.toISOString(),
          submission_notes: notes.trim() || null,
        },
      )
    },
    onSuccess: async () => {
      setMessage("Déclaration enregistrée dans MOR.")
      setConfirmed(false)
      await refresh()
    },
    onError: error => {
      setMessage(errorMessage(error))
    },
  })

  const cancel = useMutation({
    mutationFn: () => cancelLotSubmissionV5(
      refConsultation!,
      orgAcronyme!,
      lotNumber!,
      {
        expected_revision: dossier.data?.submission?.revision ?? 0,
      },
    ),
    onSuccess: async () => {
      setMessage("Déclaration annulée dans MOR. Historique conservé.")
      setConfirmed(false)
      await refresh()
    },
    onError: error => {
      setMessage(errorMessage(error))
    },
  })

  const base = valid
    ? `/v5/prepare/${encodeURIComponent(refConsultation!)}/` +
      `${encodeURIComponent(orgAcronyme!)}/` +
      `${encodeURIComponent(lotNumber!)}`
    : "/v5/discover"

  if (!valid) {
    return <main className="m5-submit">
      <h1>Dossier non identifié</h1>
      <Link to="/v5/discover">Retour à Découvrir</Link>
    </main>
  }

  if (dossier.isPending) {
    return <main className="m5-submit" role="status">
      <Clock3 size={25} />
      <h1>Chargement de la soumission…</h1>
    </main>
  }

  if (dossier.isError || !dossier.data) {
    return <main className="m5-submit">
      <h1>Impossible d'ouvrir la soumission</h1>
      <p>{errorMessage(dossier.error)}</p>
      <Link to={base}>Retour à Préparer</Link>
    </main>
  }

  const data = dossier.data
  const active = data.status === "DECLARED"
  const busy = declare.isPending || cancel.isPending
  const parsedDate = date ? new Date(date) : null
  const dateValid = Boolean(
    parsedDate && !Number.isNaN(parsedDate.getTime())
  )
  const canDeclare = (
    confirmed &&
    reference.trim().length > 0 &&
    reference.trim().length <= 200 &&
    notes.length <= 2000 &&
    dateValid &&
    !busy
  )

  return (
    <main className="m5-submit">

      <header className="m5-submit-header m04-market-hero">
        <div className="m04-market-hero-main">
          <span className="m5-submit-eyebrow">
            04 / SOUMETTRE · DÉCLARATION DE DÉPÔT EXTERNE
          </span>

          <h1>
            {market.data?.data.identity.title ||
              `Appel d'offres ${refConsultation}`}
          </h1>

          <div className="m04-market-meta">
            <span>
              {market.data?.data.identity.buyer ||
                "Acheteur non renseigné"}
            </span>
            <span>
              Réf. {market.data?.data.identity.reference ||
                refConsultation}
            </span>
          </div>

          <div className="m04-market-tags">
            <span className="m04-market-scope">
              {lotNumber === "GLOBAL"
                ? "Marché global · Participation unique"
                : `Lot ${lotNumber}`}
            </span>
            <span className={`m5-submit-status ${active ? "is-active" : ""}`}>
              {active ? "Dépôt déclaré dans MOR" :
                data.status === "CANCELLED"
                  ? "Déclaration annulée"
                  : "Non déclaré"}
            </span>
          </div>
        </div>

        <aside className="m04-market-hero-aside">
          <span className="m04-market-deadline-label">
            Date limite
          </span>
          <strong>
            {dateLabel(market.data?.data.deadline?.iso || market.data?.data.deadline?.raw)}
          </strong>
          <small>
            {market.isError
              ? "Informations du marché indisponibles"
              : "Échéance de l'appel d'offres"}
          </small>
        </aside>
      </header>

      <SubmitPreflight
        refConsultation={refConsultation!}
        orgAcronyme={orgAcronyme!}
        lotNumber={lotNumber!}
        prepareUrl={base}
      />

      {data.legacy_submission && (
        <section className="m5-submit-legacy">
          <strong>Soumission historique V4 détectée</strong>
          <p>
            Une déclaration antérieure existe pour cet appel d'offres,
            mais aucun numéro de lot n'y est associé.
            Elle n'est pas convertie automatiquement en soumission V5.
          </p>
          <small>
            Date enregistrée : {data.legacy_submission.submitted_at}
          </small>
        </section>
      )}

      {confirmCancel && <Dialog title="Annuler cette déclaration ?" onClose={() => setConfirmCancel(false)}><p>Cette action annule la déclaration dans MOR et conserve son historique. Elle ne retire pas l'offre du portail officiel.</p><div className="dialog-actions"><button className="premium-btn outline" onClick={() => setConfirmCancel(false)}>Conserver la déclaration</button><button className="premium-btn primary" disabled={busy} onClick={() => { setConfirmCancel(false); setMessage(""); cancel.mutate() }}>Annuler dans MOR</button></div></Dialog>}
      <div className="m5-submit-grid">
        <section className="m5-submit-panel">
          <h2>
            {active ? "Rectifier la déclaration" :
              "Déclarer un dépôt externe"}
          </h2>
          <p className="m5-submit-help">
            À remplir uniquement après un dépôt effectivement réalisé
            sur le portail officiel.
          </p>

          <label htmlFor="submission-reference">
            Référence du dépôt
          </label>
          <input
            id="submission-reference"
            maxLength={200}
            value={reference}
            onChange={event => {
              setReference(event.target.value)
              setConfirmed(false)
            }}
            placeholder="Référence fournie par le portail"
          />

          <label htmlFor="submission-date">
            Date et heure du dépôt
          </label>
          <input
            id="submission-date"
            type="datetime-local"
            value={date}
            onChange={event => {
              setDate(event.target.value)
              setConfirmed(false)
            }}
          />
          <small>
            Heure saisie selon le fuseau horaire de votre navigateur.
          </small>

          <label htmlFor="submission-notes">
            Observations facultatives
          </label>
          <textarea
            id="submission-notes"
            rows={4}
            maxLength={2000}
            value={notes}
            onChange={event => {
              setNotes(event.target.value)
              setConfirmed(false)
            }}
            placeholder="Informations complémentaires"
          />

          <label className="m5-submit-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={event => setConfirmed(event.target.checked)}
            />
            <span>
              Je confirme que le dépôt a réellement été effectué
              en dehors de MOR et que les informations saisies
              correspondent à ma déclaration.
            </span>
          </label>

          <button
            type="button"
            className="m5-submit-primary"
            disabled={!canDeclare}
            onClick={() => {
              setMessage("")
              declare.mutate()
            }}
          >
            {busy ? "Enregistrement…" :
              active ? "Enregistrer la rectification" :
              "Enregistrer la déclaration"}
          </button>

          {active && (
            <button
              type="button"
              className="m5-submit-secondary"
              disabled={busy}
              onClick={() => setConfirmCancel(true)}
            >
              Annuler la déclaration MOR
            </button>
          )}

          {message && (
            <p role="status" className="m5-submit-message">{message}</p>
          )}
        </section>

        <aside className="m5-submit-panel">
          <h2>État enregistré</h2>
          <div className="m5-submit-fact">
            <span>État actuel</span>
            <strong>{data.status}</strong>
          </div>
          <div className="m5-submit-fact">
            <span>Révision</span>
            <strong>{data.submission?.revision ?? 0}</strong>
          </div>
          <div className="m5-submit-fact">
            <span>Référence</span>
            <strong>
              {data.submission?.submission_reference ?? "—"}
            </strong>
          </div>

          <h3>Historique des événements</h3>
          {data.events.length === 0 ? (
            <p className="m5-submit-help">
              Aucun événement V5 enregistré pour ce lot.
            </p>
          ) : (
            <ol className="m5-submit-events">
              {data.events.map(event => (
                <li key={event.id}>
                  <CheckCircle2 size={15} />
                  <div>
                    <strong>{event.event_type}</strong>
                    <small>
                      {event.event_at} · Auteur {event.actor_id ?? "—"}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </main>
  )
}
