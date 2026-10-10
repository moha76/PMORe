import type { Query } from "@tanstack/react-query";
const keys = new Set([
  "today-opportunities",
  "opportunities",
  "opportunity",
  "company-workspace",
  "company-profile",
  "v5-discover",
  "v5-discover-total",
  "v5-study",
  "v5-prepare-detail",
  "intelligence-strategy-v2",
  "pilotage",
  "pilotage-overview",
  "m05-dossiers",
]);
export const affectedByCompanyChange = (query: Query) =>
  keys.has(String(query.queryKey[0]));
