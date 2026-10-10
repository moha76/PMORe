import { apiGet, apiPatch } from "./client"

export type PrepareQualification =
  | "TO_QUALIFY"
  | "REQUIRED"
  | "OPTIONAL"
  | "NOT_APPLICABLE"

export type PrepareRequirement = {
  source_requirement_id: number
  requirement_type: string
  label: string | null
  category: string
  source_group: string
  source_lot_number: string | null
  selected_lot_number: string
  scope: "LOT" | "COMMON_CANDIDATE"
  scope_confirmed: boolean
  mandatory_from_extraction: boolean | null
  qualification: PrepareQualification
  qualification_revision: number
  qualification_recorded: boolean
  scope_reviewed: boolean
  qualification_updated_by: number | null
  qualification_updated_at: string | null
  document_status: string
  source: {
    document_id: number | null
    document_type: string | null
    filename: string | null
    page: number | null
    snippet: string | null
  }
}

export type PrepareRegisterResponse = {
  data: {
    ref_consultation: string
    org_acronyme: string
    lot_number: string
    requirements: PrepareRequirement[]
    summary: {
      candidate_count: number
      required_count: number
      optional_count: number
      not_applicable_count: number
      to_qualify_count: number
      common_scope_to_verify: number
      other_conditions_not_converted: number
      confirmed_mandatory_count: number | null
      validated_count: number | null
      completion_percent: number | null
    }
  }
  meta: { request_id: string }
}

export function getPrepareRequirements(
  ref: string,
  org: string,
  lot: string,
) {
  return apiGet<PrepareRegisterResponse>(
    `/api/v5/prepare/${encodeURIComponent(ref)}/` +
    `${encodeURIComponent(org)}/lots/` +
    `${encodeURIComponent(lot)}/requirements`,
  )
}

export type QualificationUpdatePayload = {
  status: PrepareQualification
  expected_revision: number
  scope_reviewed: boolean
  source_document_id: number | null
  source_page: number | null
  reviewed_excerpt: string | null
  justification: string
}

export type QualificationSaveResponse = {
  data: {
    id: number
    source_requirement_id: number
    lot_number: string
    status: PrepareQualification
    revision: number
    scope_reviewed: boolean
    updated_by: number
  }
  meta: { request_id: string }
}

export type QualificationHistoryEvent = {
  id: number
  previous_status: string | null
  new_status: string
  previous_revision: number
  new_revision: number
  actor_user_id: number
  source_document_id: number | null
  source_page: number | null
  reviewed_excerpt: string | null
  justification: string
  scope_reviewed: number
  recorded_at: string
}

export type QualificationHistoryResponse = {
  data: {
    source_requirement_id: number
    current_status: string
    current_revision: number
    scope_reviewed: boolean
    events: QualificationHistoryEvent[]
    pagination: {
      limit: number
      offset: number
      has_more: boolean
    }
  }
  meta: { request_id: string }
}

function prepareRequirementPath(
  ref: string,
  org: string,
  lot: string,
  sourceId: number,
) {
  return (
    `/api/v5/prepare/${encodeURIComponent(ref)}/` +
    `${encodeURIComponent(org)}/lots/${encodeURIComponent(lot)}/` +
    `requirements/${sourceId}`
  )
}

export function savePrepareQualification(
  ref: string,
  org: string,
  lot: string,
  sourceId: number,
  payload: QualificationUpdatePayload,
) {
  return apiPatch<QualificationSaveResponse>(
    `${prepareRequirementPath(ref, org, lot, sourceId)}/qualification`,
    payload,
  )
}

export function getPrepareQualificationHistory(
  ref: string,
  org: string,
  lot: string,
  sourceId: number,
) {
  return apiGet<QualificationHistoryResponse>(
    `${prepareRequirementPath(ref, org, lot, sourceId)}/history`,
  )
}

// G3.9 — Archive de préparation, exclusivement en lecture.
export type HistoricalPrepareDetail = {
  access_mode: "HISTORICAL_READ_ONLY"
  read_only: true
  ref_consultation: string
  org_acronyme: string
  lot_number: string
  requirements: Array<{
    id: number
    source_requirement_id: number
    status: string
    revision: number
    scope_reviewed: number | boolean
    updated_at: string | null
    source_page: number | null
    reviewed_excerpt: string | null
    justification: string | null
  }>
  qualification_events: Array<{
    id: number
    source_requirement_id: number
    previous_status: string | null
    new_status: string
    recorded_at: string
    justification: string | null
  }>
  document_versions: Array<{
    id: number
    source_requirement_id: number
    version_number: number
    original_filename: string
    mime_type: string | null
    file_size: number
    uploaded_at: string
    review_status: string
  }>
  document_reviews: Array<{
    id: number
    document_version_id: number
    source_requirement_id: number
    review_revision: number
    decision: string
    justification: string | null
    reviewed_at: string
  }>
  truncated: Record<string, boolean>
}

export function getHistoricalPrepareDetail(
  ref: string,
  org: string,
  lot: string,
) {
  return apiGet<{
    data: HistoricalPrepareDetail
    meta: { request_id: string }
  }>(
    `/api/v5/prepare/history/${encodeURIComponent(ref)}/` +
    `${encodeURIComponent(org)}/lots/` +
    `${encodeURIComponent(lot)}/detail`,
  )
}

// G3.13 — Autorisation de préparation confirmée par le serveur.
export function getPrepareAccess(
  ref: string,
  org: string,
  lot: string,
) {
  return apiGet<{
    data: {
      allowed: true
      ref_consultation: string
      org_acronyme: string
      lot_number: string
      decision: "GO"
    }
    meta: { request_id: string }
  }>(
    `/api/v5/prepare/${encodeURIComponent(ref)}/` +
    `${encodeURIComponent(org)}/lots/` +
    `${encodeURIComponent(lot)}/access`,
  )
}
