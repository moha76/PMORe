import { dateLabel } from "../../premium/format"
import { useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CheckCircle2, Clock3, CircleX, ClipboardCheck,
  Save, LoaderCircle, AlertTriangle, ShieldCheck,
} from "lucide-react"
import {
  getLotDecisions,
  saveLotDecision,
} from "../../api/opportunities"
import type {
  LotDecisionValue,
  LotDecisionsResponse,
} from "../../api/opportunities"

type Props = {
  refConsultation: string
  orgAcronyme: string
  lotNumber: string
}

const options = [
  {
    value: "GO",
    title: "Je souhaite participer",
    description: "Je souhaite préparer une offre pour ce périmètre.",
    icon: CheckCircle2,
  },
  {
    value: "LATER",
    title: "Je déciderai plus tard",
    description: "Je conserve mon étude pour décider plus tard.",
    icon: Clock3,
  },
  {
    value: "NO_GO",
    title: "Je ne souhaite pas participer",
    description: "Je ne déposerai pas d'offre pour ce périmètre.",
    icon: CircleX,
  },
] as const

export function LotDecisionPanel({
  refConsultation,
  orgAcronyme,
  lotNumber,
}: Props) {
  const queryClient = useQueryClient()
  const queryKey = [
    "v5-lot-decisions", refConsultation, orgAcronyme,
  ]

  const decisionsQuery = useQuery({
    queryKey,
    queryFn: () => getLotDecisions(refConsultation, orgAcronyme),
    retry: 1,
  })

  const saved = decisionsQuery.data?.data.decisions.find(
    x => x.lot_number === lotNumber
  )

  // null signifie aucune nouvelle sélection depuis l'ouverture.
  const [selected, setSelected] = useState<LotDecisionValue | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const choice = selected ?? saved?.decision ?? null
  const note = reason ?? saved?.reason ?? ""

  const mutation = useMutation({
    mutationFn: () => {
      if (!lotNumber || !choice) {
        throw new Error("Sélectionnez un lot et une décision.")
      }
      return saveLotDecision(
        refConsultation,
        orgAcronyme,
        lotNumber,
        choice,
        note.trim() || null
      )
    },
    onSuccess: response => {
      const previous = queryClient.getQueryData<LotDecisionsResponse>(
        queryKey
      )
      if (previous) {
        queryClient.setQueryData<LotDecisionsResponse>(
          queryKey,
          {
            ...previous,
            data: {
              ...previous.data,
              decisions: [
                ...previous.data.decisions.filter(
                  x => x.lot_number !== lotNumber
                ),
                response.data,
              ],
            },
          }
        )
      }
      setSelected(null)
      setReason(null)
      setSuccess(true)
      void queryClient.invalidateQueries({ queryKey })
      void queryClient.invalidateQueries({ queryKey: ["m05-dossiers"] })
      void queryClient.invalidateQueries({ queryKey: ["v5-prepare-access", refConsultation, orgAcronyme, lotNumber] })
    },
    onError: () => setSuccess(false),
  })

  const validLot = decisionsQuery.data?.data.valid_lots.includes(
    lotNumber
  ) ?? false

  const pending = mutation.isPending
  const dirty = selected !== null || reason !== null

  return (
    <section className="m5-decision" aria-label="Décision de participation">
      <div className="m5-decision__head">
        <div className="m5-decision__heading">
          <span className="m5-decision__symbol">
            <ClipboardCheck size={22} aria-hidden="true" />
          </span>
          <div>
            <span className="m5-decision__eyebrow">
              DÉCISION DE PARTICIPATION
            </span>
            <h2>Ma décision</h2>
            <p className="m5-decision__scope">
              {lotNumber === "GLOBAL"
                ? "Participation au marché entier"
                : lotNumber ? `Participation au lot ${lotNumber}` : "Périmètre à déterminer"}
            </p>
          </div>
        </div>
        <span className="m5-decision__state">
          {saved && !validLot
            ? "Décision historique"
            : saved && !dirty
              ? "Décision enregistrée"
              : "À confirmer"}
        </span>
      </div>

      {decisionsQuery.isPending ? (
        <div className="m5-decision__notice" role="status">
          <LoaderCircle size={17} />
          Chargement de la décision…
        </div>
      ) : decisionsQuery.isError ? (
        <div className="m5-decision__notice m5-decision__notice--error"
          role="alert">
          <AlertTriangle size={18} />
          Impossible de récupérer les décisions.
          <button type="button"
            onClick={() => void decisionsQuery.refetch()}>
            Réessayer
          </button>
        </div>
      ) : (
        <>
          {!validLot && (
            <p className="m5-decision__notice" role="alert">
              Le périmètre de ce lot reste à confirmer.
              Vous pouvez consulter l'étude et les décisions
              antérieures, mais vous ne pouvez pas enregistrer
              une nouvelle décision pour le moment.
            </p>
          )}

          <div className="m5-decision__choices">
            {options.map(option => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`m5-decision__choice ${
                    choice === option.value ? "is-active" : ""
                  }`}
                  aria-pressed={choice === option.value}
                  disabled={!validLot || pending}
                  onClick={() => {
                    setSelected(option.value)
                    setSuccess(false)
                  }}
                >
                  <span className={`m5-decision__option-icon m5-decision__option-icon--${option.value}`}>
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span className="m5-decision__option-copy">
                    <strong>{option.title}</strong>
                    <small>{option.description}</small>
                  </span>
                  <span className="m5-decision__radio"
                    aria-hidden="true" />
                </button>
              )
            })}
          </div>

          <label className="m5-decision__label"
            htmlFor="m5-decision-reason">
            Motif ou commentaire
            <span>Facultatif</span>
          </label>
          <textarea
            id="m5-decision-reason"
            className="m5-decision__textarea"
            maxLength={1000}
            rows={3}
            value={note}
            disabled={!validLot || pending}
            placeholder="Ajoutez une précision utile à votre décision…"
            onChange={event => {
              setReason(event.target.value)
              setSuccess(false)
            }}
          />

          <div className="m5-decision__actions">
            <span>
              <ShieldCheck size={16} aria-hidden="true" />
              Enregistrement sécurisé par entreprise et par lot
            </span>
            <button
              type="button"
              className="m5-decision__save"
              disabled={!validLot || !choice || pending || !dirty}
              onClick={() => mutation.mutate()}
            >
              {pending
                ? <LoaderCircle size={17} aria-hidden="true" />
                : <Save size={17} aria-hidden="true" />}
              {pending ? "Enregistrement…" : "Enregistrer ma décision"}
            </button>
          </div>

          {mutation.isError && (
            <p role="alert" className="m5-decision__feedback--error">
              Échec de l'enregistrement. Aucune confirmation reçue.
              Vérifiez votre connexion et réessayez.
            </p>
          )}

          {success && (
            <p role="status" className="m5-decision__feedback--success">
              <CheckCircle2 size={18} />
              Décision enregistrée pour {lotNumber === "GLOBAL" ? "le marché entier" : `le lot ${lotNumber}`}.
            </p>
          )}

          {/* M03-A2 — Préparer seulement après GO enregistré */}
          {saved?.decision === "GO" && !dirty && !pending &&
            !mutation.isError && validLot && (
            <div className="m5-decision__next">
              <div>
                <strong>Votre participation est enregistrée</strong>
                <p>
                  Ouvrez la préparation {lotNumber === "GLOBAL" ? "du marché entier" : `du lot ${lotNumber}`}.
                  Les conditions non résolues restent à traiter.
                </p>
              </div>
              <Link
                className="m5-decision__prepare-link"
                to={`/v5/prepare/${
                  encodeURIComponent(refConsultation)
                }/${
                  encodeURIComponent(orgAcronyme)
                }/${
                  encodeURIComponent(lotNumber)
                }`}
              >
                Passer à Préparer
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}

          {saved && (
            <p className="m5-decision__history">
              Dernière décision : {saved.decision === "GO"
                ? "Participer"
                : saved.decision === "LATER"
                  ? "Décider plus tard"
                  : "Ne pas participer"}
              {" · "}
              Mise à jour : {dateLabel(saved.updated_at)}
              {" · "}
              Auteur n°{saved.actor_user_id}
            </p>
          )}
        </>
      )}
    </section>
  )
}
