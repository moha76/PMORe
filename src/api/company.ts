import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiUploadFile,
} from "./client"


export type CompanyProfile = {
  id: number
  company_name: string
  legal_form: string | null
  city: string | null
  region: string | null

  annual_revenue: number | null
  caution_capacity: number | null
  max_contract_capacity: number | null

  activity_domains: string | null
  covered_regions: string | null

  can_site_visit: boolean | number | null
  site_visit_notes?: string | null

  accepts_subcontracting:
    boolean | number | null

  max_subcontracting_percent:
    number | null

  subcontracting_notes?:
    string | null

  can_execute_core_inhouse:
    boolean | number | null

  updated_at: string | null
}


export type CompanyDocument = {
  id: number
  document_type: string
  label: string | null
  available: number
  valid_until: string | null
  notes: string | null

  has_file: boolean
  file_url: string | null
  original_filename: string | null
  mime_type: string | null
  file_size: number | null

  analysis_status: string
  validation_status: string
  validated_json: string | null

  validated_at: string | null
  updated_at: string | null
}


export type CompanyCertification = {
  id: number
  certification_type: string
  name: string | null
  category: string | null
  class: string | null
  valid_until: string | null
  available: number
  updated_at: string | null
}


export type CompanyEquipment = {
  id: number
  equipment_type: string
  label: string | null
  quantity: number | null
  owned: number
  available: number
  updated_at: string | null
}


export type CompanyPersonnel = {
  id: number
  role: string
  qualification: string | null
  specialty: string | null
  years_experience: number | null
  available: number
  similar_projects_count: number | null
  certifications_json: string | null
  updated_at: string | null
}


export type CompanyReference = {
  id: number
  title: string
  client_name: string | null
  activity_type: string | null
  description: string | null
  amount: number | null
  execution_year: number | null
  similar_keywords: string | null
  proof_available: number
  updated_at: string | null
}


export type MatchingParameter = {
  parameter_code: string
  parameter_family: string
  source_table: string
  source_field: string | null
  label: string
  description: string | null
  value_type: string | null
  used_in_matching: number
  status: string

  has_value: boolean
  completion_status:
    | "COMPLETE"
    | "PARTIAL"
    | "MISSING"
    | "NON_APPLICABLE"
}


export type CompanyAlert = {
  level: string
  code: string
  message: string
}


export type CompanyWorkspace = {
  profile: CompanyProfile

  summary: {
    profile_completion_percent: number

    documents_total: number
    documents_uploaded: number
    documents_without_file: number
    documents_analyzed: number
    documents_validated: number
    documents_expired: number
    documents_with_future_validity: number

    certifications_total: number
    equipment_total: number
    personnel_total: number
    references_total: number
  }

  alerts: CompanyAlert[]

  documents: CompanyDocument[]
  certifications: CompanyCertification[]
  equipment: CompanyEquipment[]
  personnel: CompanyPersonnel[]
  references: CompanyReference[]

  matching_parameters:
    MatchingParameter[]
}


export type CompanyWorkspaceResponse = {
  data: CompanyWorkspace

  meta: {
    request_id?: string
  }
}


export type CompanyProfileResponse = {
  data: CompanyProfile

  meta: {
    request_id?: string
  }
}


export type CompanyProfileUpdate = {
  annual_revenue?: number | null
  caution_capacity?: number | null
  max_contract_capacity?: number | null

  activity_domains?: string | null
  covered_regions?: string | null

  can_site_visit?: boolean | null

  accepts_subcontracting?:
    boolean | null

  max_subcontracting_percent?:
    number | null

  can_execute_core_inhouse?:
    boolean | null
}


export function getCompanyProfile() {
  return apiGet<CompanyProfileResponse>(
    "/api/v4/company/profile"
  )
}


export function getCompanyWorkspace() {
  return apiGet<CompanyWorkspaceResponse>(
    "/api/v4/company/workspace"
  )
}


export function updateCompanyProfile(
  payload: CompanyProfileUpdate,
) {
  return apiPatch<CompanyProfileResponse>(
    "/api/v4/company/profile",
    payload,
  )
}


export type CompanyDocumentPayload = {
  document_type: string
  label: string
  available: boolean
  valid_until: string | null
  notes: string | null
}


type CompanyDocumentResponse = {
  data: CompanyDocument
  meta: {
    request_id?: string
  }
}


export function createCompanyDocument(
  payload: CompanyDocumentPayload,
) {
  return apiPost<CompanyDocumentResponse>(
    "/api/v4/company/documents",
    payload,
  )
}


export function updateCompanyDocument(
  documentId: number,
  payload: Partial<CompanyDocumentPayload>,
) {
  return apiPatch<CompanyDocumentResponse>(
    `/api/v4/company/documents/${documentId}`,
    payload,
  )
}


export function deleteCompanyDocument(
  documentId: number,
) {
  return apiDelete<{
    data: {
      deleted_id: number
    }
  }>(
    `/api/v4/company/documents/${documentId}`
  )
}


export function uploadCompanyDocumentFile(
  documentId: number,
  file: File,
) {
  return apiUploadFile<CompanyDocumentResponse>(
    `/api/v4/company/documents/${documentId}/file`,
    file,
  )
}


export function deleteCompanyDocumentFile(
  documentId: number,
) {
  return apiDelete<{
    data: {
      document_id: number
      has_file: boolean
    }
  }>(
    `/api/v4/company/documents/${documentId}/file`
  )
}


export type CompanyResourceKind =
  | "personnel"
  | "equipment"
  | "certifications"
  | "references"


export function createCompanyResource<T>(
  kind: CompanyResourceKind,
  payload: unknown,
) {
  return apiPost<{
    data: T
    meta: {
      request_id?: string
    }
  }>(
    `/api/v4/company/${kind}`,
    payload,
  )
}


export function updateCompanyResource<T>(
  kind: CompanyResourceKind,
  id: number,
  payload: unknown,
) {
  return apiPatch<{
    data: T
    meta: {
      request_id?: string
    }
  }>(
    `/api/v4/company/${kind}/${id}`,
    payload,
  )
}


export function deleteCompanyResource(
  kind: CompanyResourceKind,
  id: number,
) {
  return apiDelete<{
    data: {
      deleted_id: number
    }
  }>(
    `/api/v4/company/${kind}/${id}`
  )
}


// ==========================================================
// MOR DOCUMENT ANALYSIS + HUMAN REVIEW
// ==========================================================

export type CompanyDocumentExtraction = {
  schema_version: number

  extraction_method:
    string | null

  original_filename:
    string | null

  declared_document_type:
    string | null

  detected_document_type:
    string | null

  type_mismatch:
    boolean

  identifiers: {
    ice: string | null
    rc: string | null
    cnss: string | null
    fiscal_id: string | null
  }

  dates_detected: string[]

  text_length: number

  text_preview: string

  warnings: string[]
}


export type CompanyDocumentAnalysis = {
  document: {
    id: number
    document_type: string
    label: string | null

    original_filename:
      string | null

    mime_type:
      string | null

    has_file: boolean

    analysis_status: string
    validation_status: string

    validated_at:
      string | null

    valid_until:
      string | null
  }

  extracted:
    CompanyDocumentExtraction
    | null

  validated:
    Record<string, unknown>
    | null

  proof_status:
    "VALIDATED"
    | "NOT_VALIDATED"
}


export function analyzeCompanyDocument(
  documentId: number,
) {
  return apiPost<{
    data: {
      document_id: number
      analysis_status: string
      validation_status: string

      extracted:
        CompanyDocumentExtraction

      message: string
    }

    meta: {
      request_id?: string
    }
  }>(
    `/api/v4/company/documents/${documentId}/analyze`,
    {},
  )
}


export function getCompanyDocumentAnalysis(
  documentId: number,
) {
  return apiGet<{
    data: CompanyDocumentAnalysis

    meta: {
      request_id?: string
    }
  }>(
    `/api/v4/company/documents/${documentId}/analysis`
  )
}


export function validateCompanyDocument(
  documentId: number,
  payload: {
    action:
      | "VALIDATE"
      | "CORRECT"
      | "IGNORE"

    validated_data?:
      Record<string, unknown>
      | null
  },
) {
  return apiPost<{
    data: {
      document: CompanyDocument

      matcher_refresh_required:
        boolean
    }

    meta: {
      request_id?: string
    }
  }>(
    `/api/v4/company/documents/${documentId}/validation`,
    payload,
  )
}


// ==========================================================
// MOR COMPANY REMATCH STATUS
// ==========================================================

export type CompanyRematchStatus = {
  company_id: number

  state:
    | "IDLE"
    | "STARTED"
    | "RUNNING"
    | "PENDING"
    | "COMPLETED"
    | "ERROR"

  running: boolean
  pending: boolean

  total?: number
  processed?: number
  success?: number
  failed_count?: number
  progress_percent?: number

  current_ref?: string | null
  current_org?: string | null

  started_at: string | null
  finished_at: string | null

  last_result: {
    company_id: number
    total: number
    success: number
    failed_count: number
    failed: Array<{
      ref_consultation: string
      org_acronyme: string
      error: string
    }>
  } | null

  last_error: string | null
}


export function getCompanyRematchStatus() {
  return apiGet<{
    data: CompanyRematchStatus

    meta: {
      request_id?: string
    }
  }>(
    "/api/v4/company/rematch/status"
  )
}
