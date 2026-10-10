import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
export function MissionJourney() {
  const { pathname, search } = useLocation();
  const [, prefix, mission, ref, org, routeLot] = pathname.split("/");
  if (prefix !== "v5" || !["study", "prepare", "submit"].includes(mission))
    return null;
  const lot = routeLot || new URLSearchParams(search).get("lot");
  const context = `${ref}/${org}`;
  const items = [
    {
      title: "Étudier",
      key: "study",
      to: `/v5/study/${context}${lot ? `?lot=${encodeURIComponent(lot)}` : ""}`,
    },
    {
      title: "Préparer",
      key: "prepare",
      to: lot ? `/v5/prepare/${context}/${encodeURIComponent(lot)}` : null,
    },
    {
      title: "Soumettre",
      key: "submit",
      to: lot ? `/v5/submit/${context}/${encodeURIComponent(lot)}` : null,
    },
    { title: "Suivre", key: "follow", to: "/v5/mes-dossiers" },
  ];
  return (
    <nav className="premium-journey" aria-label="Missions du dossier">
      <Link to="/v5/mes-dossiers">Mes dossiers</Link>
      <ChevronRight size={14} />
      <div className="premium-journey-steps">
        {items.map((item, i) =>
          item.to ? (
            <Link
              key={item.key}
              to={item.to}
              aria-current={mission === item.key ? "step" : undefined}
            >
              <span>{String(i + 2).padStart(2, "0")}</span>
              {item.title}
            </Link>
          ) : (
            <span
              key={item.key}
              className="journey-unavailable"
              title="Sélectionnez un lot dans l'étude"
            >
              <span>{String(i + 2).padStart(2, "0")}</span>
              {item.title}
            </span>
          ),
        )}
      </div>
      <small>
        {lot
          ? `Lot ${decodeURIComponent(lot)}`
          : "Choisissez un lot pour continuer"}
      </small>
    </nav>
  );
}
