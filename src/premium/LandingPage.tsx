import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Fingerprint,
  MapPin,
  Menu,
  X,
} from "lucide-react";
import { Zellij } from "./Zellij";
import { MorRadar, MorLot, MorDossier, MorVerified } from "./MorIcons";
import { Brand } from "./Brand";
export function LandingPage() {
  const [menu, setMenu] = useState(false);
  const [step, setStep] = useState(0);
  const demoHref = `${import.meta.env.BASE_URL}v5/discover?demo=1`;
  const previewLocal = ["localhost", "127.0.0.1", "::1"].includes(
    location.hostname,
  );
  const steps = [
    {
      name: "Découvrir",
      title: "Le bon marché commence par le bon regard.",
      copy: "Comparez les consultations, les échéances et leur correspondance avec votre entreprise. Vous choisissez celles qui méritent une étude.",
      icon: MorRadar,
    },
    {
      name: "Étudier",
      title: "Une décision, avec ses preuves.",
      copy: "Examinez les conditions du DCE, les montants et les points à vérifier. Chaque lot garde son périmètre et votre décision.",
      icon: MorLot,
    },
    {
      name: "Préparer",
      title: "Chaque exigence trouve sa place.",
      copy: "Qualifiez les exigences, réunissez les versions documentaires et consignez leur contrôle. Les réserves restent visibles.",
      icon: MorDossier,
    },
    {
      name: "Soumettre & suivre",
      title: "La trace de chaque mouvement.",
      copy: "Après votre dépôt sur le portail externe, déclarez-le dans MOR et retrouvez l'historique de votre participation.",
      icon: MorVerified,
    },
  ];
  return (
    <div className="mor-landing">
      <a className="skip-link" href="#landing-main">
        Aller au contenu
      </a>
      <header className="landing-nav">
        <Link to="/" aria-label="Accueil MOR">
          <Brand />
        </Link>
        <nav className={menu ? "open" : ""} aria-label="Navigation commerciale">
          <a href="#approche" onClick={() => setMenu(false)}>
            L'approche MOR
          </a>
          <a href="#parcours" onClick={() => setMenu(false)}>
            Le produit
          </a>
          <a href="#questions" onClick={() => setMenu(false)}>
            Questions fréquentes
          </a>
        </nav>
        <div>
          <Link className="landing-login" to="/login">
            Se connecter <ArrowUpRight size={15} />
          </Link>
          <button
            className="premium-icon-btn mobile-only"
            aria-label={menu ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <main id="landing-main">
        <section className="landing-hero">
          <div className="hero-editorial">
            <span className="landing-kicker">
              <span /> MARCHÉS PUBLICS · MAROC
            </span>
            <h1>
              Repérer le marché.
              <br />
              Comprendre l'enjeu.
              <br />
              <em>Décider juste.</em>
            </h1>
            <p>
              Le radar de votre entreprise pour passer de l'appel d'offres à une
              participation documentée. Avec les conditions, les preuves et les
              bons repères.
            </p>
            <div className="landing-hero-actions">
              <Link to="/login" className="premium-btn primary">
                Entrer dans MOR <ArrowUpRight size={18} />
              </Link>
              <a href="#parcours" className="text-link">
                Explorer le parcours <ArrowDown size={16} />
              </a>
            </div>
            <div className="hero-caption">
              <Fingerprint size={19} />
              <span>
                Une intelligence au service de votre décision.
                <br />
                <strong>La décision reste la vôtre.</strong>
              </span>
            </div>
          </div>
          <div className="hero-radar">
            <div className="radar-top">
              <span>LE TERRITOIRE DES POSSIBLES</span>
              <span>01 / MOR</span>
            </div>
            <div
              className="mor-hero-art"
              role="img"
              aria-label="Composition géométrique de zellij dessinée pour MOR, illustration sans données de marché"
            >
              <Zellij className="hero-zellij" />
              <div className="mor-hero-seal">
                <MorRadar size={104} />
                <span>
                  AU CŒUR
                  <br />
                  DE VOTRE DÉCISION.
                </span>
              </div>
              <span className="mor-art-index art-index-top">
                01 / LE SIGNAL
              </span>
              <span className="mor-art-index art-index-bottom">
                02 / LA PREUVE
              </span>
            </div>
            <div className="radar-card">
              <span className="radar-card-icon">
                <MorRadar size={22} />
              </span>
              <div>
                <small>DE L'OPPORTUNITÉ À L'ACTION</small>
                <strong>Un marché. Plusieurs perspectives.</strong>
                <span>
                  Profil entreprise <ChevronRight size={12} /> Conditions{" "}
                  <ChevronRight size={12} /> Décision
                </span>
              </div>
            </div>
            <div className="radar-bottom">
              <span>
                <span className="radar-dot" />
                VOTRE PROCHAIN MOUVEMENT
              </span>
              <ArrowUpRight size={19} />
            </div>
          </div>
        </section>
        <div className="landing-principles">
          <span>
            CONÇU POUR
            <br />
            <strong>LES DÉCISIONS QUI ENGAGENT.</strong>
          </span>
          <div>
            <MorLot size={20} />
            Un périmètre par lot
          </div>
          <div>
            <MorDossier size={20} />
            Des preuves consultables
          </div>
          <div>
            <MorVerified size={20} />
            Une validation humaine
          </div>
        </div>
        <section id="approche" className="landing-approach">
          <div>
            <p className="landing-kicker">01 — L'APPROCHE MOR</p>
            <h2>
              Moins de dispersion.
              <br />
              <em>Plus de discernement.</em>
            </h2>
          </div>
          <div>
            <p className="approach-lead">
              Un appel d'offres n'est pas une simple ligne dans une liste. C'est
              un ensemble de conditions, de capacités à mobiliser et de
              décisions à prendre.
            </p>
            <p>
              MOR relie le marché au profil de votre entreprise. Les
              correspondances orientent votre lecture ; les sources vous
              permettent de vérifier. Vous gardez la main sur chaque
              participation.
            </p>
            <a className="text-link" href="#parcours">
              Voir comment cela fonctionne <ArrowRight size={17} />
            </a>
          </div>
        </section>
        <section id="parcours" className="landing-product">
          <div className="product-section-head">
            <div>
              <p className="landing-kicker">02 — UN PARCOURS, DES REPÈRES</p>
              <h2>
                Du premier signal
                <br />
                au dossier suivi.
              </h2>
            </div>
            <span>
              Une consultation.
              <br />
              Une continuité de travail.
            </span>
          </div>
          <div
            className="product-stage-nav"
            role="tablist"
            aria-label="Explorer les missions MOR"
          >
            {steps.map((s, i) => (
              <button
                key={s.name}
                id={`product-tab-${i}`}
                role="tab"
                aria-selected={step === i}
                aria-controls="product-panel"
                tabIndex={step === i ? 0 : -1}
                onKeyDown={(e) => {
                  if (
                    ["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)
                  ) {
                    e.preventDefault();
                    const next =
                      e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? 3
                          : (step + (e.key === "ArrowRight" ? 1 : 3)) % 4;
                    setStep(next);
                    document.getElementById(`product-tab-${next}`)?.focus();
                  }
                }}
                onClick={() => setStep(i)}
              >
                <span>0{i + 1}</span>
                {s.name}
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          <div
            className="product-panel"
            id="product-panel"
            role="tabpanel"
            aria-labelledby={`product-tab-${step}`}
          >
            <div className="product-panel-copy">
              <span className="stage-icon">
                {(() => {
                  const Icon = steps[step].icon;
                  return <Icon size={24} />;
                })()}
              </span>
              <h3>{steps[step].title}</h3>
              <p>{steps[step].copy}</p>
              {previewLocal ? (
                <a href={demoHref} className="text-link">
                  Ouvrir la démonstration <ArrowUpRight size={16} />
                </a>
              ) : (
                <Link to="/login" className="text-link">
                  Accéder à mon espace <ArrowUpRight size={16} />
                </Link>
              )}
            </div>
            <div className="product-example">
              <div className="example-header">
                <Brand compact />
                <span>EXEMPLE ILLUSTRATIF</span>
              </div>
              <div className="example-title">
                <small>DEMO-001 / 2026 · LOT 01</small>
                <strong>Réhabilitation d'un centre de formation</strong>
                <span>
                  <MapPin size={13} />
                  Rabat · Acheteur de démonstration
                </span>
              </div>
              {step === 0 ? (
                <>
                  <div className="example-row">
                    <span>Correspondance entreprise</span>
                    <span className="status-pill verify">À vérifier</span>
                  </div>
                  <div className="example-row">
                    <span>Estimation du lot</span>
                    <strong>1 380 000 MAD</strong>
                  </div>
                  <div className="example-row">
                    <span>Prochaine action</span>
                    <strong>
                      Ouvrir l'étude <ArrowUpRight size={13} />
                    </strong>
                  </div>
                </>
              ) : step === 1 ? (
                <>
                  <div className="example-row">
                    <span>Activité de l'entreprise</span>
                    <span className="status-pill ok">
                      <Check size={12} />
                      Conforme
                    </span>
                  </div>
                  <div className="example-row">
                    <span>Attestation fiscale</span>
                    <span className="status-pill verify">À vérifier</span>
                  </div>
                  <blockquote>
                    « Le candidat fournit une attestation fiscale en cours de
                    validité… »<small>Extrait illustratif · RC · Page 8</small>
                  </blockquote>
                </>
              ) : step === 2 ? (
                <>
                  <div className="example-row">
                    <span>Attestation fiscale</span>
                    <span className="status-pill verify">Pièce manquante</span>
                  </div>
                  <div className="example-row">
                    <span>Qualification humaine</span>
                    <strong>Obligatoire</strong>
                  </div>
                  <div className="example-document">
                    <MorDossier size={24} />
                    <span>
                      Qualifier · Téléverser · Contrôler
                      <small>Chaque version conserve sa trace.</small>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="example-row">
                    <span>Dépôt externe</span>
                    <span className="status-pill neutral">Non déclaré</span>
                  </div>
                  <div className="example-document">
                    <MorVerified size={24} />
                    <span>
                      Votre déclaration, dans MOR
                      <small>
                        Le dépôt officiel s'effectue sur le portail externe.
                      </small>
                    </span>
                  </div>
                </>
              )}
              <div className="example-footer">
                Données fictives · aucune consultation réelle
              </div>
            </div>
          </div>
        </section>
        <section className="landing-intelligence">
          <div>
            <p className="landing-kicker">03 — VOIR AU-DELÀ D'UN MARCHÉ</p>
            <h2>
              Votre entreprise.
              <br />
              <em>Son champ des possibles.</em>
            </h2>
            <p>
              Vos activités, vos territoires et vos capacités donnent du
              contexte aux opportunités. Examinez les points qui limitent votre
              position et les scénarios de caution proposés par l'analyse.
            </p>
            <Link to="/login" className="premium-btn outline">
              Accéder à mon espace <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="intelligence-diagram">
            <div>
              <span>01</span>
              <BuildingLabel />
              Vos activités & territoires
            </div>
            <div>
              <span>02</span>
              <MorLot size={19} />
              Vos capacités & justificatifs
            </div>
            <div>
              <span>03</span>
              <MorRadar size={19} />
              Les conditions du marché
            </div>
            <p>
              <ArrowDown size={19} />
              <strong>Une lecture qui vous ressemble.</strong>
              <small>Avec les limites et les réserves de l'analyse.</small>
            </p>
          </div>
        </section>
        <section id="questions" className="landing-faq">
          <div>
            <p className="landing-kicker">LES BONS REPÈRES</p>
            <h2>Avant de vous lancer.</h2>
          </div>
          <div>
            {[
              [
                "MOR décide-t-il à ma place ?",
                "Non. Le matching aide à lire les conditions ; votre décision de participation reste distincte et enregistrée par périmètre.",
              ],
              [
                "Puis-je déposer officiellement mon offre dans MOR ?",
                "Le dépôt officiel s'effectue sur le portail externe concerné. MOR permet d'enregistrer votre déclaration et son historique.",
              ],
              [
                "Les démonstrations présentent-elles de vrais marchés ?",
                "Les exemples de cette page sont fictifs et signalés comme tels. En mode connecté, les consultations et informations proviennent de l'API existante.",
              ],
              [
                "Comment accéder à mon entreprise ?",
                "Connectez-vous avec votre compte MOR existant. Le profil, les ressources et les justificatifs restent rattachés à votre espace.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="landing-close">
          <span>LE PROCHAIN MARCHÉ MÉRITE UN REGARD PLUS PRÉCIS.</span>
          <h2>
            Faites place à<br />
            <em>la bonne décision.</em>
          </h2>
          <Link to="/login" className="premium-btn light">
            Entrer dans MOR <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <Link to="/">
          <Brand />
        </Link>
        <span>
          Morocco Opportunity Radar
          <br />
          <small>Intelligence marchés publics · Maroc</small>
        </span>
        <a href="#landing-main">Revenir en haut ↑</a>
      </footer>
    </div>
  );
}
function BuildingLabel() {
  return <Fingerprint size={19} />;
}
