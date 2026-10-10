import type { Evidence } from "../../api/types";
import { Dialog } from "../../premium/Dialog";
export function EvidenceDrawer({
  evidence,
  onClose,
}: {
  evidence: Evidence | null;
  onClose: () => void;
}) {
  if (!evidence) return null;
  return (
    <Dialog title="La preuve, dans son contexte." onClose={onClose}>
      <p className="premium-eyebrow">SOURCE DOCUMENTAIRE</p>
      <div className="evidence-meta-grid">
        <div>
          <small>Document</small>
          <strong>
            {evidence.filename ?? evidence.document ?? "Non identifié"}
          </strong>
        </div>
        <div>
          <small>Page</small>
          <strong>{evidence.page ?? "Non localisée"}</strong>
        </div>
        <div>
          <small>Type</small>
          <strong>{evidence.document_type ?? "Non renseigné"}</strong>
        </div>
        <div>
          <small>Article / section</small>
          <strong>
            {evidence.article ?? evidence.section ?? "Non renseigné"}
          </strong>
        </div>
      </div>
      <blockquote>{evidence.snippet ?? "Aucun extrait disponible."}</blockquote>
      <p>
        Confiance de l'extraction :{" "}
        <strong>
          {evidence.confidence != null
            ? `${Math.round(evidence.confidence * 100)} %`
            : "Non disponible"}
        </strong>
      </p>
      <small>
        Ce niveau concerne l'extraction documentaire. Il ne vaut pas validation
        de l'éligibilité de votre entreprise.
      </small>
    </Dialog>
  );
}
