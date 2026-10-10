import {
  useRef,
  useState,
} from "react"

import type {
  ChangeEvent,
} from "react"

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  analyzeCompanyDocument,
  createCompanyDocument,
  deleteCompanyDocument,
  deleteCompanyDocumentFile,
  getCompanyDocumentAnalysis,
  getCompanyRematchStatus,
  updateCompanyDocument,
  uploadCompanyDocumentFile,
  validateCompanyDocument,
} from "../../api/company"

import type {
  CompanyDocument,
  CompanyDocumentAnalysis,
  CompanyDocumentPayload,
} from "../../api/company"


type Props = {
  documents: CompanyDocument[]
}


type FormState = {
  document_type: string
  label: string
  available: boolean
  valid_until: string
  notes: string
}


const EMPTY_FORM: FormState = {
  document_type: "",
  label: "",
  available: true,
  valid_until: "",
  notes: "",
}


function fileSize(
  value: number | null,
) {
  if (!value) {
    return "—"
  }

  if (value < 1024) {
    return `${value} o`
  }

  if (value < 1024 * 1024) {
    return `${(
      value / 1024
    ).toFixed(1)} Ko`
  }

  return `${(
    value / 1024 / 1024
  ).toFixed(1)} Mo`
}


function statusLabel(
  document: CompanyDocument,
) {
  if (!document.has_file) {
    return {
      text: "Fichier manquant",
      className: "warning",
    }
  }

  if (
    document.validation_status
    === "VALIDATED"
    || document.validation_status
    === "CORRECTED"
  ) {
    return {
      text: "Validé MOR",
      className: "success",
    }
  }

  if (
    document.analysis_status
    === "ANALYZED"
  ) {
    return {
      text: "À valider",
      className: "neutral",
    }
  }

  return {
    text: "À analyser",
    className: "neutral",
  }
}



const DOCUMENT_TYPE_HINTS:
  Record<string, string[]> = {
    ATTESTATION_FISCALE:
      ["fiscal"],

    CNSS:
      ["cnss"],

    DECLARATION_HONNEUR:
      ["honneur"],

    POUVOIR_SIGNATAIRE:
      ["pouvoir", "signataire"],

    REGISTRE_COMMERCE:
      ["registre", "commerce"],

    FICHE_TECHNIQUE:
      ["fiche", "technique"],

    CAUTION_PROVISOIRE_DOCUMENT:
      ["caution"],
  }


function normalizeDocumentText(
  value?: string | null,
) {
  return String(value || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
}


function documentClassificationWarning(
  document: CompanyDocument,
) {
  const type =
    String(
      document.document_type || "",
    )
      .trim()
      .toUpperCase()

  const hints =
    DOCUMENT_TYPE_HINTS[type]

  if (!hints?.length) {
    return null
  }

  const label =
    normalizeDocumentText(
      document.label,
    )

  if (!label) {
    return null
  }

  const matches =
    hints.some(
      (hint) =>
        label.includes(hint),
    )

  if (matches) {
    return null
  }

  return (
    "Le libellé semble ne pas correspondre "
    + `au type ${type}.`
  )
}


export function CompanyDocumentsPanel({
  documents,
}: Props) {
  const queryClient =
    useQueryClient()

  const rematchQuery =
    useQuery({
      queryKey: [
        "company-rematch-status",
      ],

      queryFn:
        getCompanyRematchStatus,

      refetchInterval:
        2500,
    })

  const rematchStatus =
    rematchQuery.data?.data
    ?? null

  const rematchRunning =
    rematchStatus?.state
      === "STARTED"
    || rematchStatus?.state
      === "RUNNING"
    || rematchStatus?.state
      === "PENDING"

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    )

  const [editingId, setEditingId] =
    useState<number | null>(null)

  const [showForm, setShowForm] =
    useState(false)

  const [uploadTarget, setUploadTarget] =
    useState<number | null>(null)

  const [
    previewDocument,
    setPreviewDocument,
  ] = useState<CompanyDocument | null>(
    null
  )

  const [
    uploadDialogDocument,
    setUploadDialogDocument,
  ] = useState<CompanyDocument | null>(
    null
  )

  const [
    confirmDialog,
    setConfirmDialog,
  ] = useState<{
    type:
      | "DELETE_DOCUMENT"
      | "DELETE_FILE"

    document: CompanyDocument
  } | null>(null)

  const [form, setForm] =
    useState<FormState>(
      EMPTY_FORM
    )

  const [
    reviewDocumentId,
    setReviewDocumentId,
  ] = useState<number | null>(
    null
  )

  const [
    review,
    setReview,
  ] = useState<
    CompanyDocumentAnalysis
    | null
  >(null)

  const [
    correctedType,
    setCorrectedType,
  ] = useState("")

  const [
    correctedIce,
    setCorrectedIce,
  ] = useState("")

  const [
    correctedRc,
    setCorrectedRc,
  ] = useState("")

  const [
    correctedCnss,
    setCorrectedCnss,
  ] = useState("")

  const [
    correctedFiscalId,
    setCorrectedFiscalId,
  ] = useState("")


  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: [
        "company-workspace",
      ],
    })
  }


  const resetForm = () => {
    setEditingId(null)
    setShowForm(false)
    setForm(EMPTY_FORM)
  }


  const createMutation =
    useMutation({
      mutationFn: (
        payload:
          CompanyDocumentPayload
      ) =>
        createCompanyDocument(
          payload
        ),

      onSuccess: async () => {
        resetForm()
        await refresh()
      },
    })


  const updateMutation =
    useMutation({
      mutationFn: ({
        id,
        payload,
      }: {
        id: number
        payload:
          Partial<CompanyDocumentPayload>
      }) =>
        updateCompanyDocument(
          id,
          payload,
        ),

      onSuccess: async () => {
        resetForm()
        await refresh()
      },
    })


  const deleteMutation =
    useMutation({
      mutationFn:
        deleteCompanyDocument,

      onSuccess:
        refresh,
    })


  const deleteFileMutation =
    useMutation({
      mutationFn:
        deleteCompanyDocumentFile,

      onSuccess:
        refresh,
    })


  const uploadMutation =
    useMutation({
      mutationFn: ({
        documentId,
        file,
      }: {
        documentId: number
        file: File
      }) =>
        uploadCompanyDocumentFile(
          documentId,
          file,
        ),

      onSuccess: async () => {
        setUploadTarget(null)
        setUploadDialogDocument(null)
        await refresh()
      },
    })


  const populateCorrection = (
    data: CompanyDocumentAnalysis,
  ) => {
    const extracted =
      data.extracted

    setCorrectedType(
      extracted
        ?.detected_document_type
      || extracted
        ?.declared_document_type
      || ""
    )

    setCorrectedIce(
      extracted
        ?.identifiers
        .ice
      || ""
    )

    setCorrectedRc(
      extracted
        ?.identifiers
        .rc
      || ""
    )

    setCorrectedCnss(
      extracted
        ?.identifiers
        .cnss
      || ""
    )

    setCorrectedFiscalId(
      extracted
        ?.identifiers
        .fiscal_id
      || ""
    )
  }


  const reviewMutation =
    useMutation({
      mutationFn:
        getCompanyDocumentAnalysis,

      onSuccess: (
        response
      ) => {
        setReview(
          response.data
        )

        populateCorrection(
          response.data
        )
      },
    })


  const analyzeMutation =
    useMutation({
      mutationFn:
        analyzeCompanyDocument,

      onSuccess: async (
        _response,
        documentId,
      ) => {
        await refresh()

        setReviewDocumentId(
          documentId
        )

        reviewMutation.mutate(
          documentId
        )
      },
    })


  const validationMutation =
    useMutation({
      mutationFn: ({
        documentId,
        action,
        validatedData,
      }: {
        documentId: number
        action:
          | "VALIDATE"
          | "CORRECT"
          | "IGNORE"
        validatedData?:
          Record<string, unknown>
          | null
      }) =>
        validateCompanyDocument(
          documentId,
          {
            action,
            validated_data:
              validatedData,
          },
        ),

      onSuccess: async (
        _response,
        variables,
      ) => {
        await refresh()

        await queryClient.invalidateQueries({
          queryKey: [
            "company-rematch-status",
          ],
        })

        reviewMutation.mutate(
          variables.documentId
        )
      },
    })


  const openReview = (
    documentId: number,
  ) => {
    setReviewDocumentId(
      documentId
    )

    setReview(null)

    reviewMutation.mutate(
      documentId
    )
  }


  const closeReview = () => {
    setReviewDocumentId(null)
    setReview(null)
  }


  const validateReview = () => {
    if (
      reviewDocumentId === null
    ) {
      return
    }

    validationMutation.mutate({
      documentId:
        reviewDocumentId,

      action:
        "VALIDATE",
    })
  }


  const correctReview = () => {
    if (
      reviewDocumentId === null
      || !review?.extracted
    ) {
      return
    }

    const extracted =
      review.extracted

    const corrected = {
      ...extracted,

      detected_document_type:
        correctedType.trim()
        || null,

      identifiers: {
        ...extracted.identifiers,

        ice:
          correctedIce.trim()
          || null,

        rc:
          correctedRc.trim()
          || null,

        cnss:
          correctedCnss.trim()
          || null,

        fiscal_id:
          correctedFiscalId
            .trim()
          || null,
      },
    }

    validationMutation.mutate({
      documentId:
        reviewDocumentId,

      action:
        "CORRECT",

      validatedData:
        corrected,
    })
  }


  const ignoreReview = () => {
    if (
      reviewDocumentId === null
    ) {
      return
    }

    const confirmed =
      window.confirm(
        "Ignorer cette analyse MOR ?"
      )

    if (!confirmed) {
      return
    }

    validationMutation.mutate({
      documentId:
        reviewDocumentId,

      action:
        "IGNORE",
    })
  }


  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }


  const openEdit = (
    document: CompanyDocument,
  ) => {
    setEditingId(
      document.id
    )

    setForm({
      document_type:
        document.document_type,

      label:
        document.label
        || "",

      available:
        Boolean(
          document.available
        ),

      valid_until:
        document.valid_until
        || "",

      notes:
        document.notes
        || "",
    })

    setShowForm(true)
  }


  const saveForm = () => {
    const payload:
      CompanyDocumentPayload = {
        document_type:
          form.document_type
            .trim(),

        label:
          form.label.trim(),

        available:
          form.available,

        valid_until:
          form.valid_until
            || null,

        notes:
          form.notes.trim()
            || null,
      }

    if (
      !payload.document_type
      || !payload.label
    ) {
      return
    }

    if (editingId !== null) {
      updateMutation.mutate({
        id: editingId,
        payload,
      })

      return
    }

    createMutation.mutate(
      payload
    )
  }


  const selectFile = (
    documentId: number,
  ) => {
    setUploadTarget(
      documentId
    )

    fileInputRef.current?.click()
  }


  const onFileSelected = (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0]

    if (
      !file
      || uploadTarget === null
    ) {
      return
    }

    uploadMutation.mutate({
      documentId:
        uploadTarget,

      file,
    })

    event.target.value = ""
  }


  const removeDocument = (
    document: CompanyDocument,
  ) => {
    setConfirmDialog({
      type: "DELETE_DOCUMENT",
      document,
    })
  }


  const removeFile = (
    document: CompanyDocument,
  ) => {
    setConfirmDialog({
      type: "DELETE_FILE",
      document,
    })
  }


  const executeConfirmedAction = () => {
    if (!confirmDialog) {
      return
    }

    if (
      confirmDialog.type
      === "DELETE_DOCUMENT"
    ) {
      deleteMutation.mutate(
        confirmDialog.document.id
      )
    }

    if (
      confirmDialog.type
      === "DELETE_FILE"
    ) {
      deleteFileMutation.mutate(
        confirmDialog.document.id
      )
    }

    setConfirmDialog(null)
  }



  const busy =
    createMutation.isPending
    || updateMutation.isPending
    || deleteMutation.isPending
    || deleteFileMutation.isPending
    || uploadMutation.isPending
    || analyzeMutation.isPending
    || validationMutation.isPending
    || analyzeMutation.isPending
    || reviewMutation.isPending
    || validationMutation.isPending


  return (
    <section className="mor-workspace-card mor-full">

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        hidden
        onChange={
          onFileSelected
        }
      />


      <div className="mor-card-heading">

        <div>
          <span>
            DOSSIER ADMINISTRATIF
          </span>

          <h2>
            Documents entreprise
          </h2>
        </div>

        <button
          type="button"
          className="mor-doc-add"
          onClick={
            openCreate
          }
        >
          + Ajouter un document
        </button>

      </div>


      {rematchStatus
        && rematchStatus.state
          !== "IDLE"
        && (
          <div
            className={
              "mor-rematch-status "
              + (
                rematchStatus.state
                === "ERROR"
                  ? "error"
                  : rematchRunning
                    ? "running"
                    : "success"
              )
            }
          >

            <div
              className="mor-rematch-indicator"
              aria-hidden="true"
            />

            <div>

              <strong>
                {rematchRunning
                  ? "Matching en recalcul…"
                  : rematchStatus.state
                    === "ERROR"
                    ? "Erreur de recalcul"
                    : "Matching actualisé"}
              </strong>

              <span>
                {rematchRunning
                  ? (
                    rematchStatus.state
                    === "PENDING"
                      ? "Une nouvelle mise à jour attend la fin du calcul actuel."
                      : "MOR recalcule les opportunités avec les nouvelles preuves entreprise."
                  )
                  : rematchStatus.state
                    === "ERROR"
                    ? (
                      rematchStatus
                        .last_error
                      || "Le moteur de matching a rencontré une erreur."
                    )
                    : (
                      rematchStatus
                        .last_result
                        ? `${
                            rematchStatus
                              .last_result
                              .success
                          } / ${
                            rematchStatus
                              .last_result
                              .total
                          } opportunités recalculées`
                        : "Les qualifications sont à jour."
                    )}
              </span>

            </div>

          </div>
        )}


      {showForm && (
        <div
          className="mor-doc-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target
              === event.currentTarget
            ) {
              resetForm()
            }
          }}
        >
          <section
            className="mor-doc-action-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              editingId !== null
                ? "Modifier le document"
                : "Ajouter un document"
            }
          >
            <div className="mor-doc-editor">

          <div className="mor-doc-editor-title">
            <strong>
              {editingId !== null
                ? "Modifier le document"
                : "Nouveau document"}
            </strong>

            <button
              type="button"
              onClick={
                resetForm
              }
            >
              ×
            </button>
          </div>


          <div className="mor-doc-form-grid">

            <label>
              <span>
                Type
              </span>

              <input
                value={
                  form.document_type
                }
                placeholder="ATTESTATION_FISCALE"
                onChange={(event) =>
                  setForm({
                    ...form,
                    document_type:
                      event.target.value,
                  })
                }
              />
            </label>


            <label>
              <span>
                Libellé
              </span>

              <input
                value={
                  form.label
                }
                placeholder="Attestation fiscale"
                onChange={(event) =>
                  setForm({
                    ...form,
                    label:
                      event.target.value,
                  })
                }
              />
            </label>


            <label>
              <span>
                Valide jusqu’au
              </span>

              <input
                type="date"
                value={
                  form.valid_until
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    valid_until:
                      event.target.value,
                  })
                }
              />
            </label>


            <label className="wide">
              <span>
                Notes
              </span>

              <textarea
                rows={2}
                value={
                  form.notes
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    notes:
                      event.target.value,
                  })
                }
              />
            </label>


            <label className="mor-doc-checkbox">
              <input
                type="checkbox"
                checked={
                  form.available
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    available:
                      event.target.checked,
                  })
                }
              />

              Document disponible
            </label>

          </div>


          <div className="mor-doc-form-actions">

            <button
              type="button"
              onClick={
                resetForm
              }
            >
              Annuler
            </button>

            <button
              type="button"
              className="primary"
              disabled={
                busy
                || !form.label.trim()
                || !form
                  .document_type
                  .trim()
              }
              onClick={
                saveForm
              }
            >
              {busy
                ? "Enregistrement…"
                : "Enregistrer"}
            </button>

          </div>

            </div>
          </section>
        </div>
      )}


      <div className="mor-doc-manager">

        {documents.map(
          (document) => {
            const status =
              statusLabel(
                document
              )

            return (
              <article
                key={
                  document.id
                }
                id={
                  `company-document-${document.id}`
                }
                className="mor-doc-item"
              >

                <div className="mor-doc-main">

                  <div className="mor-doc-icon">
                    {document.has_file
                      ? "PDF"
                      : "DOC"}
                  </div>

                  <div>
                    <strong>
                      {document.label
                        || document.document_type}
                    </strong>

                    <span>
                      {
                        document.document_type
                      }
                    </span>

                    {
                      documentClassificationWarning(
                        document,
                      ) && (
                        <div className="mor-doc-classification-warning">

                          <div>
                            <strong>
                              ⚠ Classification à vérifier
                            </strong>

                            <p>
                              {
                                documentClassificationWarning(
                                  document,
                                )
                              }
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              openEdit(document)
                            }
                          >
                            Corriger
                          </button>

                        </div>
                      )
                    }

                    {document.has_file && (
                      <small>
                        {
                          document
                            .original_filename
                        }
                        {" · "}
                        {fileSize(
                          document.file_size
                        )}
                      </small>
                    )}
                  </div>

                </div>


                <div className="mor-doc-validity">

                  <span>
                    Validité
                  </span>

                  <strong>
                    {document.valid_until
                      || "Non renseignée"}
                  </strong>

                </div>


                <div className="mor-doc-health">

                  <span
                    className={
                      `mor-status ${
                        status.className
                      }`
                    }
                  >
                    {status.text}
                  </span>

                  {document.has_file && (
                    <small>
                      {
                        document
                          .analysis_status
                      }
                      {" · "}
                      {
                        document
                          .validation_status
                      }
                    </small>
                  )}

                </div>


                <div className="mor-doc-actions">

                  {document.has_file && (
                    <button
                      type="button"
                      disabled={
                        busy
                      }
                      onClick={() =>
                        setPreviewDocument(
                          document
                        )
                      }
                    >
                      Ouvrir
                    </button>
                  )}


                  <button
                    type="button"
                    disabled={
                      busy
                    }
                    onClick={() =>
                      setUploadDialogDocument(
                        document
                      )
                    }
                  >
                    {document.has_file
                      ? "Remplacer"
                      : "Uploader"}
                  </button>


                  {document.has_file
                    && document
                      .analysis_status
                      !== "ANALYZED"
                    && (
                      <button
                        type="button"
                        className="mor-doc-ai-action"
                        disabled={
                          busy
                        }
                        onClick={() =>
                          analyzeMutation
                            .mutate(
                              document.id
                            )
                        }
                      >
                        Analyser avec MOR
                      </button>
                    )}


                  {document.has_file
                    && document
                      .analysis_status
                      === "ANALYZED"
                    && (
                      <button
                        type="button"
                        className="mor-doc-ai-action"
                        disabled={
                          busy
                        }
                        onClick={() =>
                          openReview(
                            document.id
                          )
                        }
                      >
                        Revoir l’analyse
                      </button>
                    )}


                  <button
                    type="button"
                    disabled={
                      busy
                    }
                    onClick={() =>
                      openEdit(
                        document
                      )
                    }
                  >
                    Modifier
                  </button>


                  {document.has_file && (
                    <button
                      type="button"
                      disabled={
                        busy
                      }
                      onClick={() =>
                        removeFile(
                          document
                        )
                      }
                    >
                      Retirer fichier
                    </button>
                  )}


                  <button
                    type="button"
                    className="danger"
                    disabled={
                      busy
                    }
                    onClick={() =>
                      removeDocument(
                        document
                      )
                    }
                  >
                    Supprimer
                  </button>

                </div>

              </article>
            )
          }
        )}

      </div>


      {reviewDocumentId !== null && (
        <div className="mor-doc-review">

          <div className="mor-doc-review-header">

            <div>
              <span>
                REVUE DOCUMENTAIRE MOR
              </span>

              <h3>
                Vérification humaine
                de l’extraction
              </h3>
            </div>

            <button
              type="button"
              onClick={
                closeReview
              }
            >
              ×
            </button>

          </div>


          {reviewMutation.isPending && (
            <div className="mor-doc-review-loading">
              Lecture de l’analyse…
            </div>
          )}


          {review?.extracted && (
            <>

              <div className="mor-doc-review-status">

                <div>
                  <span>
                    Analyse MOR
                  </span>

                  <strong>
                    {
                      review.document
                        .analysis_status
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Validation humaine
                  </span>

                  <strong>
                    {
                      review.document
                        .validation_status
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Preuve matching
                  </span>

                  <strong>
                    {
                      review.proof_status
                      === "VALIDATED"
                        ? "Disponible"
                        : "Non validée"
                    }
                  </strong>
                </div>

              </div>


              <div className="mor-doc-review-types">

                <div>
                  <span>
                    Type déclaré
                  </span>

                  <strong>
                    {
                      review.extracted
                        .declared_document_type
                      || "—"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Type détecté par MOR
                  </span>

                  <strong>
                    {
                      review.extracted
                        .detected_document_type
                      || "Non identifié"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Concordance
                  </span>

                  <strong
                    className={
                      review.extracted
                        .type_mismatch
                        ? "danger"
                        : "success"
                    }
                  >
                    {
                      review.extracted
                        .type_mismatch
                        ? "Divergence"
                        : "Concordant"
                    }
                  </strong>
                </div>

              </div>


              {review.extracted
                .warnings.length > 0 && (
                <div className="mor-doc-review-warnings">
                  {
                    review.extracted
                      .warnings
                      .map(
                        (
                          warning,
                          index,
                        ) => (
                          <p
                            key={
                              `${warning}-${index}`
                            }
                          >
                            {warning}
                          </p>
                        )
                      )
                  }
                </div>
              )}


              <div className="mor-doc-review-fields">

                <label>
                  <span>
                    Type retenu
                  </span>

                  <input
                    value={
                      correctedType
                    }
                    onChange={
                      (event) =>
                        setCorrectedType(
                          event
                            .target
                            .value
                        )
                    }
                  />
                </label>


                <label>
                  <span>
                    ICE
                  </span>

                  <input
                    value={
                      correctedIce
                    }
                    onChange={
                      (event) =>
                        setCorrectedIce(
                          event
                            .target
                            .value
                        )
                    }
                  />
                </label>


                <label>
                  <span>
                    RC
                  </span>

                  <input
                    value={
                      correctedRc
                    }
                    onChange={
                      (event) =>
                        setCorrectedRc(
                          event
                            .target
                            .value
                        )
                    }
                  />
                </label>


                <label>
                  <span>
                    CNSS
                  </span>

                  <input
                    value={
                      correctedCnss
                    }
                    onChange={
                      (event) =>
                        setCorrectedCnss(
                          event
                            .target
                            .value
                        )
                    }
                  />
                </label>


                <label>
                  <span>
                    Identifiant fiscal
                  </span>

                  <input
                    value={
                      correctedFiscalId
                    }
                    onChange={
                      (event) =>
                        setCorrectedFiscalId(
                          event
                            .target
                            .value
                        )
                    }
                  />
                </label>

              </div>


              <div className="mor-doc-review-dates">

                <span>
                  Dates détectées
                </span>

                <div>
                  {
                    review.extracted
                      .dates_detected
                      .length > 0
                      ? review.extracted
                        .dates_detected
                        .map(
                          (date) => (
                            <strong
                              key={
                                date
                              }
                            >
                              {date}
                            </strong>
                          )
                        )
                      : (
                        <small>
                          Aucune date détectée
                        </small>
                      )
                  }
                </div>

              </div>


              <div className="mor-doc-review-preview">

                <span>
                  Extrait détecté
                </span>

                <pre>
                  {
                    review.extracted
                      .text_preview
                    || "Aucun texte exploitable."
                  }
                </pre>

              </div>


              <div className="mor-doc-review-note">
                L’analyse MOR est une proposition.
                Elle ne devient une preuve utilisable
                dans le matching qu’après validation
                humaine.
              </div>


              <div className="mor-doc-review-actions">

                <button
                  type="button"
                  disabled={
                    validationMutation
                      .isPending
                  }
                  onClick={
                    ignoreReview
                  }
                >
                  Ignorer
                </button>

                <button
                  type="button"
                  disabled={
                    validationMutation
                      .isPending
                  }
                  onClick={
                    correctReview
                  }
                >
                  Corriger et valider
                </button>

                <button
                  type="button"
                  className="primary"
                  disabled={
                    validationMutation
                      .isPending
                  }
                  onClick={
                    validateReview
                  }
                >
                  Valider l’analyse MOR
                </button>

              </div>

            </>
          )}


          {reviewMutation.isError && (
            <div className="mor-company-save-error">
              Impossible de charger
              l’analyse documentaire.
            </div>
          )}

        </div>
      )}


      {documents.length === 0 && (
        <div className="mor-doc-empty">
          Aucun document enregistré.
          Ajoutez les pièces administratives
          et techniques de l’entreprise.
        </div>
      )}


      {(createMutation.isError
        || updateMutation.isError
        || deleteMutation.isError
        || deleteFileMutation.isError
        || uploadMutation.isError
        || analyzeMutation.isError
        || reviewMutation.isError
        || validationMutation.isError) && (
        <div className="mor-company-save-error">
          L’opération documentaire a échoué.
          Vérifiez le fichier ou les informations
          puis réessayez.
        </div>
      )}


      {previewDocument && (
        <div
          className="mor-doc-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target
              === event.currentTarget
            ) {
              setPreviewDocument(null)
            }
          }}
        >
          <section
            className="mor-doc-action-modal mor-doc-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Aperçu du document"
          >

            <header className="mor-doc-simple-modal-header">

              <div>
                <span>
                  DOCUMENT ENTREPRISE
                </span>

                <h2>
                  {
                    previewDocument.label
                    || previewDocument
                      .document_type
                  }
                </h2>

                <small>
                  {
                    previewDocument
                      .original_filename
                  }
                </small>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPreviewDocument(
                    null
                  )
                }
                aria-label="Fermer"
              >
                ×
              </button>

            </header>

            <div className="mor-doc-preview-content">

              {previewDocument.file_url && (
                <iframe
                  src={
                    previewDocument
                      .file_url
                  }
                  title="Aperçu document"
                />
              )}

            </div>

          </section>
        </div>
      )}


      {uploadDialogDocument && (
        <div
          className="mor-doc-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target
              === event.currentTarget
            ) {
              setUploadDialogDocument(
                null
              )
            }
          }}
        >

          <section
            className="mor-doc-action-modal mor-doc-upload-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Importer un fichier"
          >

            <header className="mor-doc-simple-modal-header">

              <div>
                <span>
                  FICHIER DOCUMENTAIRE
                </span>

                <h2>
                  {uploadDialogDocument.has_file
                    ? "Remplacer le fichier"
                    : "Importer un fichier"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setUploadDialogDocument(
                    null
                  )
                }
                aria-label="Fermer"
              >
                ×
              </button>

            </header>


            <div className="mor-doc-upload-content">

              <div className="mor-doc-upload-icon">
                ↑
              </div>

              <strong>
                {
                  uploadDialogDocument
                    .label
                  || uploadDialogDocument
                    .document_type
                }
              </strong>

              <p>
                Formats acceptés :
                PDF, JPG et PNG.
                Taille maximale : 15 Mo.
              </p>

              {uploadDialogDocument.has_file && (
                <div className="mor-doc-replace-warning">
                  Le nouveau fichier remplacera
                  le fichier actuellement associé
                  au document. L’analyse MOR devra
                  être recalculée.
                </div>
              )}

              <button
                type="button"
                className="primary"
                disabled={
                  uploadMutation.isPending
                }
                onClick={() =>
                  selectFile(
                    uploadDialogDocument.id
                  )
                }
              >
                {uploadMutation.isPending
                  ? "Import en cours…"
                  : "Choisir un fichier"}
              </button>

            </div>

          </section>

        </div>
      )}


      {confirmDialog && (
        <div
          className="mor-doc-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target
              === event.currentTarget
            ) {
              setConfirmDialog(null)
            }
          }}
        >

          <section
            className="mor-doc-action-modal mor-doc-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirmation"
          >

            <header className="mor-doc-simple-modal-header">

              <div>
                <span>
                  CONFIRMATION
                </span>

                <h2>
                  {confirmDialog.type
                    === "DELETE_DOCUMENT"
                    ? "Supprimer ce document ?"
                    : "Retirer ce fichier ?"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setConfirmDialog(null)
                }
              >
                ×
              </button>

            </header>


            <div className="mor-doc-confirm-content">

              <strong>
                {
                  confirmDialog
                    .document
                    .label
                  || confirmDialog
                    .document
                    .document_type
                }
              </strong>

              <p>
                {confirmDialog.type
                  === "DELETE_DOCUMENT"
                  ? (
                    "La fiche documentaire "
                    + "et son fichier seront "
                    + "supprimés."
                  )
                  : (
                    "La fiche sera conservée, "
                    + "mais le fichier et son "
                    + "analyse MOR seront retirés."
                  )}
              </p>

            </div>


            <footer className="mor-doc-confirm-footer">

              <button
                type="button"
                onClick={() =>
                  setConfirmDialog(null)
                }
              >
                Annuler
              </button>

              <button
                type="button"
                className="danger"
                disabled={
                  deleteMutation.isPending
                  || deleteFileMutation
                    .isPending
                }
                onClick={
                  executeConfirmedAction
                }
              >
                {confirmDialog.type
                  === "DELETE_DOCUMENT"
                  ? "Supprimer définitivement"
                  : "Retirer le fichier"}
              </button>

            </footer>

          </section>

        </div>
      )}


      {reviewDocumentId !== null && (
        <div
          className="mor-doc-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target
              === event.currentTarget
            ) {
              closeReview()
            }
          }}
        >

          <section
            className="mor-doc-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Revue documentaire MOR"
          >

            <header className="mor-doc-modal-header">

              <div>
                <span className="mor-doc-modal-eyebrow">
                  REVUE DOCUMENTAIRE MOR
                </span>

                <h2>
                  Vérifier l’analyse
                  avant validation
                </h2>

                <p>
                  L’extraction MOR est une
                  proposition automatique.
                  Elle ne devient une preuve
                  qu’après validation humaine.
                </p>
              </div>

              <button
                type="button"
                className="mor-doc-modal-close"
                onClick={
                  closeReview
                }
                aria-label="Fermer"
              >
                ×
              </button>

            </header>


            {reviewMutation.isPending && (
              <div className="mor-doc-modal-loading">
                Analyse du document en cours…
              </div>
            )}


            {review?.extracted && (
              <div className="mor-doc-modal-body">

                <div className="mor-doc-review-kpis">

                  <div>
                    <span>
                      Analyse MOR
                    </span>

                    <strong>
                      {
                        review.document
                          .analysis_status
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Validation
                    </span>

                    <strong>
                      {
                        review.document
                          .validation_status
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Preuve matching
                    </span>

                    <strong
                      className={
                        review.proof_status
                        === "VALIDATED"
                          ? "success"
                          : "warning"
                      }
                    >
                      {
                        review.proof_status
                        === "VALIDATED"
                          ? "Disponible"
                          : "Non validée"
                      }
                    </strong>
                  </div>

                </div>


                <div
                  className={
                    review.extracted
                      .type_mismatch
                      ? "mor-doc-type-comparison mismatch"
                      : "mor-doc-type-comparison"
                  }
                >

                  <div>
                    <span>
                      Type déclaré
                    </span>

                    <strong>
                      {
                        review.extracted
                          .declared_document_type
                        || "—"
                      }
                    </strong>
                  </div>

                  <div className="mor-doc-type-arrow">
                    →
                  </div>

                  <div>
                    <span>
                      Type détecté par MOR
                    </span>

                    <strong>
                      {
                        review.extracted
                          .detected_document_type
                        || "Non identifié"
                      }
                    </strong>
                  </div>

                  <div className="mor-doc-type-result">
                    {
                      review.extracted
                        .type_mismatch
                        ? "Divergence à vérifier"
                        : "Concordance détectée"
                    }
                  </div>

                </div>


                {review.extracted
                  .warnings.length > 0 && (
                  <div className="mor-doc-review-warning">

                    <strong>
                      Points d’attention
                    </strong>

                    {review.extracted
                      .warnings
                      .map(
                        (
                          warning,
                          index,
                        ) => (
                          <p
                            key={
                              `${index}-${warning}`
                            }
                          >
                            {warning}
                          </p>
                        )
                      )}

                  </div>
                )}


                <section className="mor-doc-review-section">

                  <div className="mor-doc-review-section-title">
                    <div>
                      <span>
                        DONNÉES EXTRAITES
                      </span>

                      <h3>
                        Informations à confirmer
                      </h3>
                    </div>
                  </div>


                  <div className="mor-doc-review-form">

                    <label className="wide">
                      <span>
                        Type documentaire retenu
                      </span>

                      <input
                        value={
                          correctedType
                        }
                        onChange={(event) =>
                          setCorrectedType(
                            event.target.value
                          )
                        }
                      />
                    </label>


                    <label>
                      <span>
                        ICE
                      </span>

                      <input
                        value={
                          correctedIce
                        }
                        placeholder="Non détecté"
                        onChange={(event) =>
                          setCorrectedIce(
                            event.target.value
                          )
                        }
                      />
                    </label>


                    <label>
                      <span>
                        RC
                      </span>

                      <input
                        value={
                          correctedRc
                        }
                        placeholder="Non détecté"
                        onChange={(event) =>
                          setCorrectedRc(
                            event.target.value
                          )
                        }
                      />
                    </label>


                    <label>
                      <span>
                        CNSS
                      </span>

                      <input
                        value={
                          correctedCnss
                        }
                        placeholder="Non détecté"
                        onChange={(event) =>
                          setCorrectedCnss(
                            event.target.value
                          )
                        }
                      />
                    </label>


                    <label>
                      <span>
                        Identifiant fiscal
                      </span>

                      <input
                        value={
                          correctedFiscalId
                        }
                        placeholder="Non détecté"
                        onChange={(event) =>
                          setCorrectedFiscalId(
                            event.target.value
                          )
                        }
                      />
                    </label>

                  </div>

                </section>


                <section className="mor-doc-review-section">

                  <div className="mor-doc-review-section-title">
                    <div>
                      <span>
                        DATES DÉTECTÉES
                      </span>

                      <h3>
                        Repères temporels
                      </h3>
                    </div>
                  </div>

                  <div className="mor-doc-date-list">

                    {review.extracted
                      .dates_detected
                      .length > 0
                      ? review.extracted
                        .dates_detected
                        .map((date) => (
                          <span key={date}>
                            {date}
                          </span>
                        ))
                      : (
                        <small>
                          Aucune date détectée
                        </small>
                      )}

                  </div>

                </section>


                <section className="mor-doc-review-section">

                  <div className="mor-doc-review-section-title">
                    <div>
                      <span>
                        SOURCE EXTRAITE
                      </span>

                      <h3>
                        Aperçu du document
                      </h3>
                    </div>

                    <small>
                      {
                        review.extracted
                          .text_length
                      } caractères
                    </small>
                  </div>

                  <pre className="mor-doc-text-preview">
                    {
                      review.extracted
                        .text_preview
                      || "Aucun texte exploitable détecté."
                    }
                  </pre>

                </section>

              </div>
            )}


            {review?.extracted && (
              <footer className="mor-doc-modal-footer">

                <button
                  type="button"
                  disabled={
                    validationMutation
                      .isPending
                  }
                  onClick={
                    ignoreReview
                  }
                >
                  Ignorer
                </button>

                <div>
                  <button
                    type="button"
                    disabled={
                      validationMutation
                        .isPending
                    }
                    onClick={
                      correctReview
                    }
                  >
                    Corriger et valider
                  </button>

                  <button
                    type="button"
                    className="primary"
                    disabled={
                      validationMutation
                        .isPending
                    }
                    onClick={
                      validateReview
                    }
                  >
                    {
                      validationMutation
                        .isPending
                        ? "Validation…"
                        : "Valider l’analyse MOR"
                    }
                  </button>
                </div>

              </footer>
            )}

          </section>

        </div>
      )}

    </section>
  )
}
