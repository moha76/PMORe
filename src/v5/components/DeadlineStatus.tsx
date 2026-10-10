import { AlertTriangle, CalendarDays } from "lucide-react"

type Props = {
  deadline?: string | null
}

const DAY = 86400000

export function deadlineDays(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const today = new Date()

  const current = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )

  const target = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )

  return Math.round((target - current) / DAY)
}

export function DeadlineStatus({ deadline }: Props) {
  const days = deadlineDays(deadline)

  if (days === null) {
    return (
      <span className="mor-v5-deadline unknown">
        <CalendarDays size={15} />
        Date inconnue
      </span>
    )
  }

  const date = new Date(deadline!)

  const label = new Intl.DateTimeFormat("fr-MA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)

  if (days < 0) {
    return (
      <span className="mor-v5-deadline expired">
        Expiré
      </span>
    )
  }

  return (
    <span
      className={
        "mor-v5-deadline " +
        (days < 15 ? "urgent" : "normal")
      }
    >
      {days < 15
        ? <AlertTriangle size={15} aria-hidden="true" />
        : <CalendarDays size={15} aria-hidden="true" />}

      <span>
        <strong>{label}</strong>
        <small>
          {days === 0
            ? "Dernier jour"
            : `${days} jours restants`}
        </small>
      </span>
    </span>
  )
}
