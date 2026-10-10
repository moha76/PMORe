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
        <rect x="1" y="1" width="38" height="38" rx="10" fill="currentColor" />
        <path
          d="M10 27V13l10 9 10-9v14M20 22v8"
          stroke="var(--brand-symbol, #F6F5EE)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="11" r="2" fill="var(--brand-symbol, #F6F5EE)" />
      </svg>
      <span>
        <strong>
          MOR<span className="brand-dot">.</span>
        </strong>
        {!compact && <small>OPPORTUNITY RADAR</small>}
      </span>
    </span>
  );
}
