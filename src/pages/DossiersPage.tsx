import {
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
  getDossiers,
} from "../api/dossiers"

import type {
  DossierItem,
  DossierPreparationStatus,
} from "../api/dossiers"


function isUnauthorized(
  error: unknown,
) {
  return (
    error instanceof ApiError
    && error.status === 401
  )
}


function preparationLabel(
  status: DossierPreparationStatus,
) {
  switch (status) {
    case "ADVANCED":
      return "Préparation avancée"

    case "IN_PROGRESS":
      return "En cours"

    case "BLOCKED":
      return "Bloqué"

    case "TO_REVIEW":
    default:
      return "À revoir"
  }
}


function matchingLabel(
  status?: string | null,
) {
  switch (status) {
    case "OK":
      return "Conforme"

    case "VERIFY":
      return "À vérifier"

    case "PARTIAL":
      return "Partiel"

    case "BLOCKING":
      return "Bloqué"

    default:
      return "Inconnu"
  }
}


function deadlineLabel(
  dossier: DossierItem,
) {
  const raw =
    dossier.deadline?.raw

  if (raw) {
    return raw
  }

  const iso =
    dossier.deadline?.iso

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


function dossierPath(
  dossier: DossierItem,
) {
  return `/dossiers/${encodeURIComponent(
    dossier.ref_consultation,
  )}/${encodeURIComponent(
    dossier.org_acronyme,
  )}`
}


export function DossiersPage() {
  const navigate =
    useNavigate()

  const location =
    useLocation()

  const [page, setPage] =
    useState(1)

  const query =
    useQuery({
      queryKey: [
        "dossiers",
        page,
      ],

      queryFn: () =>
        getDossiers(
          page,
          25,
        ),
    })


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
      <div className="dossiers-page">
        <div className="dossiers-loading">
          Chargement des dossiers…
        </div>
      </div>
    )
  }


  if (
    query.isError
    || !query.data
  ) {
    return (
      <div className="dossiers-page">
        <div className="dossiers-error">
          Impossible de charger les dossiers.
        </div>
      </div>
    )
  }


  const dossiers =
    query.data.data

  const summary =
    query.data.meta.summary

  const pagination =
    query.data.meta.pagination


  return (
    <div className="dossiers-page">
      <header className="dossiers-header">
        <div>
          <div className="dossiers-eyebrow">
            PRÉPARATION DES CANDIDATURES
          </div>

          <h1>
            Dossiers
          </h1>

          <p>
            Transformez vos décisions GO en dossiers
            opérationnels et suivez les points restant
            à traiter avant dépôt.
          </p>
        </div>

        <div className="dossiers-header-badge">
          {pagination.total}
          {" "}
          dossier
          {pagination.total > 1 ? "s" : ""}
          {" "}
          GO
        </div>
      </header>


      <section className="dossiers-kpis">
        <article className="dossiers-kpi total">
          <span>
            Dossiers GO
          </span>

          <strong>
            {pagination.total}
          </strong>

          <small>
            Opportunités engagées
          </small>
        </article>

        <article className="dossiers-kpi advanced">
          <span>
            Préparation avancée
          </span>

          <strong>
            {summary.advanced}
          </strong>

          <small>
            Couverture MOR complète
          </small>
        </article>

        <article className="dossiers-kpi progress">
          <span>
            En cours
          </span>

          <strong>
            {summary.in_progress}
          </strong>

          <small>
            Vérifications restantes
          </small>
        </article>

        <article className="dossiers-kpi blocked">
          <span>
            Bloqués
          </span>

          <strong>
            {summary.blocked}
          </strong>

          <small>
            Blocage détecté
          </small>
        </article>

        <article className="dossiers-kpi review">
          <span>
            À revoir
          </span>

          <strong>
            {summary.to_review}
          </strong>

          <small>
            Analyse absente ou obsolète
          </small>
        </article>
      </section>


      {dossiers.length === 0 ? (
        <section className="dossiers-empty">
          <div className="dossiers-empty-icon">
            ✓
          </div>

          <h2>
            Aucun dossier en préparation
          </h2>

          <p>
            Les opportunités apparaissent ici après
            une décision humaine GO.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/opportunities")
            }
          >
            Voir les opportunités
          </button>
        </section>
      ) : (
        <section className="dossiers-list">
          {dossiers.map((dossier) => {
            const prep =
              dossier.preparation

            const checks =
              prep.checks

            const remaining =
              checks.verify
              + checks.blocking
              + checks.unknown
              + checks.partial

            const freshness =
              dossier.matching.freshness
              ?? "UNKNOWN"

            return (
              <article
                className={
                  "dossier-card "
                  + prep.status.toLowerCase()
                }
                key={
                  dossier.ref_consultation
                  + ":"
                  + dossier.org_acronyme
                }
              >
                <div className="dossier-card-main">
                  <div className="dossier-card-top">
                    <div>
                      <div className="dossier-reference">
                        {dossier.reference
                          || dossier.ref_consultation}
                      </div>

                      <h2>
                        {dossier.title
                          || "Appel d’offres"}
                      </h2>
                    </div>

                    <span
                      className={
                        "dossier-preparation-status "
                        + prep.status.toLowerCase()
                      }
                    >
                      {preparationLabel(
                        prep.status,
                      )}
                    </span>
                  </div>


                  <div className="dossier-meta">
                    {dossier.buyer && (
                      <span>
                        <strong>
                          Acheteur
                        </strong>

                        {dossier.buyer}
                      </span>
                    )}

                    {dossier.location && (
                      <span>
                        <strong>
                          Lieu
                        </strong>

                        {dossier.location}
                      </span>
                    )}

                    <span>
                      <strong>
                        Échéance
                      </strong>

                      {deadlineLabel(
                        dossier,
                      )}
                    </span>
                  </div>


                  <div className="dossier-progress-area">
                    <div className="dossier-progress-head">
                      <div>
                        <span>
                          Couverture MOR
                        </span>

                        <strong>
                          {prep.coverage_percent}%
                        </strong>
                      </div>

                      <small>
                        {checks.ok}
                        /
                        {checks.total}
                        {" "}
                        points satisfaits
                      </small>
                    </div>

                    <div
                      className="dossier-progress-track"
                      aria-label={
                        `Couverture ${prep.coverage_percent}%`
                      }
                    >
                      <div
                        className="dossier-progress-value"
                        style={{
                          width:
                            `${Math.max(
                              0,
                              Math.min(
                                100,
                                prep.coverage_percent,
                              ),
                            )}%`,
                        }}
                      />
                    </div>
                  </div>


                  <div className="dossier-checks">
                    <div className="ok">
                      <strong>
                        {checks.ok}
                      </strong>

                      <span>
                        Satisfaits
                      </span>
                    </div>

                    <div className="verify">
                      <strong>
                        {checks.verify}
                      </strong>

                      <span>
                        À vérifier
                      </span>
                    </div>

                    <div className="unknown">
                      <strong>
                        {checks.unknown}
                      </strong>

                      <span>
                        Inconnus
                      </span>
                    </div>

                    <div className="blocking">
                      <strong>
                        {checks.blocking}
                      </strong>

                      <span>
                        Bloquants
                      </span>
                    </div>
                  </div>
                </div>


                <aside className="dossier-card-side">
                  <div className="dossier-side-row">
                    <span>
                      Matching MOR
                    </span>

                    <strong>
                      {matchingLabel(
                        dossier.matching
                          .computed_status,
                      )}
                    </strong>
                  </div>

                  <div className="dossier-side-row">
                    <span>
                      Fraîcheur
                    </span>

                    <strong
                      className={
                        freshness === "FRESH"
                          ? "fresh"
                          : "warning"
                      }
                    >
                      {freshness === "FRESH"
                        ? "À jour"
                        : freshness === "STALE"
                          ? "Obsolète"
                          : "Inconnue"}
                    </strong>
                  </div>

                  <div className="dossier-side-row">
                    <span>
                      À traiter
                    </span>

                    <strong>
                      {remaining}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="dossier-open-button"
                    onClick={() =>
                      navigate(
                        dossierPath(
                          dossier,
                        ),
                      )
                    }
                  >
                    Ouvrir le dossier
                    <span aria-hidden="true">
                      →
                    </span>
                  </button>
                </aside>
              </article>
            )
          })}
        </section>
      )}


      {pagination.total_pages > 1 && (
        <nav
          className="dossiers-pagination"
          aria-label="Pagination des dossiers"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage((current) =>
                Math.max(
                  1,
                  current - 1,
                ),
              )
            }
          >
            Précédent
          </button>

          <span>
            Page {page}
            {" "}
            sur
            {" "}
            {pagination.total_pages}
          </span>

          <button
            type="button"
            disabled={
              page
              >= pagination.total_pages
            }
            onClick={() =>
              setPage((current) =>
                current + 1,
              )
            }
          >
            Suivant
          </button>
        </nav>
      )}
    </div>
  )
}
