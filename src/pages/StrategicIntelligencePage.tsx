import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  Activity, ArrowRight, BarChart3, Building2,
  CheckCircle2, ChevronRight, CircleAlert,
  CircleHelp, FileCheck2, LockKeyhole,
  RefreshCw, ShieldAlert, Target, TrendingUp,
  Wallet,
} from "lucide-react"
import { apiGet } from "../api/client"
import "./StrategicIntelligencePage.css"

type Cause = {
  code: string
  ao_count: number
}

type Opportunity = {
  ref: string
  org: string
  title: string
  new_state: string
  reviews: string[]
}

type Scenario = {
  ceiling: number
  additional_capacity: number
  newly_unblocked_ao: number
  without_reserve: number
  conditional: number
  blocked: number
  opportunities: Opportunity[]
}

type Strategy = {
  error?: string
  company: string
  activity_domains: string
  covered_regions: string
  current_caution_capacity: number
  scope: string
  ao_in_scope: number
  current_position: {
    without_reserve: number
    conditional: number
    blocked: number
  }
  blocking_causes: Cause[]
  verification_causes: Cause[]
  caution_scenarios: Scenario[]
  limitations: string[]
}

const labels: Record<string, string> = {
  CAUTION: "Capacité de cautionnement",
  SIMILAR_REFERENCES: "Références similaires",
  ISO: "Certification ISO",
  COMPANY_ACTIVITY_FIT: "Compatibilité métier",
  CNSS: "Attestation CNSS",
  ATTESTATION_FISCALE: "Attestation fiscale",
  DECLARATION_HONNEUR: "Déclaration sur l'honneur",
  CAUTION_PROVISOIRE_DOCUMENT: "Justificatif de caution",
  POUVOIR_SIGNATAIRE: "Pouvoir du signataire",
  REGISTRE_COMMERCE: "Registre du commerce",
  CORE_EXECUTION_INHOUSE: "Exécution en interne",
  SUBCONTRACTING_LIMIT: "Conditions de sous-traitance",
  QUALIFICATION: "Qualification professionnelle",
  ESTIMATION_CAPACITY: "Capacité financière estimée",
  ECHANTILLON: "Échantillon",
  PROSPECTUS: "Prospectus",
}

const label = (code: string) =>
  labels[code] ?? code.replaceAll("_", " ")

const number = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(n)

function getStrategy() {
  return apiGet<{ data: Strategy }>(
    "/api/v4/intelligence/strategy",
  )
}

export function StrategicIntelligencePage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<number | null>(null)

  const query = useQuery({
    queryKey: ["intelligence-strategy-v2"],
    queryFn: getStrategy,
    staleTime: 60_000,
    retry: 1,
  })

  if (query.isLoading) {
    return (
      <main className="mis-page">
        <div className="mis-state">Analyse de votre marché en cours…</div>
      </main>
    )
  }

  if (query.isError || !query.data) {
    return (
      <main className="mis-page">
        <div className="mis-state">
          <CircleAlert />
          <h2>Analyse momentanément indisponible</h2>
          <p>Le moteur stratégique n'a pas pu être interrogé.</p>
          <button onClick={() => void query.refetch()}>
            Réessayer
          </button>
        </div>
      </main>
    )
  }

  const data = query.data.data

  if (data.error) {
    return (
      <main className="mis-page">
        <div className="mis-state">
          <CircleAlert />
          <h2>Profil à compléter</h2>
          <p>{data.error}</p>
          <button onClick={() => navigate("/company")}>
            Ouvrir Mon entreprise
          </button>
        </div>
      </main>
    )
  }

  const scenarios = data.caution_scenarios ?? []
  const active = scenarios.find(s => s.ceiling === selected)
    ?? scenarios[0]
  const baseline = data.current_position
  const remaining = active?.blocked ?? baseline.blocked
  const conditional = active?.conditional ?? baseline.conditional
  const clear = active?.without_reserve ?? baseline.without_reserve

  const barTotal = Math.max(data.ao_in_scope, 1)
  const ratio = (value: number) =>
    `${Math.max(0, value) * 100 / barTotal}%`

  return (
    <main className="mis-page">
      <header className="mis-hero">
        <div className="mis-hero-copy">
          <span className="mis-eyebrow">
            MOR PREMIUM / INTELLIGENCE STRATÉGIQUE
          </span>
          <h1>Ma position sur le marché</h1>
          <p>
            Identifiez ce qui limite votre entreprise,
            mesurez votre potentiel et découvrez
            les améliorations qui changent réellement
            votre situation.
          </p>
          <div className="mis-company">
            <Building2 size={16} />
            <strong>{data.company}</strong>
          </div>
        </div>
        <div className="mis-hero-symbol">
          <Target size={44} strokeWidth={1.5} />
        </div>
      </header>

      <section className="mis-scope">
        <div>
          <span className="mis-eyebrow">PÉRIMÈTRE PERSONNALISÉ</span>
          <h2>Vos métiers et vos territoires</h2>
          <div className="mis-chips">
            {(data.activity_domains || "")
              .split(",").map(s => s.trim())
              .filter(Boolean).map(s => (
                <span key={s}>{s}</span>
              ))}
          </div>
          <p>
            <Target size={15} />
            Régions déclarées : {data.covered_regions || "Non renseignées"}
          </p>
        </div>
        <button className="mis-link" onClick={() => navigate("/company")}>
          Ajuster mon profil <ArrowRight size={16} />
        </button>
      </section>

      <section className="mis-summary">
        <article className="mis-kpi">
          <span><Target size={19} /> Mes AO métiers</span>
          <strong>{number(data.ao_in_scope)}</strong>
          <small>Ouverts, avec correspondance métier validée par MOR</small>
        </article>
        <article className="mis-kpi mis-kpi-teal">
          <span><CheckCircle2 size={19} /> Sous réserve</span>
          <strong>{number(baseline.conditional)}</strong>
          <small>Sans blocage identifié, justificatifs à vérifier</small>
        </article>
        <article className="mis-kpi mis-kpi-warn">
          <span><ShieldAlert size={19} /> Avec obstacles</span>
          <strong>{number(baseline.blocked)}</strong>
          <small>Au moins une contrainte identifiée</small>
        </article>
        <article className="mis-kpi">
          <span><Wallet size={19} /> Caution actuelle</span>
          <strong>{number(data.current_caution_capacity)} <em>DH</em></strong>
          <small>Capacité déclarée dans votre profil</small>
        </article>
      </section>

      <section className="mis-panel">
        <div className="mis-panel-heading">
          <div>
            <span className="mis-eyebrow">DIAGNOSTIC</span>
            <h2>Ce qui limite votre entreprise</h2>
            <p>Obstacles détectés dans les AO de vos métiers.</p>
          </div>
          <ShieldAlert size={25} />
        </div>
        <div className="mis-obstacle-grid">
          {data.blocking_causes.length === 0 ? (
            <p>Aucun blocage confirmé dans le périmètre analysé.</p>
          ) : data.blocking_causes.map(cause => (
            <div className="mis-obstacle" key={cause.code}>
              <span className="mis-obstacle-count">
                {number(cause.ao_count)}
              </span>
              <div>
                <strong>{label(cause.code)}</strong>
                <small>AO concernés — certains peuvent cumuler plusieurs obstacles</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mis-panel mis-simulator">
        <div className="mis-panel-heading">
          <div>
            <span className="mis-eyebrow">SIMULATEUR STRATÉGIQUE</span>
            <h2>Et si vous renforciez votre caution ?</h2>
            <p>
              Choisissez un seuil réel issu des AO analysés.
              Aucun changement n'est enregistré dans votre profil.
            </p>
          </div>
          <TrendingUp size={27} />
        </div>

        <div className="mis-sim-layout">
          <div className="mis-sim-controls">
            <label htmlFor="mis-caution">Capacité simulée</label>
            <select
              id="mis-caution"
              value={active?.ceiling ?? ""}
              disabled={scenarios.length === 0}
              onChange={e => setSelected(Number(e.target.value))}
            >
              {scenarios.map(s => (
                <option key={s.ceiling} value={s.ceiling}>
                  {number(s.ceiling)} DH
                </option>
              ))}
            </select>
            <div className="mis-capacity-note">
              <Wallet size={17} />
              Capacité actuelle : {number(data.current_caution_capacity)} DH
            </div>
            {active && (
              <div className="mis-gain">
                <span>Marchés supplémentaires sans blocage identifié</span>
                <strong>+{number(active.newly_unblocked_ao)} AO</strong>
                <small>
                  +{number(active.additional_capacity)} DH de
                  capacité simulée, sous réserve des autres vérifications
                </small>
              </div>
            )}
          </div>
          <div className="mis-sim-result">
            <h3>Votre position simulée</h3>
            <div className="mis-stacked">
              <span className="mis-stacked-ok" style={{width: ratio(clear)}} />
              <span className="mis-stacked-check" style={{width: ratio(conditional)}} />
              <span className="mis-stacked-block" style={{width: ratio(remaining)}} />
            </div>
            <div className="mis-legend">
              <div><b>{clear}</b> Sans réserve identifiée</div>
              <div><b>{conditional}</b> Sous réserve</div>
              <div><b>{remaining}</b> Avec obstacle</div>
            </div>
            <p>
              <CircleHelp size={16} />
              Les résultats portent exclusivement sur les contrôles
              présents dans les analyses MOR. Ils ne constituent pas
              une validation définitive de candidature.
            </p>
          </div>
        </div>
      </section>

      <section className="mis-panel">
        <div className="mis-panel-heading">
          <div>
            <span className="mis-eyebrow">POTENTIEL RÉVÉLÉ</span>
            <h2>Les marchés concernés par ce scénario</h2>
            <p>
              Consultez les AO qui changeraient de situation
              avec le seuil de cautionnement sélectionné.
            </p>
          </div>
          <BarChart3 size={25} />
        </div>
        {active?.opportunities?.length ? (
          <div className="mis-opportunities">
            {active.opportunities.map(ao => (
              <button
                key={`${ao.ref}:${ao.org}`}
                className="mis-ao"
                onClick={() => navigate(
                  `/v5/study/${encodeURIComponent(ao.ref)}/${encodeURIComponent(ao.org)}`
                )}
              >
                <div className="mis-ao-ref">
                  <FileCheck2 size={18} />
                  AO {ao.ref}
                </div>
                <div className="mis-ao-body">
                  <strong>{ao.title}</strong>
                  <small>
                    {ao.reviews.length
                      ? `${ao.reviews.length} points à vérifier, dont : ${
                          ao.reviews.slice(0, 3).map(label).join(" · ")
                        }`
                      : "Aucune réserve identifiée dans les contrôles existants"}
                  </small>
                </div>
                <ChevronRight size={20} />
              </button>
            ))}
          </div>
        ) : (
          <div className="mis-empty">
            <LockKeyhole size={25} />
            <p>
              Aucun AO supplémentaire ne change de situation
              au seuil sélectionné.
            </p>
          </div>
        )}
      </section>

      <section className="mis-panel">
        <div className="mis-panel-heading">
          <div>
            <span className="mis-eyebrow">PRÉPARATION</span>
            <h2>Les vérifications à traiter</h2>
            <p>
              Ces éléments ne sont pas automatiquement des blocages.
            </p>
          </div>
          <Activity size={24} />
        </div>
        <div className="mis-review-list">
          {data.verification_causes.slice(0, 8).map(item => (
            <div key={item.code}>
              <span>{label(item.code)}</span>
              <strong>{item.ao_count} AO</strong>
            </div>
          ))}
        </div>
        <button className="mis-secondary" onClick={() => navigate("/company")}>
          Vérifier les données de mon entreprise
          <ArrowRight size={16} />
        </button>
      </section>

      <footer className="mis-footer">
        <div>
          <CircleHelp size={16} />
          <span>
            Marchés issus des analyses enregistrées, potentiellement
            non exhaustives. Les dates, territoires, preuves et
            conditions doivent être vérifiés avant toute décision.
          </span>
        </div>
        <button onClick={() => void query.refetch()}>
          <RefreshCw size={15} /> Actualiser
        </button>
      </footer>
    </main>
  )
}
