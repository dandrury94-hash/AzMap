import type { ResourceType } from './resources'
import type { RelationshipType } from './relationships'

/**
 * A node in the canonical resource graph — one record per Azure resource (or
 * synthetic grouping node such as a Subscription, Region, or ResourceGroup).
 *
 * Design notes:
 *
 * - `id` is always a lowercased ARM resource ID, e.g.
 *   `/subscriptions/abc/resourcegroups/rg1/providers/microsoft.network/virtualnetworks/vnet1`.
 *   Case-normalisation ensures that two references to the same resource always
 *   produce the same node ID regardless of how Azure returned the casing.
 *
 * - Synthetic nodes (Subscription, Region, ResourceGroup) use stable prefixed IDs
 *   rather than ARM IDs because they are created by the normalizer from context,
 *   not from a directly imported resource payload:
 *     - Subscription: `sub-{subscriptionId}`
 *     - Region: `region-{subscriptionId}-{location}`
 *     - ResourceGroup: `rg-{subscriptionId}-{rgName}`
 *
 * - `rawPayload` preserves the original Azure API response for the resource.
 *   It is never modified by the normalizer (ADR-002: Hybrid Modeling Strategy).
 *   Future normalization passes, export tools, or debugging views can read the
 *   original shape without re-importing the file.
 *
 * - `metadata` is a typed escape hatch for data that is useful but does not yet
 *   have a first-class field — e.g. a NIC's private IP, a subnet's address prefix,
 *   or a region's paired-region name. Keeps the core contract stable while
 *   allowing incremental enrichment.
 */
export type GraphNode = {
  /** Canonical, lowercased ARM resource ID (or synthetic prefixed ID). */
  id: string

  /** Resource category. Determines rendering, icon, and colour. */
  type: ResourceType

  /** Human-readable resource name (last segment of the ARM ID). */
  name: string

  /** Azure subscription GUID this resource belongs to. */
  subscriptionId?: string

  /** Lowercased resource group name this resource belongs to. */
  resourceGroup?: string

  /** Lowercased Azure region name (e.g. 'uksouth', 'eastus'). */
  location?: string

  /** Azure tags attached to the resource at import time. */
  tags?: Record<string, string>

  /**
   * Loosely-typed bucket for resource-specific supplementary data.
   * Examples: `{ privateIp: '10.0.0.4' }`, `{ addressPrefix: '10.0.1.0/24' }`.
   * Prefer promoting stable fields to first-class properties over time.
   */
  metadata?: Record<string, unknown>

  /**
   * The original Azure API response, preserved verbatim.
   * Never modified post-import (ADR-002). Used for debugging, re-normalization,
   * and the Node Detail Panel in the UI.
   */
  rawPayload?: unknown
}

/**
 * A directed edge in the canonical resource graph — one record per relationship
 * between two resources.
 *
 * Design notes:
 *
 * - Edges are first-class entities (ADR-004), not inferred dynamically by UI
 *   components or rendering layers. All topology reasoning must flow through edges.
 *
 * - `id` is deterministic: the same source/target/relationship always produces
 *   the same edge ID, making import idempotent (re-importing the same file
 *   produces the same graph, not a growing one).
 *
 * - The edge model is directed: `source → target`. Direction carries semantic
 *   meaning that varies by relationship type — see `RelationshipType` for details.
 *
 * - `metadata` is available for future use (e.g. peering state, connection weight,
 *   bandwidth, latency annotations) without changing the core edge contract.
 */
export type GraphEdge = {
  /** Deterministic ID encoding relationship type + source + target path segments. */
  id: string

  /** ARM resource ID of the originating resource. */
  source: string

  /** ARM resource ID of the target resource. */
  target: string

  /** The semantic type of this relationship. */
  relationshipType: RelationshipType

  /** Optional supplementary data about the relationship (future use). */
  metadata?: Record<string, unknown>
}
