import {
  apiGet,
} from "./client"


export type DossierPreparationStatus =
  | "ADVANCED"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "TO_REVIEW"


export type DossierItem = {
  ref_consultation: string
  org_acronyme: string
  reference: string | null
  title: string | null
  buyer: string | null
  category: string | null
  location: string | null

  deadline: {
    raw?: string | null
    iso?: string | null
    status?: string | null
  } | null

  decision: {
    human_decision?: string | null
    reason?: string | null
    updated_at?: string | null
  } | null

  matching: {
    computed_status?: string | null
    freshness?: string | null
    engine_version?: string | null
    summary?: {
      blocking_count?: number
      verify_count?: number
      ok_count?: number
      lots_count?: number
    } | null
  }

  analysis_quality?: unknown

  preparation: {
    status: DossierPreparationStatus
    coverage_percent: number

    checks: {
      total: number
      ok: number
      verify: number
      blocking: number
      unknown: number
      partial: number
    }
  }
}


export type DossiersResponse = {
  data: DossierItem[]

  meta: {
    pagination: {
      page: number
      page_size: number
      total: number
      total_pages: number
    }

    summary: {
      total: number
      advanced: number
      in_progress: number
      blocked: number
      to_review: number
    }
  }
}


export function getDossiers(
  page = 1,
  pageSize = 25,
) {
  const params =
    new URLSearchParams()

  params.set(
    "page",
    String(page),
  )

  params.set(
    "page_size",
    String(pageSize),
  )

  return apiGet<DossiersResponse>(
    `/api/v4/dossiers?${params.toString()}`,
  )
}


export type DossierActionStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "READY"
  | "IMPOSSIBLE"


export type DossierAction = {
  id: number
  company_id: number
  ref_consultation: string
  org_acronyme: string
  lot_number: string | null
  requirement_type: string
  status: DossierActionStatus
  notes: string | null
  created_at: string | null
  updated_at: string | null
}


export type DossierActionsResponse = {
  data: DossierAction[]
  meta: {
    request_id: string
  }
}


export type DossierActionPayload = {
  lot_number?: string | null
  requirement_type: string
  status: DossierActionStatus
  notes?: string | null
}


import {
  apiPatch,
} from "./client"


export function getDossierActions(
  refConsultation: string,
  orgAcronyme: string,
) {
  return apiGet<DossierActionsResponse>(
    `/api/v4/dossiers/${encodeURIComponent(
      refConsultation,
    )}/${encodeURIComponent(
      orgAcronyme,
    )}/actions`,
  )
}


export function updateDossierAction(
  refConsultation: string,
  orgAcronyme: string,
  payload: DossierActionPayload,
) {
  return apiPatch<{
    data: DossierAction
    meta: {
      request_id: string
    }
  }>(
    `/api/v4/dossiers/${encodeURIComponent(
      refConsultation,
    )}/${encodeURIComponent(
      orgAcronyme,
    )}/actions`,
    payload,
  )
}
