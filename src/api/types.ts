export type MatchStatus =
  | "OK"
  | "PARTIAL"
  | "BLOCKING"
  | "VERIFY"
  | "NOT_APPLICABLE"
  | "UNKNOWN"

export interface Evidence {
  document_id?: number | null
  document_type?: string | null
  filename?: string | null
  document?: string | null
  page?: number | null
  article?: string | null
  section?: string | null
  snippet?: string | null
  confidence?: number | null
}

export interface MatchUserView {
  status?: string | null
  ao_requirement?: unknown
  company_state?: unknown
  gap?: unknown
  explanation?: string | null
  impact?: string | null
  action?: string | null
}

export interface MatchCheck {
  code?: string | null
  status: MatchStatus
  raw_status?: string | null
  label?: string | null
  detail?: string | null
  impact?: string | null
  source?: Evidence | null
  required?: unknown
  matched?: unknown
  missing?: unknown
  activity_level?: string | null
  matched_tokens?: string[] | null
  coverage_status?: string | null
  mandatory?: boolean | null
  user_view?: MatchUserView | null
}

export interface MatchLot {
  lot_number?: string | null
  lot_title?: string | null
  computed_status: MatchStatus
  raw_status?: string | null
  summary?: Record<string, unknown> | null
  checks: MatchCheck[]
}

export interface MatchingResult {
  computed_status: MatchStatus
  raw_status?: string | null
  engine_version?: string | null
  analyzed_at?: string | null
  updated_at?: string | null

  freshness?:
    | "FRESH"
    | "STALE"
    | "UNKNOWN"

  company_data_at?: string | null
  is_available: boolean
  summary?: {
    blocking_count: number
    verify_count: number
    ok_count: number
    lots_count: number
  } | null
  lots: MatchLot[]
}

export interface FinancialLotRecord {
  lot_number?: string | null
  lot_title?: string | null
  estimation?: number | null
  caution_provisoire?: number | null
  currency?: string | null
  evidence?: Evidence | null
}

export interface RequirementItem {
  lot_number?: string | null
  type: string
  label: string
  value_text?: string | null
  value_number?: number | null
  value_unit?: string | null
  mandatory?: boolean | null
  evidence?: Evidence | null
}

export interface FactItem {
  lot_number?: string | null
  value_text?: string | null
  value_number?: number | null
  value_unit?: string | null
  mandatory?: boolean | null
  evidence?: Evidence | null
}

export interface TenderDocumentItem {
  id: number
  document_type?: string | null
  filename?: string | null
  extension?: string | null
  size_bytes?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export interface OpportunityDetail {
  identity: {
    ref_consultation: string
    org_acronyme: string
    reference?: string | null
    title?: string | null
    buyer?: string | null
    notice_type?: string | null
    procedure?: string | null
    award_mode?: string | null
    category?: string | null
    location?: string | null
    activity_domains?: string | null
    url?: string | null
  }

  deadline: {
    raw?: string | null
    iso?: string | null
    status?: string | null
  }

  financial_summary: {
    estimation_raw?: string | null
    caution_raw?: string | null
  }

  decision: {
    human_decision: string
    raw_decision?: string | null
    reason?: string | null
    updated_at?: string | null
  }

  matching: MatchingResult

  analysis_quality: {
    pipeline_status: string
    coverage_status: string
    observed: Record<string, number>
    registry?: Record<string, unknown> | null
    registry_comparison: {
      comparable: boolean
      is_consistent: boolean | null
      differences: Record<string, unknown>
    }
  }

  financial_lot_records: FinancialLotRecord[]
  requirements: Record<string, RequirementItem[]>
  facts: Record<string, FactItem[]>
  documents: TenderDocumentItem[]
}

export interface OpportunityDetailResponse {
  data: OpportunityDetail
  meta: {
    request_id: string
  }
}

export interface OpportunityMatchingSummary {
  available: boolean
  computed_status:
    | "OK"
    | "PARTIAL"
    | "BLOCKING"
    | "VERIFY"
    | "UNKNOWN"

  blocking_count: number
  verify_count: number
  ok_count: number

  engine_version?: string | null
  analyzed_at?: string | null
  updated_at?: string | null

  freshness?:
    | "FRESH"
    | "STALE"
    | "UNKNOWN"

  company_data_at?: string | null
}

export interface OpportunityListItem {
  id?: number
  ref_consultation: string
  org_acronyme: string
  reference?: string | null
  title?: string | null
  buyer?: string | null
  notice_type?: string | null
  procedure?: string | null
  award_mode?: string | null
  category?: string | null
  location?: string | null
  activity_domains?: string | null

  estimation?: string | null
  caution?: string | null

  deadline?: string | null
  deadline_iso?: string | null

  status?: string | null
  effective_status?: string | null

  human_decision: string
  raw_decision?: string | null
  decision_reason?: string | null

  first_seen_at?: string | null
  last_seen_at?: string | null
  updated_at?: string | null
  matching: OpportunityMatchingSummary

}

export interface OpportunitiesResponse {
  data: OpportunityListItem[]

  meta: {
    pagination: {
      page: number
      page_size: number
      total: number
      total_pages: number
    }

    request_id: string
    data_updated_at?: string | null

    portfolio_summary: {
      ok: number
      verify: number
      partial: number
      blocking: number
      stale: number
      unknown: number
    }
  }
}

export interface OpportunityFilters {
  active_deadline_only?: boolean
  q?: string
  status?: string
  decision?: string
  category?: string
  location?: string

  matching_status?:
    | "ACTIONABLE"
    | "OK"
    | "VERIFY"
    | "PARTIAL"
    | "BLOCKING"
    | "STALE"
    | "UNKNOWN"

  sort?:
    | "mor_priority"
    | "deadline_asc"
    | "deadline_desc"
    | "newest"
    | "updated"

  page?: number
  page_size?: number
}
