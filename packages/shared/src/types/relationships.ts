/**
 * The complete set of semantic relationship types used in the canonical resource graph.
 *
 * Every edge in the graph carries exactly one RelationshipType. The type encodes
 * the architectural meaning of the connection — not just that two resources are
 * related, but HOW they are related and what that implies for topology reasoning.
 *
 * All edges are directed: source → target. The semantic meaning of direction varies
 * by type; see each member for its specific directional convention.
 *
 * Stability contract: these string values are persisted in exported .azmap files.
 * Changing a string value is a breaking change that will invalidate all existing
 * exports containing that type. Add new values freely; never rename existing ones
 * without a migration strategy.
 */
export enum RelationshipType {
  /**
   * Structural ownership — the source resource hierarchically contains the target.
   *
   * Direction: parent → child
   *
   * The child's lifecycle is tied to the parent: deleting the parent deletes the
   * child. This is the relationship that builds the organisational hierarchy:
   *
   *   Subscription → Region → ResourceGroup → <resource>
   *
   * It also expresses logical structural containment within the network layer:
   *
   *   VirtualNetwork → Subnet
   *   VirtualWAN → VirtualHub
   *   VirtualHub → AzureFirewall (hub-deployed, Secured Virtual Hub mode)
   *   VirtualHub → NetworkVirtualAppliance (hub-deployed NVA)
   *   ContainerAppEnvironment → ContainerApp
   */
  Contains = 'contains',

  /**
   * Peripheral attachment — a resource is connected to another as a functional
   * accessory without that connection being part of either resource's core identity.
   *
   * Direction: attaching resource → the thing it is attached to
   *
   * Neither resource is destroyed when the attachment is removed. The relationship
   * captures "this resource uses that one" rather than "this resource owns that one".
   *
   * Examples:
   *   VirtualMachine → NetworkInterface (VM references the NIC)
   *   NetworkInterface → LoadBalancer  (NIC is registered in a backend pool)
   *   NatGateway → Subnet              (NAT Gateway provides outbound SNAT)
   */
  AttachedTo = 'attached_to',

  /**
   * Network path — the source resource has a direct layer-3 network connection
   * to the target, meaning traffic can flow between them without a gateway.
   *
   * Direction: resource with a network presence → the network it connects to
   *
   * This is the primary relationship for expressing where a resource lives in
   * the network fabric. Used whenever a resource occupies a subnet, injects into
   * a VNet, or acquires a private IP in a particular address space.
   *
   * Examples:
   *   NetworkInterface → Subnet           (NIC's private IP lives here)
   *   AzureFirewall → Subnet              (VNet-deployed: AzureFirewallSubnet)
   *   ApplicationGateway → Subnet         (gateway occupies a dedicated subnet)
   *   BastionHost → Subnet                (AzureBastionSubnet)
   *   VpnGateway → Subnet                 (GatewaySubnet)
   *   KubernetesCluster → Subnet          (agent pool VNet integration)
   *   AppService → Subnet                 (regional VNet integration)
   *   ContainerAppEnvironment → Subnet    (infrastructure subnet injection)
   *   ApiManagementService → Subnet       (Internal / External VNet mode)
   */
  ConnectedTo = 'connected_to',

  /**
   * Security policy application — the target security resource governs
   * inbound and outbound traffic for the source.
   *
   * Direction: protected resource → security control
   *
   * The source is secured BY the target, not the reverse. This directionality
   * enables straightforward queries like "what secures this subnet?" — follow
   * outgoing SecuredBy edges from the Subnet node.
   *
   * Examples:
   *   Subnet → NetworkSecurityGroup   (NSG applied at the subnet level)
   *   NetworkInterface → NetworkSecurityGroup (NSG applied directly to the NIC)
   */
  SecuredBy = 'secured_by',

  /**
   * Traffic routing control — the source routing policy overrides default
   * system routes for traffic egressing from the target network.
   *
   * Direction: routing policy → the network whose routes it controls
   *
   * Azure Route Tables are associated with subnets. When a UDR (User-Defined
   * Route) table is attached, all traffic leaving that subnet consults the table
   * for next-hop decisions before falling through to system defaults.
   *
   * Examples:
   *   RouteTable → Subnet  (UDR applied to subnet egress)
   */
  RoutesTo = 'routes_to',

  /**
   * Virtual Network peering — two VNets have a low-latency, private peering
   * that allows traffic to flow directly between them without a gateway.
   *
   * Direction: the VNet that declared the peering → the remote VNet
   *
   * Azure peering is always configured on both sides: each VNet gets its own
   * peering object. AzMap models the peering as declared in the imported VNet's
   * properties, so a single import may yield one or two directed edges depending
   * on which VNets appear in the export. Rendering layers may treat PeeredWith
   * as visually undirected since traffic flows in both directions.
   *
   * Examples:
   *   VirtualNetwork → VirtualNetwork  (hub-to-spoke or mesh peering)
   */
  PeeredWith = 'peered_with',

  /**
   * Functional dependency — the source resource cannot operate correctly without
   * the target being present and configured.
   *
   * Direction: dependent resource → its dependency
   *
   * Unlike AttachedTo (physical/peripheral), DependsOn expresses a logical or
   * configurational binding. Deleting the dependency will break the source's
   * functionality, even if Azure does not prevent it.
   *
   * Examples:
   *   AzureFirewall → FirewallPolicy  (policy is the firewall's rule set)
   *   AppService → AppServicePlan     (plan provides the compute substrate)
   */
  DependsOn = 'depends_on',

  /**
   * Disaster recovery failover pairing — the source resource's workload is
   * configured to fail over to the target in a DR event.
   *
   * Direction: primary resource → failover target
   *
   * Reserved for explicit DR configuration such as Azure Site Recovery (ASR)
   * pairings or database geo-replication. It is not yet extracted by the
   * normalizer because the Azure replication topology APIs require separate
   * calls beyond what a standard resource export contains. The type is defined
   * here so future normalizer passes can populate it without changing the schema.
   *
   * Examples:
   *   VirtualMachine → VirtualMachine  (ASR replication: primary → replica)
   *   SqlDatabase → SqlDatabase        (active geo-replication primary → secondary)
   */
  FailsOverTo = 'fails_over_to',
}
