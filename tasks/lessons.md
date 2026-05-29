# tasks/lessons.md — AzMap

Purpose:
Capture durable engineering lessons, architectural insights, implementation mistakes, and conceptual understanding gained during development.

This file is:
- engineering memory
- architectural memory
- implementation guidance
- anti-regression guidance
- learning reinforcement

Update this file whenever:
- an important mistake is corrected
- a design assumption changes
- a better architectural approach is discovered
- a workflow improvement is identified
- a new engineering concept becomes understood

---

# Core Principles

- Lessons should be durable and reusable
- Focus on engineering understanding, not session history
- Capture why something mattered
- Capture what initially seemed correct but was wrong
- Prefer distilled insights over raw notes

---

# Session Workflow Lessons

## Wait for user confirmation before committing

After implementing a change, describe what to test and wait for explicit confirmation
that it works before running `git commit`.

Do not pre-emptively commit.

---

## Confirm repo and branch before touching any file

At session start:
- run `git status`
- run `git branch`

Confirm the correct repo and branch before proceeding.

---

## Check CHG number from CHANGELOG.md before writing any entry

Search CHANGELOG.md for the latest CHG number before writing a new entry.

Never assume numbering from memory.

---

## Scope work to what fits within remaining session limits

If context is running low:
- reduce scope
- complete cleanly
- avoid partial architectural implementations

A clean small change is better than a fragmented large one.

---

# Documentation Governance Lessons

## Lock architectural decisions before the session ends

Any locked architectural decision must be added to:
- CLAUDE.md
- DECISIONS.md

Decisions that exist only in chat are effectively lost.

---

## Keep documentation synchronized with architecture

Any session that changes:
- topology contracts
- relationship behavior
- protection models
- traversal logic
- overlay behavior
- rendering ownership

must update:
- DECISIONS.md
- FILES_OF_INTEREST.md
- CHANGE_IMPACT_MAP.md
- CHANGELOG.md

Documentation drift creates architectural drift.

---

# Engineering Lessons

## Read the actual source before writing integration code

Never write integration code until:
- the actual API shape
- source format
- documentation
- contracts

have been verified directly.

Do not guess shapes.

---

## Verify API response envelopes before writing client code

Inspect raw API responses first.

Do not assume:
- `.data`
- `.items`
- `.records`

or similar wrappers exist without verification.

---

## Per-item API calls must be isolated

A single item failure must not abort an entire batch operation.

Per-item integrations should:
- isolate failures
- continue processing
- log failures clearly

---

## Resolve stable values once before loops

Resolve:
- IDs
- configuration
- profiles
- static references

once before entering loops.

Avoid repeated resolution inside iterative operations.

---

## New persistent schema fields require compatibility planning

Any new stored field must consider:
- backward compatibility
- fallback behavior
- historical persistence

Treat stored data as immutable historical state.

---

## New integrations should default to restrictive behavior

New integrations or data sources should:
- default to disabled
- require explicit enablement
- avoid production-impacting behavior by default

---

# Architecture Lessons

## The canonical graph is the system

The graph is not just a storage structure.

It is:
- the infrastructure truth model
- the relationship authority
- the traversal authority
- the projection source
- the overlay foundation

Everything derives from it.

---

## Relationship ownership must remain centralized

Relationship logic scattered across:
- UI
- rendering
- exports
- overlays

creates inconsistent topology reasoning.

Relationship ownership belongs in normalization/graph layers.

---

## Views are projections, not owners

Topology views should:
- consume projections
- never own infrastructure truth
- never recompute topology independently

---

## Imported topology should remain immutable

Imported Azure payloads are baseline truth.

Simulations, overlays, and analytical systems should compose state on top rather than mutate imported topology.

This preserves:
- determinism
- replayability
- analytical consistency

---

## Overlay systems are analytical layers

BCP/DR, SPOF, security, and compliance systems should behave as overlays rather than alternate graph implementations.

This prevents topology corruption.

---

## Avoid parallel traversal systems

Traversal logic duplicated across:
- overlays
- exports
- rendering
- governance systems

will eventually diverge.

Traversal ownership should remain centralized.

---

## Progressive rendering scales better than full-environment rendering

Large Azure environments should progressively expose topology layers.

Avoid rendering entire environments simultaneously when projections can scope visibility.

---

# Mistakes & Anti-Patterns

## Things that initially seem correct but are usually wrong

- Recomputing topology inside UI components
- Mutating imported topology directly
- Embedding rendering assumptions into normalization
- Duplicating traversal logic
- Creating secondary relationship systems
- Premature abstractions before ownership is understood
- Combining overlays with canonical graph ownership
- Adding state before ownership boundaries are clear

---

# Azure & Infrastructure Lessons

## ARM resource ID anatomy

Every Azure resource has a fully-qualified ARM resource ID of the form:

```
/subscriptions/{subscriptionId}
/resourceGroups/{resourceGroupName}
/providers/{namespace}/{type}/{name}
[/{childType}/{childName}]
```

Key facts:
- The `/providers/` segment separates the organisational context from the resource type.
- The `{namespace}/{type}` segment (e.g. `microsoft.network/virtualnetworks`) is the ARM type string, always used lowercased in AzMap.
- Child resources (e.g. `/providers/microsoft.sql/servers/sql1/databases/db1`) extend the path with additional `/{type}/{name}` segments.
- The same resource may appear with different casing in different API responses — always lowercase before comparing or storing.

---

## The Azure export envelope problem

Azure tooling wraps resource arrays in different shapes depending on which tool produced the export:

| Shape | Produced by |
|---|---|
| Raw array `[...]` | `az resource list`, `az graph query --query data` |
| `{ "resources": [...] }` | ARM template format (`azuredeploy.json`) |
| `{ "value": [...] }` | ARM REST API list responses |
| Single object `{ "id": ..., "type": ... }` | Single resource paste from portal or CLI |

Always detect the envelope before extracting resources. In AzMap, `extractResources()` handles all four shapes. Do not assume the input is always a plain array.

---

## Subnets are embedded, not top-level resources

Azure's REST API and `az network vnet list` return subnets embedded inside the VNet payload under `properties.subnets[]`. They are **not** separate top-level resources in a standard export. This means:

- Subnet nodes must be extracted from VNet payloads, not from the top-level resource list.
- If a user exports only their NICs and not their VNets, no Subnet nodes will exist in the graph — NIC → Subnet edges will reference missing nodes.
- The normalizer handles this by extracting Subnet nodes from VNet payloads in Pass 1, before NIC edges are created in Pass 2.

---

## Two-pass normalization: why Pass 2 exists

A single-pass normalizer cannot safely create cross-resource edges because the resource array has no guaranteed ordering. A NIC might appear before its VNet (and thus before the Subnet nodes embedded in that VNet).

The solution is two passes:
- **Pass 1** — create all nodes first. Every resource gets a node. VNet subnets are materialized from VNet payloads in this pass.
- **Pass 2** — create cross-resource edges after all nodes exist. NIC → Subnet edges are safe to create because all Subnet nodes already exist regardless of where the VNet appeared in the input.

This pattern generalizes: any relationship that references another resource belongs in Pass 2. Any relationship derivable from a single resource's own properties belongs in Pass 1 (via `extractNetworkRelationships`).

---

## Lazy hierarchy materialization pattern

Azure exports contain leaf resources (VMs, NICs, etc.) but not the hierarchy containers (Subscription, Region, ResourceGroup) as separate JSON objects. AzMap creates these synthetic nodes on-demand using the `ensureSubscription`, `ensureRegion`, and `ensureResourceGroup` functions.

The pattern:
1. Check if the node already exists in the map.
2. If not, create it and add it — including Contains edges up to its parent (which is also ensured recursively).
3. Return the node ID so the caller can immediately wire up a child Contains edge.

Because both `addNode` and `addEdge` are write-once (only insert if ID absent), calling `ensureSubscription('abc')` 100 times for 100 resources in the same subscription creates exactly one node. This is idempotent materialization — efficient and safe.

---

## LB backend pool ID parsing

A NIC's `ipConfigurations[].properties.loadBalancerBackendAddressPools[].id` points to a **pool** resource, not the Load Balancer itself:

```
/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.network/loadBalancers/{lbName}/backendAddressPools/{poolName}
```

To get the LB's own resource ID, split on `/backendaddresspools/` (lowercased) and take the prefix. The individual pool is not a useful topology node — the LB is.

---

## Azure resource containment: what lives where

Azure has two distinct containment concepts that must not be conflated:

**Structural containment** (a resource cannot exist without its parent):
- VNet → Subnet (Subnet is a sub-resource of VNet; has no independent lifecycle)

**Ownership containment** (a resource belongs to a container but is independently manageable):
- ResourceGroup → VirtualMachine, NetworkInterface, NetworkSecurityGroup, VirtualNetwork, etc.

An NSG is **not** contained by the Subnet it secures. It is a separate resource in the RG that can be associated and dissociated from any subnet. The relationship is `SecuredBy`, not `Contains`.

A VM does **not** connect directly to a subnet. The NIC does. The NIC holds the private IP from the subnet's address space. The VM attaches to the NIC via `AttachedTo`.

Layout containment must reflect these ownership rules: NSG/VM/NIC belong in the RG container, not in the Subnet or VNet.

---

## Regions are a global Azure concept, not a subscription sub-resource

In Azure's resource model, a "region" is a physical data centre location. It is not owned by any subscription. Resources in a region are owned by subscriptions, not the other way around.

For the AzMap visual model:
- The subscription is the outer layout container (billing/RBAC boundary)
- Regions are column labels within the subscription context
- When a second subscription is imported, it adds a new swimlane row — regions appear again as labels within that row, which is correct and intentional

Avoid modelling regions as globally shared containers that span subscriptions. That would conflate a deployment location with a governance boundary.

---

## Symmetric container overhang in React Flow requires height derivation from content, not from child dims

When a child node needs to protrude `OVERHANG` pixels above and below its parent:

- Child height = `content_h + 2 × OVERHANG`
- Parent height = `content_h` (derived from content directly, **not** from child dims)
- Child `y` within parent = `-OVERHANG`

If the parent's height is derived from the child's dims (the natural bottom-up approach), the parent inherits the inflated height and the child no longer protrudes below — only above. The fix is to compute the parent's height from the *uninflated* content value and subtract the overhang before storing it in the parent's size cache.

The `isRegionColumn()` check in the swimlane dims function exists for exactly this reason: it strips `2 × REGION_OVERHANG` from each region child's height before computing `innerH` for the swimlane.

---

## React Flow handle position carries visual semantic meaning

Handle position in React Flow affects where edges terminate visually. This can be used intentionally:

- **Centred handle** (`top: 50%, left: 50%`): edge appears to enter the interior of the box. Use for "attached to / lives inside" relationships.
- **Border handle** (default `Position.Bottom`): edge exits the outer wall. Use for "governs / enforces boundary" relationships.

Omitting `extent: 'parent'` on a child node allows it to overflow the parent's React Flow bounds without being clipped — essential for region overhang. The parent component must not use `overflow-hidden` CSS for this to work.

---

## Canvas-level peering bus zone: busY must be an absolute coordinate

When multiple peering edges need parallel horizontal bus lanes, the bus Y must be an **absolute canvas coordinate** computed in the layout phase — not derived from handle Y positions at edge render time.

Computing bus Y as `min(sourceY, targetY) - LIFT` at render time places the bus just above the nearest VNet handle, which is deep inside the card hierarchy. Enclosing cards (RG → Region → Swimlane) each have headers, so the bus segment intersects those header bars.

The correct pattern:
1. `peeringBusZoneHeight = PAD × 2 + numPeeringEdges × LANE_STEP` — zero when no peering
2. Offset swimlanes down by `mgSectionHeight + peeringBusZoneHeight` (not just `mgSectionHeight`)
3. Set `data.busY = busOriginY + laneIndex × LANE_STEP` on each peering edge in the layout pass
4. `PeeringEdge` reads `data.busY` directly and draws a ⊓-shaped path — it never re-derives busY

This follows the same pattern as `mgSectionHeight`: a reserved canvas region whose height is derived from graph data and propagated to both the layout offset and each edge's data payload. `busOriginY` is the single source of truth.

---

## EdgeLabelRenderer is required for HTML-layer edge labels

React Flow's DOM stacking order:
```
SVG layer (edges)          ← bottom
HTML layer (node cards)
EdgeLabelRenderer portal   ← top
```

Labels rendered in SVG (the default React Flow `label` prop on standard edges) are **behind** HTML node cards. Any label that overlaps a card body or header will be hidden behind it.

`EdgeLabelRenderer` renders labels in an HTML portal that sits above all node cards. Every custom edge type that has a visible label must use `EdgeLabelRenderer`. Position the label div with `position: absolute; transform: translate(-50%, -50%) translate(${x}px, ${y}px)`. Add `pointerEvents: 'none'` so the label does not intercept clicks meant for the canvas.

---

## Per-peer VNet handle naming and canonical edge direction

Each VNet needs one `(source + target)` handle pair per peer, spread evenly across the top edge. Key decisions:

- **Sort `peerIds` alphabetically** before computing positions so the horizontal spread is stable regardless of edge insertion order.
- **Handle IDs**: `peer-src-{peerId}` (`type="source"`) and `peer-tgt-{peerId}` (`type="target"`). The prefix distinguishes role; the suffix is the remote VNet's node ID.
- **Canonical edge direction**: always assign `source = min(a, b)` and `target = max(a, b)` by string comparison when building peering edges. This guarantees that for any pair (A, B), node A always carries `peer-src-B` and node B always carries `peer-tgt-A`, regardless of which Azure-side of the peering the export captured.
- **`peerIds` is layout-phase data**: `Topology.tsx` builds `vnetPeerMap` from `subEdges` and injects `peerIds` into VNet node data as `finalLayoutNodes`. `AzureContainer` is a pure renderer — it must not derive peer relationships independently (this would violate the no-business-logic-in-presentation-layer rule).

---

## Azure relationships are more important than individual resources

The value of AzMap is not simply listing Azure resources.

The value comes from:
- relationships
- dependencies
- topology structure
- connectivity reasoning
- governance visibility

Relationship quality matters more than raw inventory size.

---

## Connectivity analysis requires layered reasoning

End-to-end flow analysis depends on:
- routing
- NSGs
- firewall policy
- peering
- identity boundaries
- topology traversal

This should evolve incrementally rather than being implemented prematurely.

---

## Governance overlays should remain explainable

CAF/WAF/compliance overlays should:
- explain reasoning
- expose assumptions
- remain traceable

Avoid opaque scoring systems.

---

# DevOps & Workflow Lessons

## Architectural sequencing matters

Advanced features should not begin before foundational contracts stabilize.

Examples:
- overlays
- simulations
- advanced exports
- connectivity analysis

all depend on:
- stable graph contracts
- stable traversal systems
- stable projections

---

## Clean architecture reduces AI drift

Strong:
- ownership boundaries
- documentation
- layer separation
- governance rules

significantly improve AI-assisted engineering consistency.

---

# Concepts To Revisit Later

These concepts are important but should not necessarily be implemented immediately.

---

## Potential Future Topics

- Graph databases
- CQRS
- Event sourcing
- Distributed caching
- Worker orchestration
- Async processing pipelines
- Incremental graph updates
- Background topology indexing
- Real-time topology updates
- Policy engines
- Graph query languages

---

# Question → Answer → Why It Matters

Use this structure when adding future lessons.

Example:

## Question
Why should overlays avoid mutating topology?

### Answer
Because overlays represent analytical perspectives rather than infrastructure truth.

### Why It Matters
Mutating baseline topology creates inconsistent traversal behavior, invalid exports, and unreliable simulations.

---

# Final Guidance

The objective of this file is not to record activity.

The objective is to accumulate engineering understanding over time.

Good engineering organizations institutionalize lessons.

This file is the beginning of that process for AzMap.