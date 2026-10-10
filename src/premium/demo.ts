/* Explicit, localhost-only preview transport. Never forwards demo API calls. */
import type { OpportunityDetail, OpportunityListItem } from "../api/types";
import type { PrepareRequirement } from "../api/prepare";
const local = ["localhost", "127.0.0.1", "::1"].includes(
  window.location.hostname,
);
export const demoEnabled =
  local &&
  (new URLSearchParams(location.search).get("demo") === "1" ||
    sessionStorage.getItem("mor-demo") === "1");
export function leaveDemo() {
  sessionStorage.removeItem("mor-demo");
  location.href = import.meta.env.BASE_URL;
}
const timestamp = "2026-10-10T10:00:00Z";
export const demoOpportunities: OpportunityListItem[] = [
  [
    "DEMO-001",
    "Travaux de réhabilitation d'un centre de formation",
    "Acheteur de démonstration · Rabat",
    "Rabat-Salé-Kénitra",
    "Travaux",
    "2480000",
    "VERIFY",
    "2026-11-18T10:00:00Z",
  ],
  [
    "DEMO-002",
    "Acquisition de matériel informatique et de mobilier",
    "Acheteur de démonstration · Casablanca",
    "Casablanca-Settat",
    "Fournitures",
    "860000",
    "OK",
    "2026-11-24T10:00:00Z",
  ],
  [
    "DEMO-003",
    "Étude technique d'un équipement de proximité",
    "Acheteur de démonstration · Marrakech",
    "Marrakech-Safi",
    "Services",
    "420000",
    "BLOCKING",
    "2026-12-02T10:00:00Z",
  ],
  [
    "DEMO-004",
    "Aménagement et entretien des espaces paysagers",
    "Acheteur de démonstration · Tanger",
    "Tanger-Tétouan-Al Hoceïma",
    "Travaux",
    null,
    "UNKNOWN",
    "2026-12-08T10:00:00Z",
  ],
  [
    "DEMO-005",
    "Maintenance des installations électriques",
    "Acheteur de démonstration · Rabat",
    "Rabat-Salé-Kénitra",
    "Services",
    "310000",
    "VERIFY",
    "2026-12-15T10:00:00Z",
  ],
  [
    "DEMO-006",
    "Fourniture de consommables et équipements de bureau",
    "Acheteur de démonstration · Fès",
    "Fès-Meknès",
    "Fournitures",
    "175000",
    "OK",
    "2026-12-20T10:00:00Z",
  ],
].map((x, i) => ({
  id: i + 1,
  ref_consultation: x[0]!,
  org_acronyme: "DEMO",
  reference: `${x[0]}/2026`,
  title: x[1],
  buyer: x[2],
  location: x[3],
  category: x[4],
  estimation: x[5],
  deadline_iso: x[7],
  deadline: x[7],
  status: "OPEN",
  human_decision: "ACTIVE",
  matching: {
    available: true,
    computed_status: x[6] as "OK" | "VERIFY" | "BLOCKING" | "UNKNOWN",
    blocking_count: x[6] === "BLOCKING" ? 1 : 0,
    verify_count: x[6] === "VERIFY" ? 2 : 0,
    ok_count: 3,
    freshness: i === 4 ? "STALE" : "FRESH",
    updated_at: timestamp,
  },
}));
const evidence = {
  document_id: 1,
  document_type: "RC",
  filename: "RC — exemple de démonstration.pdf",
  page: 8,
  snippet:
    "Le candidat fournit une attestation fiscale en cours de validité et justifie de références similaires pour le lot concerné.",
  confidence: 0.92,
};
const decisions: Record<
  string,
  Record<
    string,
    {
      lot_number: string;
      decision: string;
      reason: string | null;
      actor_user_id: number;
      created_at: string;
      updated_at: string;
    }
  >
> = {
  "DEMO-001": {
    "1": {
      lot_number: "1",
      decision: "GO",
      reason:
        "Exemple : participation retenue sous réserve du contrôle des pièces.",
      actor_user_id: 1,
      created_at: timestamp,
      updated_at: timestamp,
    },
  },
};
const qualifications: Record<string, PrepareRequirement[]> = {};
const submissions: Record<
  string,
  {
    submission: Record<string, unknown> | null;
    events: Record<string, unknown>[];
    status: string;
  }
> = {};
const versions: Record<string, Array<Record<string, unknown>>> = {};
const reviews: Record<
  string,
  {
    current_decision: string;
    current_revision: number;
    history: Array<Record<string, unknown>>;
  }
> = {};
const histories: Record<string, Array<Record<string, unknown>>> = {};
const profile = {
  id: 1,
  company_name: "Atlas Atelier · Entreprise de démonstration",
  legal_form: "SARL",
  city: "Rabat",
  region: "Rabat-Salé-Kénitra",
  annual_revenue: 4800000,
  caution_capacity: 120000,
  max_contract_capacity: 3000000,
  activity_domains: "Bâtiment, réhabilitation, maintenance",
  covered_regions: "Rabat-Salé-Kénitra, Casablanca-Settat",
  can_site_visit: true,
  accepts_subcontracting: true,
  max_subcontracting_percent: 20,
  can_execute_core_inhouse: true,
  updated_at: timestamp,
};
function detail(ref: string): OpportunityDetail | null {
  const ao = demoOpportunities.find((x) => x.ref_consultation === ref);
  if (!ao) return null;
  return {
    identity: {
      ref_consultation: ref,
      org_acronyme: "DEMO",
      reference: ao.reference,
      title: ao.title,
      buyer: ao.buyer,
      category: ao.category,
      location: ao.location,
      procedure: "Appel d'offres ouvert · exemple",
      url: null,
    },
    deadline: { iso: ao.deadline_iso, raw: ao.deadline_iso, status: "OPEN" },
    financial_summary: {},
    decision: { human_decision: "ACTIVE" },
    matching: {
      is_available: true,
      computed_status: ao.matching.computed_status,
      freshness: ao.matching.freshness,
      engine_version: "DEMO",
      analyzed_at: timestamp,
      updated_at: timestamp,
      summary: {
        ok_count: 3,
        verify_count: 2,
        blocking_count: 0,
        lots_count: 2,
      },
      lots: ["1", "2"].map((lot, i) => ({
        lot_number: lot,
        lot_title: i
          ? "Installations techniques"
          : "Réhabilitation et second œuvre",
        computed_status: i ? "BLOCKING" : "VERIFY",
        checks: [
          {
            code: "COMPANY_ACTIVITY_FIT",
            label: "Compatibilité de l'activité",
            status: "OK",
            detail: "L'activité déclarée correspond aux travaux du lot.",
            source: evidence,
          },
          {
            code: "CAUTION",
            label: "Capacité de cautionnement",
            status: i ? "BLOCKING" : "OK",
            detail: i
              ? "La capacité déclarée doit être réexaminée."
              : "La capacité déclarée couvre la caution de ce lot.",
            source: evidence,
          },
          {
            code: "ATTESTATION_FISCALE",
            label: "Attestation fiscale",
            status: "VERIFY",
            detail: "Vérifiez la validité du justificatif au jour du dépôt.",
            source: evidence,
          },
          {
            code: "SIMILAR_REFERENCES",
            label: "Références similaires",
            status: "VERIFY",
            detail: "Le caractère similaire reste à confirmer à partir du DCE.",
            source: evidence,
          },
        ],
      })),
    },
    analysis_quality: {
      pipeline_status: "DEMO",
      coverage_status: "PARTIAL",
      observed: {},
      registry_comparison: {
        comparable: false,
        is_consistent: null,
        differences: {},
      },
    },
    financial_lot_records: ["1", "2"].map((lot, i) => ({
      lot_number: lot,
      lot_title: i
        ? "Installations techniques"
        : "Réhabilitation et second œuvre",
      estimation: i ? 1100000 : 1380000,
      caution_provisoire: i ? 150000 : 28000,
      currency: "MAD",
      evidence,
    })),
    requirements: {
      ADMINISTRATIF: [
        {
          type: "ATTESTATION_FISCALE",
          label: "Attestation fiscale en cours de validité",
          lot_number: "1",
          mandatory: true,
          evidence,
        },
        {
          type: "CNSS",
          label: "Attestation CNSS",
          lot_number: "1",
          mandatory: true,
          evidence,
        },
      ],
      TECHNIQUE: [
        {
          type: "SIMILAR_REFERENCES",
          label: "Références de travaux similaires",
          lot_number: "1",
          mandatory: true,
          evidence,
        },
      ],
    },
    facts: {},
    documents: [
      {
        id: 1,
        filename: evidence.filename,
        document_type: "RC",
        extension: "pdf",
        size_bytes: null,
      },
    ],
  };
}
function register(key: string, lot: string) {
  return (qualifications[key] ??= [
    "Attestation fiscale",
    "Attestation CNSS",
    "Références similaires",
  ].map((label, i) => ({
    source_requirement_id: i + 1,
    requirement_type: ["ATTESTATION_FISCALE", "CNSS", "SIMILAR_REFERENCES"][i],
    label,
    category: i === 2 ? "TECHNIQUE" : "ADMINISTRATIF",
    source_group: i === 2 ? "TECHNIQUE" : "ADMINISTRATIF",
    source_lot_number: lot,
    selected_lot_number: lot,
    scope: "LOT",
    scope_confirmed: true,
    mandatory_from_extraction: true,
    qualification: i === 0 ? "REQUIRED" : "TO_QUALIFY",
    qualification_revision: i === 0 ? 1 : 0,
    qualification_recorded: i === 0,
    scope_reviewed: true,
    qualification_updated_by: i === 0 ? 1 : null,
    qualification_updated_at: i === 0 ? timestamp : null,
    document_status: "NO_DOCUMENT",
    source: {
      document_id: 1,
      document_type: "RC",
      filename: evidence.filename,
      page: 8,
      snippet: evidence.snippet,
    },
  })));
}
const envelope = (data: unknown) => ({
  data,
  meta: { request_id: "LOCAL-DEMO" },
});
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function handle(url: URL, init?: RequestInit): Response {
  const path = url.pathname;
  const method = init?.method ?? "GET";
  const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
  if (path === "/api/v4/company/rematch/status")
    return response(envelope({ state: "IDLE" }));
  if (path === "/api/v4/company/profile") {
    if (method === "PATCH") Object.assign(profile, body);
    return response(envelope(profile));
  }
  if (path === "/api/v4/company/workspace")
    return response(
      envelope({
        profile,
        summary: {
          profile_completion_percent: 72,
          documents_total: 0,
          documents_uploaded: 0,
          documents_without_file: 0,
          documents_analyzed: 0,
          documents_validated: 0,
          documents_expired: 0,
          documents_with_future_validity: 0,
          certifications_total: 0,
          equipment_total: 0,
          personnel_total: 0,
          references_total: 0,
        },
        alerts: [
          {
            level: "VERIFY",
            code: "DEMO",
            message:
              "Exemple : ajoutez vos justificatifs et références pour préciser les correspondances.",
          },
        ],
        documents: [],
        certifications: [],
        equipment: [],
        personnel: [],
        references: [],
        matching_parameters: [],
      }),
    );
  if (path === "/api/v4/intelligence/strategy")
    return response(
      envelope({
        company: profile.company_name,
        activity_domains: profile.activity_domains,
        covered_regions: profile.covered_regions,
        current_caution_capacity: profile.caution_capacity,
        scope: "Périmètre illustratif — 6 marchés fictifs",
        ao_in_scope: 6,
        current_position: { without_reserve: 2, conditional: 2, blocked: 1 },
        blocking_causes: [{ code: "CAUTION", ao_count: 1 }],
        verification_causes: [{ code: "ATTESTATION_FISCALE", ao_count: 2 }],
        caution_scenarios: [
          {
            ceiling: 180000,
            additional_capacity: 60000,
            newly_unblocked_ao: 1,
            without_reserve: 3,
            conditional: 2,
            blocked: 0,
            opportunities: [
              {
                ref: "DEMO-001",
                org: "DEMO",
                title: demoOpportunities[0].title,
                new_state: "VERIFY",
                reviews: ["ATTESTATION_FISCALE"],
              },
            ],
          },
        ],
        limitations: [
          "Scénario de démonstration, sans valeur prédictive.",
          "La capacité de caution ne couvre pas toutes les conditions de participation.",
        ],
      }),
    );
  if (path === "/api/v4/opportunities") {
    let items = [...demoOpportunities];
    const q = url.searchParams.get("q")?.toLowerCase();
    const region = url.searchParams.get("location")?.toLowerCase();
    const match = url.searchParams.get("matching_status");
    const category = url.searchParams.get("category");
    if (q)
      items = items.filter((x) =>
        `${x.title} ${x.buyer} ${x.reference}`.toLowerCase().includes(q),
      );
    if (region)
      items = items.filter((x) => x.location?.toLowerCase().includes(region));
    if (category) items = items.filter((x) => x.category === category);
    if (match)
      items = items.filter((x) =>
        match === "ACTIONABLE"
          ? ["OK", "VERIFY"].includes(x.matching.computed_status)
          : match === "STALE"
            ? x.matching.freshness === "STALE"
            : x.matching.computed_status === match,
      );
    const sort = url.searchParams.get("sort");
    if (sort === "deadline_desc") items.reverse();
    if (sort === "mor_priority") {
      const rank: Record<string, number> = {
        OK: 0,
        VERIFY: 1,
        BLOCKING: 2,
        UNKNOWN: 3,
      };
      items.sort(
        (a, b) =>
          rank[a.matching.computed_status] - rank[b.matching.computed_status],
      );
    }
    const page = Number(url.searchParams.get("page") ?? 1);
    const size = Number(url.searchParams.get("page_size") ?? 25);
    return response({
      data: items.slice((page - 1) * size, page * size),
      meta: {
        pagination: {
          page,
          page_size: size,
          total: items.length,
          total_pages: Math.ceil(items.length / size),
        },
        request_id: "LOCAL-DEMO",
        data_updated_at: timestamp,
        portfolio_summary: {
          ok: 2,
          verify: 2,
          blocking: 1,
          partial: 0,
          stale: 1,
          unknown: 1,
        },
      },
    });
  }
  const opportunity = path.match(
    /^\/api\/v4\/opportunities\/([^/]+)\/([^/]+)(.*)$/,
  );
  if (opportunity) {
    const [, ref, , suffix] = opportunity;
    if (!detail(ref)) return response({ error: "Exemple introuvable" }, 404);
    if (!suffix) return response(envelope(detail(ref)));
    if (suffix === "/lot-decisions")
      return response(
        envelope({
          decisions: Object.values(decisions[ref] ?? {}),
          valid_lots: ["1", "2"],
          scope: {
            kind: "LOTS",
            selectable_lots: ["1", "2"],
            review_lots: [],
            reason: "Exemple multi-lots",
          },
        }),
      );
    const decision = suffix.match(/^\/lots\/([^/]+)\/decision$/);
    if (decision && method === "PATCH") {
      const lot = decision[1];
      if (
        !["1", "2"].includes(lot) ||
        !["GO", "LATER", "NO_GO"].includes(body.decision)
      )
        return response({}, 422);
      const record = {
        lot_number: lot,
        decision: body.decision,
        reason: body.reason,
        actor_user_id: 1,
        created_at: timestamp,
        updated_at: new Date().toISOString(),
      };
      (decisions[ref] ??= {})[lot] = record;
      return response(envelope(record));
    }
  }
  const prepare = path.match(
    /^\/api\/v5\/prepare\/([^/]+)\/([^/]+)\/lots\/([^/]+)(.*)$/,
  );
  if (prepare) {
    const [, ref, org, lot, suffix] = prepare;
    const key = `${ref}/${org}/${lot}`;
    if (decisions[ref]?.[lot]?.decision !== "GO")
      return response({ error: "Participation GO requise" }, 403);
    if (suffix === "/access")
      return response(
        envelope({
          allowed: true,
          ref_consultation: ref,
          org_acronyme: org,
          lot_number: lot,
          decision: "GO",
        }),
      );
    const requirements = register(key, lot);
    if (suffix === "/requirements")
      return response(
        envelope({
          ref_consultation: ref,
          org_acronyme: org,
          lot_number: lot,
          requirements,
          summary: {
            candidate_count: requirements.length,
            required_count: requirements.filter(
              (x) => x.qualification === "REQUIRED",
            ).length,
            optional_count: 0,
            not_applicable_count: 0,
            to_qualify_count: requirements.filter(
              (x) => x.qualification === "TO_QUALIFY",
            ).length,
            common_scope_to_verify: 0,
            other_conditions_not_converted: 0,
            confirmed_mandatory_count: null,
            validated_count: null,
            completion_percent: null,
          },
        }),
      );
    const requirement = suffix.match(/^\/requirements\/(\d+)\/(.*)$/);
    if (requirement) {
      const id = Number(requirement[1]);
      const action = requirement[2];
      const item = requirements.find((x) => x.source_requirement_id === id);
      if (!item) return response({}, 404);
      const itemKey = `${key}/${id}`;
      if (action === "summary")
        return response(
          envelope({
            total: requirements.length,
            ready: false,
            counters: {},
            items: requirements.map((x) => {
              const v = versions[`${key}/${x.source_requirement_id}`] ?? [];
              const accepted = v.some(
                (y) =>
                  reviews[`${key}/${x.source_requirement_id}/${y.id}`]
                    ?.current_decision === "ACCEPTED",
              );
              return {
                ...x,
                management_type: "DOCUMENT",
                scope_status: "LOT",
                source_mandatory: 1,
                source_page: 8,
                state:
                  x.qualification === "TO_QUALIFY"
                    ? "TO_QUALIFY"
                    : accepted
                      ? "ACCEPTED"
                      : v.length
                        ? "PENDING_REVIEW"
                        : "MISSING",
                document_state: accepted
                  ? "ACCEPTED"
                  : v.length
                    ? "PENDING_REVIEW"
                    : "NO_DOCUMENT",
                scope_uncertain: false,
                needs_scope_review: false,
                version_count: v.length,
                accepted_version_exists: accepted,
              };
            }),
          }),
        );
      if (action === "qualification" && method === "PATCH") {
        if (body.expected_revision !== item.qualification_revision)
          return response({}, 409);
        item.qualification = body.status;
        item.qualification_revision++;
        item.qualification_recorded = true;
        item.scope_reviewed = body.scope_reviewed;
        (histories[itemKey] ??= []).push({
          id: Date.now(),
          new_status: body.status,
          new_revision: item.qualification_revision,
          previous_revision: body.expected_revision,
          justification: body.justification,
          recorded_at: new Date().toISOString(),
          actor_user_id: 1,
          reviewed_excerpt: body.reviewed_excerpt,
          scope_reviewed: true,
        });
        return response(
          envelope({
            id,
            source_requirement_id: id,
            lot_number: lot,
            status: item.qualification,
            revision: item.qualification_revision,
            scope_reviewed: item.scope_reviewed,
            updated_by: 1,
          }),
        );
      }
      if (action === "history")
        return response(
          envelope({
            source_requirement_id: id,
            current_status: item.qualification,
            current_revision: item.qualification_revision,
            events: histories[itemKey] ?? [],
            pagination: { limit: 25, offset: 0, has_more: false },
          }),
        );
      if (action === "documents") {
        if (method === "POST") {
          const v = {
            id: Date.now(),
            version_number: (versions[itemKey]?.length ?? 0) + 1,
            original_filename:
              new Headers(init?.headers).get("X-MOR-Filename") ??
              "Document démo",
            mime_type: new Headers(init?.headers).get("Content-Type"),
            file_size: init?.body instanceof Blob ? init.body.size : 0,
            uploaded_at: new Date().toISOString(),
            uploaded_by: 1,
            download_url:
              init?.body instanceof Blob
                ? URL.createObjectURL(init.body)
                : null,
          };
          (versions[itemKey] ??= []).push(v);
          return response(envelope(v));
        }
        return response(envelope(versions[itemKey] ?? []));
      }
      const review = action.match(/^documents\/(\d+)\/reviews$/);
      if (review) {
        const reviewKey = `${itemKey}/${review[1]}`;
        const state = (reviews[reviewKey] ??= {
          current_decision: "PENDING_REVIEW",
          current_revision: 0,
          history: [],
        });
        if (method === "POST") {
          if (body.expected_revision !== state.current_revision)
            return response({}, 409);
          state.current_revision++;
          state.current_decision = body.decision;
          state.history.push({
            id: Date.now(),
            review_revision: state.current_revision,
            decision: body.decision,
            justification: body.justification,
            reviewed_by: 1,
            reviewed_at: new Date().toISOString(),
          });
        }
        return response(envelope(state));
      }
    }
  }
  const submission = path.match(
    /^\/api\/v5\/submissions\/([^/]+)\/([^/]+)\/lots\/([^/]+)(\/cancel)?$/,
  );
  if (submission) {
    const [, ref, org, lot, cancel] = submission;
    const key = `${ref}/${org}/${lot}`;
    const state = (submissions[key] ??= {
      submission: null,
      events: [],
      status: "NOT_DECLARED",
    });
    if (method === "POST") {
      if (body.expected_revision !== (state.submission?.revision ?? 0))
        return response({}, 409);
      const previous = state.status;
      state.status = cancel ? "CANCELLED" : "DECLARED";
      state.submission = {
        ...state.submission,
        id: 1,
        company_id: 1,
        ref_consultation: ref,
        org_acronyme: org,
        lot_number: lot,
        status: state.status,
        declared_submitted_at:
          body.declared_submitted_at ?? state.submission?.declared_submitted_at,
        submission_reference:
          body.submission_reference ?? state.submission?.submission_reference,
        submission_notes: body.submission_notes ?? null,
        revision: Number(state.submission?.revision ?? 0) + 1,
        declared_by: 1,
        updated_at: new Date().toISOString(),
        created_at: timestamp,
      };
      const event = {
        id: Date.now(),
        event_type: cancel
          ? "CANCELLED"
          : previous === "DECLARED"
            ? "UPDATED"
            : "DECLARED",
        previous_state_json: JSON.stringify({ status: previous }),
        new_state_json: JSON.stringify(state.submission),
        actor_id: 1,
        event_at: new Date().toISOString(),
      };
      state.events.push(event);
      return response(
        envelope({
          submission: state.submission,
          event_type: event.event_type,
          revision: state.submission.revision,
        }),
      );
    }
    return response(
      envelope({
        ref_consultation: ref,
        org_acronyme: org,
        lot_number: lot,
        ...state,
        legacy_submission: null,
      }),
    );
  }
  if (path === "/api/v5/dossiers/overview") {
    const items = Object.entries(decisions).flatMap(([ref, lots]) =>
      Object.values(lots)
        .filter((x) => x.decision === "GO")
        .map((x) => {
          const ao = demoOpportunities.find((y) => y.ref_consultation === ref)!;
          const s = submissions[`${ref}/DEMO/${x.lot_number}`];
          return {
            ...ao,
            lot_number: x.lot_number,
            stage: s?.status === "DECLARED" ? "SUBMITTED" : "PREPARATION",
            last_modified_at: x.updated_at,
            submitted_at: s?.submission?.declared_submitted_at,
          };
        }),
    );
    return response({ items, total: items.length, page: 1, page_size: 100 });
  }
  return response(
    {
      error:
        "Cette opération n'est pas simulée. Aucun appel réel n'a été envoyé.",
    },
    501,
  );
}
export function installDemoTransport() {
  if (!demoEnabled) return;
  sessionStorage.setItem("mor-demo", "1");
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      location.origin,
    );
    if (url.origin === location.origin && url.pathname.startsWith("/api/")) {
      await new Promise((resolve) => setTimeout(resolve, 180));
      return handle(url, init);
    }
    return original(input, init);
  };
}
