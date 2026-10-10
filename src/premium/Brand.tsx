export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="mor-brand" aria-label="MOR, Morocco Opportunity Radar">
      <svg
        width="38"
        height="38"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="8"
          fill="var(--brand-fill, currentColor)"
        />
        <path
          d="m20 4 5 5h6v6l5 5-5 5v6h-6l-5 5-5-5H9v-6l-5-5 5-5V9h6Z"
          stroke="var(--brand-inlay, #B59361)"
          strokeWidth=".8"
        />
        <path
          d="M12 26V15l8 7 8-7v11M20 22v6"
          stroke="var(--brand-symbol, #F6F5EE)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="m20 10 2 2-2 2-2-2Z" fill="var(--brand-symbol, #F6F5EE)" />
      </svg>
      <span>
        <strong>
          MOR<span className="brand-dot">.</span>
        </strong>
        {!compact && <small>MARCHÉS PUBLICS · MAROC</small>}
      </span>
    </span>
  );
}
