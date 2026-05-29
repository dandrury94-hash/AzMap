import type { FC } from 'react'
import { ResourceType } from '@azmap/shared'
import {
  // General
  Subscriptions, RegionManagement, ResourceGroups, ManagementGroups,
  // Compute
  VirtualMachine, VMScaleSets, AvailabilitySets, Disks,
  HostGroups, Hosts, BatchAccounts, ServiceFabricClusters,
  KubernetesServices, ContainerInstances,
  // Containers
  ContainerRegistries,
  // App platform
  AppServices, AppServicePlans, AppServiceEnvironments, StaticApps,
  SignalR, CognitiveSearch, NotificationHubNamespaces,
  // Core networking
  VirtualNetworks, Subnet, NetworkInterfaces, NetworkSecurityGroups,
  PublicIPAddresses, PublicIPPrefixes, RouteTables, NAT,
  DDoSProtectionPlans, NetworkWatcher, IPGroups,
  DNSZones, TrafficManagerProfiles, FrontDoorAndCDNProfiles, CDNProfiles,
  // WAN
  VirtualWANs, VirtualWANHub,
  // Security & inspection
  Firewalls, AzureFirewallPolicy, VirtualRouter,
  // Gateways
  LoadBalancers, ApplicationGateways, VirtualNetworkGateways,
  LocalNetworkGateways, Connections, ExpressRouteCircuits,
  // Private connectivity
  PrivateLink, Bastions,
  // Security resources
  KeyVaults, ApplicationSecurityGroups,
  // Identity
  ManagedIdentities,
  // Storage
  StorageAccounts, AzureNetAppFiles, RecoveryServicesVaults,
  // Databases
  SQLServer, SQLDatabase, SQLManagedInstance, AzureCosmosDB,
  AzureDatabasePostgreSQLServer, AzureDatabaseMySQLServer,
  AzureDatabaseMariaDBServer, CacheRedis,
  AzureSynapseAnalytics, AzurePurviewAccounts,
  // Integration
  APIManagementServices, EventHubs, AzureServiceBus,
  EventGridTopics, EventGridDomains, LogicApps, Relays,
  // Analytics
  AzureDatabricks, DataFactories, AzureDataExplorerClusters,
  HDInsightClusters, StreamAnalyticsJobs, AnalysisServices,
  LogAnalyticsWorkspaces,
  // Monitoring
  ApplicationInsights,
  // IoT
  IoTHub, DeviceProvisioningServices, DigitalTwins, IoTCentralApplications,
  // AI & ML
  MachineLearning, CognitiveServices, BotServices, AzureOpenAI,
  // Management & operations
  AutomationAccounts, ArcMachines, AzureArc,
} from './icons'

export type NodeConfig = {
  label: string
  accent: string
  text: string
  Icon: FC<{ size?: string }>
}

export const nodeConfig: Record<ResourceType, NodeConfig> = {
  // ── Organisational ────────────────────────────────────────────────────────
  [ResourceType.ManagementGroup]: { label: 'Management Group', accent: '#7c3aed', text: '#a78bfa', Icon: ManagementGroups },
  [ResourceType.Subscription]:    { label: 'Subscription',     accent: '#0369a1', text: '#7dd3fc', Icon: Subscriptions    },
  [ResourceType.Region]:          { label: 'Region',           accent: '#374151', text: '#9ca3af', Icon: RegionManagement },
  [ResourceType.ResourceGroup]:   { label: 'Resource Group',   accent: '#4b5563', text: '#d1d5db', Icon: ResourceGroups   },

  // ── Compute ───────────────────────────────────────────────────────────────
  [ResourceType.VirtualMachine]:         { label: 'Virtual Machine',       accent: '#047857', text: '#6ee7b7', Icon: VirtualMachine     },
  [ResourceType.VirtualMachineScaleSet]: { label: 'VM Scale Set',          accent: '#065f46', text: '#a7f3d0', Icon: VMScaleSets        },
  [ResourceType.AvailabilitySet]:        { label: 'Availability Set',      accent: '#047857', text: '#6ee7b7', Icon: AvailabilitySets   },
  [ResourceType.ManagedDisk]:            { label: 'Managed Disk',          accent: '#374151', text: '#9ca3af', Icon: Disks              },
  [ResourceType.DedicatedHostGroup]:     { label: 'Dedicated Host Group',  accent: '#065f46', text: '#a7f3d0', Icon: HostGroups         },
  [ResourceType.DedicatedHost]:          { label: 'Dedicated Host',        accent: '#065f46', text: '#a7f3d0', Icon: Hosts              },
  [ResourceType.BatchAccount]:           { label: 'Batch Account',         accent: '#0369a1', text: '#7dd3fc', Icon: BatchAccounts      },
  [ResourceType.ServiceFabricCluster]:   { label: 'Service Fabric',        accent: '#4338ca', text: '#a5b4fc', Icon: ServiceFabricClusters },

  // ── Containers & orchestration ────────────────────────────────────────────
  [ResourceType.KubernetesCluster]:       { label: 'AKS Cluster',              accent: '#0369a1', text: '#7dd3fc', Icon: KubernetesServices   },
  [ResourceType.ContainerGroup]:          { label: 'Container Group',          accent: '#0e7490', text: '#67e8f9', Icon: ContainerInstances   },
  [ResourceType.ContainerRegistry]:       { label: 'Container Registry',       accent: '#0369a1', text: '#7dd3fc', Icon: ContainerRegistries  },
  [ResourceType.ContainerAppEnvironment]: { label: 'Container App Env',        accent: '#4338ca', text: '#a5b4fc', Icon: AppServices          },
  [ResourceType.ContainerApp]:            { label: 'Container App',            accent: '#4338ca', text: '#c7d2fe', Icon: AppServices          },

  // ── App platform ──────────────────────────────────────────────────────────
  [ResourceType.AppService]:            { label: 'App Service',             accent: '#0369a1', text: '#7dd3fc', Icon: AppServices            },
  [ResourceType.AppServicePlan]:        { label: 'App Service Plan',        accent: '#0c4a6e', text: '#bae6fd', Icon: AppServicePlans        },
  [ResourceType.AppServiceEnvironment]: { label: 'App Service Environment', accent: '#0c4a6e', text: '#bae6fd', Icon: AppServiceEnvironments },
  [ResourceType.StaticWebApp]:          { label: 'Static Web App',          accent: '#1d4ed8', text: '#93c5fd', Icon: StaticApps            },

  // ── Core networking ───────────────────────────────────────────────────────
  [ResourceType.VirtualNetwork]:           { label: 'Virtual Network',        accent: '#1d4ed8', text: '#93c5fd', Icon: VirtualNetworks        },
  [ResourceType.Subnet]:                   { label: 'Subnet',                 accent: '#0e7490', text: '#67e8f9', Icon: Subnet                },
  [ResourceType.NetworkInterface]:         { label: 'Network Interface',      accent: '#b45309', text: '#fcd34d', Icon: NetworkInterfaces      },
  [ResourceType.NetworkSecurityGroup]:     { label: 'NSG',                    accent: '#b91c1c', text: '#fca5a5', Icon: NetworkSecurityGroups  },
  [ResourceType.ApplicationSecurityGroup]: { label: 'App Security Group',     accent: '#9f1239', text: '#fda4af', Icon: ApplicationSecurityGroups },
  [ResourceType.PublicIpAddress]:          { label: 'Public IP',              accent: '#0369a1', text: '#7dd3fc', Icon: PublicIPAddresses      },
  [ResourceType.PublicIpPrefix]:           { label: 'Public IP Prefix',       accent: '#075985', text: '#bae6fd', Icon: PublicIPPrefixes       },
  [ResourceType.RouteTable]:               { label: 'Route Table',            accent: '#374151', text: '#9ca3af', Icon: RouteTables            },
  [ResourceType.NatGateway]:              { label: 'NAT Gateway',            accent: '#0e7490', text: '#67e8f9', Icon: NAT                   },
  [ResourceType.DdosProtectionPlan]:       { label: 'DDoS Protection',        accent: '#b91c1c', text: '#fca5a5', Icon: DDoSProtectionPlans    },
  [ResourceType.NetworkWatcher]:           { label: 'Network Watcher',        accent: '#374151', text: '#d1d5db', Icon: NetworkWatcher         },
  [ResourceType.IpGroup]:                  { label: 'IP Group',               accent: '#374151', text: '#9ca3af', Icon: IPGroups              },

  // ── DNS ───────────────────────────────────────────────────────────────────
  [ResourceType.DnsZone]:        { label: 'DNS Zone',         accent: '#0e7490', text: '#67e8f9', Icon: DNSZones },
  [ResourceType.PrivateDnsZone]: { label: 'Private DNS Zone', accent: '#164e63', text: '#a5f3fc', Icon: DNSZones },

  // ── WAN / hub-and-spoke ───────────────────────────────────────────────────
  [ResourceType.VirtualWan]: { label: 'Virtual WAN', accent: '#1d4ed8', text: '#93c5fd', Icon: VirtualWANs   },
  [ResourceType.VirtualHub]: { label: 'Virtual Hub', accent: '#1e40af', text: '#bfdbfe', Icon: VirtualWANHub },

  // ── Traffic management & CDN ──────────────────────────────────────────────
  [ResourceType.TrafficManagerProfile]: { label: 'Traffic Manager', accent: '#0369a1', text: '#7dd3fc', Icon: TrafficManagerProfiles   },
  [ResourceType.FrontDoor]:             { label: 'Front Door',      accent: '#0369a1', text: '#7dd3fc', Icon: FrontDoorAndCDNProfiles  },
  [ResourceType.CdnProfile]:            { label: 'CDN Profile',     accent: '#0c4a6e', text: '#bae6fd', Icon: CDNProfiles              },

  // ── Network security & inspection ─────────────────────────────────────────
  [ResourceType.AzureFirewall]:           { label: 'Azure Firewall',  accent: '#b91c1c', text: '#fca5a5', Icon: Firewalls          },
  [ResourceType.FirewallPolicy]:          { label: 'Firewall Policy', accent: '#991b1b', text: '#fecaca', Icon: AzureFirewallPolicy },
  [ResourceType.NetworkVirtualAppliance]: { label: 'NVA',             accent: '#7c2d12', text: '#fdba74', Icon: VirtualRouter       },

  // ── Load balancing & gateways ─────────────────────────────────────────────
  [ResourceType.LoadBalancer]:        { label: 'Load Balancer',         accent: '#1d4ed8', text: '#93c5fd', Icon: LoadBalancers          },
  [ResourceType.ApplicationGateway]:  { label: 'Application Gateway',   accent: '#0369a1', text: '#7dd3fc', Icon: ApplicationGateways    },
  [ResourceType.VpnGateway]:          { label: 'VPN / ER Gateway',      accent: '#4338ca', text: '#a5b4fc', Icon: VirtualNetworkGateways },
  [ResourceType.LocalNetworkGateway]: { label: 'Local Network Gateway', accent: '#374151', text: '#9ca3af', Icon: LocalNetworkGateways   },
  [ResourceType.GatewayConnection]:   { label: 'Gateway Connection',    accent: '#374151', text: '#d1d5db', Icon: Connections            },
  [ResourceType.ExpressRouteCircuit]: { label: 'ExpressRoute Circuit',  accent: '#4338ca', text: '#c7d2fe', Icon: ExpressRouteCircuits   },

  // ── Private connectivity ──────────────────────────────────────────────────
  [ResourceType.PrivateEndpoint]: { label: 'Private Endpoint', accent: '#0e7490', text: '#67e8f9', Icon: PrivateLink },
  [ResourceType.BastionHost]:     { label: 'Bastion Host',     accent: '#b45309', text: '#fcd34d', Icon: Bastions    },

  // ── Storage ───────────────────────────────────────────────────────────────
  [ResourceType.StorageAccount]: { label: 'Storage Account', accent: '#0369a1', text: '#7dd3fc', Icon: StorageAccounts  },
  [ResourceType.NetAppAccount]:  { label: 'NetApp Account',  accent: '#0c4a6e', text: '#bae6fd', Icon: AzureNetAppFiles },

  // ── Databases & caching ───────────────────────────────────────────────────
  [ResourceType.SqlServer]:          { label: 'SQL Server',         accent: '#b45309', text: '#fcd34d', Icon: SQLServer                   },
  [ResourceType.SqlDatabase]:        { label: 'SQL Database',       accent: '#92400e', text: '#fde68a', Icon: SQLDatabase                 },
  [ResourceType.SqlManagedInstance]: { label: 'SQL Managed Instance', accent: '#b45309', text: '#fcd34d', Icon: SQLManagedInstance        },
  [ResourceType.CosmosDbAccount]:    { label: 'Cosmos DB',          accent: '#4338ca', text: '#a5b4fc', Icon: AzureCosmosDB               },
  [ResourceType.PostgreSqlServer]:   { label: 'PostgreSQL Server',  accent: '#1d4ed8', text: '#93c5fd', Icon: AzureDatabasePostgreSQLServer },
  [ResourceType.MySqlServer]:        { label: 'MySQL Server',       accent: '#065f46', text: '#a7f3d0', Icon: AzureDatabaseMySQLServer    },
  [ResourceType.MariaDbServer]:      { label: 'MariaDB Server',     accent: '#065f46', text: '#a7f3d0', Icon: AzureDatabaseMariaDBServer  },
  [ResourceType.RedisCache]:         { label: 'Redis Cache',        accent: '#b91c1c', text: '#fca5a5', Icon: CacheRedis                  },
  [ResourceType.SynapseWorkspace]:   { label: 'Synapse Workspace',  accent: '#4338ca', text: '#a5b4fc', Icon: AzureSynapseAnalytics       },

  // ── Security resources ────────────────────────────────────────────────────
  [ResourceType.KeyVault]: { label: 'Key Vault', accent: '#b45309', text: '#fcd34d', Icon: KeyVaults },

  // ── Identity ──────────────────────────────────────────────────────────────
  [ResourceType.UserAssignedIdentity]: { label: 'Managed Identity', accent: '#7c3aed', text: '#a78bfa', Icon: ManagedIdentities },

  // ── Integration & messaging ───────────────────────────────────────────────
  [ResourceType.ApiManagementService]:     { label: 'API Management',      accent: '#0369a1', text: '#7dd3fc', Icon: APIManagementServices  },
  [ResourceType.EventHubNamespace]:        { label: 'Event Hub',           accent: '#4338ca', text: '#a5b4fc', Icon: EventHubs              },
  [ResourceType.ServiceBusNamespace]:      { label: 'Service Bus',         accent: '#1d4ed8', text: '#93c5fd', Icon: AzureServiceBus        },
  [ResourceType.EventGridTopic]:           { label: 'Event Grid Topic',    accent: '#0369a1', text: '#7dd3fc', Icon: EventGridTopics         },
  [ResourceType.EventGridDomain]:          { label: 'Event Grid Domain',   accent: '#0369a1', text: '#7dd3fc', Icon: EventGridDomains        },
  [ResourceType.LogicApp]:                 { label: 'Logic App',           accent: '#0369a1', text: '#7dd3fc', Icon: LogicApps              },
  [ResourceType.RelayNamespace]:           { label: 'Relay',               accent: '#374151', text: '#9ca3af', Icon: Relays                 },
  [ResourceType.NotificationHubNamespace]: { label: 'Notification Hub',    accent: '#0369a1', text: '#7dd3fc', Icon: NotificationHubNamespaces },
  [ResourceType.SignalRService]:           { label: 'SignalR Service',     accent: '#0369a1', text: '#7dd3fc', Icon: SignalR                },

  // ── Analytics ─────────────────────────────────────────────────────────────
  [ResourceType.DatabricksWorkspace]:   { label: 'Databricks',         accent: '#b91c1c', text: '#fca5a5', Icon: AzureDatabricks          },
  [ResourceType.DataFactory]:           { label: 'Data Factory',       accent: '#0369a1', text: '#7dd3fc', Icon: DataFactories            },
  [ResourceType.DataExplorerCluster]:   { label: 'Data Explorer',      accent: '#0c4a6e', text: '#bae6fd', Icon: AzureDataExplorerClusters },
  [ResourceType.HDInsightCluster]:      { label: 'HDInsight',          accent: '#4338ca', text: '#a5b4fc', Icon: HDInsightClusters        },
  [ResourceType.StreamAnalyticsJob]:    { label: 'Stream Analytics',   accent: '#0369a1', text: '#7dd3fc', Icon: StreamAnalyticsJobs      },
  [ResourceType.AnalysisServicesServer]:{ label: 'Analysis Services',  accent: '#1d4ed8', text: '#93c5fd', Icon: AnalysisServices         },
  [ResourceType.PurviewAccount]:        { label: 'Purview',            accent: '#7c3aed', text: '#a78bfa', Icon: AzurePurviewAccounts     },

  // ── AI & machine learning ─────────────────────────────────────────────────
  [ResourceType.MachineLearningWorkspace]: { label: 'ML Workspace',       accent: '#0369a1', text: '#7dd3fc', Icon: MachineLearning   },
  [ResourceType.CognitiveServicesAccount]: { label: 'Cognitive Services', accent: '#4338ca', text: '#a5b4fc', Icon: CognitiveServices },
  [ResourceType.SearchService]:            { label: 'AI Search',          accent: '#0369a1', text: '#7dd3fc', Icon: CognitiveSearch   },
  [ResourceType.BotService]:               { label: 'Bot Service',        accent: '#0369a1', text: '#7dd3fc', Icon: BotServices       },
  [ResourceType.AzureOpenAIService]:       { label: 'Azure OpenAI',       accent: '#047857', text: '#6ee7b7', Icon: AzureOpenAI       },

  // ── IoT ───────────────────────────────────────────────────────────────────
  [ResourceType.IoTHub]:                    { label: 'IoT Hub',             accent: '#0369a1', text: '#7dd3fc', Icon: IoTHub                    },
  [ResourceType.DeviceProvisioningService]: { label: 'Device Provisioning', accent: '#0c4a6e', text: '#bae6fd', Icon: DeviceProvisioningServices },
  [ResourceType.DigitalTwinsInstance]:      { label: 'Digital Twins',       accent: '#4338ca', text: '#a5b4fc', Icon: DigitalTwins               },
  [ResourceType.IoTCentralApp]:             { label: 'IoT Central',         accent: '#0369a1', text: '#7dd3fc', Icon: IoTCentralApplications     },

  // ── Monitoring & operations ───────────────────────────────────────────────
  [ResourceType.LogAnalyticsWorkspace]:       { label: 'Log Analytics',     accent: '#374151', text: '#9ca3af', Icon: LogAnalyticsWorkspaces },
  [ResourceType.ApplicationInsightsComponent]:{ label: 'App Insights',      accent: '#374151', text: '#9ca3af', Icon: ApplicationInsights     },
  [ResourceType.AutomationAccount]:           { label: 'Automation Account',accent: '#374151', text: '#d1d5db', Icon: AutomationAccounts      },
  [ResourceType.RecoveryServicesVault]:       { label: 'Recovery Vault',    accent: '#0369a1', text: '#7dd3fc', Icon: RecoveryServicesVaults  },

  // ── Hybrid & Arc ──────────────────────────────────────────────────────────
  [ResourceType.ArcServer]:           { label: 'Arc Server',     accent: '#047857', text: '#6ee7b7', Icon: ArcMachines        },
  [ResourceType.ArcKubernetesCluster]:{ label: 'Arc Kubernetes', accent: '#0369a1', text: '#7dd3fc', Icon: KubernetesServices },
  [ResourceType.AzureLocalCluster]:   { label: 'Azure Local',    accent: '#374151', text: '#9ca3af', Icon: AzureArc           },
}
