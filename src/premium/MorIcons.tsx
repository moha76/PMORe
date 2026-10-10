import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number };
function Frame({ size = 24, children, ...props }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}
const star =
  "12,2 15,5 19,5 19,9 22,12 19,15 19,19 15,19 12,22 9,19 5,19 5,15 2,12 5,9 5,5 9,5";

/** MOR vector family: a shared 24 px grid and the eight-point zellij geometry. */
export function MorRadar(props: Props) {
  return (
    <Frame {...props}>
      <polygon points={star} />
      <circle cx="12" cy="12" r="4.5" />
      <path d="m12 12 6-6" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </Frame>
  );
}
export function MorDossier(props: Props) {
  return (
    <Frame {...props}>
      <path d="M3 8V5.5A1.5 1.5 0 0 1 4.5 4H9l2.5 3H19a2 2 0 0 1 2 2v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M3 10h18" />
      <path d="m12 12 2 2 2 2-2 2-2 2-2-2-2-2 2-2Z" />
    </Frame>
  );
}
export function MorIntelligence(props: Props) {
  return (
    <Frame {...props}>
      <path d="M3 3v17h18M6 15l4-5 4 3 5-7" />
      <path d="M16 6h3v3" />
      <path d="m7 2 2 2-2 2-2-2Z" />
      <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
    </Frame>
  );
}
export function MorCompany(props: Props) {
  return (
    <Frame {...props}>
      <path d="M3 21V7l9-4 9 4v14M2 21h20M8 21v-6a4 4 0 0 1 8 0v6" />
      <path d="M7 8h1M16 8h1M7 11h1M16 11h1" />
      <path d="m12 5 1.5 1.5L12 8l-1.5-1.5Z" />
    </Frame>
  );
}
export function MorVerified(props: Props) {
  return (
    <Frame {...props}>
      <polygon points={star} />
      <path d="m7.5 12 3 3 6-6" />
    </Frame>
  );
}
export function MorReview(props: Props) {
  return (
    <Frame {...props}>
      <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
      <path d="m12 6 6 6-6 6-6-6Z" />
      <path d="M12 9v4M12 15h.01" />
    </Frame>
  );
}
export function MorObstacle(props: Props) {
  return (
    <Frame {...props}>
      <path d="m8 3-5 5v8l5 5h8l5-5V8l-5-5Z" />
      <path d="m9 9 6 6m0-6-6 6" />
    </Frame>
  );
}
export function MorLot(props: Props) {
  return (
    <Frame {...props}>
      <path d="m12 2 9 5-9 5-9-5ZM3 12l9 5 9-5M3 17l9 5 9-5" />
      <path d="m12 5 3 2-3 2-3-2Z" />
    </Frame>
  );
}
