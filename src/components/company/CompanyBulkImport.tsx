import { useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import {
  createCompanyDocument,
  uploadCompanyDocumentFile,
  analyzeCompanyDocument,
  type CompanyDocumentExtraction,
} from "../../api/company"
import "./CompanyBulkImport.css"

type Job = {
  id: number
  name: string
  status: string
  documentId?: number
  extraction?: CompanyDocumentExtraction
  error?: string
}

export function CompanyBulkImport() {
  const queryClient = useQueryClient()
  const [jobs, setJobs] = useState<Job[]>([])
  const [running, setRunning] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const update = (id: number, patch: Partial<Job>) => {
    setJobs(previous =>
      previous.map(job =>
        job.id === id ? { ...job, ...patch } : job
      )
    )
  }

  const start = async () => {
    if (running || files.length === 0) return

    setRunning(true)
    const batch = files.map((file, id) => ({
      id,
      name: file.name,
      status: "En attente",
    }))
    setJobs(batch)

    try {
      for (const [id, file] of files.entries()) {
        let documentId: number | undefined

        try {
          update(id, { status: "Création du document" })

          const created = await createCompanyDocument({
            document_type: "AUTRE",
            label: file.name,
            available: true,
            valid_until: null,
            notes: "Import intelligent — analyse à vérifier",
          })

          documentId = created.data.id
          update(id, {
            documentId,
            status: "Téléversement",
          })

          await uploadCompanyDocumentFile(documentId, file)

          update(id, { status: "Analyse en cours" })

          const analysis = await analyzeCompanyDocument(documentId)

          update(id, {
            status: "Analysé — validation nécessaire",
            extraction: analysis.data.extracted,
          })
        } catch (error) {
          update(id, {
            status: "Erreur",
            documentId,
            error: error instanceof Error
              ? error.message
              : "Opération impossible",
          })
        }
      }
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["company-workspace"] })
      setRunning(false)
      setFiles([])
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const completed = jobs.filter(j => j.extraction).length
  const finished = jobs.filter(j =>
    j.extraction || j.status === "Erreur"
  ).length

  return (
    <section className="mor-bulk-import">
      <header className="mor-bulk-import-header">
        <div>
          <span className="mor-bulk-kicker">ASSISTANT DOCUMENTAIRE</span>
          <h2>Import intelligent des documents</h2>
          <p>
            Importez plusieurs justificatifs, analysez leur contenu
            et examinez les informations détectées avant validation.
          </p>
        </div>
      </header>

      <div className="mor-bulk-upload">
        <label htmlFor="mor-bulk-file-input">
          Sélectionnez les documents à analyser
        </label>
        <input
          ref={inputRef}
          id="mor-bulk-file-input"
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          disabled={running}
          onChange={event =>
            setFiles(Array.from(event.target.files || []))
          }
        />
        <p>
          PDF ou images. Chaque document est enregistré séparément.
        </p>
        <div className="mor-bulk-controls">
          <span>
            {files.length} fichier(s) sélectionné(s)
          </span>
          <button
            type="button"
            onClick={() => void start()}
            disabled={running || files.length === 0}
          >
            {running ? "Traitement en cours…" : "Importer et analyser"}
          </button>
        </div>
      </div>

      {jobs.length > 0 && (
        <section className="mor-bulk-results">
          <div className="mor-bulk-results-head">
            <h3>Résultats de l'import</h3>
            <span>
              {finished}/{jobs.length} traités · {completed} analysés
            </span>
          </div>

          {jobs.map(job => (
            <article className="mor-bulk-job" key={job.id}>
              <div className="mor-bulk-job-head">
                <strong>{job.name}</strong>
                <span>{job.status}</span>
              </div>

              {job.documentId && (
                <small>Document MOR n°{job.documentId}</small>
              )}

              {job.error && (
                <p role="alert" className="mor-bulk-error">
                  {job.error}
                </p>
              )}

              {job.extraction && (
                <div className="mor-bulk-extraction">
                  <div>
                    <span>Type détecté</span>
                    <strong>
                      {job.extraction.detected_document_type
                        || "Non déterminé"}
                    </strong>
                  </div>
                  {(
                    [
                      ["ICE", job.extraction.identifiers?.ice],
                      ["RC", job.extraction.identifiers?.rc],
                      ["CNSS", job.extraction.identifiers?.cnss],
                      ["Identifiant fiscal",
                        job.extraction.identifiers?.fiscal_id],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value || "Non détecté"}</strong>
                    </div>
                  ))}

                  {job.extraction.warnings?.length > 0 && (
                    <div className="mor-bulk-warnings">
                      <span>Points à vérifier</span>
                      {job.extraction.warnings.map((warning, index) => (
                        <p key={index}>{warning}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      <footer className="mor-bulk-notice">
        Les valeurs affichées sont des extractions automatiques.
        Elles ne sont pas validées et ne modifient pas le profil.
        Leur validation et leur application seront réalisées dans
        l'étape suivante.
      </footer>
    </section>
  )
}
