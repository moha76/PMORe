import { MorLot as Layers3 } from "../../premium/MorIcons";
import { dateLabel } from "../../premium/format"
import { useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowUpRight, AlertTriangle, CheckCircle2,
  ClipboardList, FileSearch, FileText, ShieldAlert,
  Wallet, ChevronRight, CalendarDays, Building2,
  RefreshCw, ListFilter, Info, Banknote,
} from "lucide-react"
import { getOpportunityDetail, getLotDecisions } from "../../api/opportunities"
import { EvidenceDrawer } from "../../components/opportunity/EvidenceDrawer"
import type { Evidence, MatchCheck } from "../../api/types"
import { LotDecisionPanel } from "../components/LotDecisionPanel"
import "../styles/study.css"

type Tab = "summary" | "conditions" | "finance" | "sources"
type Filter = "ALL" | "OK" | "VERIFY" | "BLOCKING"

const tabs = [
  { id: "summary", title: "Synthèse", icon: ClipboardList },
  { id: "conditions", title: "Conditions", icon: CheckCircle2 },
  { id: "finance", title: "Finances", icon: Wallet },
  { id: "sources", title: "Sources", icon: FileSearch },
] as const

function readable(value: string | number | null | undefined) {
  return value === null || value === undefined || value === ""
    ? "Non renseigné"
    : String(value)
}

function statusName(value: string) {
  switch (value) {
    case "OK": return "Conforme"
    case "VERIFY": return "À vérifier"
    case "PARTIAL": return "Partiellement conforme"
    case "BLOCKING": return "Obstacle"
    case "NOT_APPLICABLE": return "Non applicable"
    default: return "Information manquante"
  }
}

function statusTone(value: string) {
  if (value === "OK") return "success"
  if (value === "BLOCKING") return "danger"
  if (value === "NOT_APPLICABLE") return "neutral"
  return "warning"
}

function CheckRow({
  check,
  onEvidence,
}: {
  check: MatchCheck
  onEvidence: (e: Evidence) => void
}) {
  const tone = statusTone(check.status)
  return (
    <article className={`study-check study-check--${tone}`}>
      <div className="study-check__status">
        <span className={`study-pill study-pill--${tone}`}>
          {statusName(check.status)}
        </span>
      </div>
      <div className="study-check__main">
        <h3>{readable(check.label ?? check.code)}</h3>
        <p>{readable(
          check.user_view?.explanation ??
          check.detail ??
          check.user_view?.gap
            ?.toString()
        )}</p>
        {/* MOR_M05_10_ACTION_CARDS */}
        {check.user_view?.action && (
          <div className="study-check__next-action">
            <span className="study-check__next-action-label">
              Action à effectuer
            </span>
            <p>{check.user_view.action}</p>
          </div>
        )}
        {check.source?.filename && (
          <span className="study-check__reference">
            <FileText size={13} aria-hidden="true" />
            {check.source.filename}
            {check.source.page != null
              ? ` · Page ${check.source.page}` : ""}
          </span>
        )}
      </div>
      {check.source && (
        <button
          type="button"
          className="study-proof"
          onClick={() => onEvidence(check.source!)}
        >
          Preuve <ArrowUpRight size={15} />
        </button>
      )}
    </article>
  )
}

// G1.4-B — Périmètre de lecture unifié.
// Les lignes sans numéro sont communes au marché.
// GLOBAL n'est jamais assimilé à un lot numéroté.
function belongsToScope(
  recordLot: string | null | undefined,
  selectedLot: string,
): boolean {
  const value = recordLot?.trim() ?? ""

  if (!selectedLot || selectedLot === "GLOBAL") {
    return !value || value === "GLOBAL"
  }

  return !value || value === selectedLot
}

export function StudyPage() {
  const { refConsultation, orgAcronyme } = useParams()
  const [tab, setTab] = useState<Tab>("summary")
  const [searchParams, setSearchParams] = useSearchParams()
  const lotSelection = searchParams.get("lot") ?? ""
  function setLotSelection(lot: string) { const next = new URLSearchParams(searchParams); next.set("lot", lot); setSearchParams(next, { replace: true }) }
  const [filter, setFilter] = useState<Filter>("ALL")
  const [evidence, setEvidence] = useState<Evidence | null>(null)

  const query = useQuery({
    queryKey: ["v5-study", refConsultation, orgAcronyme],
    queryFn: () =>
      getOpportunityDetail(refConsultation!, orgAcronyme!),
    enabled: Boolean(refConsultation && orgAcronyme),
    retry: 1,
  })

  // M02_R2E_BACKEND_LOTS
  // Le backend est la source unique des lots autorisés.
  const lotDecisionsQuery = useQuery({
    queryKey: [
      "v5-lot-decisions",
      refConsultation,
      orgAcronyme,
    ],
    queryFn: () =>
      getLotDecisions(refConsultation!, orgAcronyme!),
    enabled: Boolean(refConsultation && orgAcronyme),
    retry: 1,
  })

  if (!refConsultation || !orgAcronyme) {
    return <main className="study-page">Marché non identifié.</main>
  }

  if (query.isPending) {
    return (
      <main className="study-page study-state" role="status">
        Chargement des données du marché…
      </main>
    )
  }

  if (query.isError || !query.data) {
    return (
      <main className="study-page study-state">
        <AlertTriangle size={28} />
        <h1>Impossible de charger cette étude</h1>
        <p>Les données du marché sont indisponibles.</p>
        <button type="button" onClick={() => void query.refetch()}>
          <RefreshCw size={16} /> Réessayer
        </button>
      </main>
    )
  }

  if (lotDecisionsQuery.isPending) {
    return (
      <main className="study-page study-state">
        Chargement du périmètre de participation...
      </main>
    )
  }

  if (lotDecisionsQuery.isError) {
    return (
      <main className="study-page study-state">
        <AlertTriangle size={28} />
        <h1>Périmètre indisponible</h1>
        <p>
          Impossible de vérifier les lots autorisés.
          Aucune décision ne doit être enregistrée
          sans cette vérification.
        </p>
        <button
          type="button"
          onClick={() => void lotDecisionsQuery.refetch()}
        >
          <RefreshCw size={16} /> Réessayer
        </button>
      </main>
    )
  }

  const data = query.data.data
  const matching = data.matching

  // G1.4-A — Périmètres consultables, indépendants
  // de l'autorisation à enregistrer une décision.
  const participationScope = lotDecisionsQuery.data.data.scope
  const selectableLots = participationScope.selectable_lots
  const reviewLots = participationScope.review_lots

  const lotNumbers = Array.from(new Set([
    ...selectableLots,
    ...reviewLots,
  ]))

  const currentLot = lotNumbers.includes(lotSelection)
    ? lotSelection : (lotNumbers[0] ?? "")


  const selectedLotInfo = matching.lots.find(
    x => currentLot === "GLOBAL"
      ? !x.lot_number || x.lot_number === "GLOBAL"
      : x.lot_number === currentLot
  )

  const checksForScope = (scopeLot: string) =>
    matching.lots
      .filter(x => belongsToScope(x.lot_number, scopeLot))
      .flatMap(x => x.checks)

  const checks = checksForScope(currentLot)

  const ok = checks.filter(x => x.status === "OK")
  const blocking = checks.filter(x => x.status === "BLOCKING")
  const verify = checks.filter(x =>
    ["VERIFY", "PARTIAL", "UNKNOWN"].includes(x.status)
  )

  // MOR_M05_11_PRIORITY_ORDER
  // Priorité basée uniquement sur les statuts réels du matching.
  const priorityRank: Record<string, number> = {
    BLOCKING: 0,
    PARTIAL: 1,
    VERIFY: 2,
    UNKNOWN: 3,
    OK: 4,
    NOT_APPLICABLE: 5,
  }

  const priorityChecks = [...checks].sort(
    (a, b) =>
      (priorityRank[a.status] ?? 6) -
      (priorityRank[b.status] ?? 6)
  )

  const listed = filter === "OK"
    ? priorityChecks.filter(x => x.status === "OK")
    : filter === "VERIFY"
      ? priorityChecks.filter(x =>
          ["PARTIAL", "VERIFY", "UNKNOWN"].includes(x.status)
        )
      : filter === "BLOCKING"
        ? priorityChecks.filter(x => x.status === "BLOCKING")
        : priorityChecks.filter(x =>
            ["BLOCKING", "PARTIAL", "VERIFY", "UNKNOWN"].includes(x.status)
          )

  // MOR_M05_9_PRIORITY_SUMMARY
  // Vue courte par défaut ; les filtres explicites restent complets.
  const summaryChecks = filter === "ALL"
    ? listed.slice(0, 5)
    : listed

  const remainingPriorityChecks = filter === "ALL"
    ? Math.max(0, listed.length - summaryChecks.length)
    : 0

  const requirements = Object.entries(data.requirements).flatMap(
    ([group, rows]) => rows
      .filter(x =>
        belongsToScope(x.lot_number, currentLot)
      )
      .map(x => ({ ...x, group }))
  )

  const financial = data.financial_lot_records.filter(
    x => belongsToScope(x.lot_number, currentLot)
  )

  // M02-D6 LOT KPI — données du périmètre sélectionné
  const sourcedChecks = checks.filter(x =>
    x.source?.document_id != null ||
    Boolean(x.source?.filename) ||
    Boolean(x.source?.snippet)
  )

  // G1.4-C — Montants strictement associés au périmètre.
  // Une valeur générale n'est pas attribuée à un lot numéroté.
  const amountForScope = (
    scopeLot: string,
    field: "estimation" | "caution_provisoire",
  ): string => {
    const records = data.financial_lot_records.filter(x => {
      const value = x.lot_number?.trim() ?? ""
      return scopeLot === "GLOBAL" || !scopeLot
        ? !value || value === "GLOBAL"
        : value === scopeLot
    })

    const values = records
      .filter(x => x[field] != null && x.currency)
      .map(x => ({
        amount: x[field] as number,
        currency: x.currency as string,
      }))

    const unique = Array.from(
      new Map(
        values.map(v => [`${v.currency}|${v.amount}`, v])
      ).values()
    )

    if (unique.length === 0) return "Non renseigné"
    if (unique.length > 1) return "Valeurs contradictoires"

    return new Intl.NumberFormat("fr-MA", {
      maximumFractionDigits: 2,
    }).format(unique[0].amount) + " " + unique[0].currency
  }

  const lotEstimation = amountForScope(currentLot, "estimation")
  const lotCaution = amountForScope(currentLot, "caution_provisoire")

  const filteredTitle = filter === "OK" ? "Conditions conformes" :
    filter === "VERIFY" ? "Points à vérifier" :
    filter === "BLOCKING" ? "Obstacles identifiés" :
    "Points nécessitant votre attention"

  const quality = data.analysis_quality
  const freshness = matching.freshness ?? "UNKNOWN"

  return (
    <main className="study-page">
      <header className="study-hero">
        <div className="study-hero__main">
          <p className="premium-eyebrow">02 / ÉTUDIER · ANALYSE DE PARTICIPATION</p>
          <h1 title={data.identity.title ?? undefined}>
            {readable(data.identity.title)}
          </h1>
          <div className="study-hero__meta">
            <span><Building2 size={15} /> {readable(data.identity.buyer)}</span>
            <span>Réf. {readable(
              data.identity.reference ?? refConsultation
            )}</span>
          </div>
        </div>
        <div className="study-hero__aside">
          <span className="study-hero__label">Date limite</span>
          <strong><CalendarDays size={16} />
            {dateLabel(data.deadline.iso ?? data.deadline.raw)}
          </strong>
          <span className={`study-pill study-pill--${
            statusTone(selectedLotInfo?.computed_status ??
              matching.computed_status)
          }`}>
            {statusName(selectedLotInfo?.computed_status ??
              matching.computed_status)}
          </span>
        </div>
      </header>

      {/* MOR_M05_13_FINAL */}
      {/* M02-D9 LOT CARDS */}
      <section className="study-lot-selector"
        aria-label="Sélectionner un lot">
        <div className="study-lot-selector__heading">
          <div>
            <span className="study-overline">PÉRIMÈTRE DE PARTICIPATION</span>
            <h2>{lotNumbers.length === 1 ? "Périmètre étudié" : "Lots du marché"}</h2>
          </div>
          <span>{lotNumbers.length === 1
              ? "1 périmètre"
              : `${lotNumbers.length} périmètres`}</span>
        </div>
        <div className="study-lot-cards">
          {(lotNumbers.length ? lotNumbers : [""]).map(number => {
            const lot = matching.lots.find(x =>
              number === "GLOBAL"
                ? !x.lot_number
                : x.lot_number === number
            )
            const fin = data.financial_lot_records.filter(x => {
              const value = x.lot_number?.trim() ?? ""
              return number === "GLOBAL" || !number
                ? !value || value === "GLOBAL"
                : value === number
            })
            const estimation = amountForScope(number, "estimation")
            const lotChecks = checksForScope(number)
            const nbOk = lotChecks.filter(x => x.status === "OK").length
            const nbVerify = lotChecks.filter(x =>
              ["VERIFY", "PARTIAL", "UNKNOWN"].includes(x.status)
            ).length
            const nbBlock = lotChecks.filter(
              x => x.status === "BLOCKING"
            ).length

            return (
              <button type="button" key={number || "global"}
                className={`study-lot-card ${
                  currentLot === number ? "is-selected" : ""
                }`}
                aria-pressed={currentLot === number}
                onClick={() => {
                  setLotSelection(number)
                  setFilter("ALL")
                }}>
                <div className="study-lot-card__top">
                  <span className="study-lot-card__identity">
                    <span className="study-lot-card__icon">
                      <Layers3 size={21} aria-hidden="true" />
                    </span>
                    <span className="study-lot-card__number">
                      {number === "GLOBAL"
                        ? "MARCHÉ ENTIER"
                        : number
                          ? `LOT ${number}`
                          : "ALLOTISSEMENT À DÉTERMINER"}
                    </span>
                    <small>
                      {selectableLots.includes(number)
                        ? "Périmètre sélectionnable"
                        : number
                          ? "Périmètre à vérifier"
                          : "Périmètre non déterminé"}
                    </small>
                  </span>
                  <span className={`study-pill study-pill--${
                    statusTone(lot?.computed_status ?? "UNKNOWN")
                  }`}>
                    {"Matching : "}
                    {statusName(lot?.computed_status ?? "UNKNOWN")}
                  </span>
                </div>
                <strong className="study-lot-card__name">
                  {number === "GLOBAL"
                    ? "Marché entier · périmètre de participation"
                    : lot?.lot_title ??
                      fin.find(x => x.lot_title)?.lot_title ??
                      (number ? `Lot ${number}` : "Allotissement à vérifier")}
                </strong>
                <div className="study-lot-card__metrics">
                  <span className="study-lot-card__ok">
                    {nbOk} conformes
                  </span>
                  <span className="study-lot-card__verify">
                    {nbVerify} à vérifier
                  </span>
                  <span className="study-lot-card__block">
                    {nbBlock} obstacles
                  </span>
                </div>
                <div className="study-lot-card__bottom">
                  <span className="study-lot-card__amount-label">
                    <Banknote size={16} aria-hidden="true" />
                    Estimation
                  </span>
                  <strong>{estimation}</strong>
                </div>
                <span className="study-lot-card__footer">
                  {currentLot === number
                    ? "Lot actuellement étudié"
                    : "Cliquer pour étudier ce lot"}
                  <ChevronRight size={16} aria-hidden="true" />
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* M02-D6 LOT KPI : visibles dans les quatre sections */}
      <section className="study-lot-dashboard"
        aria-label="Indicateurs du lot sélectionné">
        <div className="study-lot-dashboard__heading">
          <div>
            <span className="study-overline">TABLEAU DE BORD DU LOT</span>
            <h2>
              {currentLot === "GLOBAL"
              ? "Analyse du marché entier"
              : currentLot ? `Analyse du lot ${currentLot}` : "Analyse du marché"}
            </h2>
          </div>
          <span className={`study-pill study-pill--${
            statusTone(selectedLotInfo?.computed_status ??
              matching.computed_status)
          }`}>
            {statusName(selectedLotInfo?.computed_status ??
              matching.computed_status)}
          </span>
        </div>

        <div className="study-lot-kpis">
          {([
            { key: "OK", label: "Conformes", value: ok.length,
              tone: "success", icon: CheckCircle2 },
            { key: "VERIFY", label: "À vérifier", value: verify.length,
              tone: "warning", icon: AlertTriangle },
            { key: "BLOCKING", label: "Obstacles", value: blocking.length,
              tone: "danger", icon: ShieldAlert },
          ] as const).map(k => {
            const Icon = k.icon
            return (
              <button
                key={k.key}
                type="button"
                className={`study-lot-kpi study-lot-kpi--${k.tone} ${
                  tab === "conditions" && filter === k.key ? "is-active" : ""
                }`}
                aria-pressed={tab === "conditions" && filter === k.key}
                onClick={() => {
                  setFilter(k.key)
                  setTab("conditions")
                }}
              >
                <span className="study-lot-kpi__label">
                  {k.label} <Icon size={19} />
                </span>
                <strong>{k.value}</strong>
                <span className="study-lot-kpi__hint">
                  Voir les contrôles <ChevronRight size={14} />
                </span>
              </button>
            )
          })}

          <button className="study-lot-kpi study-lot-kpi--blue"
            type="button" onClick={() => setTab("sources")}>
            <span className="study-lot-kpi__label">
              Contrôles avec preuve <FileSearch size={19} />
            </span>
            <strong>{sourcedChecks.length}</strong>
            <span className="study-lot-kpi__hint">
              Sources du marché <ChevronRight size={14} />
            </span>
          </button>

          <button className="study-lot-kpi study-lot-kpi--neutral"
            type="button" onClick={() => setTab("finance")}>
            <span className="study-lot-kpi__label">
              Estimation du lot <Wallet size={19} />
            </span>
            <strong className="study-lot-kpi__money">{lotEstimation}</strong>
            <span className="study-lot-kpi__hint">
              Détail financier <ChevronRight size={14} />
            </span>
          </button>

          <button className="study-lot-kpi study-lot-kpi--neutral"
            type="button" onClick={() => setTab("finance")}>
            <span className="study-lot-kpi__label">
              Caution provisoire <Wallet size={19} />
            </span>
            <strong className="study-lot-kpi__money">{lotCaution}</strong>
            <span className="study-lot-kpi__hint">
              Détail financier <ChevronRight size={14} />
            </span>
          </button>
        </div>
        {participationScope.kind === "UNDETERMINED" && (
          <p className="study-disclaimer" role="status">
            Allotissement non déterminé. L'étude reste consultable,
            mais aucune décision de participation ne peut être
            enregistrée avant clarification du périmètre.
          </p>
        )}
        {currentLot &&
          !selectableLots.includes(currentLot) &&
          participationScope.kind !== "UNDETERMINED" && (
          <p className="study-disclaimer" role="status">
            Ce lot est en cours de vérification documentaire.
            Vous pouvez consulter son analyse, mais pas encore
            enregistrer une décision de participation.
          </p>
        )}
        <p className="study-lot-dashboard__note">
          Les indicateurs de conformité proviennent des contrôles du matching.
          Les montants proviennent des données financières consolidées du lot.
        </p>
      </section>

      {/* MOR_M05_7_ANALYSIS_LAYOUT */}
      <div className="study-analysis-layout">
        <div className="study-analysis-layout__main">
      <nav className="study-tabs" aria-label="Sections du marché">
        {tabs.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? "is-active" : ""}
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => {
                setTab(item.id)
                if (item.id === "conditions") setFilter("ALL")
              }}
            >
              <Icon size={18} />
              {item.title}
            </button>
          )
        })}
      </nav>

      {tab === "summary" && (
        <section className="study-section">
          <div className="study-section-heading">
            <div>
              <span className="study-overline">VUE DE DÉCISION</span>
              <h2>Synthèse de participation</h2>
              <p>Lecture des contrôles issus de votre analyse MOR.</p>
            </div>
            {freshness !== "FRESH" && (
              <span className="study-pill study-pill--warning">
                Analyse {freshness === "STALE" ? "à actualiser" : "non datée"}
              </span>
            )}
          </div>

          <div className="study-workspace">
            <section className="study-panel study-panel--main">
              <header className="study-panel__header">
                <div>
                  <span className="study-overline">PRIORITÉS DU LOT</span>
                  <h2>
                    {filter === "ALL"
                      ? "Points à examiner avant de décider"
                      : filteredTitle}
                  </h2>
                </div>
                {filter !== "ALL" && (
                  <button
                    className="study-clear"
                    type="button"
                    onClick={() => setFilter("ALL")}
                  >
                    <ListFilter size={15} /> Tout afficher
                  </button>
                )}
              </header>

              {checks.length === 0 && (
                <div className="study-empty">
                  Aucun contrôle disponible. L'éligibilité n'est pas établie.
                </div>
              )}
              {summaryChecks.length === 0 && checks.length > 0 && (
                <div className="study-empty">
                  {filter === "ALL"
                    ? "Aucun obstacle ni point à vérifier identifié par le matching. Consultez les conditions pour examiner les autres contrôles."
                    : "Aucun contrôle dans cette catégorie."}
                </div>
              )}
              <div className="study-checks">
                {summaryChecks.map((check, i) => (
                  <CheckRow
                    key={`${check.code ?? "check"}-${i}`}
                    check={check}
                    onEvidence={setEvidence}
                  />
                ))}
              </div>
              <div className="study-priority-footer">
                <span>
                  {filter === "ALL" && remainingPriorityChecks > 0
                    ? `${remainingPriorityChecks} autre(s) point(s) à examiner`
                    : "Consultez le détail des contrôles et justificatifs."}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFilter("ALL")
                    setTab("conditions")
                  }}
                >
                  Voir toutes les conditions
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </section>

            <aside className="study-panel study-context">
              <header className="study-panel__header">
                <div>
                  <span className="study-overline">CONTEXTE DOCUMENTAIRE</span>
                  <h2>Fiabilité de l'étude</h2>
                </div>
              </header>
              <div className="study-context__item">
                <span>Fraîcheur du matching</span>
                <strong>{freshness === "FRESH" ? "À jour" :
                  freshness === "STALE" ? "À actualiser" :
                  "À confirmer"}</strong>
              </div>
              <div className="study-context__item">
                <span>Traitement du DCE</span>
                <strong>{readable(quality.pipeline_status)}</strong>
              </div>
              <div className="study-context__item">
                <span>Couverture d'analyse</span>
                <strong>{readable(quality.coverage_status)}</strong>
              </div>
              <div className="study-context__item">
                <span>Documents répertoriés</span>
                <strong>{data.documents.length}</strong>
              </div>
              <button
                type="button"
                className="study-context__link"
                onClick={() => setTab("sources")}
              >
                Consulter les sources <ArrowUpRight size={16} />
              </button>
              <div className="study-context__note">
                <Info size={17} />
                <p>Une intention de participer ne supprime pas les obstacles et les vérifications restantes.</p>
              </div>
            </aside>
          </div>
        </section>
      )}

      {tab === "conditions" && (
        <section className="study-section">
          <div className="study-section-heading">
            <div>
              <span className="study-overline">EXIGENCES DU DCE</span>
              <h2>Conditions de participation</h2>
              <p>Exigences consolidées, valeurs et preuves documentaires.</p>
            </div>
          </div>
          <div className="study-panel study-studychecks">
            <header className="study-panel__header">
              <div>
                <span className="study-overline">
                  COMPATIBILITÉ ENTREPRISE / LOT
                </span>
                <h2>{filter === "ALL"
                  ? "Résultats du matching"
                  : filteredTitle}</h2>
              </div>
              {filter !== "ALL" && (
                <button className="study-clear" type="button"
                  onClick={() => setFilter("ALL")}>
                  <ListFilter size={15} /> Tous les contrôles
                </button>
              )}
            </header>
            <div className="study-checks">
              {(filter === "ALL" ? checks : listed).map((check, i) => (
                <CheckRow
                  key={`${check.code ?? "check"}-${i}`}
                  check={check}
                  onEvidence={setEvidence}
                />
              ))}
            </div>
            {(filter === "ALL" ? checks : listed).length === 0 && (
              <div className="study-empty">
                Aucun contrôle de matching pour cette sélection.
              </div>
            )}
          </div>
          <h3 className="study-subsection-title">
            Exigences documentaires consolidées
          </h3>
          <div className="study-panel study-table-panel">
            <div className="study-table-wrap">
              <table className="study-table">
                <thead><tr>
                  <th>Catégorie / condition</th>
                  <th>Valeur extraite</th>
                  <th>Obligatoire</th>
                  <th>Justificatif</th>
                </tr></thead>
                <tbody>
                  {requirements.map((r, i) => (
                    <tr key={`${r.group}-${r.type}-${i}`}>
                      <td>
                        <span className="study-table__muted">{r.group}</span>
                        <strong>{r.label}</strong>
                      </td>
                      <td>{readable(r.value_text ?? r.value_number)}</td>
                      <td>{r.mandatory == null ? "À vérifier" :
                        r.mandatory ? "Oui" : "Non"}</td>
                      <td>
                        {r.evidence ? (
                          <button
                            type="button"
                            className="study-proof"
                            onClick={() => setEvidence(r.evidence ?? null)}
                          >Source <ArrowUpRight size={14} /></button>
                        ) : "Non disponible"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {requirements.length === 0 && (
              <div className="study-empty">
                Aucune exigence extraite pour ce périmètre.
              </div>
            )}
          </div>
          <p className="study-disclaimer">
            La présence d'une exigence ne prouve pas sa satisfaction par l'entreprise. Les résultats de compatibilité sont présentés dans la Synthèse.
          </p>
        </section>
      )}

      {tab === "finance" && (
        <section className="study-section">
          <div className="study-section-heading">
            <div>
              <span className="study-overline">ÉVALUATION FINANCIÈRE</span>
              <h2>Engagement financier</h2>
              <p>Chiffres officiels disponibles et limites de calcul.</p>
            </div>
          </div>
          <div className="study-financial-grid">
            <div className="study-financial-card">
              <span>Estimation générale publiée</span>
              <strong>{readable(data.financial_summary.estimation_raw)}</strong>
            </div>
            <div className="study-financial-card">
              <span>Caution générale publiée</span>
              <strong>{readable(data.financial_summary.caution_raw)}</strong>
            </div>
          </div>
          <div className="study-panel study-table-panel">
            <header className="study-panel__header">
              <h2>Informations du lot sélectionné</h2>
            </header>
            {financial.length === 0 ? (
              <div className="study-empty">
                Aucune donnée financière consolidée pour ce lot.
              </div>
            ) : (
              <div className="study-table-wrap">
                <table className="study-table">
                  <thead><tr>
                    <th>Lot</th><th>Estimation</th>
                    <th>Caution provisoire</th><th>Source</th>
                  </tr></thead>
                  <tbody>
                    {financial.map((f, i) => (
                      <tr key={`${f.lot_number ?? "global"}-${i}`}>
                        <td><strong>{f.lot_title ??
                          (f.lot_number ? `Lot ${f.lot_number}` : "Marché")}</strong></td>
                        <td>{readable(f.estimation)} {f.estimation != null ? readable(f.currency) : ""}</td>
                        <td>{readable(f.caution_provisoire)} {f.caution_provisoire != null ? readable(f.currency) : ""}</td>
                        <td>{f.evidence ? (
                          <button className="study-proof" type="button"
                            onClick={() => setEvidence(f.evidence ?? null)}>
                            Source <ArrowUpRight size={14} />
                          </button>
                        ) : "Non disponible"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="study-context__note">
            <Wallet size={18} />
            <p>Rentabilité non calculable : les coûts de réalisation propres à l'entreprise ne sont pas encore renseignés. Aucun résultat financier n'est supposé.</p>
          </div>
        </section>
      )}

      {tab === "sources" && (
        <section className="study-section">
          <div className="study-section-heading">
            <div>
              <span className="study-overline">TRAÇABILITÉ DOCUMENTAIRE</span>
              <h2>Sources du marché</h2>
              <p>Documents associés à l'AO et état global de l'extraction.</p>
            </div>
          </div>
          <div className="study-panel">
            <header className="study-panel__header">
              <h2>Documents répertoriés ({data.documents.length})</h2>
            </header>
            {data.documents.length === 0 && (
              <div className="study-empty">
                Aucun document disponible dans l'inventaire.
              </div>
            )}
            <div className="study-documents">
              {data.documents.map(d => (
                <div className="study-document" key={d.id}>
                  <div className="study-document__icon">
                    <FileText size={21} />
                  </div>
                  <div>
                    <strong>{readable(d.filename)}</strong>
                    <span>{readable(d.document_type)}
                      {" · "}
                      Document n°{d.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="study-source-footer">
            <span>Extraction : {readable(quality.pipeline_status)}</span>
            <span>Couverture : {readable(quality.coverage_status)}</span>
          </div>
          {data.identity.url && (
            <a className="study-official" href={data.identity.url}
              target="_blank" rel="noopener noreferrer">
              Ouvrir l'annonce officielle <ArrowUpRight size={16} />
            </a>
          )}
        </section>
      )}


        </div>

        <aside
          className="study-analysis-layout__rail"
          aria-label="Espace de décision de participation"
        >
      {/* MOR_M05_5_DECISION_WORKSPACE */}
      <section
        id="study-decision"
        className="study-decision-anchor"
        aria-label="Espace de décision"
      >
        <div className="study-decision-anchor__intro">
          <div>
            <span className="study-overline">
              VOTRE PROCHAINE ACTION
            </span>
            <h2>Décider de participer</h2>
            <p>
              Votre choix est enregistré pour le périmètre
              sélectionné. Les vérifications restantes
              demeurent visibles dans l'étude.
            </p>
          </div>
        </div>

        {currentLot && currentLot !== "UNDETERMINED" ? (
          <LotDecisionPanel
            key={`${refConsultation}:${orgAcronyme}:${currentLot}`}
            refConsultation={refConsultation}
            orgAcronyme={orgAcronyme}
            lotNumber={currentLot}
          />
        ) : (
          <div
            className="study-decision-anchor__empty"
            role="status"
          >
            Aucun périmètre de participation n'est encore
            identifié. Consultez les éléments du marché
            pour clarifier son allotissement avant
            d'enregistrer une décision.
          </div>
        )}
      </section>

        </aside>
      </div>

      <EvidenceDrawer
        evidence={evidence}
        onClose={() => setEvidence(null)}
      />
    </main>
  )
}
