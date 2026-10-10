import { Link } from "react-router-dom";
import { ArrowUpRight, ChartNoAxesCombined } from "lucide-react";

type Summary = {
  ok: number;
  verify: number;
  partial: number;
  blocking: number;
  stale: number;
  unknown: number;
};
export function PortfolioPulse({
  summary,
  loading,
  failed,
}: {
  summary?: Summary;
  loading: boolean;
  failed: boolean;
}) {
  const groups = [
    { label: "Sans réserve", value: summary?.ok ?? 0, color: "#78a1ff" },
    {
      label: "À vérifier / partiels",
      value: (summary?.verify ?? 0) + (summary?.partial ?? 0),
      color: "#ffd37a",
    },
    { label: "Obstacles", value: summary?.blocking ?? 0, color: "#fb8f9e" },
    { label: "État inconnu", value: summary?.unknown ?? 0, color: "#a5b3cf" },
  ];
  const total = groups.reduce((sum, group) => sum + group.value, 0);
  let offset = 0;
  return (
    <aside className="portfolio-pulse" aria-label="Lecture du portefeuille">
      <div className="pulse-heading">
        <span>
          <ChartNoAxesCombined size={18} />
          LECTURE DU PORTEFEUILLE
        </span>
        <span>MOR / MATCHING</span>
      </div>
      <div className="pulse-content">
        <div className="pulse-chart">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="#ffffff18"
              strokeWidth="12"
            />
            {total > 0 &&
              groups.map((group) => {
                const length = (group.value / total) * 301.593;
                const start = offset;
                offset += length;
                return (
                  <circle
                    key={group.label}
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke={group.color}
                    strokeWidth="12"
                    strokeDasharray={`${length} ${301.593 - length}`}
                    strokeDashoffset={-start}
                    transform="rotate(-90 60 60)"
                  />
                );
              })}
          </svg>
          <div>
            <strong>
              {summary && !failed
                ? new Intl.NumberFormat("fr-MA").format(total)
                : "—"}
            </strong>
            <span>états de matching</span>
          </div>
        </div>
        <div className="pulse-legend">
          {groups.map((group) => (
            <div key={group.label}>
              <span style={{ background: group.color }} />
              <span>{group.label}</span>
              <strong>
                {summary && !failed
                  ? new Intl.NumberFormat("fr-MA").format(group.value)
                  : "—"}
              </strong>
            </div>
          ))}
        </div>
      </div>
      <footer>
        <span>
          {failed
            ? "Lecture indisponible"
            : loading
              ? "Lecture en cours…"
              : `Répartition du matching · ${summary?.stale ?? 0} obsolète(s)`}
        </span>
        <Link to="/company">
          Mon profil <ArrowUpRight size={15} />
        </Link>
      </footer>
    </aside>
  );
}
