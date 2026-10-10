import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

type PaginationProps = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  disabled?: boolean
  onChange: (page: number) => void
}

function pageNumbers(
  current: number,
  total: number,
): (number | string)[] {
  if (total <= 7) {
    return Array.from(
      { length: total },
      (_, index) => index + 1,
    )
  }

  const pages = new Set<number>([
    1,
    total,
    current - 1,
    current,
    current + 1,
  ])

  const ordered = [...pages]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b)

  const result: (number | string)[] = []

  ordered.forEach((page, index) => {
    if (index > 0 && page - ordered[index - 1] > 1) {
      result.push("…")
    }
    result.push(page)
  })

  return result
}

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  disabled = false,
  onChange,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <nav
      className="mor-v5-pagination"
      aria-label="Pagination des marchés"
    >
      <div className="mor-v5-pagination-meta">
        <p className="mor-v5-pagination-summary">
          {first.toLocaleString("fr-FR")}–{last.toLocaleString("fr-FR")}
          {" sur "}
          {total.toLocaleString("fr-FR")} résultats
        </p>

        <span className="mor-v5-pagination-page">
          Page {page} sur {totalPages}
        </span>
      </div>

      <div className="mor-v5-pagination-controls">
        <button
          type="button"
          aria-label="Première page"
          disabled={disabled || page <= 1}
          onClick={() => onChange(1)}
        >
          <ChevronsLeft size={16} />
        </button>

        <button
          type="button"
          aria-label="Page précédente"
          disabled={disabled || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>

        {pageNumbers(page, totalPages).map((item, index) =>
          typeof item === "number" ? (
            <button
              type="button"
              key={item}
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              className={item === page ? "active" : ""}
              disabled={disabled}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          ) : (
            <span key={`gap-${index}`} aria-hidden="true">
              …
            </span>
          ),
        )}

        <button
          type="button"
          aria-label="Page suivante"
          disabled={disabled || page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={16} />
        </button>

        <button
          type="button"
          aria-label="Dernière page"
          disabled={disabled || page >= totalPages}
          onClick={() => onChange(totalPages)}
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </nav>
  )
}
