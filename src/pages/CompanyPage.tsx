import "../index.css"
import { CompanyActivitiesEditor, CompanyOperationalEditor } from "./CompanyProfileEditors"
// M08_COMPANY_EDITORS
import { Building2 } from "lucide-react"
// M06_COMPANY_ICONS_V1
import { LayoutDashboard, FolderOpen, BriefcaseBusiness, SlidersHorizontal } from "lucide-react"
import { CompanyBulkImport } from "../components/company/CompanyBulkImport"
import "./CompanyPage.css"
import {
  useMemo,
  useState,
  useEffect,
} from "react"

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  getCompanyWorkspace,
  updateCompanyProfile,
} from "../api/company"

import {
  CompanyDocumentsPanel,
} from "../components/company/CompanyDocumentsPanel"

import {
  CompanyResourcesPanel,
} from "../components/company/CompanyResourcesPanel"


type Tab =
  | "overview"
  | "documents"
  | "personnel"
  | "equipment"
  | "certifications"
  | "references"
  | "matching"
  | "bulk-import"


function money(
  value: number | null,
) {
  if (value == null) {
    return "À renseigner"
  }

  return (
    new Intl.NumberFormat(
      "fr-MA",
      {
        maximumFractionDigits: 0,
      },
    ).format(value)
    + " DH"
  )
}







function matchingParameterTarget(
  family: string | null,
  sourceTable: string,
): Tab {
  const value =
    `${family ?? ""} ${sourceTable}`
      .toLowerCase()

  if (
    value.includes("document")
  ) {
    return "documents"
  }

  if (
    value.includes("personnel")
    || value.includes("staff")
  ) {
    return "personnel"
  }

  if (
    value.includes("equipment")
    || value.includes("materiel")
    || value.includes("matériel")
  ) {
    return "equipment"
  }

  if (
    value.includes("certification")
    || value.includes("qualification")
    || value.includes("agrement")
    || value.includes("agrément")
  ) {
    return "certifications"
  }

  if (
    value.includes("reference")
    || value.includes("experience")
    || value.includes("expérience")
  ) {
    return "references"
  }

  return "overview"
}


function matchingParameterImpact(
  family: string | null,
  label: string,
) {
  const value =
    `${family ?? ""} ${label}`
      .toLowerCase()

  if (
    value.includes("finance")
    || value.includes("chiffre")
    || value.includes("caution")
    || value.includes("marché")
  ) {
    return "Utilisé pour vérifier si la capacité financière de l'entreprise est compatible avec les exigences du marché."
  }

  if (
    value.includes("personnel")
  ) {
    return "Utilisé pour comparer les profils, qualifications et expériences disponibles avec le personnel exigé par le DCE."
  }

  if (
    value.includes("matériel")
    || value.includes("materiel")
    || value.includes("equipment")
  ) {
    return "Utilisé pour vérifier la disponibilité des moyens matériels demandés pour l'exécution du marché."
  }

  if (
    value.includes("certification")
    || value.includes("agrément")
    || value.includes("qualification")
  ) {
    return "Utilisé pour contrôler les agréments, qualifications et certifications exigés par l'appel d'offres."
  }

  if (
    value.includes("référence")
    || value.includes("reference")
    || value.includes("expérience")
    || value.includes("experience")
  ) {
    return "Utilisé pour mesurer la similarité entre les références de l'entreprise et les prestations demandées."
  }

  if (
    value.includes("activité")
    || value.includes("activity")
  ) {
    return "Utilisé pour vérifier la compatibilité entre l'activité de l'entreprise et l'objet du marché."
  }

  if (
    value.includes("région")
    || value.includes("region")
  ) {
    return "Utilisé pour apprécier la capacité géographique de l'entreprise à intervenir dans la zone du marché."
  }

  return "Ce paramètre contribue à la qualification MOR en comparant les données de l'entreprise avec les exigences de l'appel d'offres."
}


function matchingParameterImpactLevel(
  family: string | null,
  label: string,
) {
  const value =
    `${family ?? ""} ${label}`
      .toLowerCase()

  if (
    value.includes("activité")
    || value.includes("activity")
    || value.includes("référence")
    || value.includes("reference")
    || value.includes("personnel")
    || value.includes("qualification")
    || value.includes("agrément")
    || value.includes("agrement")
    || value.includes("certification")
  ) {
    return {
      level: "CRITICAL",
      label: "Critique",
      rank: 3,
    }
  }

  if (
    value.includes("finance")
    || value.includes("chiffre")
    || value.includes("caution")
    || value.includes("marché")
    || value.includes("materiel")
    || value.includes("matériel")
    || value.includes("equipment")
    || value.includes("région")
    || value.includes("region")
  ) {
    return {
      level: "IMPORTANT",
      label: "Important",
      rank: 2,
    }
  }

  return {
    level: "INFO",
    label: "Informatif",
    rank: 1,
  }
}


export function CompanyPage() {
  const queryClient =
    useQueryClient()

  const initialCompanyNavigation =
    (() => {
      const params =
        new URLSearchParams(
          window.location.search,
        )

      const requestedTab =
        params.get("tab")

      const allowedTabs: Tab[] = [
        "overview",
        "documents",
        "personnel",
        "equipment",
        "certifications",
        "references",
        "matching",
        "bulk-import",
      ]

      const tab: Tab =
        requestedTab
        && allowedTabs.includes(
          requestedTab as Tab,
        )
          ? requestedTab as Tab
          : "overview"

      return {
        tab,
        focus:
          params.get("focus") || "",
      }
    })()

  const [activeTab, setActiveTab] =
    useState<Tab>(
      initialCompanyNavigation.tab,
    )

  const [editingFinance, setEditingFinance] =
    useState(false)

  const [annualRevenue, setAnnualRevenue] =
    useState("")

  const [
    cautionCapacity,
    setCautionCapacity,
  ] = useState("")

  const [
    maxContractCapacity,
    setMaxContractCapacity,
  ] = useState("")


  const query = useQuery({
    queryKey: [
      "company-workspace",
    ],

    queryFn:
      getCompanyWorkspace,
  })


  const workspace =
    query.data?.data

  const profile =
    workspace?.profile


  const mutation = useMutation({
    mutationFn: () =>
      updateCompanyProfile({
        annual_revenue:
          annualRevenue
            ? Number(annualRevenue)
            : null,

        caution_capacity:
          cautionCapacity
            ? Number(cautionCapacity)
            : null,

        max_contract_capacity:
          maxContractCapacity
            ? Number(
                maxContractCapacity
              )
            : null,
      }),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "company-workspace",
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "company-rematch-status",
          ],
        }),
      ])

      await queryClient.refetchQueries({
        queryKey: [
          "company-rematch-status",
        ],
      })

      setEditingFinance(false)
    },
  })


  const documentHealth =
    useMemo(() => {
      if (!workspace) {
        return {
          ready: 0,
          missing: 0,
          expired: 0,
        }
      }

      return {
        ready:
          workspace.summary
            .documents_uploaded,

        missing:
          workspace.summary
            .documents_without_file,

        expired:
          workspace.summary
            .documents_expired,
      }
    }, [workspace])


  useEffect(() => {
    if (!workspace) {
      return
    }

    const focus =
      initialCompanyNavigation.focus

    if (!focus) {
      return
    }

    const targets:
      Record<string, string> = {
        finance:
          "company-finance",
        capabilities:
          "company-capabilities",
      }

    const targetId =
      targets[focus]
      || (
        /^company-document-\d+$/.test(
          focus,
        )
          ? focus
          : ""
      )

    if (!targetId) {
      return
    }

    const timer =
      window.setTimeout(
        () => {
          const element =
            document.getElementById(
              targetId,
            )

          if (!element) {
            return
          }

          if (
            targetId.startsWith(
              "company-document-",
            )
          ) {
            element.classList.add(
              "mor-v63-document-focus",
            )

            window.setTimeout(
              () => {
                element.classList.remove(
                  "mor-v63-document-focus",
                )
              },
              2200,
            )
          }

          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
          })

          element.classList.add(
            "mor-company-focus-target",
          )

          window.setTimeout(
            () => {
              element.classList.remove(
                "mor-company-focus-target",
              )
            },
            2200,
          )
        },
        120,
      )

    return () =>
      window.clearTimeout(timer)
  }, [
    workspace,
    activeTab,
  ])


  if (query.isLoading) {
    return (
      <div className="mor-company-state">
        Chargement du dossier entreprise…
      </div>
    )
  }


  if (
    query.isError
    || !workspace
    || !profile
  ) {
    return (
      <div className="mor-company-state error">
        Impossible de charger le dossier
        entreprise.
      </div>
    )
  }





  const matchingParameters =
    workspace.matching_parameters ?? []


  const activeMatchingParameters =
    matchingParameters.filter(
      (parameter) =>
        Boolean(
          parameter.used_in_matching,
        ),
    )


  const incompleteMatchingParameters =
    activeMatchingParameters.filter(
      (parameter) =>
        parameter.completion_status
          === "MISSING"
        || parameter.completion_status
          === "PARTIAL",
    )


  const criticalIncompleteParameters =
    incompleteMatchingParameters.filter(
      (parameter) =>
        matchingParameterImpactLevel(
          parameter.parameter_family,
          parameter.label,
        ).level === "CRITICAL",
    )


  const matchingFamilies =
    Array.from(
      new Set(
        matchingParameters.map(
          (parameter) =>
            parameter.parameter_family
            || "Autres",
        ),
      ),
    )
      .sort(
        (a, b) =>
          a.localeCompare(
            b,
            "fr",
          ),
      )


  const startFinanceEdit = () => {
    setAnnualRevenue(
      profile.annual_revenue
        ?.toString() ?? ""
    )

    setCautionCapacity(
      profile.caution_capacity
        ?.toString() ?? ""
    )

    setMaxContractCapacity(
      profile.max_contract_capacity
        ?.toString() ?? ""
    )

    setEditingFinance(true)
  }


  return (
    <main className="mor-workspace mor-company-premium">

      <header className="mor-workspace-hero">

        <div className="mor-workspace-company">

          <span className="mor-workspace-eyebrow">
            MON ENTREPRISE / PROFIL ET CAPACITÉS
          </span>

          <h1>
            {profile.company_name}
          </h1>

          <p>
            {[
              profile.legal_form,
              profile.city,
              profile.region,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

        </div>


        <div className="mor-profile-completion">

          <div>
            <strong>
              {
                workspace.summary
                  .profile_completion_percent
              }%
            </strong>

            <span>
              profil renseigné
            </span>
          </div>

          <div className="mor-completion-track">
            <span
              style={{
                width:
                  `${
                    workspace.summary
                      .profile_completion_percent
                  }%`,
              }}
            />
          </div>

        </div>

      </header>


      {/* M06_FIVE_SPACES_V1 */}
      <nav className="mor-company-five-nav" aria-label="Espaces entreprise">
        <button
          type="button"
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          <LayoutDashboard size={19} />
          Vue d'ensemble
        </button>

        <button
          type="button"
          className={
            ["personnel", "equipment"].includes(activeTab)
              ? "active"
              : ""
          }
          onClick={() => setActiveTab("personnel")}
        >
          <Building2 size={19} />
          Profil et capacités
        </button>

        <button
          type="button"
          className={
            ["documents", "certifications", "bulk-import"].includes(activeTab)
              ? "active"
              : ""
          }
          onClick={() => setActiveTab("documents")}
        >
          <FolderOpen size={19} />
          Documents
        </button>

        <button
          type="button"
          className={activeTab === "references" ? "active" : ""}
          onClick={() => setActiveTab("references")}
        >
          <BriefcaseBusiness size={19} />
          Expérience
        </button>

        <button
          type="button"
          className={activeTab === "matching" ? "active" : ""}
          onClick={() => setActiveTab("matching")}
        >
          <SlidersHorizontal size={19} />
          Critères MOR
        </button>
      </nav>


      {activeTab === "overview" && <>
      <section className="mor-workspace-kpis mor-kpis-m09">
{/* M09_PREMIUM_KPI */}

        <article className="mor-kpi-premium mor-kpi-theme-1">
<div className="mor-kpi-premium-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/><path d="M8 3v5h5"/><path d="M8 13h5M8 17h4"/><path d="M16 3h5v8h-5z"/></svg></div>

          <span>
            Documents
          </span>

          <strong>
            {
              workspace.summary
                .documents_total
            }
          </strong>

          <small>
            {documentHealth.ready}
            {" "}fichier chargé
          </small>
        </article>


        <article className="mor-kpi-premium mor-kpi-theme-2">
<div className="mor-kpi-premium-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><path d="M17 5a3 3 0 0 1 0 6"/><path d="M18 15a5 5 0 0 1 3 5"/></svg></div>

          <span>
            Personnel
          </span>

          <strong>
            {
              workspace.summary
                .personnel_total
            }
          </strong>

          <small>
            profils déclarés
          </small>
        </article>


        <article className="mor-kpi-premium mor-kpi-theme-3">
<div className="mor-kpi-premium-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-3.1 3.1-3-3z"/></svg></div>

          <span>
            Matériel
          </span>

          <strong>
            {
              workspace.summary
                .equipment_total
            }
          </strong>

          <small>
            moyens déclarés
          </small>
        </article>


        <article className="mor-kpi-premium mor-kpi-theme-4">
<div className="mor-kpi-premium-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18M10 13v2h4v-2"/></svg></div>

          <span>
            Références
          </span>

          <strong>
            {
              workspace.summary
                .references_total
            }
          </strong>

          <small>
            expériences
          </small>
        </article>


        <article className="mor-kpi-premium mor-kpi-theme-5">
<div className="mor-kpi-premium-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="m8.5 12-2 9 5.5-3 5.5 3-2-9"/><path d="m10 8 1.5 1.5L14 7"/></svg></div>

          <span>
            Certifications
          </span>

          <strong>
            {
              workspace.summary
                .certifications_total
            }
          </strong>

          <small>
            qualifications
          </small>
        </article>

      </section>


      {workspace.alerts.length > 0 && (
        <section className="mor-company-alerts">

          <div className="mor-section-title">
            <span>
              À TRAITER
            </span>

            <h2>
              Points qui réduisent la qualité
              du matching
            </h2>
          </div>

          <div className="mor-alert-grid">
            {workspace.alerts.map(
              (alert) => (
                <article
                  key={alert.code}
                  className={
                    `mor-company-alert ${
                      alert.level
                        .toLowerCase()
                    }`
                  }
                >
                  <strong>
                    {alert.level ===
                    "BLOCKING"
                      ? "Bloquant"
                      : "À compléter"}
                  </strong>

                  <p>
                    {alert.message}
                  </p>
                </article>
              )
            )}
          </div>

        </section>
      )}


      </>}

      {["personnel", "equipment"].includes(activeTab) && (
        <div className="mor-company-subnav">
          <button
            type="button"
            className={activeTab === "personnel" ? "active" : ""}
            onClick={() => setActiveTab("personnel")}
          >
            Personnel
          </button>
          <button
            type="button"
            className={activeTab === "equipment" ? "active" : ""}
            onClick={() => setActiveTab("equipment")}
          >
            Matériel
          </button>
        </div>
      )}

      {["documents", "certifications", "bulk-import"].includes(activeTab) && (
        <div className="mor-company-subnav">
          <button
            type="button"
            className={activeTab === "documents" ? "active" : ""}
            onClick={() => setActiveTab("documents")}
          >
            Justificatifs
          </button>
          <button
            type="button"
            className={activeTab === "certifications" ? "active" : ""}
            onClick={() => setActiveTab("certifications")}
          >
            Certifications
          </button>
          <button
            type="button"
            className={activeTab === "bulk-import" ? "active" : ""}
            onClick={() => setActiveTab("bulk-import")}
          >
            Import intelligent
          </button>
        </div>
      )}


      {activeTab === "overview" && (
        
        <div className="mor-workspace-overview">
          {/* M07_8_THREE_COLUMNS */}

          <div className="mor-overview-column mor-overview-column-one">


          {/* M08_PERSISTENT_MATCHING_CARD */}
{incompleteMatchingParameters.length > 0 && (
            <section className="mor-matching-readiness">

              <div className="mor-matching-readiness-head">
                <div>
                  <span>
                    MATCHING MOR
                  </span>

                  <h2>
                    À compléter pour améliorer
                    vos recommandations
                  </h2>

                  <p>
                    Certaines données utilisées par MOR
                    sont encore manquantes ou incomplètes.
                  </p>
                </div>

                <div className="mor-matching-readiness-count">
                  <strong>
                    {
                      incompleteMatchingParameters
                        .length
                    }
                  </strong>

                  <span>
                    paramètre
                    {
                      incompleteMatchingParameters
                        .length > 1
                        ? "s"
                        : ""
                    }
                    {" "}
                    à compléter
                  </span>
                </div>
              </div>


              {criticalIncompleteParameters.length > 0 && (
                <div className="mor-matching-critical-alert">
                  <strong>
                    {
                      criticalIncompleteParameters
                        .length
                    }
                    {" "}
                    paramètre
                    {
                      criticalIncompleteParameters
                        .length > 1
                        ? "s critiques"
                        : " critique"
                    }
                  </strong>

                  <span>
                    Ces informations peuvent fortement
                    influencer la qualification d'un AO.
                  </span>
                </div>
              )}


              <div className="mor-matching-readiness-list">
                {incompleteMatchingParameters.map(
                  (parameter) => {
                    const impact =
                      matchingParameterImpactLevel(
                        parameter.parameter_family,
                        parameter.label,
                      )

                    return (
                      <div
                        key={
                          parameter.parameter_code
                        }
                        className="mor-matching-readiness-item"
                      >
                        <div>
                          <strong>
                            {parameter.label}
                          </strong>

                          <span>
                            Impact {impact.label}
                            {" · "}
                            {parameter
                              .completion_status
                              === "PARTIAL"
                              ? "Incomplet"
                              : "Non renseigné"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setActiveTab(
                              matchingParameterTarget(
                                parameter
                                  .parameter_family,
                                parameter
                                  .source_table,
                              ),
                            )
                          }
                        >
                          {parameter
                            .completion_status
                            === "PARTIAL"
                            ? "Compléter"
                            : "Renseigner"}
                        </button>
                      </div>
                    )
                  },
                )}
              </div>


              <button
                type="button"
                className="mor-matching-readiness-settings"
                onClick={() =>
                  setActiveTab(
                    "matching",
                  )
                }
              >
                Voir tous les paramètres MOR →
              </button>

            </section>
          )}
{incompleteMatchingParameters.length === 0 && (
  <section className="mor-matching-readiness">
    <div className="mor-matching-readiness-head">
      <div>
        <span>MATCHING MOR</span>
        <h2>Paramètres de mon entreprise</h2>
        <p>Aucun paramètre incomplet détecté.</p>
      </div>
    </div>
    <button
      type="button"
      className="mor-matching-readiness-settings"
      onClick={() => setActiveTab("matching")}
    >
      Voir tous les paramètres MOR →
    </button>
  </section>
)}


          
<section className="mor-workspace-card mor-document-readiness">

            <div className="mor-card-heading">
              <div>
                <span>
                  DOSSIER ADMINISTRATIF
                </span>

                <h2>
                  État documentaire
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveTab(
                    "documents"
                  )
                }
              >
                Voir les documents
              </button>
            </div>

            <div className="mor-readiness-grid">

              <div className="success">
                <strong>
                  {
                    documentHealth.ready
                  }
                </strong>
                <span>
                  fichiers chargés
                </span>
              </div>

              <div className="warning">
                <strong>
                  {
                    documentHealth.missing
                  }
                </strong>
                <span>
                  fichiers manquants
                </span>
              </div>

              <div className="danger">
                <strong>
                  {
                    documentHealth.expired
                  }
                </strong>
                <span>
                  expirés
                </span>
              </div>

            </div>

          </section>
          </div>

          <div className="mor-overview-column mor-overview-column-two">
<CompanyActivitiesEditor profile={profile} />
<CompanyOperationalEditor profile={profile} />
          </div>

          <div className="mor-overview-column mor-overview-column-three">
<section
            id="company-finance"
            className="mor-workspace-card mor-finance-aside"
          >

            <div className="mor-card-heading">
              <div>
                <span>
                  CAPACITÉS UTILISÉES PAR MOR
                </span>

                <h2>
                  Capacités de l'entreprise
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  startFinanceEdit
                }
              >
                Modifier
              </button>
            </div>


            {!editingFinance ? (
              <div className="mor-finance-values">

                <div>
                  <span>
                    Chiffre d'affaires annuel
                  </span>

                  <strong>
                    {money(
                      profile
                        .annual_revenue
                    )}
                  </strong>

                  <small>
                    Indicateur financier utilisé
                    dans certains contrôles MOR.
                  </small>
                </div>

                <div>
                  <span>
                    Capacité de caution
                  </span>

                  <strong>
                    {money(
                      profile
                        .caution_capacity
                    )}
                  </strong>

                  <small>
                    Montant maximal de caution
                    que l'entreprise peut mobiliser.
                  </small>
                </div>

                <div
                  className={
                    profile
                      .max_contract_capacity
                      == null
                      ? "warning"
                      : ""
                  }
                >
                  <span>
                    Capacité maximale de marché
                  </span>

                  <strong>
                    {money(
                      profile
                        .max_contract_capacity
                    )}
                  </strong>

                  <small>
                    Montant maximal d'un marché
                    que l'entreprise considère
                    pouvoir exécuter.
                  </small>
                </div>

                <div className="mor-finance-impact">
                  <strong>
                    Impact sur le matching MOR
                  </strong>

                  <span>
                    Ces valeurs influencent directement
                    la sélection des Bons candidats dans
                    Pour mon entreprise.
                  </span>
                </div>

              </div>
            ) : (
              <div className="mor-finance-edit">

                <label>
                  CA annuel
                  <input
                    type="number"
                    min="0"
                    value={
                      annualRevenue
                    }
                    onChange={(event) =>
                      setAnnualRevenue(
                        event.target
                          .value
                      )
                    }
                  />
                </label>

                <label>
                  Capacité caution
                  <input
                    type="number"
                    min="0"
                    value={
                      cautionCapacity
                    }
                    onChange={(event) =>
                      setCautionCapacity(
                        event.target
                          .value
                      )
                    }
                  />
                </label>

                <label>
                  Capacité maximale marché
                  <input
                    type="number"
                    min="0"
                    value={
                      maxContractCapacity
                    }
                    onChange={(event) =>
                      setMaxContractCapacity(
                        event.target
                          .value
                      )
                    }
                  />
                </label>

                <div className="mor-finance-actions">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingFinance(
                        false
                      )
                    }
                  >
                    Annuler
                  </button>

                  <button
                    type="button"
                    className="primary"
                    disabled={
                      mutation.isPending
                    }
                    onClick={() =>
                      mutation.mutate()
                    }
                  >
                    {mutation.isPending
                      ? "Enregistrement…"
                      : "Enregistrer"}
                  </button>
                </div>

              </div>
            )}

          </section>
          </div>

        </div>
      )}


      {activeTab === "bulk-import" && (
        <CompanyBulkImport />
      )}

      {activeTab === "documents" && (
        <CompanyDocumentsPanel
          documents={workspace.documents}
        />
      )}


      {activeTab === "personnel" && (
        <CompanyResourcesPanel
          kind="personnel"
          items={workspace.personnel}
        />
      )}


      {activeTab === "equipment" && (
        <CompanyResourcesPanel
          kind="equipment"
          items={workspace.equipment}
        />
      )}


      {activeTab === "certifications" && (
        <CompanyResourcesPanel
          kind="certifications"
          items={workspace.certifications}
        />
      )}


      {activeTab === "references" && (
        <CompanyResourcesPanel
          kind="references"
          items={workspace.references}
        />
      )}


      {activeTab === "matching" && (
        <div className="mor-settings-page">

          <section className="mor-settings-hero">
            <div>
              <span className="mor-workspace-eyebrow">
                MOTEUR MOR
              </span>

              <h2>
                Paramètres utilisés pour
                qualifier vos opportunités
              </h2>

              <p>
                MOR croise ces informations
                avec les exigences de chaque
                appel d'offres. Ces paramètres
                proviennent de votre dossier
                entreprise et de vos preuves.
              </p>
            </div>

            <div className="mor-settings-summary">
              <div>
                <strong>
                  {
                    activeMatchingParameters
                      .length
                  }
                </strong>

                <span>
                  paramètres actifs
                </span>
              </div>

              <div>
                <strong>
                  {
                    matchingFamilies.length
                  }
                </strong>

                <span>
                  familles
                </span>
              </div>

              <div>
                <strong>
                  {
                    matchingParameters.length
                  }
                </strong>

                <span>
                  paramètres connus
                </span>
              </div>
            </div>
          </section>


          <section className="mor-settings-info">
            <strong>
              Comment modifier ces paramètres ?
            </strong>

            <p>
              MOR ne demande pas de régler
              manuellement son moteur.
              Modifiez les données réelles de
              votre entreprise — finances,
              personnel, matériel,
              certifications, références et
              documents — puis MOR recalcule
              automatiquement le matching.
            </p>
          </section>


          <div className="mor-settings-families">
            {matchingFamilies.map(
              (family) => {
                const parameters =
                  matchingParameters
                    .filter(
                      (parameter) =>
                        (
                          parameter
                            .parameter_family
                          || "Autres"
                        ) === family,
                    )
                    .sort(
                      (a, b) => {
                        const aImpact =
                          matchingParameterImpactLevel(
                            a.parameter_family,
                            a.label,
                          )

                        const bImpact =
                          matchingParameterImpactLevel(
                            b.parameter_family,
                            b.label,
                          )

                        return (
                          bImpact.rank
                          - aImpact.rank
                        )
                      },
                    )

                const activeCount =
                  parameters.filter(
                    (parameter) =>
                      Boolean(
                        parameter
                          .used_in_matching,
                      ),
                  ).length

                return (
                  <section
                    key={family}
                    className="mor-settings-family"
                  >
                    <header className="mor-settings-family-head">
                      <div>
                        <span>
                          FAMILLE
                        </span>

                        <h3>
                          {family}
                        </h3>
                      </div>

                      <small>
                        {activeCount}
                        /
                        {parameters.length}
                        {" "}
                        actifs
                      </small>
                    </header>

                    <div className="mor-settings-parameter-list">
                      {parameters.map(
                        (parameter) => {
                          const active =
                            Boolean(
                              parameter
                                .used_in_matching,
                            )

                          const impact =
                            matchingParameterImpactLevel(
                              parameter
                                .parameter_family,
                              parameter.label,
                            )

                          return (
                            <article
                              key={
                                parameter
                                  .parameter_code
                              }
                              className={
                                active
                                  ? "active"
                                  : "inactive"
                              }
                            >
                              <div className="mor-settings-parameter-main">
                                <strong>
                                  {
                                    parameter
                                      .label
                                  }
                                </strong>

                                <code>
                                  {
                                    parameter
                                      .parameter_code
                                  }
                                </code>

                                {parameter
                                  .description && (
                                  <p>
                                    {
                                      parameter
                                        .description
                                    }
                                  </p>
                                )}

                                <div className="mor-settings-impact">
                                  <span>
                                    Pourquoi MOR l'utilise
                                  </span>

                                  <p>
                                    {
                                      matchingParameterImpact(
                                        parameter
                                          .parameter_family,
                                        parameter.label,
                                      )
                                    }
                                  </p>
                                </div>
                              </div>

                              <div className="mor-settings-parameter-meta">
                                <span
                                  className={
                                    "mor-impact-badge "
                                    + impact.level
                                      .toLowerCase()
                                  }
                                >
                                  Impact
                                  {" "}
                                  {impact.label}
                                </span>

                                <span
                                  className={
                                    active
                                      ? "mor-status success"
                                      : "mor-status neutral"
                                  }
                                >
                                  {active
                                    ? "Utilisé dans le matching"
                                    : "Non utilisé"}
                                </span>

                                <span
                                  className={
                                    parameter
                                      .completion_status
                                      === "COMPLETE"
                                      ? "mor-status success"
                                      : parameter
                                          .completion_status
                                          === "PARTIAL"
                                        ? "mor-status warning"
                                        : parameter
                                            .completion_status
                                            === "NON_APPLICABLE"
                                          ? "mor-status neutral"
                                          : "mor-status danger"
                                  }
                                >
                                  {parameter
                                    .completion_status
                                    === "COMPLETE"
                                    ? "✓ Renseigné"
                                    : parameter
                                        .completion_status
                                        === "PARTIAL"
                                      ? "À compléter"
                                      : parameter
                                          .completion_status
                                          === "NON_APPLICABLE"
                                        ? "Non applicable"
                                        : "! À renseigner"}
                                </span>

                                <small>
                                  Source :
                                  {" "}
                                  {
                                    parameter
                                      .source_table
                                  }
                                  {parameter
                                    .source_field
                                    ? "."
                                      + parameter
                                        .source_field
                                    : ""}
                                </small>

                                {parameter
                                  .value_type && (
                                  <small>
                                    Type :
                                    {" "}
                                    {
                                      parameter
                                        .value_type
                                    }
                                  </small>
                                )}

                                <button
                                  type="button"
                                  className={
                                    "mor-settings-source-action "
                                    + (
                                      parameter
                                        .completion_status
                                        === "COMPLETE"
                                        ? "secondary"
                                        : "primary"
                                    )
                                  }
                                  onClick={() =>
                                    setActiveTab(
                                      matchingParameterTarget(
                                        parameter
                                          .parameter_family,
                                        parameter
                                          .source_table,
                                      ),
                                    )
                                  }
                                >
                                  {parameter
                                    .completion_status
                                    === "COMPLETE"
                                    ? "Voir la donnée source →"
                                    : parameter
                                        .completion_status
                                        === "PARTIAL"
                                      ? "Compléter →"
                                      : parameter
                                          .completion_status
                                          === "NON_APPLICABLE"
                                        ? "Voir la source →"
                                        : "Renseigner →"}
                                </button>
                              </div>
                            </article>
                          )
                        },
                      )}
                    </div>
                  </section>
                )
              },
            )}
          </div>

        </div>
      )}

    </main>
  )
}
