import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownUp,
  Compass,
  ArrowUpRight,
  Building2,
  Radar,
  ShieldCheck,
  ScanLine,
  ShieldAlert,
  ListFilter,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { getOpportunities } from "../../api/opportunities";
import type { OpportunityFilters } from "../../api/types";
import { PortfolioPulse } from "../../premium/PortfolioPulse";
import { PageHeading } from "../../premium/PageHeading";
import { dateLabel } from "../../premium/format";
import { DeadlineStatus } from "../components/DeadlineStatus";
import { MatchStatus } from "../components/MatchStatus";
import { matchingFreshnessLabel } from "../../utils/matchingFreshness";
import { Pagination } from "../components/Pagination";
export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const [advanced, setAdvanced] = useState(
    Boolean(params.get("location") || params.get("category")),
  );
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [compact, setCompact] = useState(false);
  const q = params.get("q") ?? "";
  const location = params.get("location") ?? "";
  const category = params.get("category") ?? "";
  const matching = (params.get("matching") ?? "") as
    NonNullable<OpportunityFilters["matching_status"]> | "";
  const sort = (params.get("sort") ??
    "mor_priority") as OpportunityFilters["sort"];
  const rawPage = Number(params.get("page") ?? 1);
  const page =
    Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }
  function reset() {
    setParams({});
    setSearch("");
  }
  const filters = {
    active_deadline_only: true,
    status: "OPEN",
    q: q || undefined,
    location: location || undefined,
    category: category || undefined,
    matching_status: matching || undefined,
    sort,
    page,
    page_size: 25,
  } as const;
  const query = useQuery({
    queryKey: ["v5-discover", filters],
    queryFn: () => getOpportunities(filters),
  });
  const totalQuery = useQuery({
    queryKey: ["v5-discover-total", q, location, category],
    queryFn: () =>
      getOpportunities({
        active_deadline_only: true,
        status: "OPEN",
        q: q || undefined,
        location: location || undefined,
        category: category || undefined,
        page_size: 1,
      }),
  });
  const data = query.data;
  const summary = data?.meta.portfolio_summary;
  const pagination = data?.meta.pagination;
  const stats = [
    {
      label: "Marchés ouverts",
      value: totalQuery.data?.meta.pagination.total,
      key: "",
      desc: "Dans votre recherche",
      Icon: Radar,
    },
    {
      label: "Sans réserve détectée",
      value: summary?.ok,
      key: "OK",
      desc: "À étudier avant de décider",
      Icon: ShieldCheck,
    },
    {
      label: "Points à vérifier",
      value: summary?.verify,
      key: "VERIFY",
      desc: "Une lecture complémentaire",
      Icon: ScanLine,
    },
    {
      label: "Obstacles identifiés",
      value: summary?.blocking,
      key: "BLOCKING",
      desc: "Conditions à examiner",
      Icon: ShieldAlert,
    },
  ];
  return (
    <main className="premium-discover">
      <div className="market-command">
        <PageHeading
          eyebrow="01 / DÉCOUVRIR"
          title="Votre prochain marché commence ici."
          description="Repérez les opportunités. Comparez les conditions. Choisissez celles qui méritent votre attention."
          actions={
            <button
              className="premium-btn outline"
              onClick={() => {
                void query.refetch();
                void totalQuery.refetch();
              }}
              disabled={query.isFetching}
            >
              <RefreshCw
                size={15}
                className={query.isFetching ? "is-spinning" : ""}
              />
              Actualiser
            </button>
          }
        />
        <PortfolioPulse
          summary={summary}
          loading={query.isPending}
          failed={query.isError}
        />
      </div>
      <div className="discover-overview">
        <div className="discover-stats" aria-label="Repères des marchés">
          {stats.map((s, i) => (
            <button
              key={s.label}
              className={`discover-stat stat-${i} ${matching === s.key ? "selected" : ""}`}
              aria-pressed={matching === s.key}
              onClick={() => update("matching", s.key)}
            >
              <span className="stat-icon">
                <s.Icon size={22} />
              </span>
              <span>
                <span className={`stat-marker marker-${i}`} />
                {s.label}
                <ArrowUpRight size={14} />
              </span>
              <strong>
                {s.value == null
                  ? "—"
                  : new Intl.NumberFormat("fr-MA").format(s.value)}
              </strong>
              <small>{s.desc}</small>
            </button>
          ))}
        </div>
      </div>
      <section
        className="discover-register"
        aria-label="Registre des opportunités"
      >
        <div className="register-tabs">
          <div>
            <button
              className={!matching ? "active" : ""}
              onClick={() => update("matching", "")}
            >
              Tous les marchés
            </button>
            <button
              className={matching === "ACTIONABLE" ? "active" : ""}
              onClick={() => update("matching", "ACTIONABLE")}
            >
              Pour mon entreprise <span className="small-dot" />
            </button>
          </div>
          <span className="register-date">
            {data?.meta.data_updated_at
              ? `Données du ${dateLabel(data.meta.data_updated_at)}`
              : "Données issues du registre MOR"}
          </span>
        </div>
        <div className="register-toolbar">
          <form
            className="register-search"
            onSubmit={(e) => {
              e.preventDefault();
              update("q", search.trim());
            }}
          >
            <Search size={18} />
            <input
              aria-label="Rechercher des marchés"
              placeholder="Rechercher un marché, une référence, un acheteur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => {
                  setSearch("");
                  update("q", "");
                }}
              >
                <X size={15} />
              </button>
            )}
            <button type="submit">Rechercher</button>
          </form>
          <button
            className={`premium-btn outline ${advanced ? "is-selected" : ""}`}
            aria-expanded={advanced}
            aria-controls="discover-advanced"
            onClick={() => setAdvanced(!advanced)}
          >
            <SlidersHorizontal size={16} />
            Filtres
          </button>
          <label className="register-sort">
            <ArrowDownUp size={15} />
            <select
              aria-label="Trier les marchés"
              value={sort}
              onChange={(e) => update("sort", e.target.value)}
            >
              <option value="mor_priority">Priorité MOR</option>
              <option value="deadline_asc">Échéance proche</option>
              <option value="deadline_desc">Échéance éloignée</option>
              <option value="newest">Plus récents</option>
              <option value="updated">Dernière actualisation</option>
            </select>
          </label>
        </div>
        {advanced && (
          <div id="discover-advanced" className="register-advanced">
            <label>
              <MapPin size={14} />
              Ville ou région
              <input
                placeholder="Ex. Rabat"
                value={location}
                onChange={(e) => update("location", e.target.value)}
              />
            </label>
            <label>
              Catégorie
              <select
                value={category}
                onChange={(e) => update("category", e.target.value)}
              >
                <option value="">Toutes les catégories</option>
                <option>Travaux</option>
                <option>Fournitures</option>
                <option>Services</option>
              </select>
            </label>
            <label>
              Correspondance
              <select
                value={matching}
                onChange={(e) => update("matching", e.target.value)}
              >
                <option value="">Tous les états</option>
                <option value="ACTIONABLE">Pour mon entreprise</option>
                <option value="OK">Sans réserve détectée</option>
                <option value="VERIFY">À vérifier</option>
                <option value="PARTIAL">Partielle</option>
                <option value="BLOCKING">Obstacles identifiés</option>
                <option value="STALE">Obsolète</option>
                <option value="UNKNOWN">Inconnue</option>
              </select>
            </label>
            <button className="text-link" onClick={reset}>
              Réinitialiser <X size={14} />
            </button>
          </div>
        )}
        <div className="register-count">
          <span>
            <strong>{pagination?.total ?? "—"}</strong> opportunités{" "}
            {q && <>pour « {q} »</>}
            {matching && (
              <button
                className="filter-chip"
                onClick={() => update("matching", "")}
              >
                {matching === "ACTIONABLE" ? "Pour mon entreprise" : matching}{" "}
                <X size={12} />
              </button>
            )}
          </span>
          <button aria-pressed={compact} onClick={() => setCompact(!compact)}>
            <ListFilter size={15} />
            {compact ? "Vue confortable" : "Vue compacte"}
          </button>
        </div>
        {query.isPending ? (
          <div
            className="table-skeleton"
            role="status"
            aria-label="Chargement des marchés"
          >
            {[1, 2, 3, 4, 5].map((x) => (
              <div key={x}>
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <div className="premium-empty" role="alert">
            <RefreshCw size={27} />
            <h2>Le registre est momentanément indisponible.</h2>
            <p>
              Vérifiez votre session et la connexion à l'API. Aucun résultat
              n'est présumé.
            </p>
            <button
              className="premium-btn primary"
              onClick={() => void query.refetch()}
            >
              Réessayer
            </button>
            <Link to="/login">Se reconnecter</Link>
          </div>
        ) : !data?.data.length ? (
          <div className="premium-empty">
            <Search size={29} />
            <h2>Aucun marché dans cette sélection.</h2>
            <p>Élargissez vos critères pour explorer d'autres opportunités.</p>
            <button className="premium-btn outline" onClick={reset}>
              Effacer les filtres
            </button>
          </div>
        ) : (
          <div
            className={`premium-table-scroll ${compact ? "is-compact" : ""}`}
          >
            <table className="premium-table">
              <caption className="sr-only">
                Marchés ouverts correspondant à vos filtres
              </caption>
              <thead>
                <tr>
                  <th scope="col">MARCHÉ / ACHETEUR</th>
                  <th scope="col">TERRITOIRE</th>
                  <th scope="col">ESTIMATION</th>
                  <th scope="col">ÉCHÉANCE</th>
                  <th scope="col">CORRESPONDANCE</th>
                  <th scope="col">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <tr key={`${item.ref_consultation}/${item.org_acronyme}`}>
                    <td>
                      <span className="market-ref">
                        {item.reference || item.ref_consultation}
                        <span>
                          {item.category || "Catégorie non renseignée"}
                        </span>
                      </span>
                      <Link
                        className="market-title"
                        to={`/v5/study/${encodeURIComponent(item.ref_consultation)}/${encodeURIComponent(item.org_acronyme)}`}
                      >
                        {item.title || "Intitulé indisponible"}
                      </Link>
                      <span className="market-buyer">
                        <Building2 size={12} />
                        {item.buyer || "Acheteur non renseigné"}
                      </span>
                    </td>
                    <td>
                      <span className="market-region">
                        {item.location || "Non renseigné"}
                      </span>
                    </td>
                    <td>
                      <strong className="market-money">
                        {item.estimation
                          ? Number.isFinite(Number(item.estimation))
                            ? `${new Intl.NumberFormat("fr-MA").format(Number(item.estimation))} MAD`
                            : item.estimation
                          : "Non renseignée"}
                      </strong>
                      <small className="cell-secondary">
                        Estimation publiée
                      </small>
                    </td>
                    <td>
                      <DeadlineStatus
                        deadline={item.deadline_iso || item.deadline}
                      />
                    </td>
                    <td>
                      <MatchStatus matching={item.matching} />
                      <small className="cell-secondary">
                        {matchingFreshnessLabel(item.matching.freshness)}
                      </small>
                    </td>
                    <td>
                      <Link
                        className="table-open"
                        aria-label={`Étudier ${item.reference || item.ref_consultation}`}
                        to={`/v5/study/${encodeURIComponent(item.ref_consultation)}/${encodeURIComponent(item.org_acronyme)}`}
                      >
                        <ArrowUpRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.total_pages}
            total={pagination.total}
            pageSize={pagination.page_size}
            onChange={(p: number) => update("page", String(p))}
          />
        )}
      </section>
      <div className="discover-disclaimer">
        <span>
          <SearchCheckIcon />
          La correspondance oriente votre lecture. Elle ne vaut pas décision de
          participation.
        </span>
        <Link to="/intelligence">
          Voir ma position sur le marché <ArrowUpRight size={14} />
        </Link>
      </div>
    </main>
  );
}
function SearchCheckIcon() {
  return <Compass size={15} />;
}
