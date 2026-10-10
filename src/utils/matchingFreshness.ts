export type MatchingFreshness =
  | "FRESH"
  | "STALE"
  | "UNKNOWN"


export function matchingFreshnessLabel(
  freshness:
    | MatchingFreshness
    | null
    | undefined,
) {
  switch (freshness) {
    case "FRESH":
      return "À jour"

    case "STALE":
      return "Obsolète"

    default:
      return "Fraîcheur inconnue"
  }
}


export function matchingFreshnessTone(
  freshness:
    | MatchingFreshness
    | null
    | undefined,
) {
  switch (freshness) {
    case "FRESH":
      return "fresh"

    case "STALE":
      return "stale"

    default:
      return "unknown"
  }
}


export function matchingDateLabel(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "date inconnue"
  }

  const normalized =
    value.includes("T")
      ? value
      : value.replace(
          " ",
          "T",
        ) + "Z"

  const date =
    new Date(normalized)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    "fr-MA",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(date)
}
