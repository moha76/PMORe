import { apiGet } from "./client";
export type DossierStage =
  "STUDY" | "PREPARATION" | "PRE_SUBMISSION" | "SUBMITTED" | "WON" | "HISTORY";
export type DossierV5 = {
  ref_consultation: string;
  org_acronyme: string;
  lot_number: string | null;
  reference: string | null;
  title: string | null;
  buyer: string | null;
  deadline: string | null;
  last_modified_at?: string | null;
  submitted_at?: string | null;
  stage: DossierStage;
};
export type DossiersV5 = {
  items: DossierV5[];
  total: number;
  page: number;
  page_size: number;
};
export function getDossiersV5(page: number) {
  return apiGet<DossiersV5>(
    `/api/v5/dossiers/overview?page=${page}&page_size=100`,
  );
}
export function dossierDestination(d: DossierV5) {
  const context = `${encodeURIComponent(d.ref_consultation)}/${encodeURIComponent(d.org_acronyme)}`;
  if (d.lot_number && d.stage === "SUBMITTED")
    return `/v5/submit/${context}/${encodeURIComponent(d.lot_number)}`;
  if (d.lot_number && ["PREPARATION", "PRE_SUBMISSION"].includes(d.stage))
    return `/v5/prepare/${context}/${encodeURIComponent(d.lot_number)}`;
  return `/v5/study/${context}${d.lot_number ? `?lot=${encodeURIComponent(d.lot_number)}` : ""}`;
}
