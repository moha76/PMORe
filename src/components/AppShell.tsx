import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Menu, PanelLeftClose, X } from "lucide-react";
import { getCompanyRematchStatus } from "../api/company";
import { MissionJourney } from "../v5/components/MissionJourney";
import {
  MorRadar as Compass,
  MorCompany as Building2,
  MorDossier as FolderOpen,
  MorIntelligence as Sparkles,
} from "../premium/MorIcons";
import { Zellij } from "../premium/Zellij";
import { Brand } from "../premium/Brand";
import { affectedByCompanyChange } from "../premium/cache";
import { demoEnabled, leaveDemo } from "../premium/demo";
const links = [
  { to: "/v5/discover", label: "Découvrir", Icon: Compass },
  { to: "/v5/mes-dossiers", label: "Mes dossiers", Icon: FolderOpen },
  { to: "/intelligence", label: "Intelligence marché", Icon: Sparkles },
  { to: "/company", label: "Mon entreprise", Icon: Building2 },
];
export function AppShell() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const client = useQueryClient();
  const handled = useRef<string | null>(null);
  const rematchQuery = useQuery({
    queryKey: ["company-rematch-status"],
    queryFn: getCompanyRematchStatus,
    refetchInterval: 3000,
    retry: false,
  });
  const rematch = rematchQuery.data?.data;
  const running = ["STARTED", "RUNNING", "PENDING"].includes(
    rematch?.state ?? "",
  );
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  useEffect(() => {
    if (
      rematch?.state === "COMPLETED" &&
      rematch.finished_at &&
      handled.current !== rematch.finished_at
    ) {
      handled.current = rematch.finished_at;
      void client.invalidateQueries({ predicate: affectedByCompanyChange });
    }
  }, [rematch?.state, rematch?.finished_at, client]);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        document.getElementById("mobile-navigation-toggle")?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  const current =
    links.find((link) => location.pathname.startsWith(link.to))?.label ??
    ({ study: "Étudier", prepare: "Préparer", submit: "Soumettre" }[
      location.pathname.split("/")[2] as "study" | "prepare" | "submit"
    ] ||
      "Espace de travail");
  return (
    <div className={`premium-app ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">
        Aller au contenu
      </a>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Fermer la navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="main-navigation"
        className={`premium-sidebar ${open ? "is-open" : ""}`}
      >
        <Zellij className="sidebar-zellij" />
        <Link className="sidebar-brand" to="/">
          <Brand compact={collapsed} />
        </Link>
        <div className="sidebar-workspace">
          <span className="workspace-avatar">M</span>
          <div>
            <strong>Mon espace MOR</strong>
            <small>Marchés publics · Maroc</small>
          </div>
          <span className="workspace-dot" />
        </div>
        <span className="sidebar-caption">ESPACE DE TRAVAIL</span>
        <nav aria-label="Navigation principale">
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "is-active" : ""}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {to === "/v5/discover" && <span className="sidebar-nav-marker" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="sidebar-note-icon">
              <Compass size={21} />
            </span>
            <strong>
              Chaque marché mérite
              <br />
              une décision éclairée.
            </strong>
            <p>
              Vos conditions. Vos preuves.
              <br />
              Votre prochain mouvement.
            </p>
            <Link to="/company">
              Affiner mon profil <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link className="sidebar-public-link" to="/">
            Découvrir MOR <ArrowUpRight size={14} />
          </Link>
          <button
            className="sidebar-collapse"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={
              collapsed ? "Déployer la navigation" : "Réduire la navigation"
            }
          >
            <PanelLeftClose size={17} />
            <span>Réduire le menu</span>
          </button>
        </div>
      </aside>
      <div className="premium-app-main">
        <header className="premium-topbar">
          <div>
            <button
              id="mobile-navigation-toggle"
              className="premium-icon-btn mobile-only"
              aria-label={
                open ? "Fermer la navigation" : "Ouvrir la navigation"
              }
              aria-expanded={open}
              aria-controls="main-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="topbar-breadcrumb">
              Espace de travail <span>/</span> <strong>{current}</strong>
            </span>
          </div>
          <div className="topbar-account">
            <span className="topbar-country">
              MAROC <span>MA</span>
            </span>
            <Link
              to="/login"
              aria-label="Accéder à la connexion"
              className="account-avatar"
            >
              M
            </Link>
          </div>
        </header>
        {demoEnabled && (
          <div className="demo-notice" role="status">
            <span>
              <span className="demo-dot" />
              Démonstration · exemples fictifs, modifications temporaires, sans
              effet réel
            </span>
            <button onClick={leaveDemo}>
              Quitter la démo <X size={14} />
            </button>
          </div>
        )}
        {(running || rematch?.state === "ERROR") && (
          <div className="premium-rematch" role="status">
            {running
              ? `Actualisation de vos correspondances${rematch?.total ? ` · ${rematch.processed ?? 0}/${rematch.total}` : "…"}`
              : "Le recalcul n'a pas abouti. Vos résultats peuvent être obsolètes."}
          </div>
        )}
        <div id="main-content" className="premium-content" tabIndex={-1}>
          <MissionJourney />
          <Outlet />
        </div>
        <footer className="app-footnote">
          <span>MOR · Morocco Opportunity Radar</span>
          <span>La décision reste la vôtre.</span>
        </footer>
      </div>
    </div>
  );
}
