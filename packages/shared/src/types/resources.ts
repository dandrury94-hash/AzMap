/**
 * The canonical set of Azure resource types that AzMap can model.
 *
 * ResourceType is the single authoritative label used throughout the entire
 * system — stored in GraphNode.type, keyed in nodeConfig, counted in Dashboard,
 * and persisted in exported .azmap files.
 *
 * Design notes:
 *
 * - String values intentionally equal their enum key (e.g. `VirtualMachine =
 *   'VirtualMachine'`). This keeps serialized .azmap files human-readable and
 *   makes debugging straightforward — you see the same string everywhere: in
 *   the file, in the store, in the UI.
 *
 * - Stability contract: these strings are persisted in .azmap exports. Renaming
 *   a string value is a breaking change that invalidates all existing exports
 *   containing that type. Add new values freely; never rename an existing value
 *   without a migration path.
 *
 * - The mapping from raw Azure ARM type strings (e.g.
 *   'microsoft.compute/virtualmachines') to ResourceType lives exclusively in
 *   AZURE_TYPE_MAP inside jsonNormalizer.ts — one place, one lookup, no
 *   duplication. Unknown ARM types are silently skipped rather than warned
 *   about, because real Azure environments always contain unmodeled types.
 *
 * - nodeConfig.ts is typed as Record<ResourceType, NodeConfig>, which means
 *   adding a new ResourceType here without a matching nodeConfig entry is a
 *   TypeScript compile error. This prevents "invisible" node types.
 */
export enum ResourceType {
  // ── Organisational ──────────────────────────────────────────────────────────
  // Synthetic hierarchy nodes created by the normalizer on demand as regular
  // resources are encountered. They are never in Azure exports directly.
  ManagementGroup = 'ManagementGroup',
  Subscription    = 'Subscription',
  Region          = 'Region',
  ResourceGroup   = 'ResourceGroup',

  // ── Compute ──────────────────────────────────────────────────────────────────
  // Microsoft.Compute and related providers covering virtual machines,
  // scale sets, dedicated infrastructure, and batch processing.
  VirtualMachine         = 'VirtualMachine',
  VirtualMachineScaleSet = 'VirtualMachineScaleSet',
  AvailabilitySet        = 'AvailabilitySet',
  ManagedDisk            = 'ManagedDisk',
  DedicatedHostGroup     = 'DedicatedHostGroup',
  DedicatedHost          = 'DedicatedHost',
  BatchAccount           = 'BatchAccount',
  ServiceFabricCluster   = 'ServiceFabricCluster',

  // ── Containers & orchestration ───────────────────────────────────────────────
  // Microsoft.ContainerService, Microsoft.ContainerInstance,
  // Microsoft.ContainerRegistry, and Microsoft.App.
  KubernetesCluster       = 'KubernetesCluster',
  ContainerGroup          = 'ContainerGroup',
  ContainerRegistry       = 'ContainerRegistry',
  ContainerAppEnvironment = 'ContainerAppEnvironment',
  ContainerApp            = 'ContainerApp',

  // ── App platform ─────────────────────────────────────────────────────────────
  // Microsoft.Web — PaaS application hosting and serverless compute.
  AppService            = 'AppService',
  AppServicePlan        = 'AppServicePlan',
  AppServiceEnvironment = 'AppServiceEnvironment',
  StaticWebApp          = 'StaticWebApp',

  // ── Core networking ──────────────────────────────────────────────────────────
  // The fundamental Microsoft.Network building blocks: virtual networks,
  // their subdivisions, interfaces, and associated security/routing objects.
  // Note: Subnet nodes are synthetic — they are extracted from the embedded
  // subnets array inside a VirtualNetwork resource rather than imported directly.
  VirtualNetwork            = 'VirtualNetwork',
  Subnet                    = 'Subnet',
  NetworkInterface          = 'NetworkInterface',
  NetworkSecurityGroup      = 'NetworkSecurityGroup',
  ApplicationSecurityGroup  = 'ApplicationSecurityGroup',
  PublicIpAddress           = 'PublicIpAddress',
  PublicIpPrefix            = 'PublicIpPrefix',
  RouteTable                = 'RouteTable',
  NatGateway                = 'NatGateway',
  DdosProtectionPlan        = 'DdosProtectionPlan',
  NetworkWatcher            = 'NetworkWatcher',
  IpGroup                   = 'IpGroup',

  // ── DNS ──────────────────────────────────────────────────────────────────────
  DnsZone        = 'DnsZone',
  PrivateDnsZone = 'PrivateDnsZone',

  // ── WAN / hub-and-spoke ──────────────────────────────────────────────────────
  // Microsoft.Network Virtual WAN and the hubs that attach to it.
  // A VirtualHub is always contained by a VirtualWAN.
  VirtualWan = 'VirtualWan',
  VirtualHub = 'VirtualHub',

  // ── Traffic management & CDN ─────────────────────────────────────────────────
  // Global load balancing, front-door routing, and content delivery.
  TrafficManagerProfile = 'TrafficManagerProfile',
  FrontDoor             = 'FrontDoor',
  CdnProfile            = 'CdnProfile',

  // ── Network security & inspection ────────────────────────────────────────────
  // Stateful firewalls and network virtual appliances.
  // AzureFirewall can be VNet-deployed (in AzureFirewallSubnet) or
  // hub-deployed (in Secured Virtual Hub mode, owned by a VirtualHub).
  AzureFirewall           = 'AzureFirewall',
  FirewallPolicy          = 'FirewallPolicy',
  NetworkVirtualAppliance = 'NetworkVirtualAppliance',

  // ── Load balancing & gateways ────────────────────────────────────────────────
  // Inbound traffic distribution, VPN/ExpressRoute termination,
  // and site-to-site connectivity.
  LoadBalancer        = 'LoadBalancer',
  ApplicationGateway  = 'ApplicationGateway',
  VpnGateway          = 'VpnGateway',
  LocalNetworkGateway = 'LocalNetworkGateway',
  GatewayConnection   = 'GatewayConnection',
  ExpressRouteCircuit = 'ExpressRouteCircuit',

  // ── Private connectivity ─────────────────────────────────────────────────────
  // Private Endpoints bring PaaS service traffic onto the VNet fabric.
  // Bastion provides secure, browser-based RDP/SSH without a public IP on VMs.
  PrivateEndpoint = 'PrivateEndpoint',
  BastionHost     = 'BastionHost',

  // ── Storage ──────────────────────────────────────────────────────────────────
  StorageAccount = 'StorageAccount',
  NetAppAccount  = 'NetAppAccount',

  // ── Databases & caching ──────────────────────────────────────────────────────
  // Both legacy (microsoft.dbforpostgresql/servers) and flexible server
  // variants (microsoft.dbforpostgresql/flexibleservers) map to the same
  // ResourceType so imports from either API version are handled transparently.
  SqlServer          = 'SqlServer',
  SqlDatabase        = 'SqlDatabase',
  SqlManagedInstance = 'SqlManagedInstance',
  CosmosDbAccount    = 'CosmosDbAccount',
  PostgreSqlServer   = 'PostgreSqlServer',
  MySqlServer        = 'MySqlServer',
  MariaDbServer      = 'MariaDbServer',
  RedisCache         = 'RedisCache',
  SynapseWorkspace   = 'SynapseWorkspace',

  // ── Security resources ───────────────────────────────────────────────────────
  KeyVault = 'KeyVault',

  // ── Identity ─────────────────────────────────────────────────────────────────
  UserAssignedIdentity = 'UserAssignedIdentity',

  // ── Integration & messaging ──────────────────────────────────────────────────
  // Middleware, event streaming, pub/sub, and workflow orchestration.
  ApiManagementService      = 'ApiManagementService',
  EventHubNamespace         = 'EventHubNamespace',
  ServiceBusNamespace       = 'ServiceBusNamespace',
  EventGridTopic            = 'EventGridTopic',
  EventGridDomain           = 'EventGridDomain',
  LogicApp                  = 'LogicApp',
  RelayNamespace            = 'RelayNamespace',
  NotificationHubNamespace  = 'NotificationHubNamespace',
  SignalRService             = 'SignalRService',

  // ── Analytics ────────────────────────────────────────────────────────────────
  // Big-data processing, ETL pipelines, and analytical query engines.
  DatabricksWorkspace    = 'DatabricksWorkspace',
  DataFactory            = 'DataFactory',
  DataExplorerCluster    = 'DataExplorerCluster',
  HDInsightCluster       = 'HDInsightCluster',
  StreamAnalyticsJob     = 'StreamAnalyticsJob',
  AnalysisServicesServer = 'AnalysisServicesServer',
  PurviewAccount         = 'PurviewAccount',

  // ── AI & machine learning ────────────────────────────────────────────────────
  MachineLearningWorkspace = 'MachineLearningWorkspace',
  CognitiveServicesAccount = 'CognitiveServicesAccount',
  SearchService            = 'SearchService',
  BotService               = 'BotService',
  AzureOpenAIService       = 'AzureOpenAIService',

  // ── IoT ──────────────────────────────────────────────────────────────────────
  IoTHub                    = 'IoTHub',
  DeviceProvisioningService = 'DeviceProvisioningService',
  DigitalTwinsInstance      = 'DigitalTwinsInstance',
  IoTCentralApp             = 'IoTCentralApp',

  // ── Monitoring & operations ──────────────────────────────────────────────────
  // Observability, automation, and backup infrastructure.
  LogAnalyticsWorkspace        = 'LogAnalyticsWorkspace',
  ApplicationInsightsComponent = 'ApplicationInsightsComponent',
  AutomationAccount            = 'AutomationAccount',
  RecoveryServicesVault        = 'RecoveryServicesVault',

  // ── Hybrid & Arc ─────────────────────────────────────────────────────────────
  // Resources managed by Azure Arc running outside Azure datacenters.
  ArcServer            = 'ArcServer',
  ArcKubernetesCluster = 'ArcKubernetesCluster',
  AzureLocalCluster    = 'AzureLocalCluster',
}
