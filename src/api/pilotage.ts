import {
  apiDelete,
  apiGet,
  apiPatch,
} from "./client"


export type PilotageStage =
  | "ACTIVE"
  | "GO"
  | "IN_PREPARATION"
  | "READY"
  | "BLOCKED"
  | "SUBMITTED"
  | "WON"
  | "LOST"
  | "CANCELLED"
  | "EXPIRED"
  | "HISTORY"


export type TenderSubmission = {
  id: number
  company_id: number
  ref_consultation: string
  org_acronyme: string
  submitted_at: string
  submitted_by?: number | null
  submission_reference?: string | null
  submission_notes?: string | null
  created_at: string
  updated_at: string
}


export type TenderOutcomeValue =
  | "PENDING"
  | "WON"
  | "LOST"
  | "CANCELLED"


export type TenderOutcome = {
  id: number
  company_id: number
  ref_consultation: string
  org_acronyme: string
  outcome: TenderOutcomeValue
  result_date?: string | null
  awarded_amount?: number | null
  winner_name?: string | null
  loss_reason?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}


export type PilotageItem = {
  ref_consultation: string
  org_acronyme: string
  decision: string
  reason?: string | null
  decision_updated_at?: string | null

  reference?: string | null
  title?: string | null
  buyer?: string | null
  category?: string | null
  location?: string | null
  deadline_iso?: string | null
  deadline?: string | null
  tender_status?: string | null

  mor_status: string
  engine_version?: string | null
  analyzed_at?: string | null
  matching_updated_at?: string | null

  action_count: number
  pending_actions: number
  progress_actions: number
  ready_actions: number
  impossible_actions: number

  stage: PilotageStage
  submission?: TenderSubmission | null
  outcome?: TenderOutcome | null
}


export type PilotageResponse = {
  data: {
    kpis: {
      active: number
      go: number
      in_preparation: number
      ready: number
      blocked: number
      submitted: number
      won: number
      lost: number
      cancelled: number
      expired: number
      no_go: number
      dismissed: number
      total_tracked: number
    }

    pipeline: {
      ACTIVE: PilotageItem[]
      GO: PilotageItem[]
      IN_PREPARATION: PilotageItem[]
      READY: PilotageItem[]
      BLOCKED: PilotageItem[]
      SUBMITTED: PilotageItem[]
      WON: PilotageItem[]
      LOST: PilotageItem[]
      CANCELLED: PilotageItem[]
      EXPIRED: PilotageItem[]
    }

    history: PilotageItem[]
    generated_at: string
  }

  meta: {
    request_id: string
  }
}


export type SubmissionPayload = {
  submission_reference?: string | null
  submission_notes?: string | null
}


export function getPilotageOverview() {
  return apiGet<PilotageResponse>(
    "/api/v4/pilotage/overview",
  )
}


export function markTenderSubmitted(
  refConsultation: string,
  orgAcronyme: string,
  payload: SubmissionPayload = {},
) {
  return apiPatch<{
    data: TenderSubmission
    meta: {
      request_id: string
    }
  }>(
    `/api/v4/pilotage/${encodeURIComponent(
      refConsultation,
    )}/${encodeURIComponent(
      orgAcronyme,
    )}/submission`,
    payload,
  )
}


export function cancelTenderSubmission(
  refConsultation: string,
  orgAcronyme: string,
) {
  return apiDelete<{
    data: {
      deleted: boolean
    }
    meta: {
      request_id: string
    }
  }>(
    `/api/v4/pilotage/${encodeURIComponent(
      refConsultation,
    )}/${encodeURIComponent(
      orgAcronyme,
    )}/submission`,
  )
}


export type OutcomePayload = {
  outcome: TenderOutcomeValue
  result_date?: string | null
  awarded_amount?: number | null
  winner_name?: string | null
  loss_reason?: string | null
  notes?: string | null
}


export function updateTenderOutcome(
  refConsultation: string,
  orgAcronyme: string,
  payload: OutcomePayload,
) {
  return apiPatch<{
    data: TenderOutcome
    meta: {
      request_id: string
    }
  }>(
    `/api/v4/pilotage/${encodeURIComponent(
      refConsultation,
    )}/${encodeURIComponent(
      orgAcronyme,
    )}/outcome`,
    payload,
  )
}


export function deleteTenderOutcome(
  refConsultation: string,
  orgAcronyme: string,
) {
  return apiDelete<{
    data: {
      deleted: boolean
    }
    meta: {
      request_id: string
    }
  }>(
    `/api/v4/pilotage/${encodeURIComponent(
      refConsultation,
    )}/${encodeURIComponent(
      orgAcronyme,
    )}/outcome`,
  )
}
