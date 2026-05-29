/**
 * jsonNormalizer — the core import pipeline for AzMap.
 *
 * This module is responsible for converting raw JSON (either an Azure resource
 * export or a previously-saved .azmap file) into the canonical GraphNode +
 * GraphEdge representation that the rest of the application works with.
 *
 * The pipeline has two distinct passes over the resource list:
 *
 *   Pass 1 — Nodes + self-contained relationships
 *     For each resource: create its GraphNode, wire it into the organisational
 *     hierarchy (Subscription → Region → ResourceGroup → resource), and extract
 *     any relationships that can be derived from the resource's own properties
 *     alone (e.g. a RouteTable's list of associated subnets, a Firewall's
 *     reference to its policy). VNet subnets and VNet peerings are also
 *     extracted here because they are embedded inside the VNet payload.
 *
 *   Pass 2 — Cross-resource relationships
 *     A second sweep over NICs and VMs to create relationships that reference
 *     other nodes. This pass runs after all nodes exist, guaranteeing that
 *     target IDs (e.g. a Subnet referenced by a NIC) are already in the node
 *     map even if the target resource appeared later in the input array.
 *
 * See ADR-002 (Hybrid Modeling Strategy) for why rawPayload is preserved.
 * See ADR-004 for why edges are first-class entities.
 * See ADR-009 for the learning-oriented documentation standard this file follows.
 */

import type { GraphEdge, GraphNode } from '@azmap/shared'
import { RelationshipType, ResourceType } from '@azmap/shared'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A loosely-typed envelope for a single Azure resource as returned by the
 * Azure CLI, Resource Graph, or ARM REST API.
 *
 * The index signature `[key: string]: unknown` is intentional. Azure resource
 * payloads vary wildly across providers and API versions — some have a top-level
 * `subscriptionId` field, others don't; some providers return `kind`, `sku`,
 * `zones`, `identity`, and other provider-specific envelopes. Rather than
 * enumerating every possible shape (which would immediately become incomplete),
 * we capture only the fields we actually use and let the index signature absorb
 * everything else. The full payload is preserved verbatim in `rawPayload` for
 * debugging and re-normalization (ADR-002).
 */
type AzureResource = {
  id?: string
  name?: string
  type?: string
  location?: string
  subscriptionId?: string
  resourceGroup?: string
  tags?: Record<string, string>
  properties?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * The shape of a native AzMap export file (.azmap).
 *
 * An .azmap file is simply a JSON object containing pre-normalized nodes and
 * edges. When AzMap detects this format it skips normalization entirely and
 * loads the graph directly, making re-imports instant and idempotent.
 *
 * The `version` field is reserved for future migration support. It is not
 * currently validated.
 */
type AzMapFile = {
  version?: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/**
 * The public contract returned by `normalizeJson`.
 *
 * - `nodes` / `edges` — the normalized graph ready for the store.
 * - `sourceFormat` — tells the caller whether the input was a native .azmap
 *   file (no normalization performed) or a raw Azure JSON export.
 * - `warnings` — non-fatal issues encountered during normalization (e.g. a
 *   resource missing its `id` or `type`). These are surfaced in the UI but
 *   do not abort the import.
 */
export type NormalizationResult = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  sourceFormat: 'azmap' | 'azure-json'
  warnings: string[]
  log: string[]
}

// ─── Resource type mapping ────────────────────────────────────────────────────

/**
 * The single authoritative lookup table from Azure ARM type strings to AzMap
 * ResourceType values.
 *
 * Keys are the fully-qualified ARM provider/type path, always lowercased
 * (e.g. 'microsoft.network/virtualnetworks'). Azure APIs return type strings
 * inconsistently — sometimes PascalCase, sometimes mixed — so all lookups
 * normalize to lowercase before consulting this map.
 *
 * Design decisions encoded here:
 *
 * - Multiple ARM types map to one ResourceType when they represent the same
 *   logical resource at different API maturity levels. For example,
 *   'microsoft.dbforpostgresql/servers' (legacy) and
 *   'microsoft.dbforpostgresql/flexibleservers' (current) both map to
 *   PostgreSqlServer. Users should not need to think about which API version
 *   produced their export.
 *
 * - 'microsoft.network/vpngateways' and 'microsoft.network/expressroutegateways'
 *   (which are vWAN-specific gateway variants) map to the same VpnGateway type
 *   as 'microsoft.network/virtualnetworkgateways' (the classic VNet gateway).
 *   They serve the same topological role: terminating encrypted tunnels.
 *
 * - Types NOT in this map are silently skipped. This is deliberate: real Azure
 *   environments always contain management-plane and preview services that
 *   AzMap has not modeled yet. Emitting a warning for every unknown type would
 *   drown out genuinely useful warnings about malformed resources.
 */
const AZURE_TYPE_MAP: Record<string, ResourceType> = {
  // Hierarchy resources
  // 'az account management-group entities list' returns non-standard type strings:
  //   MGs  → "/providers/Microsoft.Management/managementGroups"  (leading /providers/ stripped below)
  //   Subs → "/subscriptions"  (not a real ARM namespace; mapped here as a special alias)
  // 'az rest /subscriptions' returns the standard ARM type:
  //   Microsoft.Resources/subscriptions
  'microsoft.management/managementgroups':            ResourceType.ManagementGroup,
  'microsoft.resources/subscriptions':                ResourceType.Subscription,
  'microsoft.subscription/subscriptions':             ResourceType.Subscription,   // alias — older exports
  '/subscriptions':                                   ResourceType.Subscription,   // entities list format
  'microsoft.resources/resourcegroups':               ResourceType.ResourceGroup,

  // Compute
  'microsoft.compute/virtualmachines':                ResourceType.VirtualMachine,

  // Core networking
  'microsoft.network/virtualnetworks':                ResourceType.VirtualNetwork,
  'microsoft.network/networksecuritygroups':          ResourceType.NetworkSecurityGroup,
  'microsoft.network/networkinterfaces':              ResourceType.NetworkInterface,
  'microsoft.network/publicipaddresses':              ResourceType.PublicIpAddress,
  'microsoft.network/routetables':                    ResourceType.RouteTable,
  'microsoft.network/natgateways':                    ResourceType.NatGateway,

  // WAN / hub-and-spoke
  'microsoft.network/virtualwans':                    ResourceType.VirtualWan,
  'microsoft.network/virtualhubs':                    ResourceType.VirtualHub,

  // Security & inspection
  'microsoft.network/azurefirewalls':                 ResourceType.AzureFirewall,
  'microsoft.network/firewallpolicies':               ResourceType.FirewallPolicy,
  'microsoft.network/networkvirtualappliances':       ResourceType.NetworkVirtualAppliance,

  // Load balancing & gateways
  'microsoft.network/loadbalancers':                  ResourceType.LoadBalancer,
  'microsoft.network/applicationgateways':            ResourceType.ApplicationGateway,
  'microsoft.network/virtualnetworkgateways':         ResourceType.VpnGateway,
  'microsoft.network/vpngateways':                    ResourceType.VpnGateway,        // vWAN VPN gateway
  'microsoft.network/expressroutegateways':           ResourceType.VpnGateway,        // vWAN ER gateway
  'microsoft.network/localnetworkgateways':           ResourceType.LocalNetworkGateway,
  'microsoft.network/connections':                    ResourceType.GatewayConnection,
  'microsoft.network/expressroutecircuits':           ResourceType.ExpressRouteCircuit,

  // Private connectivity
  'microsoft.network/privateendpoints':               ResourceType.PrivateEndpoint,
  'microsoft.network/bastionhosts':                   ResourceType.BastionHost,

  // Additional networking
  'microsoft.network/applicationsecuritygroups':      ResourceType.ApplicationSecurityGroup,
  'microsoft.network/publicipprefixes':               ResourceType.PublicIpPrefix,
  'microsoft.network/ddosprotectionplans':            ResourceType.DdosProtectionPlan,
  'microsoft.network/networkwatchers':                ResourceType.NetworkWatcher,
  'microsoft.network/ipgroups':                       ResourceType.IpGroup,
  'microsoft.network/dnszones':                       ResourceType.DnsZone,
  'microsoft.network/privatednszones':                ResourceType.PrivateDnsZone,
  'microsoft.network/trafficmanagerprofiles':         ResourceType.TrafficManagerProfile,
  'microsoft.network/frontdoors':                     ResourceType.FrontDoor,
  'microsoft.cdn/profiles':                           ResourceType.CdnProfile,

  // Compute
  'microsoft.compute/virtualmachinescalesets':        ResourceType.VirtualMachineScaleSet,
  'microsoft.compute/availabilitysets':               ResourceType.AvailabilitySet,
  'microsoft.compute/disks':                          ResourceType.ManagedDisk,
  'microsoft.compute/hostgroups':                     ResourceType.DedicatedHostGroup,
  'microsoft.compute/hostgroups/hosts':               ResourceType.DedicatedHost,
  'microsoft.batch/batchaccounts':                    ResourceType.BatchAccount,
  'microsoft.servicefabric/clusters':                 ResourceType.ServiceFabricCluster,

  // Containers & orchestration
  'microsoft.containerservice/managedclusters':       ResourceType.KubernetesCluster,
  'microsoft.containerinstance/containergroups':      ResourceType.ContainerGroup,
  'microsoft.containerregistry/registries':           ResourceType.ContainerRegistry,
  'microsoft.app/managedenvironments':                ResourceType.ContainerAppEnvironment,
  'microsoft.app/containerapps':                      ResourceType.ContainerApp,

  // App platform
  'microsoft.web/sites':                              ResourceType.AppService,
  'microsoft.web/serverfarms':                        ResourceType.AppServicePlan,
  'microsoft.web/hostingenvironments':                ResourceType.AppServiceEnvironment,
  'microsoft.web/staticsites':                        ResourceType.StaticWebApp,
  'microsoft.app/logicapps':                          ResourceType.LogicApp,

  // Storage
  'microsoft.storage/storageaccounts':                ResourceType.StorageAccount,
  'microsoft.netapp/netappaccounts':                  ResourceType.NetAppAccount,

  // Databases & caching
  'microsoft.sql/servers':                            ResourceType.SqlServer,
  'microsoft.sql/servers/databases':                  ResourceType.SqlDatabase,
  'microsoft.sql/managedinstances':                   ResourceType.SqlManagedInstance,
  'microsoft.documentdb/databaseaccounts':            ResourceType.CosmosDbAccount,
  'microsoft.dbforpostgresql/servers':                ResourceType.PostgreSqlServer,
  'microsoft.dbforpostgresql/flexibleservers':        ResourceType.PostgreSqlServer,
  'microsoft.dbformysql/servers':                     ResourceType.MySqlServer,
  'microsoft.dbformysql/flexibleservers':             ResourceType.MySqlServer,
  'microsoft.dbformariadb/servers':                   ResourceType.MariaDbServer,
  'microsoft.cache/redis':                            ResourceType.RedisCache,
  'microsoft.synapse/workspaces':                     ResourceType.SynapseWorkspace,

  // Security resources
  'microsoft.keyvault/vaults':                        ResourceType.KeyVault,

  // Identity
  'microsoft.managedidentity/userassignedidentities': ResourceType.UserAssignedIdentity,

  // Integration & messaging
  'microsoft.apimanagement/service':                  ResourceType.ApiManagementService,
  'microsoft.eventhub/namespaces':                    ResourceType.EventHubNamespace,
  'microsoft.servicebus/namespaces':                  ResourceType.ServiceBusNamespace,
  'microsoft.eventgrid/topics':                       ResourceType.EventGridTopic,
  'microsoft.eventgrid/domains':                      ResourceType.EventGridDomain,
  'microsoft.logic/workflows':                        ResourceType.LogicApp,
  'microsoft.relay/namespaces':                       ResourceType.RelayNamespace,
  'microsoft.notificationhubs/namespaces':            ResourceType.NotificationHubNamespace,
  'microsoft.signalrservice/signalr':                 ResourceType.SignalRService,
  'microsoft.signalrservice/webpubsub':               ResourceType.SignalRService,

  // Analytics
  'microsoft.databricks/workspaces':                  ResourceType.DatabricksWorkspace,
  'microsoft.datafactory/factories':                  ResourceType.DataFactory,
  'microsoft.kusto/clusters':                         ResourceType.DataExplorerCluster,
  'microsoft.hdinsight/clusters':                     ResourceType.HDInsightCluster,
  'microsoft.streamanalytics/streamingjobs':          ResourceType.StreamAnalyticsJob,
  'microsoft.analysisservices/servers':               ResourceType.AnalysisServicesServer,
  'microsoft.purview/accounts':                       ResourceType.PurviewAccount,

  // AI & machine learning
  'microsoft.machinelearningservices/workspaces':     ResourceType.MachineLearningWorkspace,
  'microsoft.cognitiveservices/accounts':             ResourceType.CognitiveServicesAccount,
  'microsoft.search/searchservices':                  ResourceType.SearchService,
  'microsoft.botservice/botservices':                 ResourceType.BotService,
  'microsoft.openai/accounts':                        ResourceType.AzureOpenAIService,

  // IoT
  'microsoft.devices/iothubs':                        ResourceType.IoTHub,
  'microsoft.devices/provisioningservices':           ResourceType.DeviceProvisioningService,
  'microsoft.digitaltwins/digitaltwininstances':      ResourceType.DigitalTwinsInstance,
  'microsoft.iotcentral/iotapps':                     ResourceType.IoTCentralApp,

  // Monitoring & operations
  'microsoft.operationalinsights/workspaces':         ResourceType.LogAnalyticsWorkspace,
  'microsoft.insights/components':                    ResourceType.ApplicationInsightsComponent,
  'microsoft.automation/automationaccounts':          ResourceType.AutomationAccount,
  'microsoft.recoveryservices/vaults':                ResourceType.RecoveryServicesVault,

  // Hybrid & Arc
  'microsoft.hybridcompute/machines':                 ResourceType.ArcServer,
  'microsoft.kubernetes/connectedclusters':           ResourceType.ArcKubernetesCluster,
  'microsoft.azurestackhci/clusters':                 ResourceType.AzureLocalCluster,
}

// ─── ID helpers ───────────────────────────────────────────────────────────────

/**
 * Normalise an ARM resource ID to a canonical, lowercased node ID.
 *
 * Azure APIs return resource IDs in inconsistent casing. A VNet might appear
 * as `/subscriptions/ABC/resourceGroups/RG1/providers/Microsoft.Network/
 * virtualNetworks/vnet1` in one API call and with different casing in another.
 * Lowercasing everything ensures that two references to the same resource always
 * produce the same node ID, preventing duplicate nodes.
 *
 * The function name "nid" stands for "normalized ID". It is deliberately short
 * because it appears dozens of times throughout the normalizer.
 */
function nid(id: string): string {
  return id.toLowerCase()
}

/**
 * Parse an ARM resource ID into its constituent parts.
 *
 * ARM IDs follow a predictable structure:
 *
 *   /subscriptions/{subId}
 *   /resourceGroups/{rgName}
 *   /providers/{namespace}/{type}/{name}
 *     [/{childType}/{childName}]   ← optional, for child resources like databases
 *
 * Examples:
 *   /subscriptions/abc/resourceGroups/rg1/providers/microsoft.network/virtualnetworks/vnet1
 *   → { subscriptionId: 'abc', resourceGroup: 'rg1', type: 'microsoft.network/virtualnetworks', name: 'vnet1' }
 *
 *   /subscriptions/abc/resourceGroups/rg1/providers/microsoft.sql/servers/sql1/databases/db1
 *   → { subscriptionId: 'abc', resourceGroup: 'rg1', type: 'microsoft.sql/servers', name: 'sql1' }
 *   (child segment is not captured — we model the parent server, not the child database directly here)
 *
 * The function works entirely on the lowercased ID to match the nid() contract.
 * It uses regex for subscription/RG extraction (structure is well-defined) and
 * manual string slicing after the /providers/ marker for the type/name (more
 * flexible for the variable depth of child resources).
 */
function parseAzureId(id: string) {
  const lower = id.toLowerCase()
  const subMatch  = lower.match(/\/subscriptions\/([^/]+)/)
  const rgMatch   = lower.match(/\/resourcegroups\/([^/]+)/)
  const provIdx   = lower.indexOf('/providers/')

  let type = ''
  let name = ''
  if (provIdx !== -1) {
    const parts = lower.slice(provIdx + 11).split('/')
    if (parts.length >= 3) { type = `${parts[0]}/${parts[1]}`; name = parts[2] }
    else if (parts.length === 2) { type = parts[0]; name = parts[1] }
  }

  return {
    subscriptionId: subMatch?.[1] ?? null,
    resourceGroup:  rgMatch?.[1]  ?? null,
    type,
    name,
  }
}

/**
 * Compute a deterministic edge ID from a relationship type and two node IDs.
 *
 * Edge IDs must be stable across imports so that re-importing the same file
 * produces the same graph rather than accumulating duplicate edges. The ID is
 * derived entirely from three inputs that are intrinsic to the relationship:
 * the relationship type, the source ID, and the target ID.
 *
 * To keep IDs reasonably short we use only the last two path segments of each
 * node ID. For a Subnet like
 *   /subscriptions/abc/resourcegroups/rg1/providers/microsoft.network/virtualnetworks/vnet1/subnets/subnet1
 * the last two segments are `subnets-subnet1`, which is unique within the
 * graph in practice.
 *
 * Known limitation: if two resources of the same type and name exist in
 * different subscriptions or resource groups, their last-two-segments will
 * collide and produce the same edge ID. This would cause one edge to silently
 * win over the other. In practice this is rare, and the full-ID approach would
 * produce extremely long IDs that are harder to read in debugging tools. The
 * tradeoff is documented as a known limitation rather than silently accepted.
 *
 * The function name "eid" stands for "edge ID".
 */
function eid(rel: RelationshipType, source: string, target: string): string {
  const seg = (id: string) => id.split('/').filter(Boolean).slice(-2).join('-')
  return `${rel}--${seg(source)}--${seg(target)}`
}

// ─── Format detection ─────────────────────────────────────────────────────────

/**
 * Determine whether a parsed JSON value is a native AzMap file.
 *
 * The detection heuristic is: the object has both a `nodes` array and an
 * `edges` array. This is intentionally checked BEFORE trying to extract Azure
 * resources, because an AzMap file's `nodes` array would otherwise be
 * misidentified as a raw Azure resource array (both are arrays of objects).
 *
 * The TypeScript type predicate (`data is AzMapFile`) narrows the caller's
 * type automatically if this returns true, avoiding redundant casts.
 */
function isAzMapFile(data: unknown): data is AzMapFile {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return Array.isArray(d.nodes) && Array.isArray(d.edges)
}

/**
 * Extract a flat array of Azure resources from any of the four common export
 * envelope shapes that Azure tooling produces.
 *
 * Azure exports are not standardised — different tools wrap resources
 * differently:
 *
 *   1. Raw array          — Azure CLI `az resource list`, Resource Graph
 *                           `az graph query` with `--query data`
 *      [ { "id": "...", "type": "..." }, ... ]
 *
 *   2. `.resources` key   — ARM template format (azuredeploy.json)
 *      { "resources": [ ... ] }
 *
 *   3. `.value` key       — ARM REST API list responses
 *      { "value": [ ... ], "nextLink": "..." }
 *
 *   4. Single object      — A single resource pasted from the portal or CLI
 *      { "id": "...", "type": "..." }
 *
 * Returns null if the input matches none of these shapes, which will cause
 * `normalizeJson` to throw a user-friendly error.
 */
function extractResources(data: unknown): AzureResource[] | null {
  if (Array.isArray(data)) return data as AzureResource[]
  if (typeof data !== 'object' || data === null) return null
  const d = data as Record<string, unknown>
  if (Array.isArray(d.resources)) return d.resources as AzureResource[]   // ARM template
  if (Array.isArray(d.value))     return d.value as AzureResource[]        // REST list response
  if (typeof d.id === 'string' && typeof d.type === 'string') return [d as AzureResource]
  return null
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Parse a JSON string and normalize it into a canonical AzMap resource graph.
 *
 * This is the single public entry point for the entire import pipeline.
 * It handles format detection, dispatches to the appropriate normalizer, and
 * surfaces parsing errors as thrown exceptions (caught by the import UI layer).
 *
 * The function first checks whether the input is a native .azmap file. If it
 * is, nodes and edges are returned directly without re-normalization — this
 * makes re-importing a previously saved file instant and fully idempotent.
 *
 * If the input is a raw Azure export, `extractResources` is called to find
 * the resource array regardless of which envelope shape wraps it, and then
 * `normalizeAzureResources` performs the full two-pass normalization.
 *
 * @throws {Error} if the input is not valid JSON.
 * @throws {Error} if the input is valid JSON but matches no known format.
 */
export function normalizeJson(jsonString: string): NormalizationResult {
  let data: unknown
  try {
    data = JSON.parse(jsonString)
  } catch {
    throw new Error('Invalid JSON — could not parse the file.')
  }

  if (isAzMapFile(data)) {
    return { nodes: data.nodes, edges: data.edges, sourceFormat: 'azmap', warnings: [], log: [`Loaded AzMap native file — ${data.nodes.length} nodes · ${data.edges.length} edges (no normalization needed)`] }
  }

  const resources = extractResources(data)
  if (!resources) {
    throw new Error(
      'Unrecognised format. Expected an Azure resource array, ARM template, or AzMap (.azmap) file.'
    )
  }

  return normalizeAzureResources(resources)
}

// ─── Per-type relationship extractor (Pass 1) ────────────────────────────────

/**
 * Extract topology relationships from a single resource's own properties.
 *
 * This function is called from Pass 1 of the normalizer for every resource
 * whose type appears in the switch. It handles only relationships that are
 * SELF-CONTAINED — derivable entirely from the resource's own `properties`
 * object without needing to look at any other resource.
 *
 * Why a separate function?
 * Pass 1 iterates the resource array once to build all nodes. Separating the
 * relationship logic here keeps the main loop readable and makes it easy to
 * add new resource types without touching the core normalizer loop.
 *
 * Why not handle NICs and VMs here?
 * NIC → Subnet and VM → NIC relationships are in Pass 2 because they require
 * all Subnet nodes to already exist. Subnets are created in Pass 1 as part of
 * VNet processing — but a NIC might appear before its VNet in the resource
 * array. Pass 2 runs after all nodes are guaranteed to exist.
 *
 * Inner helpers (defined inside to close over `addEdge`):
 *
 * - `edge(rel, src, tgt)` — thin wrapper to construct and add a GraphEdge
 *   without repeating the `eid()` call at every site.
 *
 * - `subnetsOf(arr)` — extracts subnet IDs from an array of `{ id: string }`
 *   objects (the shape Azure uses for RouteTable.subnets, NatGateway.subnets).
 *
 * - `ipConfigSubnets(arr)` — extracts subnet IDs from an array of IP
 *   configuration objects whose shape is `{ properties: { subnet: { id } } }`.
 *   Used by ApplicationGateway, BastionHost, LoadBalancer, VpnGateway, and
 *   VNet-deployed AzureFirewall, all of which use ipConfigurations to express
 *   their subnet placement.
 *
 * @param type     The ResourceType of the resource being processed.
 * @param nodeId   The normalized (lowercased) node ID of the resource.
 * @param props    The resource's `properties` object from the Azure payload.
 * @param addEdge  Callback to register a new edge into the edge map.
 * @param contains Callback to register a Contains edge (parent → child).
 */
function extractNetworkRelationships(
  type: ResourceType,
  nodeId: string,
  props: Record<string, unknown>,
  addEdge: (e: GraphEdge) => void,
  contains: (sourceId: string, targetId: string) => void,
): void {
  function edge(rel: RelationshipType, src: string, tgt: string) {
    addEdge({ id: eid(rel, src, tgt), source: src, target: tgt, relationshipType: rel })
  }
  function subnetsOf(arr: unknown): string[] {
    if (!Array.isArray(arr)) return []
    return (arr as Array<Record<string, unknown>>).map(s => s.id as string).filter(Boolean).map(nid)
  }
  function ipConfigSubnets(arr: unknown): string[] {
    if (!Array.isArray(arr)) return []
    return (arr as Array<Record<string, unknown>>)
      .map(cfg => ((cfg.properties as Record<string, unknown> | undefined)?.subnet as Record<string, unknown> | undefined)?.id as string | undefined)
      .filter((id): id is string => Boolean(id))
      .map(nid)
  }

  switch (type) {
    case ResourceType.VirtualHub: {
      // A VirtualHub is always owned by a VirtualWAN. The hub's payload contains
      // a `virtualWan.id` reference back to the parent WAN.
      const vwan = props.virtualWan as Record<string, unknown> | undefined
      if (vwan?.id) contains(nid(vwan.id as string), nodeId)
      break
    }

    case ResourceType.NetworkVirtualAppliance: {
      // An NVA deployed into a hub is contained by that hub.
      const hub = props.virtualHub as Record<string, unknown> | undefined
      if (hub?.id) contains(nid(hub.id as string), nodeId)
      break
    }

    case ResourceType.AzureFirewall: {
      // Azure Firewall has two deployment modes:
      //   - Secured Virtual Hub: the firewall is deployed inside a vHub and is
      //     contained by it (hub.id present in properties).
      //   - VNet-deployed: the firewall sits in its own AzureFirewallSubnet
      //     inside a VNet (ipConfigurations present, no hub reference).
      const hub = props.virtualHub as Record<string, unknown> | undefined
      if (hub?.id) {
        contains(nid(hub.id as string), nodeId)
      } else {
        for (const snetId of ipConfigSubnets(props.ipConfigurations)) {
          edge(RelationshipType.ConnectedTo, nodeId, snetId)
        }
      }
      const policy = props.firewallPolicy as Record<string, unknown> | undefined
      if (policy?.id) edge(RelationshipType.DependsOn, nodeId, nid(policy.id as string))
      break
    }

    case ResourceType.RouteTable: {
      // Route Tables list the subnets they are currently associated with.
      // Each subnet in the array gets a RoutesTo edge.
      for (const snetId of subnetsOf(props.subnets)) {
        edge(RelationshipType.RoutesTo, nodeId, snetId)
      }
      break
    }

    case ResourceType.NatGateway: {
      // NAT Gateways provide outbound SNAT for their associated subnets.
      for (const snetId of subnetsOf(props.subnets)) {
        edge(RelationshipType.AttachedTo, nodeId, snetId)
      }
      break
    }

    case ResourceType.ApplicationGateway: {
      // Application Gateway occupies a dedicated subnet referenced via
      // gatewayIPConfigurations (note: not ipConfigurations).
      for (const snetId of ipConfigSubnets(props.gatewayIPConfigurations)) {
        edge(RelationshipType.ConnectedTo, nodeId, snetId)
      }
      break
    }

    case ResourceType.BastionHost: {
      // Azure Bastion must be deployed into a subnet named exactly
      // 'AzureBastionSubnet'. The subnet reference is in ipConfigurations.
      for (const snetId of ipConfigSubnets(props.ipConfigurations)) {
        edge(RelationshipType.ConnectedTo, nodeId, snetId)
      }
      break
    }

    case ResourceType.PrivateEndpoint: {
      // Subnet placement: gives the private endpoint a private IP in that subnet.
      const subnet = props.subnet as Record<string, unknown> | undefined
      if (subnet?.id) edge(RelationshipType.ConnectedTo, nodeId, nid(subnet.id as string))
      // Target PaaS service: each private link service connection names the resource
      // being privately exposed (e.g. a Key Vault, Storage Account, or SQL server).
      const plConns = props.privateLinkServiceConnections as Array<Record<string, unknown>> | undefined
      if (Array.isArray(plConns)) {
        for (const conn of plConns) {
          const p = conn.properties as Record<string, unknown> | undefined
          const svcId = p?.privateLinkServiceId as string | undefined
          if (svcId) edge(RelationshipType.ConnectedTo, nodeId, nid(svcId))
        }
      }
      break
    }

    case ResourceType.TrafficManagerProfile: {
      // Traffic Manager routes DNS-based traffic to backend endpoint targets.
      // Each endpoint's targetResourceId is the Azure resource that receives traffic
      // (App Service, Public IP, nested TM profile, etc.).
      const endpoints = props.endpoints as Array<Record<string, unknown>> | undefined
      if (Array.isArray(endpoints)) {
        for (const ep of endpoints) {
          const p = ep.properties as Record<string, unknown> | undefined
          const targetId = p?.targetResourceId as string | undefined
          if (targetId) edge(RelationshipType.RoutesTo, nodeId, nid(targetId))
        }
      }
      break
    }

    case ResourceType.LoadBalancer: {
      // Internal Load Balancers have a frontend IP configuration that
      // references the subnet where the VIP lives. External LBs have no
      // subnet reference (their frontend IP is a Public IP address).
      for (const snetId of ipConfigSubnets(props.frontendIPConfigurations)) {
        edge(RelationshipType.ConnectedTo, nodeId, snetId)
      }
      break
    }

    case ResourceType.VpnGateway: {
      // VNet Gateways (VPN or ExpressRoute) are always placed in the
      // reserved GatewaySubnet. Their subnet placement is in ipConfigurations.
      for (const snetId of ipConfigSubnets(props.ipConfigurations)) {
        edge(RelationshipType.ConnectedTo, nodeId, snetId)
      }
      break
    }

    case ResourceType.GatewayConnection: {
      // A Gateway Connection links two gateway resources — either two VNet
      // Gateways (VNet-to-VNet) or a VNet Gateway and a Local Network Gateway
      // (site-to-site). We model both gateway references as ConnectedTo edges
      // from the Connection node.
      const gw1 = props.virtualNetworkGateway1 as Record<string, unknown> | undefined
      const gw2 = props.virtualNetworkGateway2 as Record<string, unknown> | undefined
      const lgw = props.localNetworkGateway2   as Record<string, unknown> | undefined
      if (gw1?.id) edge(RelationshipType.ConnectedTo, nodeId, nid(gw1.id as string))
      const peer = gw2 ?? lgw
      if (peer?.id) edge(RelationshipType.ConnectedTo, nodeId, nid(peer.id as string))
      break
    }

    // ── Containers & orchestration ─────────────────────────────────────────

    case ResourceType.KubernetesCluster: {
      // AKS supports VNet integration via agentPoolProfiles[].vnetSubnetID.
      // Each agent pool can be in a different subnet (node pool subnet isolation).
      const pools = props.agentPoolProfiles as Array<Record<string, unknown>> | undefined
      if (Array.isArray(pools)) {
        for (const pool of pools) {
          const snetId = pool.vnetSubnetID as string | undefined
          if (snetId) edge(RelationshipType.ConnectedTo, nodeId, nid(snetId))
        }
      }
      break
    }

    case ResourceType.ContainerApp: {
      // Container Apps are logically contained by a Managed Environment, which
      // acts as the shared compute and networking boundary for a group of apps.
      const envId = props.managedEnvironmentId as string | undefined
      if (envId) contains(nid(envId), nodeId)
      break
    }

    case ResourceType.ContainerAppEnvironment: {
      // A Managed Environment with VNet injection: the environment reserves a
      // subnet for its infrastructure (ingress controller, internal load balancer).
      const vnet = props.vnetConfiguration as Record<string, unknown> | undefined
      const snetId = vnet?.infrastructureSubnetId as string | undefined
      if (snetId) edge(RelationshipType.ConnectedTo, nodeId, nid(snetId))
      break
    }

    // ── App platform ───────────────────────────────────────────────────────

    case ResourceType.AppService: {
      // Regional VNet Integration: the App Service delegates a subnet for
      // outbound traffic. The subnet ID is directly on the site properties.
      const vnetSnet = props.virtualNetworkSubnetId as string | undefined
      if (vnetSnet) edge(RelationshipType.ConnectedTo, nodeId, nid(vnetSnet))
      // App Service Plan: every App Service runs on a plan that provides the
      // underlying compute. DependsOn captures this logical dependency.
      const planId = props.serverFarmId as string | undefined
      if (planId) edge(RelationshipType.DependsOn, nodeId, nid(planId))
      break
    }

    case ResourceType.AppServiceEnvironment: {
      // An ASE is always deployed into a dedicated /24 or larger subnet.
      // The subnet reference appears in different fields between ASE v2 and v3.
      const vnetRef = props.virtualNetwork as Record<string, unknown> | undefined
      const snetId = (vnetRef?.id ?? props.virtualNetworkSubnetId) as string | undefined
      if (snetId) edge(RelationshipType.ConnectedTo, nodeId, nid(snetId))
      break
    }

    // ── Integration & messaging ────────────────────────────────────────────

    case ResourceType.ApiManagementService: {
      // APIM in Internal or External VNet mode is injected into a dedicated
      // subnet. The subnet reference is inside virtualNetworkConfiguration.
      const vnetConfig = props.virtualNetworkConfiguration as Record<string, unknown> | undefined
      const snetId = vnetConfig?.subnetResourceId as string | undefined
      if (snetId) edge(RelationshipType.ConnectedTo, nodeId, nid(snetId))
      break
    }
  }
}

// ─── Azure resource normalizer ────────────────────────────────────────────────

/**
 * The core normalization pipeline: converts a flat array of Azure resource
 * payloads into a canonical GraphNode + GraphEdge graph.
 *
 * ## Idempotency
 *
 * Both `addNode` and `addEdge` are write-once: they only insert if the ID is
 * not already present. Combined with deterministic IDs (`nid` for nodes, `eid`
 * for edges), re-running normalization on the same input always produces the
 * same graph. Importing the same file twice does not duplicate anything.
 *
 * ## Lazy hierarchy materialization
 *
 * The organisational hierarchy (Subscription → Region → ResourceGroup) is built
 * on-demand as regular resources are encountered, not from dedicated hierarchy
 * exports. `ensureSubscription`, `ensureRegion`, and `ensureResourceGroup` each
 * check whether the node already exists before creating it. The chain is:
 *
 *   ensureResourceGroup calls ensureRegion
 *   ensureRegion calls ensureSubscription
 *
 * So processing the first resource in a subscription automatically creates all
 * three hierarchy nodes and their Contains edges. Subsequent resources in the
 * same subscription/region/RG find the nodes already present and skip creation.
 *
 * ## Two-pass design
 *
 * ### Pass 1 — Nodes, hierarchy, and self-contained relationships
 *
 * For each resource:
 *   1. Look up the ResourceType in AZURE_TYPE_MAP. Skip silently if unknown.
 *   2. Parse the ARM ID to extract subscription, resource group, and name.
 *   3. Ensure the hierarchy nodes exist (ensureSubscription/Region/ResourceGroup).
 *   4. Create the resource node and wire it into its ResourceGroup via Contains.
 *   5. Call `extractNetworkRelationships` for any relationships derivable from
 *      the resource's own properties.
 *
 * VirtualNetwork resources get additional special-casing in Pass 1:
 *   - Subnets are embedded inside the VNet payload (they are not separate top-
 *     level resources in most Azure exports). They are extracted and created as
 *     their own nodes here, with Contains edges from the VNet.
 *   - Each subnet's NSG reference (if present) is turned into a SecuredBy edge.
 *   - VNet peering objects are turned into PeeredWith edges.
 *
 * ### Pass 2 — Cross-resource NIC and VM relationships
 *
 * NIC → Subnet, NIC → NSG, NIC → LoadBalancer, and VM → NIC are handled in a
 * second pass for a critical ordering reason: a NIC's target Subnet might not
 * have been created yet when the NIC is encountered in Pass 1 (Subnet nodes are
 * created as part of VNet processing, and the VNet might appear after the NIC
 * in the resource array). Pass 2 guarantees all nodes exist before cross-
 * resource edges are created.
 *
 * NIC → LoadBalancer is derived by stripping the `/backendAddressPools/{name}`
 * suffix from the pool ID, giving the parent LB resource ID. The LB itself is
 * the meaningful topology node — individual backend pools are not modeled.
 *
 * ## Private IP enrichment
 *
 * While processing NIC IP configurations in Pass 2, the private IP address is
 * extracted and stored in `node.metadata.privateIp`. This is an example of the
 * metadata escape-hatch pattern: the data is useful for the Node Detail Panel
 * but does not warrant a first-class field on GraphNode.
 */
function normalizeAzureResources(resources: AzureResource[]): NormalizationResult {
  const warnings: string[] = []
  const nodes = new Map<string, GraphNode>()
  const edges = new Map<string, GraphEdge>()

  // ── IP → node reverse-lookup (for route-table next-hop resolution) ────────
  // Populated during Pass 2 from NIC private IPs and from Azure Firewall /
  // VPN Gateway private IPs. Used in Pass 3 to resolve VirtualAppliance
  // next-hop addresses in route table routes to their graph node IDs.
  const ipToNodeId = new Map<string, string>()

  // ── Stats for the import log ──────────────────────────────────────────────
  const typeCounts: Record<string, number> = {}
  let recognizedCount = 0, skippedCount = 0
  let subCount = 0, regionCount = 0, rgCount = 0, subnetCount = 0
  const edgeTypeCounts: Record<string, number> = {}

  /** Insert a node only if its ID is not already present. */
  function addNode(n: GraphNode) {
    if (!nodes.has(n.id)) {
      nodes.set(n.id, n)
      if      (n.type === ResourceType.Subscription)   subCount++
      else if (n.type === ResourceType.Region)         regionCount++
      else if (n.type === ResourceType.ResourceGroup)  rgCount++
      else if (n.type === ResourceType.Subnet)         subnetCount++
    }
  }

  /** Insert an edge only if its ID is not already present. */
  function addEdge(e: GraphEdge) {
    if (!edges.has(e.id)) {
      edges.set(e.id, e)
      edgeTypeCounts[e.relationshipType] = (edgeTypeCounts[e.relationshipType] ?? 0) + 1
    }
  }

  /** Register a Contains (parent → child) edge between two node IDs. */
  function contains(sourceId: string, targetId: string) {
    const id = eid(RelationshipType.Contains, sourceId, targetId)
    addEdge({ id, source: sourceId, target: targetId, relationshipType: RelationshipType.Contains })
  }

  /**
   * Ensure a Subscription node exists for the given subscription GUID.
   * Returns the node ID so callers can chain directly into `contains()`.
   */
  function ensureSubscription(subId: string): string {
    const id = `sub-${subId}`
    if (!nodes.has(id)) addNode({ id, type: ResourceType.Subscription, name: subId, subscriptionId: subId })
    return id
  }

  /**
   * Ensure a Region node exists for a (subscriptionId, location) pair.
   * Creates the parent Subscription node if needed, and adds a Contains edge
   * from Subscription → Region. Returns the region node ID.
   */
  function ensureRegion(subId: string, location: string): string {
    const id = `region-${subId}-${location}`
    if (!nodes.has(id)) {
      addNode({ id, type: ResourceType.Region, name: location, subscriptionId: subId, location })
      contains(ensureSubscription(subId), id)
    }
    return id
  }

  /**
   * Ensure a ResourceGroup node exists for a (subscriptionId, rgName, location)
   * triple. Creates parent Region and Subscription nodes if needed, and adds
   * Contains edges up the hierarchy. Returns the resource group node ID.
   */
  function ensureResourceGroup(subId: string, rgName: string, location: string): string {
    const id = `rg-${subId}-${rgName}`
    if (!nodes.has(id)) {
      addNode({ id, type: ResourceType.ResourceGroup, name: rgName, subscriptionId: subId, resourceGroup: rgName, location })
      contains(ensureRegion(subId, location), id)
    }
    return id
  }

  // ── Pass 1: nodes + containment + embedded subnets ────────────────────────

  for (const resource of resources) {
    if (!resource.id || !resource.type) {
      warnings.push(`Skipped resource missing id or type.`)
      continue
    }

    // 'az account management-group entities list' prefixes types with /providers/
    // (e.g. "/providers/Microsoft.Management/managementGroups"). Strip it so the
    // map lookup works identically for both entities-list and standard ARM formats.
    const azType      = resource.type.toLowerCase().replace(/^\/providers\//, '')
    typeCounts[azType] = (typeCounts[azType] ?? 0) + 1
    const resourceType = AZURE_TYPE_MAP[azType]
    if (!resourceType) { skippedCount++; continue }
    recognizedCount++

    const parsed  = parseAzureId(resource.id)
    const subId   = resource.subscriptionId ?? parsed.subscriptionId ?? 'unknown'
    const rgName  = (resource.resourceGroup ?? parsed.resourceGroup ?? '').toLowerCase()
    const location = (resource.location ?? 'unknown').toLowerCase()
    const nodeId  = nid(resource.id)

    // ── Hierarchy-level resources: handled separately ─────────────────────────
    // Management Groups live at tenant scope — no subscription, no RG.
    // Subscriptions and ResourceGroups are synthetic in the normal flow (created
    // on-demand from resource ARM IDs), so explicit imports of these types enrich
    // the synthetic node rather than creating a second node with a different ID.

    if (resourceType === ResourceType.ManagementGroup) {
      const displayName = (resource as Record<string, unknown>).displayName as string | undefined
      addNode({ id: nodeId, type: ResourceType.ManagementGroup, name: displayName ?? resource.name ?? parsed.name, rawPayload: resource })
      // 'az account management-group entities list' includes a parent field that
      // encodes the MG→MG hierarchy. Create a Contains edge so the full tree is
      // available in the graph without needing a separate hierarchy import.
      const parent = (resource as Record<string, unknown>).parent as Record<string, unknown> | null | undefined
      if (parent?.id) contains(nid(parent.id as string), nodeId)
      continue
    }

    if (resourceType === ResourceType.Subscription) {
      const syntheticId = `sub-${subId}`
      // entities list: displayName is the human name, name is the GUID.
      // REST API:       displayName is the human name, name may also be human name.
      // Prefer displayName when present; fall back to name then subId.
      const displayName = (resource as Record<string, unknown>).displayName as string | undefined
      const nodeName = displayName ?? resource.name ?? subId
      if (nodes.has(syntheticId)) {
        nodes.set(syntheticId, { ...nodes.get(syntheticId)!, name: nodeName, rawPayload: resource })
      } else {
        addNode({ id: syntheticId, type: ResourceType.Subscription, name: nodeName, subscriptionId: subId, rawPayload: resource })
      }
      // entities list: parent.id is the containing management group's ARM path.
      const parent = (resource as Record<string, unknown>).parent as Record<string, unknown> | null | undefined
      if (parent?.id) contains(nid(parent.id as string), syntheticId)
      continue
    }

    if (resourceType === ResourceType.ResourceGroup) {
      const syntheticId = `rg-${subId}-${rgName}`
      if (nodes.has(syntheticId)) {
        nodes.set(syntheticId, { ...nodes.get(syntheticId)!, tags: resource.tags, rawPayload: resource })
      } else {
        addNode({ id: syntheticId, type: ResourceType.ResourceGroup, name: rgName, subscriptionId: subId, resourceGroup: rgName, location, tags: resource.tags, rawPayload: resource })
        contains(ensureRegion(subId, location), syntheticId)
      }
      continue
    }

    ensureSubscription(subId)

    if (rgName) {
      const rgId = ensureResourceGroup(subId, rgName, location)
      addNode({
        id: nodeId,
        type: resourceType,
        name: resource.name ?? parsed.name,
        subscriptionId: subId,
        resourceGroup: rgName,
        location,
        tags: resource.tags,
        rawPayload: resource,
      })
      contains(rgId, nodeId)

      // ── Per-type relationship extraction ──────────────────────────────────
      // Azure CLI output puts resource-specific fields (ipConfigurations,
      // subnets, networkProfile, etc.) at the root of the resource object.
      // The REST API and ARM templates wrap them under a `properties` key.
      // We fall back to the resource itself so both formats are handled.
      const resourceProps = (resource.properties ?? resource) as Record<string, unknown>
      extractNetworkRelationships(resourceType, nodeId, resourceProps, addEdge, contains)

      // ── VNet: extract embedded subnets + peerings ──────────────────────────
      // Subnets are not top-level resources in most Azure exports — they live
      // inside the VNet's properties.subnets array (REST) or subnets array at
      // the resource root (CLI). We extract them here so every subnet gets its
      // own GraphNode and can be the target of NIC, RouteTable, NSG edges.
      if (resourceType === ResourceType.VirtualNetwork) {
        const props = resourceProps

        const subnets = props.subnets as Array<Record<string, unknown>> | undefined
        if (Array.isArray(subnets)) {
          for (const subnet of subnets) {
            const snetRawId = subnet.id as string | undefined
            const snetName  = subnet.name as string | undefined
            if (!snetRawId || !snetName) continue
            const snetId   = nid(snetRawId)
            const snetProps = subnet.properties as Record<string, unknown> | undefined

            addNode({
              id: snetId,
              type: ResourceType.Subnet,
              name: snetName,
              subscriptionId: subId,
              resourceGroup: rgName,
              location,
              metadata: snetProps?.addressPrefix ? { addressPrefix: snetProps.addressPrefix } : undefined,
              rawPayload: subnet,
            })
            contains(nodeId, snetId)  // VNet → Subnet

            // Subnet → NSG: the NSG applied at the subnet level is expressed
            // as a reference inside the subnet's own properties object.
            const nsgRef = snetProps?.networkSecurityGroup as Record<string, unknown> | undefined
            if (nsgRef?.id) {
              const nsgId = nid(nsgRef.id as string)
              const id = eid(RelationshipType.SecuredBy, snetId, nsgId)
              addEdge({ id, source: snetId, target: nsgId, relationshipType: RelationshipType.SecuredBy })
            }
          }
        }

        // VNet peerings: each peering object describes a connection to a remote
        // VNet. We create a PeeredWith edge from this VNet to the remote one.
        // Azure always requires the peering to be configured on both sides, so
        // a mutual import will produce edges in both directions.
        const peerings = props.virtualNetworkPeerings as Array<Record<string, unknown>> | undefined
        if (Array.isArray(peerings)) {
          for (const peering of peerings) {
            const peerProps  = peering.properties as Record<string, unknown> | undefined
            const remoteVnet = peerProps?.remoteVirtualNetwork as Record<string, unknown> | undefined
            if (remoteVnet?.id) {
              const remoteId    = nid(remoteVnet.id as string)
              const id          = eid(RelationshipType.PeeredWith, nodeId, remoteId)
              const peeringName = typeof peering.name === 'string' ? peering.name : undefined
              addEdge({
                id,
                source: nodeId,
                target: remoteId,
                relationshipType: RelationshipType.PeeredWith,
                metadata: peeringName ? { peeringName } : undefined,
              })
            }
          }
        }
      }
    }
  }

  // ── Pass 2: network relationships (NIC → Subnet, VM → NIC, NIC → NSG) ────
  // This pass runs after all nodes exist. Any resource type whose relationships
  // depend on other nodes being present should be handled here, not in Pass 1.

  for (const resource of resources) {
    if (!resource.id || !resource.type) continue
    const azType  = resource.type.toLowerCase()
    const nodeId  = nid(resource.id)
    const props   = (resource.properties ?? resource) as Record<string, unknown>

    if (azType === 'microsoft.network/networkinterfaces') {
      // NIC → Subnet connectivity + extract private IP
      // Each IP configuration on the NIC specifies the subnet it occupies and
      // the private IP address assigned within that subnet.
      const ipConfigs = props.ipConfigurations as Array<Record<string, unknown>> | undefined
      if (Array.isArray(ipConfigs)) {
        for (const cfg of ipConfigs) {
          const p = cfg.properties as Record<string, unknown> | undefined
          const subnet = p?.subnet as Record<string, unknown> | undefined
          if (subnet?.id) {
            const snetId = nid(subnet.id as string)
            const id = eid(RelationshipType.ConnectedTo, nodeId, snetId)
            addEdge({ id, source: nodeId, target: snetId, relationshipType: RelationshipType.ConnectedTo })
          }
          // Enrich the NIC node with its private IP and register in the reverse-lookup
          // table so that route tables pointing to this NIC's IP can be resolved.
          const privateIp = p?.privateIPAddress as string | undefined
          if (privateIp && nodes.has(nodeId)) {
            const n = nodes.get(nodeId)!
            nodes.set(nodeId, { ...n, metadata: { ...n.metadata, privateIp } })
            ipToNodeId.set(privateIp, nodeId)
          }
        }
      }

      // NIC → NSG: an NSG can be applied directly to the NIC in addition to
      // (or instead of) the subnet-level NSG.
      const nicNsg = props.networkSecurityGroup as Record<string, unknown> | undefined
      if (nicNsg?.id) {
        const nsgId = nid(nicNsg.id as string)
        const id = eid(RelationshipType.SecuredBy, nodeId, nsgId)
        addEdge({ id, source: nodeId, target: nsgId, relationshipType: RelationshipType.SecuredBy })
      }

      // NIC → LoadBalancer via backend address pool membership.
      // The NIC's ipConfiguration lists the backend pools it belongs to. Each
      // pool ID has the form: .../loadBalancers/{lbName}/backendAddressPools/{poolName}
      // We strip the backendAddressPools suffix to get the parent LB resource ID.
      const nicIpConfigs = props.ipConfigurations as Array<Record<string, unknown>> | undefined
      if (Array.isArray(nicIpConfigs)) {
        for (const cfg of nicIpConfigs) {
          const p = cfg.properties as Record<string, unknown> | undefined
          const pools = p?.loadBalancerBackendAddressPools as Array<Record<string, unknown>> | undefined
          if (Array.isArray(pools)) {
            for (const pool of pools) {
              const poolId = pool.id as string | undefined
              if (poolId) {
                const lbId = poolId.toLowerCase().split('/backendaddresspools/')[0]
                if (lbId) addEdge({ id: eid(RelationshipType.AttachedTo, nodeId, lbId), source: nodeId, target: lbId, relationshipType: RelationshipType.AttachedTo })
              }
            }
          }
        }
      }
    }

    if (azType === 'microsoft.compute/virtualmachines') {
      // VM → NIC: the VM's networkProfile lists the NICs attached to it.
      // A VM can have multiple NICs (one primary, additional secondary NICs).
      const netProfile = props.networkProfile as Record<string, unknown> | undefined
      const nics = netProfile?.networkInterfaces as Array<Record<string, unknown>> | undefined
      if (Array.isArray(nics)) {
        for (const nic of nics) {
          if (nic.id) {
            const nicId = nid(nic.id as string)
            const id = eid(RelationshipType.AttachedTo, nodeId, nicId)
            addEdge({ id, source: nodeId, target: nicId, relationshipType: RelationshipType.AttachedTo })
          }
        }
      }
    }

    // Azure Firewall and VPN Gateway private IP extraction for route-table resolution.
    // These are the most common VirtualAppliance next-hop targets in UDRs.
    if (azType === 'microsoft.network/azurefirewalls' ||
        azType === 'microsoft.network/virtualnetworkgateways' ||
        azType === 'microsoft.network/vpngateways' ||
        azType === 'microsoft.network/expressroutegateways') {
      const ipConfigs = props.ipConfigurations as Array<Record<string, unknown>> | undefined
      if (Array.isArray(ipConfigs)) {
        for (const cfg of ipConfigs) {
          const p = cfg.properties as Record<string, unknown> | undefined
          const ip = p?.privateIPAddress as string | undefined
          if (ip && nodes.has(nodeId)) {
            ipToNodeId.set(ip, nodeId)
            const n = nodes.get(nodeId)!
            if (!n.metadata?.privateIp) {
              nodes.set(nodeId, { ...n, metadata: { ...n.metadata, privateIp: ip } })
            }
          }
        }
      }
    }
  }

  // ── Pass 3: route-table next-hop resolution ───────────────────────────────
  // Route table routes reference next-hop resources by IP address (not ARM ID).
  // Now that ipToNodeId is fully populated (NIC IPs from Pass 2, AZFW/gateway
  // IPs from the block above), we resolve routes of type VirtualAppliance to
  // the actual graph node and emit a RoutesTo edge.
  //
  // This runs as a separate pass so it sees all private IPs regardless of the
  // order resources appeared in the input array.

  for (const resource of resources) {
    if (!resource.id || !resource.type) continue
    if (resource.type.toLowerCase() !== 'microsoft.network/routetables') continue
    const rtId = nid(resource.id)
    if (!nodes.has(rtId)) continue
    const rtProps = (resource.properties ?? resource) as Record<string, unknown>
    const routes = rtProps.routes as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(routes)) continue
    for (const route of routes) {
      const rp = route.properties as Record<string, unknown> | undefined
      if ((rp?.nextHopType as string | undefined) !== 'VirtualAppliance') continue
      const ip = rp?.nextHopIpAddress as string | undefined
      if (!ip) continue
      const targetId = ipToNodeId.get(ip)
      if (targetId && nodes.has(targetId)) {
        addEdge({ id: eid(RelationshipType.RoutesTo, rtId, targetId), source: rtId, target: targetId, relationshipType: RelationshipType.RoutesTo })
      }
    }
  }

  // ── Build import log ─────────────────────────────────────────────────────
  const log: string[] = []

  log.push(`Input: ${resources.length} resource${resources.length !== 1 ? 's' : ''} · ${recognizedCount} recognised · ${skippedCount} skipped`)

  const recognizedTypes = Object.entries(typeCounts)
    .filter(([t]) => AZURE_TYPE_MAP[t])
    .sort(([, a], [, b]) => b - a)
  for (const [t, n] of recognizedTypes) {
    const display = t.split('/').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('/')
    log.push(`  ${display} × ${n}`)
  }

  const skippedTypes = Object.entries(typeCounts)
    .filter(([t]) => !AZURE_TYPE_MAP[t])
    .sort(([, a], [, b]) => b - a)
  for (const [t, n] of skippedTypes) {
    log.push(`  (skipped) ${t} × ${n}`)
  }

  log.push(`Hierarchy: ${subCount} sub · ${regionCount} region · ${rgCount} RG  |  Subnets extracted: ${subnetCount}`)
  log.push(`Nodes: ${nodes.size}  ·  Edges: ${edges.size}`)

  const edgeSummary = Object.entries(edgeTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([rel, n]) => `${rel} × ${n}`)
    .join('  ·  ')
  if (edgeSummary) log.push(`  ${edgeSummary}`)

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
    sourceFormat: 'azure-json',
    warnings,
    log,
  }
}
