/**
 * MOR PREMIUM V5 — M04
 * Soumission externe déclarée par l'utilisateur.
 * Aucun dépôt officiel n'est effectué par ces fonctions.
 */

import { apiGet, apiPost } from "./client"

export type SubmissionStatusV5 =
  | "NOT_DECLARED"
  | "DRAFT"
  | "DECLARED"
  | "CANCELLED"

export type SubmissionEventTypeV5 =
  | "CREATED"
  | "DECLARED"
  | "UPDATED"
  | "CANCELLED"

export type LotSubmissionV5 = {
  id: number
  company_id: number
  ref_consultation: string
  org_acronyme: string
  lot_number: string
  status: Exclude<SubmissionStatusV5, "NOT_DECLARED">
  declared_submitted_at: string | null
  submission_reference: string | null
  submission_notes: string | null
  declared_by: number | null
  revision: number
  created_at: string
  updated_at: string
}

export type SubmissionEventV5 = {
  id: number
  submission_id: number
  event_type: SubmissionEventTypeV5
  previous_state_json: string | null
  new_state_json: string
  actor_id: number | null
  event_at: string
}

export type LegacySubmissionV5 = {
  exists: boolean
  lot_attributed: false
  submitted_at: string
  submission_reference: string | null
}

export type SubmissionDossierV5 = {
  ref_consultation: string
  org_acronyme: string
  lot_number: string
  status: SubmissionStatusV5
  submission: LotSubmissionV5 | null
  events: SubmissionEventV5[]
  legacy_submission: LegacySubmissionV5 | null
}

export type DeclareSubmissionV5 = {
  expected_revision: number
  submission_reference: string
  declared_submitted_at: string
  submission_notes: string | null
}

export type CancelSubmissionV5 = {
  expected_revision: number
}

export type SubmissionWriteResultV5 = {
  submission: LotSubmissionV5
  event_type: SubmissionEventTypeV5
  revision: number
}

type ApiEnvelope<T> = {
  data: T
  meta: { request_id: string }
}

function submissionPath(
  ref: string,
  org: string,
  lot: string,
): string {
  return (
    `/api/v5/submissions/${encodeURIComponent(ref)}` +
    `/${encodeURIComponent(org)}` +
    `/lots/${encodeURIComponent(lot)}`
  )
}

export async function getLotSubmissionV5(
  ref: string,
  org: string,
  lot: string,
): Promise<SubmissionDossierV5> {
  const result = await apiGet<ApiEnvelope<SubmissionDossierV5>>(
    submissionPath(ref, org, lot),
  )
  return result.data
}

export async function declareLotSubmissionV5(
  ref: string,
  org: string,
  lot: string,
  payload: DeclareSubmissionV5,
): Promise<SubmissionWriteResultV5> {
  const result = await apiPost<ApiEnvelope<SubmissionWriteResultV5>>(
    submissionPath(ref, org, lot),
    payload,
  )
  return result.data
}

export async function cancelLotSubmissionV5(
  ref: string,
  org: string,
  lot: string,
  payload: CancelSubmissionV5,
): Promise<SubmissionWriteResultV5> {
  const result = await apiPost<ApiEnvelope<SubmissionWriteResultV5>>(
    submissionPath(ref, org, lot) + "/cancel",
    payload,
  )
  return result.data
}
