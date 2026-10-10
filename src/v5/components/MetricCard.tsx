import type { ReactNode } from "react"

type MetricCardProps = {
  label: string
  value: number | string
  description: string
  icon: ReactNode
  tone?: "default" | "success" | "warning" | "danger"
  active?: boolean
  onClick?: () => void
}

export function MetricCard({
  label,
  value,
  description,
  icon,
  tone = "default",
  active = false,
  onClick,
}: MetricCardProps) {
  const formattedValue =
    typeof value === "number"
      ? value.toLocaleString("fr-FR")
      : value

  return (
    <button
      type="button"
      className={
        `mor-v5-metric mor-v5-metric--${tone} ` +
        (active ? "is-active" : "")
      }
      onClick={onClick}
    >
      <div className="mor-v5-metric-top">
        <span className="mor-v5-metric-label">{label}</span>
        <span className="mor-v5-metric-icon" aria-hidden="true">
          {icon}
        </span>
      </div>

      <strong className="mor-v5-metric-value">
        {formattedValue}
      </strong>

      <span className="mor-v5-metric-description">
        {description}
      </span>
    </button>
  )
}
