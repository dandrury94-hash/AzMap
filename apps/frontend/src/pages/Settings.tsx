import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RelationshipType, ResourceType } from '@azmap/shared'
import { useGraphStore } from '../store/graphStore'
import { useSettingsStore } from '../store/settingsStore'
import { EDGE_META } from '../topology/toFlowElements'

// ─── Data ─────────────────────────────────────────────────────────────────────

type ResourceRow = {
  type: string        // ResourceType enum value
  displayName: string // human-readable label
  armType: string     // full ARM type (lowercased), or "(synthetic)" / "(embedded in VNet)"
  layer: string       // AzMap Tutorial layer this resource belongs to
  notes?: string      // optional clarification
}

function provider(armType: string): string {
  if (armType.startsWith('(')) return '—'
  const ns = armType.split('/')[0]
  return ns.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('.')
}

const RESOURCES: ResourceRow[] = [
  // ── Identity & Management ──────────────────────────────────────────────────
  { type: 'ManagementGroup',              displayName: 'Management Group',           armType: 'microsoft.management/managementgroups',             layer: 'Identity & Management' },
  { type: 'Subscription',                 displayName: 'Subscription',               armType: '(synthetic)',                                       layer: 'Identity & Management',  notes: 'Created on-demand from subscription IDs found in imported resources' },
  { type: 'Region',                        displayName: 'Region',                     armType: '(synthetic)',                                       layer: 'Identity & Management',  notes: 'Created on-demand from resource location fields' },
  { type: 'ResourceGroup',                displayName: 'Resource Group',             armType: '(synthetic)',                                       layer: 'Identity & Management',  notes: 'Created on-demand from resource group names' },
  { type: 'LogAnalyticsWorkspace',        displayName: 'Log Analytics Workspace',    armType: 'microsoft.operationalinsights/workspaces',          layer: 'Identity & Management' },
  { type: 'ApplicationInsightsComponent', displayName: 'Application Insights',       armType: 'microsoft.insights/components',                     layer: 'Identity & Management' },
  { type: 'AutomationAccount',            displayName: 'Automation Account',         armType: 'microsoft.automation/automationaccounts',           layer: 'Identity & Management' },

  // ── Network Topology ───────────────────────────────────────────────────────
  { type: 'VirtualNetwork',        displayName: 'Virtual Network',          armType: 'microsoft.network/virtualnetworks',                 layer: 'Network Topology' },
  { type: 'Subnet',                displayName: 'Subnet',                   armType: '(embedded in VNet)',                                layer: 'Network Topology',  notes: 'Extracted from VNet properties.subnets — not a top-level ARM resource' },
  { type: 'NetworkInterface',      displayName: 'Network Interface',        armType: 'microsoft.network/networkinterfaces',               layer: 'Network Topology' },
  { type: 'PublicIpAddress',       displayName: 'Public IP Address',        armType: 'microsoft.network/publicipaddresses',               layer: 'Network Topology' },
  { type: 'PublicIpPrefix',        displayName: 'Public IP Prefix',         armType: 'microsoft.network/publicipprefixes',                layer: 'Network Topology' },
  { type: 'RouteTable',            displayName: 'Route Table',              armType: 'microsoft.network/routetables',                     layer: 'Network Topology' },
  { type: 'NatGateway',            displayName: 'NAT Gateway',              armType: 'microsoft.network/natgateways',                     layer: 'Network Topology' },
  { type: 'DnsZone',               displayName: 'DNS Zone',                 armType: 'microsoft.network/dnszones',                        layer: 'Network Topology' },
  { type: 'PrivateDnsZone',        displayName: 'Private DNS Zone',         armType: 'microsoft.network/privatednszones',                 layer: 'Network Topology' },
  { type: 'VirtualWan',            displayName: 'Virtual WAN',              armType: 'microsoft.network/virtualwans',                     layer: 'Network Topology' },
  { type: 'VirtualHub',            displayName: 'Virtual Hub',              armType: 'microsoft.network/virtualhubs',                     layer: 'Network Topology' },
  { type: 'TrafficManagerProfile', displayName: 'Traffic Manager Profile',  armType: 'microsoft.network/trafficmanagerprofiles',          layer: 'Network Topology' },
  { type: 'FrontDoor',             displayName: 'Front Door',               armType: 'microsoft.network/frontdoors',                      layer: 'Network Topology' },
  { type: 'CdnProfile',            displayName: 'CDN Profile',              armType: 'microsoft.cdn/profiles',                            layer: 'Network Topology' },
  { type: 'LoadBalancer',          displayName: 'Load Balancer',            armType: 'microsoft.network/loadbalancers',                   layer: 'Network Topology' },
  { type: 'ApplicationGateway',    displayName: 'Application Gateway',      armType: 'microsoft.network/applicationgateways',             layer: 'Network Topology' },
  { type: 'VpnGateway',            displayName: 'VPN / ER Gateway',         armType: 'microsoft.network/virtualnetworkgateways',          layer: 'Network Topology',  notes: 'Also maps /vpngateways and /expressroutegateways (vWAN variants)' },
  { type: 'LocalNetworkGateway',   displayName: 'Local Network Gateway',    armType: 'microsoft.network/localnetworkgateways',            layer: 'Network Topology' },
  { type: 'GatewayConnection',     displayName: 'Gateway Connection',       armType: 'microsoft.network/connections',                     layer: 'Network Topology' },
  { type: 'ExpressRouteCircuit',   displayName: 'ExpressRoute Circuit',     armType: 'microsoft.network/expressroutecircuits',            layer: 'Network Topology' },

  // ── Security ───────────────────────────────────────────────────────────────
  { type: 'NetworkSecurityGroup',     displayName: 'Network Security Group',    armType: 'microsoft.network/networksecuritygroups',           layer: 'Security' },
  { type: 'ApplicationSecurityGroup', displayName: 'Application Security Group',armType: 'microsoft.network/applicationsecuritygroups',      layer: 'Security' },
  { type: 'AzureFirewall',            displayName: 'Azure Firewall',            armType: 'microsoft.network/azurefirewalls',                  layer: 'Security' },
  { type: 'FirewallPolicy',           displayName: 'Firewall Policy',           armType: 'microsoft.network/firewallpolicies',                layer: 'Security' },
  { type: 'NetworkVirtualAppliance',  displayName: 'Network Virtual Appliance', armType: 'microsoft.network/networkvirtualappliances',        layer: 'Security' },
  { type: 'DdosProtectionPlan',       displayName: 'DDoS Protection Plan',      armType: 'microsoft.network/ddosprotectionplans',             layer: 'Security' },
  { type: 'NetworkWatcher',           displayName: 'Network Watcher',           armType: 'microsoft.network/networkwatchers',                 layer: 'Security' },
  { type: 'IpGroup',                  displayName: 'IP Group',                  armType: 'microsoft.network/ipgroups',                        layer: 'Security' },
  { type: 'PrivateEndpoint',          displayName: 'Private Endpoint',          armType: 'microsoft.network/privateendpoints',                layer: 'Security' },
  { type: 'BastionHost',              displayName: 'Bastion Host',              armType: 'microsoft.network/bastionhosts',                    layer: 'Security' },
  { type: 'KeyVault',                 displayName: 'Key Vault',                 armType: 'microsoft.keyvault/vaults',                         layer: 'Security' },
  { type: 'UserAssignedIdentity',     displayName: 'User-Assigned Identity',    armType: 'microsoft.managedidentity/userassignedidentities',  layer: 'Security' },

  // ── Compute & Workloads ────────────────────────────────────────────────────
  { type: 'VirtualMachine',          displayName: 'Virtual Machine',          armType: 'microsoft.compute/virtualmachines',                 layer: 'Compute & Workloads' },
  { type: 'VirtualMachineScaleSet',  displayName: 'VM Scale Set',             armType: 'microsoft.compute/virtualmachinescalesets',         layer: 'Compute & Workloads' },
  { type: 'AvailabilitySet',         displayName: 'Availability Set',         armType: 'microsoft.compute/availabilitysets',                layer: 'Compute & Workloads' },
  { type: 'ManagedDisk',             displayName: 'Managed Disk',             armType: 'microsoft.compute/disks',                           layer: 'Compute & Workloads' },
  { type: 'DedicatedHostGroup',      displayName: 'Dedicated Host Group',     armType: 'microsoft.compute/hostgroups',                      layer: 'Compute & Workloads' },
  { type: 'DedicatedHost',           displayName: 'Dedicated Host',           armType: 'microsoft.compute/hostgroups/hosts',                layer: 'Compute & Workloads' },
  { type: 'BatchAccount',            displayName: 'Batch Account',            armType: 'microsoft.batch/batchaccounts',                     layer: 'Compute & Workloads' },
  { type: 'ServiceFabricCluster',    displayName: 'Service Fabric Cluster',   armType: 'microsoft.servicefabric/clusters',                  layer: 'Compute & Workloads' },
  { type: 'KubernetesCluster',       displayName: 'AKS Cluster',              armType: 'microsoft.containerservice/managedclusters',        layer: 'Compute & Workloads' },
  { type: 'ContainerGroup',          displayName: 'Container Instance',       armType: 'microsoft.containerinstance/containergroups',       layer: 'Compute & Workloads' },
  { type: 'ContainerRegistry',       displayName: 'Container Registry',       armType: 'microsoft.containerregistry/registries',            layer: 'Compute & Workloads' },
  { type: 'ContainerAppEnvironment', displayName: 'Container App Environment',armType: 'microsoft.app/managedenvironments',                 layer: 'Compute & Workloads' },
  { type: 'ContainerApp',            displayName: 'Container App',            armType: 'microsoft.app/containerapps',                       layer: 'Compute & Workloads' },
  { type: 'StorageAccount',          displayName: 'Storage Account',          armType: 'microsoft.storage/storageaccounts',                 layer: 'Compute & Workloads' },
  { type: 'NetAppAccount',           displayName: 'Azure NetApp Files',       armType: 'microsoft.netapp/netappaccounts',                   layer: 'Compute & Workloads' },
  { type: 'SqlServer',               displayName: 'SQL Server',               armType: 'microsoft.sql/servers',                             layer: 'Compute & Workloads' },
  { type: 'SqlDatabase',             displayName: 'SQL Database',             armType: 'microsoft.sql/servers/databases',                   layer: 'Compute & Workloads' },
  { type: 'SqlManagedInstance',      displayName: 'SQL Managed Instance',     armType: 'microsoft.sql/managedinstances',                    layer: 'Compute & Workloads' },
  { type: 'CosmosDbAccount',         displayName: 'Cosmos DB Account',        armType: 'microsoft.documentdb/databaseaccounts',             layer: 'Compute & Workloads' },
  { type: 'PostgreSqlServer',        displayName: 'PostgreSQL Server',        armType: 'microsoft.dbforpostgresql/flexibleservers',         layer: 'Compute & Workloads',  notes: 'Also maps /servers (classic single-server)' },
  { type: 'MySqlServer',             displayName: 'MySQL Server',             armType: 'microsoft.dbformysql/flexibleservers',              layer: 'Compute & Workloads',  notes: 'Also maps /servers (classic single-server)' },
  { type: 'MariaDbServer',           displayName: 'MariaDB Server',           armType: 'microsoft.dbformariadb/servers',                    layer: 'Compute & Workloads' },
  { type: 'RedisCache',              displayName: 'Redis Cache',              armType: 'microsoft.cache/redis',                             layer: 'Compute & Workloads' },
  { type: 'SynapseWorkspace',        displayName: 'Synapse Workspace',        armType: 'microsoft.synapse/workspaces',                      layer: 'Compute & Workloads' },
  { type: 'ArcServer',               displayName: 'Arc-enabled Server',       armType: 'microsoft.hybridcompute/machines',                  layer: 'Compute & Workloads' },
  { type: 'ArcKubernetesCluster',    displayName: 'Arc Kubernetes Cluster',   armType: 'microsoft.kubernetes/connectedclusters',            layer: 'Compute & Workloads' },
  { type: 'AzureLocalCluster',       displayName: 'Azure Local (HCI)',        armType: 'microsoft.azurestackhci/clusters',                  layer: 'Compute & Workloads' },

  // ── Microservices ──────────────────────────────────────────────────────────
  { type: 'AppService',              displayName: 'App Service',              armType: 'microsoft.web/sites',                               layer: 'Microservices',  notes: 'Covers Web Apps and Function Apps — same ARM type, different kind field' },
  { type: 'AppServicePlan',          displayName: 'App Service Plan',         armType: 'microsoft.web/serverfarms',                         layer: 'Microservices' },
  { type: 'AppServiceEnvironment',   displayName: 'App Service Environment',  armType: 'microsoft.web/hostingenvironments',                 layer: 'Microservices' },
  { type: 'StaticWebApp',            displayName: 'Static Web App',           armType: 'microsoft.web/staticsites',                         layer: 'Microservices' },
  { type: 'ApiManagementService',    displayName: 'API Management',           armType: 'microsoft.apimanagement/service',                   layer: 'Microservices' },
  { type: 'LogicApp',                displayName: 'Logic App',                armType: 'microsoft.logic/workflows',                         layer: 'Microservices',  notes: 'Also maps microsoft.app/logicapps (Standard Logic Apps)' },
  { type: 'RelayNamespace',          displayName: 'Relay Namespace',          armType: 'microsoft.relay/namespaces',                        layer: 'Microservices' },
  { type: 'EventHubNamespace',       displayName: 'Event Hub Namespace',      armType: 'microsoft.eventhub/namespaces',                     layer: 'Microservices' },
  { type: 'ServiceBusNamespace',     displayName: 'Service Bus Namespace',    armType: 'microsoft.servicebus/namespaces',                   layer: 'Microservices' },
  { type: 'EventGridTopic',          displayName: 'Event Grid Topic',         armType: 'microsoft.eventgrid/topics',                        layer: 'Microservices' },
  { type: 'EventGridDomain',         displayName: 'Event Grid Domain',        armType: 'microsoft.eventgrid/domains',                       layer: 'Microservices' },
  { type: 'NotificationHubNamespace',displayName: 'Notification Hub Namespace',armType: 'microsoft.notificationhubs/namespaces',            layer: 'Microservices' },
  { type: 'SignalRService',          displayName: 'SignalR Service',          armType: 'microsoft.signalrservice/signalr',                  layer: 'Microservices',  notes: 'Also maps /webpubsub (Web PubSub)' },

  // ── Analytics, AI & IoT ────────────────────────────────────────────────────
  { type: 'DatabricksWorkspace',      displayName: 'Databricks Workspace',    armType: 'microsoft.databricks/workspaces',                   layer: 'Analytics, AI & IoT' },
  { type: 'DataFactory',              displayName: 'Data Factory',            armType: 'microsoft.datafactory/factories',                   layer: 'Analytics, AI & IoT' },
  { type: 'DataExplorerCluster',      displayName: 'Data Explorer Cluster',   armType: 'microsoft.kusto/clusters',                          layer: 'Analytics, AI & IoT' },
  { type: 'HDInsightCluster',         displayName: 'HDInsight Cluster',       armType: 'microsoft.hdinsight/clusters',                      layer: 'Analytics, AI & IoT' },
  { type: 'StreamAnalyticsJob',       displayName: 'Stream Analytics Job',    armType: 'microsoft.streamanalytics/streamingjobs',           layer: 'Analytics, AI & IoT' },
  { type: 'AnalysisServicesServer',   displayName: 'Analysis Services',       armType: 'microsoft.analysisservices/servers',                layer: 'Analytics, AI & IoT' },
  { type: 'PurviewAccount',           displayName: 'Purview Account',         armType: 'microsoft.purview/accounts',                        layer: 'Analytics, AI & IoT' },
  { type: 'MachineLearningWorkspace', displayName: 'ML Workspace',            armType: 'microsoft.machinelearningservices/workspaces',      layer: 'Analytics, AI & IoT' },
  { type: 'CognitiveServicesAccount', displayName: 'Cognitive Services',      armType: 'microsoft.cognitiveservices/accounts',              layer: 'Analytics, AI & IoT',  notes: 'Includes Azure OpenAI deployments — kind field distinguishes service type' },
  { type: 'AzureOpenAIService',       displayName: 'Azure OpenAI',            armType: 'microsoft.openai/accounts',                         layer: 'Analytics, AI & IoT' },
  { type: 'SearchService',            displayName: 'Azure AI Search',         armType: 'microsoft.search/searchservices',                   layer: 'Analytics, AI & IoT' },
  { type: 'BotService',               displayName: 'Bot Service',             armType: 'microsoft.botservice/botservices',                  layer: 'Analytics, AI & IoT' },
  { type: 'IoTHub',                   displayName: 'IoT Hub',                 armType: 'microsoft.devices/iothubs',                         layer: 'Analytics, AI & IoT' },
  { type: 'DeviceProvisioningService',displayName: 'Device Provisioning',     armType: 'microsoft.devices/provisioningservices',            layer: 'Analytics, AI & IoT' },
  { type: 'DigitalTwinsInstance',     displayName: 'Digital Twins',           armType: 'microsoft.digitaltwins/digitaltwininstances',       layer: 'Analytics, AI & IoT' },
  { type: 'IoTCentralApp',            displayName: 'IoT Central App',         armType: 'microsoft.iotcentral/iotapps',                      layer: 'Analytics, AI & IoT' },

  // ── BCP / DR ───────────────────────────────────────────────────────────────
  { type: 'RecoveryServicesVault',   displayName: 'Recovery Services Vault', armType: 'microsoft.recoveryservices/vaults',                 layer: 'BCP / DR' },
]

// ─── Layer config ─────────────────────────────────────────────────────────────

type LayerMeta = { label: string; color: string; bg: string; border: string }

const LAYERS: LayerMeta[] = [
  { label: 'Identity & Management',  color: 'text-blue-300',   bg: 'bg-blue-950/40',    border: 'border-blue-800/50'  },
  { label: 'Network Topology',       color: 'text-cyan-300',   bg: 'bg-cyan-950/40',    border: 'border-cyan-800/50'  },
  { label: 'Security',               color: 'text-orange-300', bg: 'bg-orange-950/40',  border: 'border-orange-800/50'},
  { label: 'Compute & Workloads',    color: 'text-violet-300', bg: 'bg-violet-950/40',  border: 'border-violet-800/50'},
  { label: 'Microservices',          color: 'text-emerald-300',bg: 'bg-emerald-950/40', border: 'border-emerald-800/50'},
  { label: 'Analytics, AI & IoT',   color: 'text-amber-300',  bg: 'bg-amber-950/40',   border: 'border-amber-800/50' },
  { label: 'BCP / DR',              color: 'text-rose-300',   bg: 'bg-rose-950/40',    border: 'border-rose-800/50'  },
]

const LAYER_MAP = new Map<string, LayerMeta>(LAYERS.map(l => [l.label, l]))

// ─── Organisational resource types — always visible, excluded from type filter ─

const ORG_TYPES = new Set<string>([
  'ManagementGroup', 'Subscription', 'Region', 'ResourceGroup',
])

// ─── Edge visibility section ───────────────────────────────────────────────────

const VISIBLE_EDGE_TYPES = (Object.values(RelationshipType) as RelationshipType[])
  .filter(t => t !== RelationshipType.Contains)

function EdgeSwatch({ stroke, strokeDasharray }: { stroke: string; strokeDasharray?: string }) {
  return (
    <svg width="32" height="14" className="shrink-0">
      <line
        x1="2" y1="7" x2="30" y2="7"
        stroke={stroke}
        strokeWidth="2"
        strokeDasharray={strokeDasharray}
      />
    </svg>
  )
}

function EdgeVisibilitySection() {
  const hiddenEdgeTypes = useSettingsStore(s => s.hiddenEdgeTypes)
  const toggleEdgeType  = useSettingsStore(s => s.toggleEdgeType)

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Edge Visibility</h2>
        <p className="text-sm text-gray-500 mt-1">
          Choose which relationship types are drawn on the topology canvas.
          Hidden edges still influence the layout but are not rendered.
        </p>
      </div>

      <div className="border border-gray-800 rounded-lg divide-y divide-gray-800 max-w-lg">
        {VISIBLE_EDGE_TYPES.map(t => {
          const meta    = EDGE_META[t]
          const hidden  = hiddenEdgeTypes.includes(t)
          return (
            <label
              key={t}
              className="flex items-center gap-4 px-4 py-2.5 cursor-pointer hover:bg-gray-800/40 transition-colors"
            >
              <input
                type="checkbox"
                checked={!hidden}
                onChange={() => toggleEdgeType(t)}
                className="accent-blue-500 shrink-0"
              />
              <EdgeSwatch stroke={meta.stroke} strokeDasharray={meta.strokeDasharray} />
              <span className="text-sm text-gray-300">{meta.label}</span>
            </label>
          )
        })}
      </div>
    </section>
  )
}

// ─── Resource type visibility section ─────────────────────────────────────────

function ResourceVisibilitySection({
  resources, layers,
}: { resources: ResourceRow[]; layers: LayerMeta[] }) {
  const hiddenResourceTypes = useSettingsStore(s => s.hiddenResourceTypes)
  const toggleResourceType  = useSettingsStore(s => s.toggleResourceType)

  const filterableResources = resources.filter(r => !ORG_TYPES.has(r.type))
  const grouped = layers
    .map(meta => ({ meta, rows: filterableResources.filter(r => r.layer === meta.label) }))
    .filter(g => g.rows.length > 0)

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Resource Visibility</h2>
        <p className="text-sm text-gray-500 mt-1">
          Hide entire resource types from the canvas. Organisational containers
          (subscriptions, regions, resource groups) are always shown.
        </p>
      </div>

      <div className="space-y-4">
        {grouped.map(({ meta, rows }) => {
          const allHidden  = rows.every(r => hiddenResourceTypes.includes(r.type as ResourceType))
          const noneHidden = rows.every(r => !hiddenResourceTypes.includes(r.type as ResourceType))

          function toggleAll() {
            rows.forEach(r => {
              const isHidden = hiddenResourceTypes.includes(r.type as ResourceType)
              if (allHidden ? isHidden : !isHidden) toggleResourceType(r.type as ResourceType)
            })
          }

          return (
            <div key={meta.label} className="border border-gray-800 rounded-lg overflow-hidden">
              <div className={`flex items-center justify-between px-4 py-2 ${meta.bg} border-b ${meta.border}`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                <button
                  onClick={toggleAll}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {allHidden ? 'Show all' : noneHidden ? 'Hide all' : 'Hide all'}
                </button>
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-800/60">
                {rows.map(r => {
                  const hidden = hiddenResourceTypes.includes(r.type as ResourceType)
                  return (
                    <label
                      key={r.type}
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-800/40 transition-colors border-b border-gray-800/60"
                    >
                      <input
                        type="checkbox"
                        checked={!hidden}
                        onChange={() => toggleResourceType(r.type as ResourceType)}
                        className="accent-blue-500 shrink-0"
                      />
                      <span className="text-xs text-gray-300 truncate">{r.displayName}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Layout controls section ───────────────────────────────────────────────────

function LayoutControlsSection() {
  const chainLayoutEnabled = useSettingsStore(s => s.chainLayoutEnabled)
  const maxChainDepth      = useSettingsStore(s => s.maxChainDepth)
  const maxLeafCols        = useSettingsStore(s => s.maxLeafCols)
  const setChainLayoutEnabled = useSettingsStore(s => s.setChainLayoutEnabled)
  const setMaxChainDepth      = useSettingsStore(s => s.setMaxChainDepth)
  const setMaxLeafCols        = useSettingsStore(s => s.setMaxLeafCols)
  const resetLayout           = useSettingsStore(s => s.resetLayout)

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Layout Controls</h2>
        <p className="text-sm text-gray-500 mt-1">
          Adjust how resources are arranged inside resource group cards.
          Changes take effect immediately on the topology canvas.
        </p>
      </div>

      <div className="border border-gray-800 rounded-lg divide-y divide-gray-800 max-w-lg">
        {/* Chain layout toggle */}
        <label className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-800/40 transition-colors">
          <div>
            <p className="text-sm text-gray-200">Chain layout</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Arrange connected resources in left-to-right chains instead of a flat grid.
            </p>
          </div>
          <input
            type="checkbox"
            checked={chainLayoutEnabled}
            onChange={e => setChainLayoutEnabled(e.target.checked)}
            className="accent-blue-500 w-4 h-4 shrink-0"
          />
        </label>

        {/* Max chain depth */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm text-gray-200">Max chain depth</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Maximum columns per chain. Deeper nodes fall into the grid below.{' '}
              <span className="text-gray-600">0 = unlimited</span>
            </p>
          </div>
          <input
            type="number"
            min={0}
            max={10}
            value={maxChainDepth}
            onChange={e => setMaxChainDepth(Number(e.target.value))}
            disabled={!chainLayoutEnabled}
            className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 text-center focus:outline-none focus:border-blue-600 disabled:opacity-40"
          />
        </div>

        {/* Max grid columns */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm text-gray-200">Grid columns</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Max columns for the remainder grid and non-chain containers (1–8).
            </p>
          </div>
          <input
            type="number"
            min={1}
            max={8}
            value={maxLeafCols}
            onChange={e => setMaxLeafCols(Number(e.target.value))}
            className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 text-center focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Reset */}
        <div className="px-4 py-3">
          <button
            onClick={resetLayout}
            className="px-3 py-1.5 rounded border border-gray-700 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Settings() {
  const [query, setQuery]       = useState('')
  const [layerFilter, setLayer] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const navigate    = useNavigate()
  const nodes       = useGraphStore(s => s.nodes)
  const sourceLabel = useGraphStore(s => s.sourceLabel)
  const importedAt  = useGraphStore(s => s.importedAt)
  const importCount = useGraphStore(s => s.importCount)
  const clearGraph  = useGraphStore(s => s.clearGraph)

  function handleClear() {
    clearGraph()
    setConfirmClear(false)
  }

  const q = query.toLowerCase().trim()

  const rows = RESOURCES.filter(r => {
    if (layerFilter && r.layer !== layerFilter) return false
    if (!q) return true
    return (
      r.type.toLowerCase().includes(q) ||
      r.displayName.toLowerCase().includes(q) ||
      r.armType.toLowerCase().includes(q) ||
      provider(r.armType).toLowerCase().includes(q) ||
      r.layer.toLowerCase().includes(q) ||
      (r.notes ?? '').toLowerCase().includes(q)
    )
  })

  // Group by layer preserving LAYERS order
  const grouped = LAYERS
    .map(meta => ({ meta, rows: rows.filter(r => r.layer === meta.label) }))
    .filter(g => g.rows.length > 0)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-10 pt-8 pb-6 border-b border-gray-800">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Reference tables and application configuration.</p>
      </div>

      <div className="px-10 py-8 space-y-10">

        {/* Data Management */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Data Management</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage the currently loaded topology graph.
            </p>
          </div>

          {sourceLabel ? (
            <div className="border border-gray-700 rounded-lg px-5 py-4 max-w-lg">
              <div className="space-y-1 mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-500 w-24 shrink-0">Last file</span>
                  <span className="text-sm text-gray-200 font-medium">{sourceLabel}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-500 w-24 shrink-0">Files loaded</span>
                  <span className="text-sm text-gray-400">{importCount}</span>
                </div>
                {importedAt && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-500 w-24 shrink-0">Last import</span>
                    <span className="text-sm text-gray-400">{new Date(importedAt).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-500 w-24 shrink-0">Nodes</span>
                  <span className="text-sm text-gray-400">{nodes.length}</span>
                </div>
              </div>

              {!confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="px-4 py-1.5 rounded border border-gray-700 text-xs text-gray-400 hover:border-red-800 hover:text-red-400 transition-colors"
                >
                  Clear imported data
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">Remove all imported data?</span>
                  <button
                    onClick={handleClear}
                    className="px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-xs text-white transition-colors"
                  >
                    Yes, clear
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1 rounded border border-gray-700 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-gray-800 rounded-lg px-5 py-4 max-w-lg text-sm text-gray-500">
              No data loaded.{' '}
              <button onClick={() => navigate('/import')} className="text-blue-400 hover:text-blue-300 underline transition-colors">
                Import a file
              </button>{' '}
              to get started.
            </div>
          )}
        </section>

        {/* Edge Visibility */}
        <EdgeVisibilitySection />

        {/* Resource Type Visibility */}
        <ResourceVisibilitySection resources={RESOURCES} layers={LAYERS} />

        {/* Layout Controls */}
        <LayoutControlsSection />

        {/* Resource Type Reference */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Resource Type Reference</h2>
            <p className="text-sm text-gray-500 mt-1">
              Every Azure resource type that AzMap recognises, the ARM provider it belongs to,
              and the Tutorial layer used to collect it. Use this to understand which collector
              script to run for any given resource type.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search types, providers, ARM paths…"
              className="flex-1 min-w-48 max-w-xs bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-600"
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setLayer(null)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  layerFilter === null
                    ? 'bg-gray-600 text-white'
                    : 'border border-gray-700 text-gray-500 hover:text-gray-300'
                }`}
              >
                All layers
              </button>
              {LAYERS.map(meta => (
                <button
                  key={meta.label}
                  onClick={() => setLayer(layerFilter === meta.label ? null : meta.label)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                    layerFilter === meta.label
                      ? `${meta.bg} ${meta.color} ${meta.border}`
                      : 'border-gray-800 text-gray-600 hover:text-gray-300 hover:border-gray-700'
                  }`}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <p className="text-xs text-gray-600 mb-4">
            {rows.length} of {RESOURCES.length} resource types
          </p>

          {/* Table */}
          {grouped.length === 0 ? (
            <p className="text-sm text-gray-600 py-8 text-center">No results matching &ldquo;{query}&rdquo;</p>
          ) : (
            <div className="space-y-8">
              {grouped.map(({ meta, rows: sectionRows }) => (
                <div key={meta.label}>
                  {/* Layer header */}
                  <div className={`flex items-center gap-3 px-4 py-2 rounded-t border ${meta.bg} ${meta.border} mb-px`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                    <span className="text-xs text-gray-600">{sectionRows.length} types</span>
                  </div>

                  {/* Table */}
                  <div className="border border-gray-800 rounded-b overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-800 bg-gray-900/60">
                          <th className="text-left px-4 py-2 font-semibold text-gray-500 w-44">ResourceType</th>
                          <th className="text-left px-4 py-2 font-semibold text-gray-500 w-44">Display Name</th>
                          <th className="text-left px-4 py-2 font-semibold text-gray-500 w-44">ARM Provider</th>
                          <th className="text-left px-4 py-2 font-semibold text-gray-500">ARM Type</th>
                          <th className="text-left px-4 py-2 font-semibold text-gray-500 w-56">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionRows.map((row, i) => (
                          <tr key={row.type}
                            className={`border-b border-gray-800/60 ${i % 2 === 0 ? 'bg-gray-900/20' : ''} hover:bg-gray-800/40 transition-colors`}>
                            <td className="px-4 py-2.5 font-mono text-gray-300 whitespace-nowrap">{row.type}</td>
                            <td className="px-4 py-2.5 text-gray-300 whitespace-nowrap">{row.displayName}</td>
                            <td className="px-4 py-2.5 font-mono text-gray-500 whitespace-nowrap">{provider(row.armType)}</td>
                            <td className="px-4 py-2.5 font-mono text-gray-500">
                              {row.armType.startsWith('(')
                                ? <span className="italic text-gray-600">{row.armType}</span>
                                : row.armType}
                            </td>
                            <td className="px-4 py-2.5 text-gray-600 leading-snug">{row.notes ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
