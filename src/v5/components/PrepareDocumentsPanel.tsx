import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, FileText, UploadCloud, AlertCircle } from "lucide-react"
import { apiGet, apiUploadFile } from "../../api/client"
import { PrepareDocumentReview } from "./PrepareDocumentReview"

type DocumentVersion = {
  id: number
  version_number: number
  original_filename: string
  mime_type: string
  file_size: number
  sha256: string
  uploaded_by: number
  uploaded_at: string
  review_status: string
}

type Props = {
  refConsultation: string
  orgAcronyme: string
  lotNumber: string
  sourceRequirementId: number
}

const MAX_SIZE = 10 * 1024 * 1024

function readableSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`
}

function message(error: unknown) {
  const e = error as {
    status?: number
    message?: string
  } | null

  if (e?.status === 401) return "Session expirée. Reconnectez-vous."
  if (e?.status === 403) return "Vous n'avez pas l'autorisation de déposer ce document."
  if (e?.status === 404) return "Cette exigence ou ce lot n'est plus accessible."
  if (e?.status === 413) return "Le PDF dépasse la limite de 10 Mo."
  if (e?.status === 507) return "Espace de stockage insuffisant."
  if (e?.status === 400) return "PDF refusé : vérifiez son format et son intégrité."
  return "Opération impossible. Réessayez ou vérifiez votre connexion."
}

export function PrepareDocumentsPanel({
  refConsultation,
  orgAcronyme,
  lotNumber,
  sourceRequirementId,
}: Props) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [downloading, setDownloading] = useState<number | null>(null)

  const base =
    `/api/v5/prepare/${encodeURIComponent(refConsultation)}` +
    `/${encodeURIComponent(orgAcronyme)}` +
    `/lots/${encodeURIComponent(lotNumber)}` +
    `/requirements/${sourceRequirementId}/documents`

  const key = [
    "v5-prepare-documents",
    refConsultation,
    orgAcronyme,
    lotNumber,
    sourceRequirementId,
  ]

  const versions = useQuery({
    queryKey: key,
    queryFn: () => apiGet<{
      data: DocumentVersion[]
      meta: { request_id: string }
    }>(base),
    retry: false,
  })

  const upload = useMutation({
    mutationFn: (selected: File) =>
      apiUploadFile<{
        data: DocumentVersion
      }>(base, selected),
    onSuccess: async result => {
      setFile(null)
      setError("")
      setSuccess(
        `Version ${result.data.version_number} déposée. ` +
        "Elle reste en attente de contrôle."
      )
      if (inputRef.current) inputRef.current.value = ""
      await Promise.all([queryClient.invalidateQueries({ queryKey: key }), queryClient.invalidateQueries({ queryKey: ["v5-document-summary", refConsultation, orgAcronyme, lotNumber] }), queryClient.invalidateQueries({ queryKey: ["v5-submit-preflight", refConsultation, orgAcronyme, lotNumber] })])
    },
    onError: err => {
      setSuccess("")
      setError(message(err))
    },
  })

  function selectFile(selected?: File) {
    setError("")
    setSuccess("")
    setFile(null)

    if (!selected) return

    if (
      !selected.name.toLowerCase().endsWith(".pdf") ||
      (selected.type && selected.type !== "application/pdf")
    ) {
      setError("Sélectionnez uniquement un fichier PDF.")
      return
    }

    if (selected.size === 0 || selected.size > MAX_SIZE) {
      setError("Le fichier doit contenir entre 1 octet et 10 Mo.")
      return
    }

    setFile(selected)
  }

  async function download(version: DocumentVersion) {
    setDownloading(version.id)
    setError("")

    try {
      const response = await fetch(
        `${base}/${version.id}/download`,
        { credentials: "include", cache: "no-store" },
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `document-v${version.version_number}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      setError("Téléchargement impossible. Vérifiez votre accès au fichier.")
    } finally {
      setDownloading(null)
    }
  }

  return (
    <section className="m5-doc-panel">
      <div className="m5-doc-heading">
        <div>
          <span className="m5-doc-eyebrow">DOSSIER DOCUMENTAIRE</span>
          <h3>Pièces justificatives</h3>
          <p>Déposez et conservez les versions de cette pièce.</p>
        </div>
        <span className="m5-doc-count">
          {versions.data?.data.length ?? "—"} version(s)
        </span>
      </div>

      <div className="m5-doc-upload">
        <label htmlFor={`m5-doc-${sourceRequirementId}`}>
          Fichier PDF · Maximum 10 Mo
        </label>
        <input
          ref={inputRef}
          id={`m5-doc-${sourceRequirementId}`}
          type="file"
          accept=".pdf,application/pdf"
          disabled={upload.isPending}
          onChange={event => selectFile(event.target.files?.[0])}
        />

        {file && (
          <div className="m5-doc-selected">
            <FileText size={18} />
            <div>
              <strong>{file.name}</strong>
              <small>{readableSize(file.size)}</small>
            </div>
          </div>
        )}

        <button
          type="button"
          className="m5-doc-upload-button"
          disabled={!file || upload.isPending}
          onClick={() => {
            if (!file || upload.isPending) return
            setSuccess("")
            upload.mutate(file)
          }}
        >
          <UploadCloud size={17} />
          {upload.isPending ? "Dépôt en cours…" : "Déposer une nouvelle version"}
        </button>

        {error && (
          <p className="m5-doc-error" role="alert">
            <AlertCircle size={16} /> {error}
          </p>
        )}

        {success && (
          <p className="m5-doc-success" role="status">{success}</p>
        )}
      </div>

      <div className="m5-doc-versions">
        <div className="m5-doc-section-title">
          <h4>Historique des versions</h4>
          <button
            type="button"
            onClick={() => void versions.refetch()}
            disabled={versions.isFetching}
          >
            Actualiser
          </button>
        </div>

        {versions.isLoading && <p>Chargement des documents…</p>}

        {versions.isError && (
          <p role="alert">
            Impossible de consulter les versions.
            <button type="button" onClick={() => void versions.refetch()}>
              Réessayer
            </button>
          </p>
        )}

        {versions.isSuccess && versions.data.data.length === 0 && (
          <div className="m5-doc-empty">
            <FileText size={22} />
            <strong>Aucun document déposé</strong>
            <p>La première pièce déposée créera la version 1.</p>
          </div>
        )}

        {versions.data?.data.map(version => (
          <article className="m5-doc-version" key={version.id}>
            <FileText size={20} />
            <div className="m5-doc-version-main">
              <strong>{version.original_filename}</strong>
              <small>
                Version {version.version_number}
                {" · "}
                {readableSize(version.file_size)}
                {" · "}
                {version.uploaded_at}
              </small>
              <PrepareDocumentReview
                base={base}
                versionId={version.id}
              />
            </div>
            <button
              type="button"
              className="m5-doc-download"
              title={`Télécharger la version ${version.version_number}`}
              aria-label={`Télécharger la version ${version.version_number}`}
              disabled={downloading === version.id}
              onClick={() => void download(version)}
            >
              <Download size={17} />
            </button>
          </article>
        ))}
      </div>

      <p className="m5-doc-disclaimer">
        Un document déposé n'est pas automatiquement considéré conforme.
        Chaque version reste conservée.
      </p>
    </section>
  )
}
