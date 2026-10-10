import {
  apiGet,
} from "./client"


export type IntelligenceRankingItem = {
  name: string
  total: number
  open_total: number
}


export type IntelligenceOverview = {
  kpis: {
    total: number
    open_total: number
    new_7d: number
    new_30d: number
    deadline_7d: number
    deadline_30d: number
    estimation_available: number
    estimation_coverage_percent: number
  }

  top_buyers: IntelligenceRankingItem[]
  categories: IntelligenceRankingItem[]
  top_locations: IntelligenceRankingItem[]

  signals: {
    hot_buyers_30d: {
      name: string
      total: number
    }[]

    hot_locations_30d: {
      name: string
      total: number
    }[]

    open_categories: {
      name: string
      total: number
    }[]

    urgent_buyers_7d: {
      name: string
      total: number
    }[]
  }

  generated_at: string
}


export type IntelligenceOverviewResponse = {
  data: IntelligenceOverview

  meta: {
    request_id: string
  }
}


export function getIntelligenceOverview() {
  return apiGet<IntelligenceOverviewResponse>(
    "/api/v4/intelligence/overview",
  )
}
