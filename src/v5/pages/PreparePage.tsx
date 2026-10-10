import { demoEnabled } from "../../premium/demo"
import { useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  AlertCircle, ArrowLeft, BookOpen, CheckCircle2,
  ChevronRight, ClipboardList, Clock3, FileSearch,
  FileText, FolderOpen, LockKeyhole, Search,
  ShieldCheck, SlidersHorizontal,
} from "lucide-react"

import {
  getOpportunityDetail,
  getLotDecisions,
} from "../../api/opportunities"
import {
  getPrepareRequirements,
  getHistoricalPrepareDetail,
  getPrepareAccess,
  type PrepareRequirement,
} from "../../api/prepare"

import { PrepareQualificationPanel } from "../components/PrepareQualificationPanel"
import { PrepareDocumentsPanel } from "../components/PrepareDocumentsPanel"
import { PrepareDocumentSummary } from "../components/PrepareDocumentSummary"
import "../styles/prepare.css"
import { HistoricalPrepareArchive } from "../components/HistoricalPrepareArchive"

type RegisterItem = {
  key: string
  title: string
  type: string
  category: string
  qualification: string
  recorded: boolean
  revision: number
  common: boolean
  scopeReviewed: boolean
  sourceDocument: string | null
  sourcePage: number | null
  sourceExcerpt: string | null
  mandatoryExtracted: boolean | null
}

type Category = "ALL" | "ADMINISTRATIF" | "TECHNIQUE" | "AUTRES"
type StatusFilter = "ALL" | "TO_QUALIFY" | "REQUIRED" | "OTHER"

// Activation explicite après migration et vérification backend.
// Ne jamais déduire la disponibilité du service d'un HTTP 404.
const PREPARE_V5_ENABLED =
  demoEnabled || import.meta.env.VITE_PREPARE_V5_ENABLED === "true"

function categoryOf(value: string): Category {
  if (value === "ADMINISTRATIF") return "ADMINISTRATIF"
  if (value === "TECHNIQUE") return "TECHNIQUE"
  return "AUTRES"
}

function statusLabel(value: string) {
  switch (value) {
    case "REQUIRED": return "Pièce exigée"
    case "OPTIONAL": return "Pièce facultative"
    case "NOT_APPLICABLE": return "Non applicable"
    default: return "À qualifier"
  }
}

function fromV5(item: PrepareRequirement): RegisterItem {
  return {
    key: `v5-${item.source_requirement_id}`,
    title: item.label || item.requirement_type,
    type: item.requirement_type,
    category: categoryOf(item.category),
    qualification: item.qualification,
    recorded: item.qualification_recorded,
    revision: item.qualification_revision,
    common: item.scope === "COMMON_CANDIDATE",
    scopeReviewed: item.scope_reviewed,
    sourceDocument: item.source.filename,
    sourcePage: item.source.page,
    sourceExcerpt: item.source.snippet,
    mandatoryExtracted: item.mandatory_from_extraction,
  }
}

export function PreparePage() {
  const { refConsultation, orgAcronyme, lotNumber } = useParams()
  const [category, setCategory] = useState<Category>("ALL")
  const [status, setStatus] = useState<StatusFilter>("ALL")
  const [search, setSearch] = useState("")
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  // M03_F80_SMART_NAVIGATION
  const detailRef = useRef<HTMLElement | null>(null)

  function openRequirement(
    sourceId: number,
    tab: "qualification" | "documents" = "qualification",
  ) {
    setCategory("ALL")
    setStatus("ALL")
    setSearch("")
    setSelectedKey(`v5-${sourceId}`)
    setWorkTab(tab)

    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })
  }

  const [workTab, setWorkTab] =
    useState<"qualification" | "documents">("qualification")


  const validParams = Boolean(refConsultation && orgAcronyme && lotNumber)

  const detailQuery = useQuery({
    queryKey: ["v5-prepare-detail", refConsultation, orgAcronyme],
    queryFn: () => getOpportunityDetail(refConsultation!, orgAcronyme!),
    enabled: validParams,
    retry: 1,
  })

  const decisionQuery = useQuery({
    queryKey: ["v5-lot-decisions", refConsultation, orgAcronyme],
    queryFn: () => getLotDecisions(refConsultation!, orgAcronyme!),
    enabled: validParams,
    retry: 1,
  })

  const decisions = decisionQuery.data?.data
  const authorized = Boolean(
    lotNumber &&
    decisions?.valid_lots.includes(lotNumber) &&
    decisions.decisions.some(
      item => item.lot_number === lotNumber && item.decision === "GO",
    ),
  )


  const accessQuery = useQuery({
    queryKey: [
      "v5-prepare-access",
      refConsultation,
      orgAcronyme,
      lotNumber,
    ],
    queryFn: () => getPrepareAccess(
      refConsultation!,
      orgAcronyme!,
      lotNumber!,
    ),
    enabled: PREPARE_V5_ENABLED &&
      validParams &&
      detailQuery.isSuccess &&
      decisionQuery.isSuccess,
    retry: false,
  })

  const activeConfirmed =
    PREPARE_V5_ENABLED &&
    accessQuery.isSuccess &&
    accessQuery.data.data.allowed === true &&
    authorized

  const accessErrorStatus =
    (accessQuery.error as { status?: number } | null)?.status

  const activeRejected =
    PREPARE_V5_ENABLED &&
    accessQuery.isError &&
    accessErrorStatus === 404

  const registerQuery = useQuery({
    queryKey: ["v5-prepare-register", refConsultation, orgAcronyme, lotNumber],
    queryFn: () => getPrepareRequirements(
      refConsultation!, orgAcronyme!, lotNumber!,
    ),
    enabled: activeConfirmed &&
      validParams && detailQuery.isSuccess,
    retry: false,
  })


  // G3.9 — L'archive n'est demandée que lorsque
  // les informations du marché sont accessibles,
  // mais que la préparation active n'est pas autorisée.
  const historicalQuery = useQuery({
    queryKey: [
      "v5-prepare-history",
      refConsultation,
      orgAcronyme,
      lotNumber,
    ],
    queryFn: () => getHistoricalPrepareDetail(
      refConsultation!,
      orgAcronyme!,
      lotNumber!,
    ),
    enabled: validParams &&
      detailQuery.isSuccess &&
      decisionQuery.isSuccess &&
      (
        !PREPARE_V5_ENABLED ||
        activeRejected ||
        (accessQuery.isSuccess && !activeConfirmed)
      ),
    retry: false,
  })

  // M04_F64_SUBMIT_LINK
  const submitUrl = validParams
    ? `/v5/submit/${encodeURIComponent(refConsultation!)}/` +
      `${encodeURIComponent(orgAcronyme!)}/` +
      `${encodeURIComponent(lotNumber!)}`
    : "/v5/discover"

  const studyUrl = validParams
    ? `/v5/study/${encodeURIComponent(refConsultation!)}/` +
      `${encodeURIComponent(orgAcronyme!)}?lot=${encodeURIComponent(lotNumber!)}`
    : "/v5/discover"


  // G3.9 — Consultation historique séparée du registre actif.
  // Ne jamais déduire l'existence d'une archive d'un 404.
  if (
    validParams &&
    detailQuery.isSuccess &&
    decisionQuery.isSuccess &&
    (
      !PREPARE_V5_ENABLED ||
      activeRejected ||
      (accessQuery.isSuccess && !activeConfirmed)
    )
  ) {
    if (historicalQuery.isPending) {
      return <main className="m5-prepare m5-prep-message"
        role="status">
        <Clock3 size={28} />
        <h1>Recherche de votre dossier archivé</h1>
        <p>Vérification sécurisée des données conservées.</p>
      </main>
    }

    if (historicalQuery.isSuccess) {
      const archive = historicalQuery.data.data
      if (
        archive.read_only === true &&
        archive.access_mode === "HISTORICAL_READ_ONLY"
      ) {
        return <HistoricalPrepareArchive
          archive={archive}
          studyUrl={studyUrl}
        />
      }
    }

    if (historicalQuery.isError) {
      return <main className="m5-prepare m5-prep-message"
        role="alert">
        <LockKeyhole size={28} />
        <h1>Dossier archivé non disponible</h1>
        <p>
          Aucun accès historique n'a été confirmé.
          Vérifiez vos droits ou réessayez.
        </p>
        <Link to={studyUrl}>Retour à Étudier</Link>
      </main>
    }
  }


  if (
    PREPARE_V5_ENABLED &&
    detailQuery.isSuccess &&
    decisionQuery.isSuccess &&
    (accessQuery.isPending ||
      (accessQuery.isError && !activeRejected))
  ) {
    if (accessQuery.isPending) {
      return <main className="m5-prepare m5-prep-message"
        role="status">
        <Clock3 size={28} />
        <h1>Vérification des autorisations</h1>
        <p>Confirmation de l'accès par le serveur.</p>
      </main>
    }

    return <main className="m5-prepare m5-prep-message"
      role="alert">
      <LockKeyhole size={28} />
      <h1>Accès à Préparer indisponible</h1>
      <p>
        Le serveur n'a pas confirmé vos droits.
        Aucune archive n'est ouverte automatiquement.
      </p>
      <Link to={studyUrl}>Retour à Étudier</Link>
    </main>
  }

  if (!validParams) {
    return <main className="m5-prepare">
      <h1>Dossier non identifié</h1>
      <Link to="/v5/discover">Retour à Découvrir</Link>
    </main>
  }

  if (detailQuery.isPending || decisionQuery.isPending) {
    return <main className="m5-prepare m5-prep-message" role="status">
      <Clock3 size={25} />
      <h1>Ouverture du dossier</h1>
      <p>Vérification du marché, du lot et de votre participation.</p>
    </main>
  }

  if (detailQuery.isError || decisionQuery.isError ||
      !detailQuery.data || !decisionQuery.data) {
    return <main className="m5-prepare m5-prep-message" role="alert">
      <AlertCircle size={28} />
      <h1>Dossier momentanément indisponible</h1>
      <p>Impossible de vérifier le marché ou votre décision de participation.</p>
      <Link to={studyUrl}>Retour à Étudier</Link>
    </main>
  }

  if (!authorized) {
    return <main className="m5-prepare m5-prep-message">
      <LockKeyhole size={28} />
      <h1>Participation non confirmée pour ce lot</h1>
      <p>Enregistrez « Je souhaite participer » depuis Étudier.</p>
      <Link to={studyUrl}><ArrowLeft size={16} /> Retour à Étudier</Link>
    </main>
  }

  if (PREPARE_V5_ENABLED && registerQuery.isPending) {
    return <main className="m5-prepare m5-prep-message" role="status">
      <Clock3 size={28} />
      <h1>Chargement du registre documentaire</h1>
      <p>Consultation sécurisée des exigences du lot sélectionné.</p>
    </main>
  }

  if (PREPARE_V5_ENABLED && registerQuery.isError) {
    const error = registerQuery.error as {
      status?: number
      statusCode?: number
      response?: { status?: number }
    } | null

    const statusCode =
      error?.status ?? error?.statusCode ?? error?.response?.status

    const accessDenied = statusCode === 401 ||
      statusCode === 403 || statusCode === 404

    return <main className="m5-prepare m5-prep-message" role="alert">
      {accessDenied ? <LockKeyhole size={28} /> :
        <AlertCircle size={28} />}
      <h1>{accessDenied
        ? "Accès au registre non autorisé"
        : "Registre documentaire indisponible"}</h1>
      <p>{accessDenied
        ? "Le serveur ne permet pas de consulter ce registre. " +
          "Vérifiez vos droits et la participation au lot."
        : "La lecture du registre a échoué. Aucune qualification " +
          "de remplacement ne sera affichée."}</p>
      <div className="m5-prep-error-actions">
        {!accessDenied && <button type="button"
          onClick={() => void registerQuery.refetch()}>
          Réessayer
        </button>}
        <Link to={studyUrl}>
          <ArrowLeft size={16} /> Retour à Étudier
        </Link>
      </div>
    </main>
  }

  const data = detailQuery.data.data
  const matchingLot = data.matching.lots.find(
    item => item.lot_number === lotNumber,
  )
  const financialLot = data.financial_lot_records.find(
    item => item.lot_number === lotNumber && item.lot_title,
  )
  const lotTitle = matchingLot?.lot_title ||
    financialLot?.lot_title || `Lot ${lotNumber}`

  const live = PREPARE_V5_ENABLED && registerQuery.isSuccess
  const waiting = PREPARE_V5_ENABLED && registerQuery.isPending
  const liveItems = registerQuery.data?.data.requirements ?? []

  // Prévisualisation issue du détail V4 : jamais une qualification.
  const previewItems: RegisterItem[] = Object.values(
    data.requirements,
  ).flat().filter(
    item => !item.lot_number || item.lot_number === lotNumber,
  ).map((item, index) => ({
    key: `preview-${index}`,
    title: item.label || item.type,
    type: item.type,
    category: categoryOf(
      Object.entries(data.requirements).find(
        ([, group]) => group.includes(item),
      )?.[0] ?? "",
    ),
    qualification: "TO_QUALIFY",
    recorded: false,
    revision: 0,
    common: !item.lot_number,
    scopeReviewed: false,
    sourceDocument: null,
    sourcePage: null,
    sourceExcerpt: null,
    mandatoryExtracted: item.mandatory ?? null,
  }))

  const items = live ? liveItems.map(fromV5) : previewItems

  const q = search.trim().toLocaleLowerCase("fr")
  const filtered = items.filter(item => {
    if (category !== "ALL" && item.category !== category) return false

    if (status === "TO_QUALIFY" && item.qualification !== "TO_QUALIFY")
      return false

    if (status === "REQUIRED" && item.qualification !== "REQUIRED")
      return false

    if (
      status === "OTHER" &&
      !["OPTIONAL", "NOT_APPLICABLE"].includes(item.qualification)
    ) return false

    const searchText = [
      item.title,
      item.type,
      item.sourceDocument ?? "",
    ].join(" ").toLocaleLowerCase("fr")

    return !q || searchText.includes(q)
  })

  const selected = filtered.find(item => item.key === selectedKey)
    ?? filtered[0] ?? null

  const selectedRequirement = liveItems.find(
    item => `v5-${item.source_requirement_id}` === selected?.key,
  )


  const tabs: { key: Category; label: string }[] = [
    { key: "ALL", label: "Toutes" },
    { key: "ADMINISTRATIF", label: "Administratif" },
    { key: "TECHNIQUE", label: "Technique" },
    { key: "AUTRES", label: "Autres" },
  ]

  return <main className="m5-prepare m5-prep">
    <header className="m5-prep-header">
      <div className="m5-prep-heading">
        <div className="m5-prep-eyebrow">
          03 / PRÉPARER
        </div>
        <h1>Préparer le dossier</h1>
        <p>{data.identity.title || "Marché public"}</p>
        <div className="m5-prep-lot">
          <FolderOpen size={16} />
          <strong>Lot {lotNumber}</strong>
          <span>{lotTitle}</span>
        </div>
      </div>
      {/* M04_F64_HEADER_NAVIGATION */}
      <div className="m5-prep-header-actions">
        <div className="m5-prep-decision">
          <CheckCircle2 size={18} />
          Participation enregistrée
        </div>

        <Link
          to={submitUrl}
          className="m5-prep-next-mission"
        >
          <span>04 · Soumettre</span>
          <ChevronRight size={17} />
        </Link>
      </div>
    </header>

    {/* M03_F82_KPI_UNIFIED:
        Les KPI documentaires sont centralisés dans
        PrepareDocumentSummary pour éviter les doublons. */}

    <div className={`m5-prep-state ${live ? "is-live" : ""}`} role="status">
      {live ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
      <div>
        <strong>
          {live ? demoEnabled ? "Registre documentaire · démonstration locale" : "Registre documentaire connecté" :
            waiting ? "Connexion au registre de qualification…" :
            "Aperçu V4 — registre V5 non activé"}
        </strong>
        <p>
          {live
            ? demoEnabled ? "Exemples interactifs. Les modifications restent temporaires et ne sont pas envoyées au backend." : "Les qualifications et révisions proviennent du backend Préparer V5."
            : "Les exigences affichées proviennent du détail du marché. " +
              "Aucune qualification ni validation documentaire n'est présumée."}
        </p>
      </div>
    </div>

      <div className="m5-prep-top-summary">
        {live && liveItems.length > 0 && (
      <PrepareDocumentSummary
        refConsultation={refConsultation!}
        orgAcronyme={orgAcronyme!}
        lotNumber={lotNumber!}
        sourceRequirementId={liveItems[0].source_requirement_id}
        onSelectRequirement={openRequirement}
      />
    )}
      </div>

    <div className="m5-prep-top-grid">
      <div className="m5-prep-top-register">
      <section className="m5-prep-register" aria-label="Registre documentaire">
        <div className="m5-prep-register-head">
          <div>
            <span className="m5-prep-eyebrow">DOSSIER DOCUMENTAIRE</span>
            <h2>Registre des exigences</h2>
            <p>{items.length} exigences visibles dans cette source</p>
          </div>
          <ClipboardList size={23} />
        </div>

        <div className="m5-prep-tabs" role="group" aria-label="Catégorie">
          {tabs.map(tab => (
            <button key={tab.key} type="button"
              className={category === tab.key ? "active" : ""}
              aria-pressed={category === tab.key}
              onClick={() => { setCategory(tab.key); setSelectedKey(null) }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="m5-prep-filters">
          <label className="m5-prep-search">
            <Search size={17} />
            <input value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Rechercher une pièce ou une exigence…"
              aria-label="Rechercher dans le registre" />
          </label>
          <label className="m5-prep-select">
            <SlidersHorizontal size={16} />
            <select value={status}
              onChange={event => {
                setStatus(event.target.value as StatusFilter)
                setSelectedKey(null)
              }} aria-label="Filtrer par qualification">
              <option value="ALL">Tous les états</option>
              <option value="TO_QUALIFY">À qualifier</option>
              <option value="REQUIRED">Exigées</option>
              <option value="OTHER">Autres qualifications</option>
            </select>
          </label>
        </div>

        <div className="m5-prep-list">
          {filtered.length === 0 ? (
            <div className="m5-prep-empty">
              <FileSearch size={28} />
              <strong>Aucune exigence dans cette sélection</strong>
              <p>Modifiez les filtres ou la recherche.</p>
            </div>
          ) : filtered.map(item => (
            <button type="button" key={item.key}
              className={`m5-prep-item ${selected?.key === item.key ? "active" : ""}`}
              onClick={() => setSelectedKey(item.key)}
              aria-pressed={selected?.key === item.key}>
              <span className="m5-prep-item-icon"><FileText size={19} /></span>
              <span className="m5-prep-item-main">
                <strong>{item.title}</strong>
                <small>
                  {item.category === "ADMINISTRATIF" ? "Administratif" :
                    item.category === "TECHNIQUE" ? "Technique" : "Autres"}
                  {" · "}
                  {item.common ? "Portée commune à examiner" : "Lot sélectionné"}
                </small>
              </span>
              <span className="m5-prep-item-status">
                {statusLabel(item.qualification)}
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
      </section>
      </div>

      <aside ref={detailRef} className="m5-prep-inspector" aria-label="Détail de l'exigence">
        {selected ? <>
          <div className="m5-prep-inspector-top">
            <span className="m5-prep-eyebrow">FICHE D'EXIGENCE</span>
            <span className="m5-prep-status">
              {statusLabel(selected.qualification)}
            </span>
          </div>
          <h2>{selected.title}</h2>
          <p className="m5-prep-type">{selected.type.replaceAll("_", " ")}</p>

          <div className="m5-prep-inspector-facts">
            <div><small>Portée</small><strong>
              {selected.common
                ? selected.scopeReviewed ? "Portée revue" : "Commune à vérifier"
                : `Lot ${lotNumber}`}
            </strong></div>
            <div><small>Révision</small><strong>
              {selected.recorded ? `N° ${selected.revision}` : "Non enregistrée"}
            </strong></div>
            <div><small>Obligation extraite</small><strong>
              {selected.mandatoryExtracted === null ? "Non précisée" :
                selected.mandatoryExtracted ? "Signalée obligatoire" :
                  "Non obligatoire"}
            </strong></div>
          </div>

          <nav className="m5-prep-task-tabs"
               aria-label="Étapes de travail documentaire">
            <button
              type="button"
              className={
                workTab === "qualification" ? "active" : ""
              }
              aria-pressed={workTab === "qualification"}
              onClick={() => setWorkTab("qualification")}
            >
              <ClipboardList size={17} />
              <span>01 · Qualification</span>
            </button>
            <button
              type="button"
              className={
                workTab === "documents" ? "active" : ""
              }
              aria-pressed={workTab === "documents"}
              onClick={() => setWorkTab("documents")}
            >
              <FolderOpen size={17} />
              <span>02 · Pièces et contrôle</span>
            </button>
          </nav>

          <div
            className="m5-prep-task-pane"
            hidden={workTab !== "qualification"}
          >
          {live && selectedRequirement ? (
            <PrepareQualificationPanel
              key={`${refConsultation}:${orgAcronyme}:${lotNumber}:${selectedRequirement.source_requirement_id}`}
              refConsultation={refConsultation!}
              orgAcronyme={orgAcronyme!}
              lotNumber={lotNumber!}
              requirement={selectedRequirement}
            />
          ) : (
            <div className="m5-prep-action">
              <LockKeyhole size={18} />
              <div>
                <strong>Qualification indisponible</strong>
                <p>Le registre V5 doit être connecté pour modifier cette exigence.</p>
              </div>
            </div>
          )}

          </div>

          <div
            className="m5-prep-task-pane"
            hidden={workTab !== "documents"}
          >
          {live && selectedRequirement && (
            <PrepareDocumentsPanel
              key={`documents:${refConsultation}:${orgAcronyme}:${lotNumber}:${selectedRequirement.source_requirement_id}`}
              refConsultation={refConsultation!}
              orgAcronyme={orgAcronyme!}
              lotNumber={lotNumber!}
              sourceRequirementId={selectedRequirement.source_requirement_id}
            />
          )}

          </div>

          <div className="m5-prep-proof">
            <div className="m5-prep-proof-title">
              <BookOpen size={18} />
              <strong>Référence au DCE</strong>
            </div>
            {selected.sourceDocument ? <>
              <p><strong>Document :</strong> {selected.sourceDocument}</p>
              <p><strong>Page :</strong> {selected.sourcePage ?? "Non localisée"}</p>
              {selected.sourceExcerpt ? (
                <blockquote>{selected.sourceExcerpt}</blockquote>
              ) : <p>Extrait documentaire non disponible.</p>}
            </> : (
              <p>
                La référence détaillée sera disponible après activation
                du registre sourcé Préparer V5.
              </p>
            )}
          </div>

        </> : (
          <div className="m5-prep-empty">
            <FileSearch size={30} />
            <strong>Sélectionnez une exigence</strong>
            <p>Son détail documentaire apparaîtra ici.</p>
          </div>
        )}
      </aside>
    </div>

    <footer className="m5-prep-footer">
      <AlertCircle size={16} />
      La qualification ne vaut pas validation d'un fichier.
      Aucun dépôt ou soumission n'est effectué depuis cet écran.
    </footer>
  </main>
}
