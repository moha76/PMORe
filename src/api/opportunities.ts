import {
  apiGet,
  apiPatch,
} from "./client"

import type {
  OpportunityDetailResponse,
  OpportunitiesResponse,
  OpportunityFilters,
} from "./types"


export function getOpportunityDetail(
  refConsultation: string,
  orgAcronyme: string,
) {
  return apiGet<OpportunityDetailResponse>(
    `/api/v4/opportunities/${encodeURIComponent(
      refConsultation,
    )}/${encodeURIComponent(
      orgAcronyme,
    )}`,
  )
}


export function getOpportunities(
  filters: OpportunityFilters,
) {
  const params =
    new URLSearchParams()

  if (filters.q) {
    params.set("q", filters.q)
  }

  if (filters.status) {
    params.set(
      "status",
      filters.status,
    )
  }

  if (filters.decision) {
    params.set(
      "decision",
      filters.decision,
    )
  }

  if (filters.category) {
    params.set(
      "category",
      filters.category,
    )
  }

  if (filters.location) {
    params.set(
      "location",
      filters.location,
    )
  }

  if (filters.matching_status) {
    params.set(
      "matching_status",
      filters.matching_status,
    )
  }

  if (filters.active_deadline_only === true) {
    params.set("active_deadline_only", "true")
  }

  params.set(
    "sort",
    filters.sort
      ?? "deadline_asc",
  )

  params.set(
    "page",
    String(
      filters.page ?? 1,
    ),
  )

  params.set(
    "page_size",
    String(
      filters.page_size ?? 25,
    ),
  )

  return apiGet<OpportunitiesResponse>(
    `/api/v4/opportunities?${params.toString()}`,
  )
}



export type OpportunityDecisionValue =
  | "ACTIVE"
  | "GO"
  | "NO_GO"
  | "DISMISSED"


export type OpportunityDecisionResponse = {
  data: {
    id: number
    company_id: number
    ref_consultation: string
    org_acronyme: string
    decision: OpportunityDecisionValue
    reason: string | null
    created_at: string
    updated_at: string
  }

  meta: {
    request_id: string
  }
}


export function updateOpportunityDecision(
  refConsultation: string,
  orgAcronyme: string,
  decision: OpportunityDecisionValue,
  reason: string | null = null,
) {
  return apiPatch<OpportunityDecisionResponse>(
    `/api/v4/opportunities/${encodeURIComponent(
      refConsultation,
    )}/${encodeURIComponent(
      orgAcronyme,
    )}/decision`,
    {
      decision,
      reason,
    },
  )
}


// M02-E9 — décisions de participation par lot
export type LotDecisionValue = "GO" | "LATER" | "NO_GO"

export type LotDecisionRecord = {
  lot_number: string
  decision: LotDecisionValue
  scope_access?: "CURRENTLY_SELECTABLE" | "HISTORICAL_ONLY"
  reason: string | null
  actor_user_id: number
  created_at: string
  updated_at: string
}

export type LotDecisionsResponse = {
  data: {
    decisions: LotDecisionRecord[]
    valid_lots: string[]
    scope: {
      kind: "LOTS" | "GLOBAL" | "UNDETERMINED"
      selectable_lots: string[]
      review_lots: string[]
      reason: string
    }
  }
  meta: { request_id: string }
}

export type SaveLotDecisionResponse = {
  data: LotDecisionRecord
  meta: { request_id: string }
}

function lotDecisionBase(ref: string, org: string) {
  return `/api/v4/opportunities/${
    encodeURIComponent(ref)
  }/${encodeURIComponent(org)}`
}

export function getLotDecisions(ref: string, org: string) {
  return apiGet<LotDecisionsResponse>(
    `${lotDecisionBase(ref, org)}/lot-decisions`
  )
}

export function saveLotDecision(
  ref: string,
  org: string,
  lot: string,
  decision: LotDecisionValue,
  reason: string | null
) {
  return apiPatch<SaveLotDecisionResponse>(
    `${lotDecisionBase(ref, org)}/lots/${
      encodeURIComponent(lot)
    }/decision`,
    { decision, reason }
  )
}
