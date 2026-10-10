import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronDown } from "lucide-react";

import { MorIntelligence as ChartNoAxesCombined } from "./MorIcons";
import { Zellij } from "./Zellij";

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
  const [expanded, setExpanded] = useState(
    () => window.matchMedia("(min-width: 761px)").matches,
  );
  const contentId = `matching-${useId().replace(/:/g, "")}`;
  const groups = [
    { label: "Sans réserve", value: summary?.ok ?? 0, color: "#a6c8ad" },
    {
      label: "À vérifier / partiels",
      value: (summary?.verify ?? 0) + (summary?.partial ?? 0),
      color: "#dbb77b",
    },
    { label: "Obstacles", value: summary?.blocking ?? 0, color: "#ebaa99" },
    { label: "État inconnu", value: summary?.unknown ?? 0, color: "#bbb9ac" },
  ];
  const total = groups.reduce((sum, group) => sum + group.value, 0);
  let offset = 0;
  return (
    <aside className="portfolio-pulse" aria-label="Lecture du portefeuille">
      <Zellij className="pulse-zellij" />
      <div className="pulse-heading">
        <span>
          <ChartNoAxesCombined size={18} />
          VOTRE LECTURE DU MARCHÉ
        </span>
        <button
          className="pulse-toggle"
          aria-label="Afficher la répartition du matching"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded(!expanded)}
        >
          <span>MOR / MATCHING</span>
          <ChevronDown size={15} />
        </button>
      </div>
      <div className="pulse-content" id={contentId} hidden={!expanded}>
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
              : summary
                ? `Matching · ${summary.stale} analyse(s) à actualiser`
                : "Matching non renseigné"}
        </span>
        <Link to="/company">
          Mon profil <ArrowUpRight size={15} />
        </Link>
      </footer>
    </aside>
  );
}
