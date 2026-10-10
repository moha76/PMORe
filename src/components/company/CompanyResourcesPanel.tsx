import {
  useState,
} from "react"

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import {
  createCompanyResource,
  deleteCompanyResource,
  updateCompanyResource,
} from "../../api/company"

import type {
  CompanyCertification,
  CompanyEquipment,
  CompanyPersonnel,
  CompanyReference,
  CompanyResourceKind,
} from "../../api/company"


type Props =
  | {
      kind: "personnel"
      items: CompanyPersonnel[]
    }
  | {
      kind: "equipment"
      items: CompanyEquipment[]
    }
  | {
      kind: "certifications"
      items: CompanyCertification[]
    }
  | {
      kind: "references"
      items: CompanyReference[]
    }


type FormState = {
  [key: string]:
    | string
    | boolean
}


function titleFor(
  kind: CompanyResourceKind,
) {
  if (kind === "personnel") {
    return "Personnel"
  }

  if (kind === "equipment") {
    return "Matériel et équipements"
  }

  if (kind === "certifications") {
    return "Certifications et agréments"
  }

  return "Références similaires"
}


function emptyForm(
  kind: CompanyResourceKind,
): FormState {
  if (kind === "personnel") {
    return {
      role: "",
      qualification: "",
      specialty: "",
      years_experience: "",
      similar_projects_count: "",
      certifications_json: "",
      available: true,
    }
  }

  if (kind === "equipment") {
    return {
      equipment_type: "",
      label: "",
      quantity: "",
      owned: true,
      available: true,
    }
  }

  if (kind === "certifications") {
    return {
      certification_type: "",
      name: "",
      category: "",
      class: "",
      valid_until: "",
      available: true,
    }
  }

  return {
    title: "",
    client_name: "",
    activity_type: "",
    description: "",
    amount: "",
    execution_year: "",
    similar_keywords: "",
    proof_available: false,
  }
}


function textValue(
  value: unknown,
) {
  if (
    value === null
    || value === undefined
  ) {
    return ""
  }

  return String(value)
}


function toNumberOrNull(
  value: string,
) {
  const clean = value.trim()

  if (!clean) {
    return null
  }

  const number = Number(clean)

  return Number.isFinite(number)
    ? number
    : null
}


export function CompanyResourcesPanel(
  props: Props,
) {
  const {
    kind,
    items,
  } = props

  const queryClient =
    useQueryClient()

  const [editingId, setEditingId] =
    useState<number | null>(null)

  const [showForm, setShowForm] =
    useState(false)

  const [form, setForm] =
    useState<FormState>(
      emptyForm(kind)
    )


  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: [
        "company-workspace",
      ],
    })
  }


  const closeForm = () => {
    setEditingId(null)

    setForm(
      emptyForm(kind)
    )

    setShowForm(false)
  }


  const mutation = useMutation({
    mutationFn: async () => {
      const payload:
        Record<string, unknown> = {}

      if (kind === "personnel") {
        payload.role =
          String(form.role || "")
            .trim()

        payload.qualification =
          String(
            form.qualification || ""
          ).trim() || null

        payload.specialty =
          String(
            form.specialty || ""
          ).trim() || null

        payload.years_experience =
          toNumberOrNull(
            String(
              form.years_experience
              || ""
            )
          )

        payload.similar_projects_count =
          toNumberOrNull(
            String(
              form.similar_projects_count
              || ""
            )
          )

        payload.certifications_json =
          String(
            form.certifications_json
            || ""
          ).trim() || null

        payload.available =
          Boolean(
            form.available
          )
      }


      if (kind === "equipment") {
        payload.equipment_type =
          String(
            form.equipment_type
            || ""
          ).trim()

        payload.label =
          String(
            form.label || ""
          ).trim() || null

        payload.quantity =
          toNumberOrNull(
            String(
              form.quantity
              || ""
            )
          )

        payload.owned =
          Boolean(form.owned)

        payload.available =
          Boolean(
            form.available
          )
      }


      if (kind === "certifications") {
        payload.certification_type =
          String(
            form.certification_type
            || ""
          ).trim()

        payload.name =
          String(
            form.name || ""
          ).trim() || null

        payload.category =
          String(
            form.category || ""
          ).trim() || null

        payload.class =
          String(
            form.class || ""
          ).trim() || null

        payload.valid_until =
          String(
            form.valid_until || ""
          ).trim() || null

        payload.available =
          Boolean(
            form.available
          )
      }


      if (kind === "references") {
        payload.title =
          String(
            form.title || ""
          ).trim()

        payload.client_name =
          String(
            form.client_name || ""
          ).trim() || null

        payload.activity_type =
          String(
            form.activity_type || ""
          ).trim() || null

        payload.description =
          String(
            form.description || ""
          ).trim() || null

        payload.amount =
          toNumberOrNull(
            String(
              form.amount || ""
            )
          )

        payload.execution_year =
          toNumberOrNull(
            String(
              form.execution_year
              || ""
            )
          )

        payload.similar_keywords =
          String(
            form.similar_keywords
            || ""
          ).trim() || null

        payload.proof_available =
          Boolean(
            form.proof_available
          )
      }


      if (editingId !== null) {
        return updateCompanyResource(
          kind,
          editingId,
          payload,
        )
      }

      return createCompanyResource(
        kind,
        payload,
      )
    },

    onSuccess: async () => {
      closeForm()
      await refresh()
    },
  })


  const deleteMutation =
    useMutation({
      mutationFn: (
        id: number
      ) =>
        deleteCompanyResource(
          kind,
          id,
        ),

      onSuccess:
        refresh,
    })


  const openCreate = () => {
    setEditingId(null)

    setForm(
      emptyForm(kind)
    )

    setShowForm(true)
  }


  const openEdit = (
    item:
      | CompanyPersonnel
      | CompanyEquipment
      | CompanyCertification
      | CompanyReference,
  ) => {
    setEditingId(
      item.id
    )

    if (
      kind === "personnel"
      && "role" in item
    ) {
      setForm({
        role:
          textValue(
            item.role
          ),

        qualification:
          textValue(
            item.qualification
          ),

        specialty:
          textValue(
            item.specialty
          ),

        years_experience:
          textValue(
            item.years_experience
          ),

        similar_projects_count:
          textValue(
            item.similar_projects_count
          ),

        certifications_json:
          textValue(
            item.certifications_json
          ),

        available:
          Boolean(
            item.available
          ),
      })
    }


    if (
      kind === "equipment"
      && "equipment_type" in item
    ) {
      setForm({
        equipment_type:
          textValue(
            item.equipment_type
          ),

        label:
          textValue(
            item.label
          ),

        quantity:
          textValue(
            item.quantity
          ),

        owned:
          Boolean(
            item.owned
          ),

        available:
          Boolean(
            item.available
          ),
      })
    }


    if (
      kind === "certifications"
      && "certification_type"
        in item
    ) {
      setForm({
        certification_type:
          textValue(
            item.certification_type
          ),

        name:
          textValue(
            item.name
          ),

        category:
          textValue(
            item.category
          ),

        class:
          textValue(
            item.class
          ),

        valid_until:
          textValue(
            item.valid_until
          ),

        available:
          Boolean(
            item.available
          ),
      })
    }


    if (
      kind === "references"
      && "title" in item
    ) {
      setForm({
        title:
          textValue(
            item.title
          ),

        client_name:
          textValue(
            item.client_name
          ),

        activity_type:
          textValue(
            item.activity_type
          ),

        description:
          textValue(
            item.description
          ),

        amount:
          textValue(
            item.amount
          ),

        execution_year:
          textValue(
            item.execution_year
          ),

        similar_keywords:
          textValue(
            item.similar_keywords
          ),

        proof_available:
          Boolean(
            item.proof_available
          ),
      })
    }

    setShowForm(true)
  }


  const remove = (
    id: number,
  ) => {
    const ok = window.confirm(
      "Supprimer définitivement cet élément ?"
    )

    if (ok) {
      deleteMutation.mutate(id)
    }
  }


  const field = (
    name: string,
    label: string,
    type = "text",
  ) => (
    <label>
      <span>{label}</span>

      <input
        type={type}
        value={
          String(
            form[name] ?? ""
          )
        }
        onChange={(event) =>
          setForm({
            ...form,
            [name]:
              event.target.value,
          })
        }
      />
    </label>
  )


  const checkbox = (
    name: string,
    label: string,
  ) => (
    <label className="mor-resource-checkbox">
      <input
        type="checkbox"
        checked={
          Boolean(
            form[name]
          )
        }
        onChange={(event) =>
          setForm({
            ...form,
            [name]:
              event.target.checked,
          })
        }
      />

      {label}
    </label>
  )


  return (
    <section className="mor-workspace-card mor-full">

      <div className="mor-card-heading">
        <div>
          <span>
            PROFIL ENTREPRISE
          </span>

          <h2>
            {titleFor(kind)}
          </h2>
        </div>

        <button
          type="button"
          className="mor-doc-add"
          onClick={
            openCreate
          }
        >
          + Ajouter
        </button>
      </div>


      {showForm && (
        <div className="mor-resource-editor">

          <div className="mor-doc-editor-title">
            <strong>
              {editingId === null
                ? "Nouvel élément"
                : "Modifier l’élément"}
            </strong>

            <button
              type="button"
              onClick={
                closeForm
              }
            >
              ×
            </button>
          </div>


          <div className="mor-resource-form">

            {kind === "personnel" && (
              <>
                {field(
                  "role",
                  "Fonction"
                )}

                {field(
                  "qualification",
                  "Qualification"
                )}

                {field(
                  "specialty",
                  "Spécialité"
                )}

                {field(
                  "years_experience",
                  "Années d’expérience",
                  "number",
                )}

                {field(
                  "similar_projects_count",
                  "Projets similaires",
                  "number",
                )}

                {field(
                  "certifications_json",
                  "Certifications"
                )}

                {checkbox(
                  "available",
                  "Disponible"
                )}
              </>
            )}


            {kind === "equipment" && (
              <>
                {field(
                  "equipment_type",
                  "Type de matériel"
                )}

                {field(
                  "label",
                  "Libellé"
                )}

                {field(
                  "quantity",
                  "Quantité",
                  "number",
                )}

                {checkbox(
                  "owned",
                  "Propriété entreprise"
                )}

                {checkbox(
                  "available",
                  "Disponible"
                )}
              </>
            )}


            {kind === "certifications" && (
              <>
                {field(
                  "certification_type",
                  "Type"
                )}

                {field(
                  "name",
                  "Nom / Agrément"
                )}

                {field(
                  "category",
                  "Catégorie"
                )}

                {field(
                  "class",
                  "Classe"
                )}

                {field(
                  "valid_until",
                  "Valide jusqu’au",
                  "date",
                )}

                {checkbox(
                  "available",
                  "Disponible"
                )}
              </>
            )}


            {kind === "references" && (
              <>
                {field(
                  "title",
                  "Intitulé du marché"
                )}

                {field(
                  "client_name",
                  "Client"
                )}

                {field(
                  "activity_type",
                  "Activité"
                )}

                {field(
                  "amount",
                  "Montant",
                  "number",
                )}

                {field(
                  "execution_year",
                  "Année",
                  "number",
                )}

                {field(
                  "similar_keywords",
                  "Mots-clés"
                )}

                <label className="wide">
                  <span>
                    Description
                  </span>

                  <textarea
                    rows={3}
                    value={
                      String(
                        form.description
                        ?? ""
                      )
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        description:
                          event.target.value,
                      })
                    }
                  />
                </label>

                {checkbox(
                  "proof_available",
                  "Preuve disponible"
                )}
              </>
            )}

          </div>


          <div className="mor-doc-form-actions">
            <button
              type="button"
              onClick={
                closeForm
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


      <div className="mor-resource-crud-list">

        {items.map(
          (item) => (
            <article
              key={item.id}
            >

              <div>
                {kind === "personnel"
                  && "role" in item && (
                    <>
                      <strong>
                        {item.role}
                      </strong>

                      <span>
                        {item.qualification
                          || "Qualification non renseignée"}
                      </span>

                      <small>
                        {item.specialty
                          || "Spécialité non renseignée"}
                      </small>
                    </>
                  )}


                {kind === "equipment"
                  && "equipment_type"
                    in item && (
                    <>
                      <strong>
                        {item.label
                          || item.equipment_type}
                      </strong>

                      <span>
                        {item.equipment_type}
                      </span>

                      <small>
                        Quantité :
                        {" "}
                        {item.quantity
                          ?? "—"}
                      </small>
                    </>
                  )}


                {kind === "certifications"
                  && "certification_type"
                    in item && (
                    <>
                      <strong>
                        {item.name
                          || item.certification_type}
                      </strong>

                      <span>
                        {item.certification_type}
                      </span>

                      <small>
                        Catégorie :
                        {" "}
                        {item.category
                          || "—"}
                        {" · "}
                        Validité :
                        {" "}
                        {item.valid_until
                          || "—"}
                      </small>
                    </>
                  )}


                {kind === "references"
                  && "title" in item && (
                    <>
                      <strong>
                        {item.title}
                      </strong>

                      <span>
                        {item.client_name
                          || "Client non renseigné"}
                      </span>

                      <small>
                        {item.execution_year
                          || "—"}
                        {" · "}
                        {item.amount
                          ? `${item.amount} DH`
                          : "Montant non renseigné"}
                      </small>
                    </>
                  )}
              </div>


              <div className="mor-resource-actions">

                <button
                  type="button"
                  onClick={() =>
                    openEdit(
                      item
                    )
                  }
                >
                  Modifier
                </button>

                <button
                  type="button"
                  className="danger"
                  onClick={() =>
                    remove(
                      item.id
                    )
                  }
                >
                  Supprimer
                </button>

              </div>

            </article>
          )
        )}

      </div>


      {items.length === 0 && (
        <div className="mor-doc-empty">
          Aucun élément renseigné.
        </div>
      )}

    </section>
  )
}
