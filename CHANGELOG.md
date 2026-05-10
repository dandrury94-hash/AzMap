# CHANGELOG.md — AzMap

Purpose:
Track meaningful architectural, engineering, governance, and implementation changes across the project.

This file acts as:
- engineering history
- architectural timeline
- session continuity
- implementation audit trail
- AI context preservation

Every meaningful change should be recorded here before work is considered complete.

---

# Entry Rules

Each entry should include:
- unique CHG number
- date
- concise title
- summary
- rationale
- affected files
- architectural impact
- validation/testing guidance
- follow-up work if relevant

---

# Entry Format

## CHG-XXX — YYYY-MM-DD — Short Title

### Summary
What changed.

### Why
Why the change was necessary.

### Files Affected
- `path/to/file`

### Architectural Impact
What systems, layers, or behaviors are affected.

### Validation
What should be verified or tested.

### Follow-Up Work
Optional future work or known next steps.

---

# Change History

## CHG-001 — 2026-05-10 — Repository Governance Foundations

### Summary
Established foundational architectural governance, workflow standards, AI operational guidance, implementation sequencing, and engineering learning structures for AzMap.

Expanded and standardized:
- governance documentation
- architectural ownership rules
- graph-centric architectural direction
- implementation workflow guidance
- architectural blast-radius documentation
- learning continuity systems

### Why
AzMap is intended to evolve into a graph-centric Azure topology analysis platform with overlays, traversal systems, exports, and governance analysis.

Strong foundational governance was established before implementation work to:
- reduce architectural drift
- improve AI-assisted engineering consistency
- preserve deterministic architecture evolution
- enforce ownership boundaries
- improve long-term maintainability
- support structured engineering learning

### Files Affected
- `MASTER_PROJECT_BRIEF.md`
- `CLAUDE.md`
- `DECISIONS.md`
- `CHANGE_IMPACT_MAP.md`
- `FILES_OF_INTEREST.md`
- `tasks/todo.md`
- `tasks/lessons.md`
- `CHANGELOG.md`

### Architectural Impact
Defined:
- canonical graph ownership
- immutable topology philosophy
- overlay/simulation constraints
- traversal ownership boundaries
- rendering ownership boundaries
- progressive rendering direction
- documentation governance
- architectural sequencing expectations

Established the governance foundation that future implementation work will derive from.

### Validation
Verify:
- all governance documents are internally consistent
- architectural responsibilities are clearly separated
- no contradictory ownership rules exist
- implementation sequencing aligns with todo phases
- documentation references remain accurate

### Follow-Up Work
Next implementation phase:
- repository scaffolding
- frontend/backend initialization
- domain model definition
- canonical graph contracts
- initial import pipeline

---

## CHG-002 — 2026-05-10 — V1 Architectural Decisions (ADR-010 through ADR-014)

### Summary
Recorded five concrete architectural decisions that close the gap between governance foundations (CHG-001) and implementation readiness.

- **ADR-010** — V1 canonical graph contracts (`GraphNode`, `GraphEdge`) defined in TypeScript before any import or normalization code is written. Graph model explicitly decoupled from SQLite persistence.
- **ADR-011** — Vite chosen over Next.js. AzMap is a local-first tool with no SSR requirements. Next.js complexity is not justified.
- **ADR-012** — React Flow + dagre chosen for rendering. ELK deferred until topology complexity demands it.
- **ADR-013** — pnpm workspaces chosen for monorepo structure. Shared canonical graph contracts must live in a shared package imported by both frontend and backend. Turborepo/NX deferred.
- **ADR-014** — `System_Prompt.md` removed. CLAUDE.md is the single Claude Code operating document. Duplicate governance sources are forbidden.

### Why
These decisions resolve the key pre-implementation questions identified during architectural review:
- graph contracts must exist before normalization code can be written
- frontend framework selection affects all subsequent scaffolding
- monorepo structure must be established before any packages are initialized
- governance duplication introduces drift risk

### Files Affected
- `DECISIONS.md` (ADR-010 through ADR-014 appended)
- `MASTER_PROJECT_BRIEF.md` (section 9 updated: Next.js → Vite + dagre)
- `System_Prompt.md` (deleted)

### Architectural Impact
- `GraphNode` and `GraphEdge` are now the stable V1 graph contracts. Normalization must produce these. Rendering must consume these.
- `ResourceType` and `RelationshipType` enumerations must be defined centrally in the shared package.
- Frontend scaffolding starts with Vite, not Next.js.
- All shared TypeScript types belong in the pnpm shared workspace package.

### Validation
- DECISIONS.md contains no contradictions between ADR-001–014
- MASTER_PROJECT_BRIEF.md section 9 reflects Vite + dagre
- System_Prompt.md no longer exists in the repository

### Follow-Up Work
- Initialize repository structure (pnpm workspace root, `packages/shared`, `apps/frontend`, `apps/backend`)
- Define `ResourceType` and `RelationshipType` enumerations in shared package
- Scaffold Vite + React + TypeScript frontend
- Scaffold Node.js + TypeScript backend

---

# Future Guidance

Avoid vague changelog entries.

Good entries explain:
- what changed
- why it mattered
- what architectural assumptions changed
- what future sessions should understand

This file is both engineering history and architectural memory.