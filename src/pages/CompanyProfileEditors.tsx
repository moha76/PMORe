import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateCompanyProfile } from "../api/company"
import "./CompanyProfileEditors.css"

type ProfileFields = {
  activity_domains: string | null
  covered_regions: string | null
  can_site_visit: boolean | number | null
  accepts_subcontracting: boolean | number | null
  max_subcontracting_percent: number | null
  can_execute_core_inhouse: boolean | number | null
}

function split(value: string | null): string[] {
  return (value || "")
    .split(/[,;\n]+/)
    .map(x => x.trim())
    .filter(Boolean)
}

function unique(values: string[]) {
  return [...new Map(
    values
      .map(x => x.trim())
      .filter(Boolean)
      .map(x => [x.toLocaleLowerCase("fr"), x])
  ).values()]
}

async function refreshCompany(
  queryClient: ReturnType<typeof useQueryClient>
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["company-workspace"]
    }),
    queryClient.invalidateQueries({
      queryKey: ["company-rematch-status"]
    }),
  ])
}

function EditableList({
  title, items, onChange, placeholder
}: {
  title: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState("")

  return (
    <div className="m08-list">
      <h3>{title}</h3>

      {items.map((item, index) => (
        <div className="m08-list-row" key={index}>
          <input
            aria-label={`${title} ${index + 1}`}
            value={item}
            onChange={e => {
              const next = [...items]
              next[index] = e.target.value
              onChange(next)
            }}
          />
          <button
            type="button"
            className="m08-remove"
            title={`Supprimer ${item}`}
            onClick={() =>
              onChange(items.filter((_, i) => i !== index))
            }
          >
            ×
          </button>
        </div>
      ))}

      <div className="m08-list-row">
        <input
          value={draft}
          placeholder={placeholder}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault()
              if (draft.trim()) {
                onChange([...items, draft.trim()])
                setDraft("")
              }
            }
          }}
        />
        <button
          type="button"
          disabled={!draft.trim()}
          onClick={() => {
            onChange([...items, draft.trim()])
            setDraft("")
          }}
        >
          Ajouter
        </button>
      </div>
    </div>
  )
}

export function CompanyActivitiesEditor({
  profile
}: {
  profile: ProfileFields
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [activities, setActivities] = useState<string[]>([])
  const [regions, setRegions] = useState<string[]>([])

  const mutation = useMutation({
    mutationFn: () => {
      const cleanActivities = unique(activities)
      const cleanRegions = unique(regions)

      if (!cleanActivities.length) {
        throw new Error("Au moins une activité est nécessaire.")
      }
      if (!cleanRegions.length) {
        throw new Error("Au moins une région est nécessaire.")
      }

      return updateCompanyProfile({
        activity_domains: cleanActivities.join(", "),
        covered_regions: cleanRegions.join(","),
      })
    },
    onSuccess: async () => {
      await refreshCompany(queryClient)
      setEditing(false)
    }
  })

  const startEdit = () => {
    setActivities(split(profile.activity_domains))
    setRegions(split(profile.covered_regions))
    mutation.reset()
    setEditing(true)
  }

  return (
    <section className="mor-workspace-card mor-activities-position m08-card">
      <div className="mor-card-heading">
        <div>
          <span>POSITIONNEMENT</span>
          <h2>Activités</h2>
        </div>
        {!editing && (
          <button type="button" onClick={startEdit}>
            Modifier
          </button>
        )}
      </div>

      {editing ? (
        <div className="m08-editor">
          <EditableList
            title="Domaines d'activité"
            items={activities}
            onChange={setActivities}
            placeholder="Nouvelle activité"
          />
          <EditableList
            title="Régions couvertes"
            items={regions}
            onChange={setRegions}
            placeholder="Nouvelle région"
          />

          {mutation.isError && (
            <p className="m08-error">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Échec de l'enregistrement"}
            </p>
          )}

          <div className="m08-actions">
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => setEditing(false)}
            >
              Annuler
            </button>
            <button
              type="button"
              className="m08-primary"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending
                ? "Enregistrement…"
                : "Enregistrer"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mor-company-tags">
            {split(profile.activity_domains).map((x, i) => (
              <span key={`${x}-${i}`}>{x}</span>
            ))}
          </div>
          <h3>Régions couvertes</h3>
          <div className="mor-company-tags">
            {split(profile.covered_regions).map((x, i) => (
              <span key={`${x}-${i}`}>{x}</span>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

type Choice = "" | "true" | "false"

function asChoice(value: boolean | number | null): Choice {
  if (value === null || value === undefined) return ""
  return value === true || value === 1 ? "true" : "false"
}

function fromChoice(value: Choice): boolean | null {
  return value === "" ? null : value === "true"
}

function boolText(value: boolean | number | null): string {
  const v = asChoice(value)
  return v === "" ? "À renseigner" : v === "true" ? "Oui" : "Non"
}

function ChoiceField({
  label, value, onChange
}: {
  label: string
  value: Choice
  onChange: (value: Choice) => void
}) {
  return (
    <label className="m08-field">
      <span>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value as Choice)}
      >
        <option value="">Non renseigné</option>
        <option value="true">Oui</option>
        <option value="false">Non</option>
      </select>
    </label>
  )
}

export function CompanyOperationalEditor({
  profile
}: {
  profile: ProfileFields
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [visit, setVisit] = useState<Choice>("")
  const [subcontract, setSubcontract] = useState<Choice>("")
  const [ceiling, setCeiling] = useState("")
  const [internal, setInternal] = useState<Choice>("")

  const mutation = useMutation({
    mutationFn: () => {
      const percent = ceiling.trim() === ""
        ? null : Number(ceiling)

      if (
        percent !== null &&
        (!Number.isFinite(percent) || percent < 0 || percent > 100)
      ) {
        throw new Error("Le plafond doit être compris entre 0 et 100 %.")
      }

      return updateCompanyProfile({
        can_site_visit: fromChoice(visit),
        accepts_subcontracting: fromChoice(subcontract),
        max_subcontracting_percent: percent,
        can_execute_core_inhouse: fromChoice(internal),
      })
    },
    onSuccess: async () => {
      await refreshCompany(queryClient)
      setEditing(false)
    },
  })

  const startEdit = () => {
    setVisit(asChoice(profile.can_site_visit))
    setSubcontract(asChoice(profile.accepts_subcontracting))
    setCeiling(profile.max_subcontracting_percent?.toString() ?? "")
    setInternal(asChoice(profile.can_execute_core_inhouse))
    mutation.reset()
    setEditing(true)
  }

  const values = [
    ["Visite de site", boolText(profile.can_site_visit)],
    ["Sous-traitance", boolText(profile.accepts_subcontracting)],
    [
      "Plafond sous-traitance",
      profile.max_subcontracting_percent == null
        ? "À renseigner"
        : `${profile.max_subcontracting_percent}%`,
    ],
    [
      "Exécution principale en interne",
      boolText(profile.can_execute_core_inhouse),
    ],
  ]

  return (
    <section
      id="company-capabilities"
      className="mor-workspace-card mor-operational-aside m08-card"
    >
      <div className="mor-card-heading">
        <div>
          <span>OPÉRATIONNEL</span>
          <h2>Capacités</h2>
        </div>
        {!editing && (
          <button type="button" onClick={startEdit}>
            Modifier
          </button>
        )}
      </div>

      {editing ? (
        <div className="m08-editor">
          <ChoiceField
            label="Visite de site"
            value={visit}
            onChange={setVisit}
          />
          <ChoiceField
            label="Sous-traitance"
            value={subcontract}
            onChange={setSubcontract}
          />
          <label className="m08-field">
            <span>Plafond sous-traitance (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={ceiling}
              onChange={e => setCeiling(e.target.value)}
              disabled={subcontract === "false"}
            />
          </label>
          <ChoiceField
            label="Exécution principale en interne"
            value={internal}
            onChange={setInternal}
          />

          {mutation.isError && (
            <p className="m08-error">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Échec de l'enregistrement"}
            </p>
          )}

          <div className="m08-actions">
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => setEditing(false)}
            >
              Annuler
            </button>
            <button
              type="button"
              className="m08-primary"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending
                ? "Enregistrement…"
                : "Enregistrer"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mor-capability-table">
          {values.map(([name, value]) => (
            <div key={name}>
              <span>{name}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
