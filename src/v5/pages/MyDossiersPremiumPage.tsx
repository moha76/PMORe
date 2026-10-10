import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Columns3,
  List,
  CalendarDays,
  Clock3,
  CheckCircle2,
  ArrowUpRight,
  FolderOpen,
  RefreshCw,
  Search,
} from "lucide-react";
import { MorLot as Layers3 } from "../../premium/MorIcons";
import { Zellij } from "../../premium/Zellij";
import { getDossiersV5, dossierDestination } from "../../api/dossiersV5";
import { PageHeading } from "../../premium/PageHeading";
import { dateLabel } from "../../premium/format";
const stages = [
  { key: "ALL", label: "Toutes les participations" },
  { key: "STUDY", label: "Étudier" },
  { key: "PREPARATION", label: "Préparer" },
  { key: "PRE_SUBMISSION", label: "Soumettre" },
  { key: "SUBMITTED", label: "Suivre" },
  { key: "WON", label: "Gagnés" },
  { key: "HISTORY", label: "Archives" },
];
const stageLabels: Record<string, string> = {
  STUDY: "En étude",
  PREPARATION: "En préparation",
  PRE_SUBMISSION: "Avant dépôt",
  SUBMITTED: "Dépôt déclaré",
  WON: "Gagné",
  HISTORY: "Archivé",
};
export function MyDossiersPremiumPage() {
  const [params, setParams] = useSearchParams();
  const stage = params.get("stage") || "ALL";
  const [search, setSearch] = useState("");
  const view = params.get("view") === "list" ? "list" : "board";
  const raw = Number(params.get("page") || 1);
  const page = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
  const query = useQuery({
    queryKey: ["m05-dossiers", page],
    queryFn: () => getDossiersV5(page),
  });
  const items = query.data?.items ?? [];
  const filtered = items.filter(
    (d) =>
      (stage === "ALL" ? d.stage !== "HISTORY" : d.stage === stage) &&
      [d.title, d.buyer, d.reference, d.ref_consultation]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(search.toLocaleLowerCase("fr")),
  );
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  }
  return (
    <main className="premium-dossiers">
      <div className="dossier-command">
        <PageHeading
          eyebrow="VOTRE ESPACE DE PARTICIPATION"
          title="Chaque participation, une décision à mener."
          description="De l'étude au suivi, retrouvez vos participations et reprenez le travail au bon endroit."
          actions={
            <Link className="premium-btn primary" to="/v5/discover">
              Découvrir un marché <ArrowUpRight size={16} />
            </Link>
          }
        />
        <div className="dossier-command-summary">
          <Zellij className="summary-zellij" />
          <Layers3 size={28} />
          <strong>{query.data?.total ?? "—"}</strong>
          <span>
            participations
            <br />
            enregistrées
          </span>
          <button
            className="premium-icon-btn"
            aria-label="Actualiser les dossiers"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>
      <div
        className="mission-overview"
        aria-label="Répartition des dossiers sur la page chargée"
      >
        {stages
          .filter((s) =>
            ["STUDY", "PREPARATION", "PRE_SUBMISSION", "SUBMITTED"].includes(
              s.key,
            ),
          )
          .map((s, i) => (
            <button
              key={s.key}
              className={`mission-overview-item mission-${s.key.toLowerCase()} ${stage === s.key ? "active" : ""}`}
              aria-pressed={stage === s.key}
              onClick={() => update("stage", stage === s.key ? "ALL" : s.key)}
            >
              <span className="mission-number">0{i + 1}</span>
              <span>
                <strong>{s.label}</strong>
                <small>
                  {
                    [
                      "Construire la décision",
                      "Assembler les pièces",
                      "Préparer le dépôt externe",
                      "Retrouver les déclarations",
                    ][i]
                  }
                </small>
              </span>
              <b>{items.filter((x) => x.stage === s.key).length}</b>
              <ArrowUpRight size={17} />
            </button>
          ))}
      </div>
      <p className="mission-scope">
        <CheckCircle2 size={15} /> Consultations et lots distincts · Compteurs
        sur la page chargée · Dépôts déclarés dans MOR
      </p>
      <section className="discover-register">
        <nav className="dossier-stage-nav" aria-label="Filtrer les missions">
          {stages.map((s) => (
            <button
              key={s.key}
              className={stage === s.key ? "active" : ""}
              aria-pressed={stage === s.key}
              onClick={() => update("stage", s.key)}
            >
              {s.label}
              <span>
                {s.key === "ALL"
                  ? items.filter((x) => x.stage !== "HISTORY").length
                  : items.filter((x) => x.stage === s.key).length}
              </span>
            </button>
          ))}
        </nav>
        <div className="dossier-search-row">
          <label className="register-search">
            <Search size={17} />
            <input
              aria-label="Rechercher dans les dossiers chargés"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un dossier, une référence, un acheteur…"
            />
          </label>
          <div
            className="dossier-view-switch"
            role="group"
            aria-label="Présentation des dossiers"
          >
            <button
              aria-pressed={view === "board"}
              onClick={() => update("view", "board")}
            >
              <Columns3 size={17} />
              Par étapes
            </button>
            <button
              aria-pressed={view === "list"}
              onClick={() => update("view", "list")}
            >
              <List size={17} />
              Liste
            </button>
          </div>
        </div>
        {query.isPending ? (
          <div className="premium-empty" role="status">
            Chargement de vos participations…
          </div>
        ) : query.isError ? (
          <div className="premium-empty" role="alert">
            <FolderOpen size={28} />
            <h2>Vos dossiers ne sont pas accessibles.</h2>
            <p>Vérifiez votre session et la connexion à l'API V5.</p>
            <button
              className="premium-btn outline"
              onClick={() => void query.refetch()}
            >
              Réessayer
            </button>
          </div>
        ) : !filtered.length ? (
          <div className="premium-empty">
            <FolderOpen size={28} />
            <h2>Aucun dossier dans cette sélection.</h2>
            <p>
              Les décisions de participation se prennent dans l'étude d'un
              marché.
            </p>
            <Link className="premium-btn primary" to="/v5/discover">
              Explorer les marchés <ArrowRight size={16} />
            </Link>
          </div>
        ) : view === "board" ? (
          <div className="mission-board">
            {stages
              .filter(
                (s) =>
                  s.key !== "ALL" &&
                  (stage !== "ALL"
                    ? s.key === stage
                    : s.key !== "HISTORY" &&
                      (s.key !== "WON" ||
                        filtered.some((d) => d.stage === "WON"))),
              )
              .map((s) => {
                const entries = filtered.filter((d) => d.stage === s.key);
                return (
                  <section
                    key={s.key}
                    className={`mission-column mission-${s.key.toLowerCase()}`}
                    aria-label={`${s.label} : ${entries.length} dossiers`}
                  >
                    <header>
                      <span className="mission-column-dot" />
                      <h2>{s.label}</h2>
                      <span>{entries.length}</span>
                    </header>
                    <div className="mission-column-body">
                      {entries.map((d) => (
                        <article
                          key={`${d.ref_consultation}/${d.org_acronyme}/${d.lot_number}`}
                          className="mission-card"
                        >
                          <div className="mission-card-ref">
                            <span>{d.reference || d.ref_consultation}</span>
                            <span>
                              {d.lot_number === "GLOBAL"
                                ? "Marché entier"
                                : d.lot_number
                                  ? `Lot ${d.lot_number}`
                                  : "Consultation"}
                            </span>
                          </div>
                          <Link
                            className="mission-card-title"
                            to={dossierDestination(d)}
                          >
                            {d.title || "Intitulé indisponible"}
                          </Link>
                          <p>{d.buyer || "Acheteur non renseigné"}</p>
                          <div className="mission-card-date">
                            <CalendarDays size={15} />
                            <span>
                              Date limite{" "}
                              <strong>{dateLabel(d.deadline)}</strong>
                            </span>
                          </div>
                          <footer>
                            <span>
                              <Clock3 size={13} />{" "}
                              {dateLabel(
                                d.stage === "SUBMITTED"
                                  ? d.submitted_at
                                  : d.last_modified_at,
                              )}
                            </span>
                            <Link
                              to={dossierDestination(d)}
                              aria-label={`Reprendre ${d.reference || d.ref_consultation}${d.lot_number ? ` lot ${d.lot_number}` : ""}`}
                            >
                              Reprendre <ArrowRight size={15} />
                            </Link>
                          </footer>
                        </article>
                      ))}
                      {!entries.length && (
                        <p className="mission-column-empty">
                          Aucun dossier à cette étape sur la page chargée.
                        </p>
                      )}
                    </div>
                  </section>
                );
              })}
          </div>
        ) : (
          <div className="premium-table-scroll">
            <table className="premium-table dossier-table">
              <caption className="sr-only">
                Vos participations par consultation et lot
              </caption>
              <thead>
                <tr>
                  <th scope="col">CONSULTATION / LOT</th>
                  <th scope="col">MISSION</th>
                  <th scope="col">DATE LIMITE</th>
                  <th scope="col">DERNIÈRE TRACE</th>
                  <th scope="col">PROCHAINE ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr
                    key={`${d.ref_consultation}/${d.org_acronyme}/${d.lot_number}`}
                  >
                    <td>
                      <span className="market-ref">
                        {d.reference || d.ref_consultation}
                        <span>
                          {d.lot_number === "GLOBAL"
                            ? "Marché entier"
                            : d.lot_number
                              ? `Lot ${d.lot_number}`
                              : "Consultation"}
                        </span>
                      </span>
                      <Link className="market-title" to={dossierDestination(d)}>
                        {d.title || "Intitulé indisponible"}
                      </Link>
                      <small className="market-buyer">
                        {d.buyer || "Acheteur non renseigné"}
                      </small>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${d.stage === "SUBMITTED" || d.stage === "WON" ? "ok" : "neutral"}`}
                      >
                        {stageLabels[d.stage] || d.stage}
                      </span>
                    </td>
                    <td>{dateLabel(d.deadline)}</td>
                    <td>
                      <small className="cell-secondary">
                        {d.stage === "SUBMITTED"
                          ? "Dépôt déclaré"
                          : "Modification"}
                      </small>
                      {dateLabel(
                        d.stage === "SUBMITTED"
                          ? d.submitted_at
                          : d.last_modified_at,
                      )}
                    </td>
                    <td>
                      <Link
                        className="dossier-resume"
                        to={dossierDestination(d)}
                      >
                        Reprendre <ArrowRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {query.data && (
          <div className="dossier-pagination">
            <span>
              Page {page} · {filtered.length} participations visibles
            </span>
            <div>
              <button
                disabled={page <= 1}
                onClick={() => update("page", String(page - 1))}
              >
                Précédent
              </button>
              <button
                disabled={page * query.data.page_size >= query.data.total}
                onClick={() => update("page", String(page + 1))}
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </section>
      <aside className="legacy-access">
        <div>
          <strong>Vos données historiques restent accessibles.</strong>
          <p>
            Les résultats et soumissions V4 restent au niveau de la
            consultation.
          </p>
        </div>
        <div>
          <Link to="/pilotage">
            Résultats & pilotage <ArrowUpRight size={14} />
          </Link>
          <Link to="/dossiers">
            Actions historiques <ArrowUpRight size={14} />
          </Link>
          <Link to="/next">
            Vue d'activité <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
    </main>
  );
}
