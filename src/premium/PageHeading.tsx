import type { ReactNode } from "react";
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="premium-heading">
      <div>
        <p className="premium-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="premium-heading-actions">{actions}</div>}
    </header>
  );
}
