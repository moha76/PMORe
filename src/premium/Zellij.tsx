import { useId } from "react";

export function Zellij({ className = "" }: { className?: string }) {
  const id = `mor-zellij-${useId().replace(/:/g, "")}`;
  return (
    <svg
      className={`mor-zellij ${className}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id={id} width="80" height="80" patternUnits="userSpaceOnUse">
          <path
            d="M40 6 50 16H64V30L74 40 64 50V64H50L40 74 30 64H16V50L6 40 16 30V16H30Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="m40 20 20 20-20 20-20-20ZM0 0l16 16M80 0 64 16M0 80l16-16M80 80L64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path d="m40 31 9 9-9 9-9-9Z" fill="currentColor" opacity=".3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
