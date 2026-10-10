import { Link } from "react-router-dom"
import {
  ArrowLeft, FileText, History, LockKeyhole,
  ShieldCheck,
} from "lucide-react"
import type { HistoricalPrepareDetail } from "../../api/prepare"
import "../styles/historical-prepare.css"

type Props = {
  archive: HistoricalPrepareDetail
  studyUrl: string
}

function safeDate(value: string | null | undefined) {
  if (!value) return "Date non renseignée"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("fr-FR")
}

export function HistoricalPrepareArchive({
  archive,
  studyUrl,
}: Props) {
  return <main className="m5-prepare m5-historical">
    <header className="m5-historical__header">
      <Link className="m5-historical__back" to={studyUrl}>
        <ArrowLeft size={17} />
        Retour à Étudier
      </Link>
      <div className="m5-historical__heading">
        <div>
          <p className="m5-historical__eyebrow">
            MOR V5 · DOSSIER CONSERVÉ
          </p>
          <h1>Archive de préparation · Lot {archive.lot_number}</h1>
          <p>Marché {archive.ref_consultation}</p>
        </div>
        <span className="m5-historical__badge">
          <LockKeyhole size={15} />
          Lecture seule
        </span>
      </div>
    </header>

    <section className="m5-historical__notice">
      <ShieldCheck size={22} />
      <div>
        <strong>Votre travail est conservé</strong>
        <p>
          Les informations enregistrées sont consultables.
          Le périmètre du lot doit être confirmé pour
          reprendre une préparation ou une soumission.
          Aucune modification n'est possible ici.
        </p>
      </div>
    </section>

    <section className="m5-historical__stats"
      aria-label="Contenu de l'archive">
      <article>
        <span>Exigences</span>
        <strong>{archive.requirements.length}</strong>
      </article>
      <article>
        <span>Événements</span>
        <strong>{archive.qualification_events.length}</strong>
      </article>
      <article>
        <span>Versions documentaires</span>
        <strong>{archive.document_versions.length}</strong>
      </article>
      <article>
        <span>Revues</span>
        <strong>{archive.document_reviews.length}</strong>
      </article>
    </section>

    {Object.values(archive.truncated).some(Boolean) && (
      <p className="m5-historical__warning" role="status">
        Cette archive contient davantage d'enregistrements
        que ceux affichés. La consultation est partielle.
      </p>
    )}

    <section className="m5-historical__section">
      <h2><FileText size={19} /> Exigences enregistrées</h2>
      {archive.requirements.length === 0
        ? <p>Aucune qualification conservée.</p>
        : <div className="m5-historical__items">
          {archive.requirements.map(item => (
            <article key={item.id}>
              <div className="m5-historical__itemtop">
                <strong>Exigence n°{item.source_requirement_id}</strong>
                <span>{item.status}</span>
              </div>
              <p>
                Révision {item.revision} ·
                Mise à jour {safeDate(item.updated_at)}
              </p>
              {item.justification && (
                <p>{item.justification}</p>
              )}
              {item.reviewed_excerpt && (
                <blockquote>{item.reviewed_excerpt}</blockquote>
              )}
            </article>
          ))}
        </div>}
    </section>

    <section className="m5-historical__section">
      <h2><History size={19} /> Historique des qualifications</h2>
      {archive.qualification_events.length === 0
        ? <p>Aucun événement enregistré.</p>
        : <div className="m5-historical__items">
          {archive.qualification_events.map(event => (
            <article key={event.id}>
              <div className="m5-historical__itemtop">
                <strong>Exigence n°{event.source_requirement_id}</strong>
                <span>{event.new_status}</span>
              </div>
              <p>{safeDate(event.recorded_at)}</p>
              {event.justification && <p>{event.justification}</p>}
            </article>
          ))}
        </div>}
    </section>

    <section className="m5-historical__section">
      <h2><FileText size={19} /> Versions documentaires</h2>
      {archive.document_versions.length === 0
        ? <p>Aucun document conservé.</p>
        : <div className="m5-historical__items">
          {archive.document_versions.map(version => (
            <article key={version.id}>
              <div className="m5-historical__itemtop">
                <strong>{version.original_filename}</strong>
                <span>Version {version.version_number}</span>
              </div>
              <p>
                Exigence n°{version.source_requirement_id} ·
                {safeDate(version.uploaded_at)}
              </p>
              <p>Contrôle : {version.review_status}</p>
            </article>
          ))}
        </div>}
    </section>

    <section className="m5-historical__section">
      <h2><ShieldCheck size={19} /> Revues documentaires</h2>
      {archive.document_reviews.length === 0
        ? <p>Aucune revue enregistrée.</p>
        : <div className="m5-historical__items">
          {archive.document_reviews.map(review => (
            <article key={review.id}>
              <div className="m5-historical__itemtop">
                <strong>Document n°{review.document_version_id}</strong>
                <span>{review.decision}</span>
              </div>
              <p>{safeDate(review.reviewed_at)}</p>
              {review.justification && <p>{review.justification}</p>}
            </article>
          ))}
        </div>}
    </section>

    <footer className="m5-historical__footer">
      <LockKeyhole size={16} />
      Archive consultable. Aucune action de dépôt,
      qualification ou soumission disponible.
    </footer>
  </main>
}
