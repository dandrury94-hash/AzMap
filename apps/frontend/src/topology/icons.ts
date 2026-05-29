// Direct imports from individual component files — the package barrel index
// has broken paths (spaces in directory names), so we bypass it entirely.

// ── General / organisational ──────────────────────────────────────────────────
export { Subscriptions }    from '@threeveloper/azure-react-icons/dist/components/general/10002-icon-service-Subscriptions'
export { ResourceGroups }   from '@threeveloper/azure-react-icons/dist/components/general/10007-icon-service-Resource-Groups'
export { ManagementGroups } from '@threeveloper/azure-react-icons/dist/components/general/10011-icon-service-Management-Groups'
export { RegionManagement } from '@threeveloper/azure-react-icons/dist/components/general/10116-icon-service-Region-Management'

// ── Compute ───────────────────────────────────────────────────────────────────
export { VirtualMachine }      from '@threeveloper/azure-react-icons/dist/components/compute/10021-icon-service-Virtual-Machine'
export { VMScaleSets }         from '@threeveloper/azure-react-icons/dist/components/compute/10034-icon-service-VM-Scale-Sets'
export { AvailabilitySets }    from '@threeveloper/azure-react-icons/dist/components/compute/10025-icon-service-Availability-Sets'
export { Disks }               from '@threeveloper/azure-react-icons/dist/components/compute/10032-icon-service-Disks'
export { HostGroups }          from '@threeveloper/azure-react-icons/dist/components/compute/10346-icon-service-Host-Groups'
export { Hosts }               from '@threeveloper/azure-react-icons/dist/components/compute/10347-icon-service-Hosts'
export { BatchAccounts }       from '@threeveloper/azure-react-icons/dist/components/compute/10031-icon-service-Batch-Accounts'
export { ServiceFabricClusters } from '@threeveloper/azure-react-icons/dist/components/compute/10036-icon-service-Service-Fabric-Clusters'
export { KubernetesServices }  from '@threeveloper/azure-react-icons/dist/components/compute/10023-icon-service-Kubernetes-Services'
export { ContainerInstances }  from '@threeveloper/azure-react-icons/dist/components/compute/10104-icon-service-Container-Instances'

// ── Containers ────────────────────────────────────────────────────────────────
export { ContainerRegistries } from '@threeveloper/azure-react-icons/dist/components/containers/10105-icon-service-Container-Registries'

// ── App platform ──────────────────────────────────────────────────────────────
export { AppServices }            from '@threeveloper/azure-react-icons/dist/components/web/10035-icon-service-App-Services'
export { AppServicePlans }        from '@threeveloper/azure-react-icons/dist/components/web/00046-icon-service-App-Service-Plans'
export { AppServiceEnvironments } from '@threeveloper/azure-react-icons/dist/components/web/10047-icon-service-App-Service-Environments'
export { StaticApps }             from '@threeveloper/azure-react-icons/dist/components/web/01007-icon-service-Static-Apps'
export { SignalR }                from '@threeveloper/azure-react-icons/dist/components/web/10052-icon-service-SignalR'
export { CognitiveSearch }        from '@threeveloper/azure-react-icons/dist/components/web/10044-icon-service-Cognitive-Search'
export { NotificationHubNamespaces } from '@threeveloper/azure-react-icons/dist/components/web/10053-icon-service-Notification-Hub-Namespaces'

// ── Core networking ───────────────────────────────────────────────────────────
export { VirtualNetworks }       from '@threeveloper/azure-react-icons/dist/components/networking/10061-icon-service-Virtual-Networks'
export { Subnet }                from '@threeveloper/azure-react-icons/dist/components/networking/02742-icon-service-Subnet'
export { NetworkInterfaces }     from '@threeveloper/azure-react-icons/dist/components/networking/10080-icon-service-Network-Interfaces'
export { NetworkSecurityGroups } from '@threeveloper/azure-react-icons/dist/components/networking/10067-icon-service-Network-Security-Groups'
export { PublicIPAddresses }     from '@threeveloper/azure-react-icons/dist/components/networking/10069-icon-service-Public-IP-Addresses'
export { PublicIPPrefixes }      from '@threeveloper/azure-react-icons/dist/components/networking/10372-icon-service-Public-IP-Prefixes'
export { RouteTables }           from '@threeveloper/azure-react-icons/dist/components/networking/10082-icon-service-Route-Tables'
export { NAT }                   from '@threeveloper/azure-react-icons/dist/components/networking/10310-icon-service-NAT'
export { DDoSProtectionPlans }   from '@threeveloper/azure-react-icons/dist/components/networking/10072-icon-service-DDoS-Protection-Plans'
export { NetworkWatcher }        from '@threeveloper/azure-react-icons/dist/components/networking/10066-icon-service-Network-Watcher'
export { IPGroups }              from '@threeveloper/azure-react-icons/dist/components/networking/00701-icon-service-IP-Groups'
export { DNSZones }              from '@threeveloper/azure-react-icons/dist/components/networking/10064-icon-service-DNS-Zones'
export { TrafficManagerProfiles } from '@threeveloper/azure-react-icons/dist/components/networking/10065-icon-service-Traffic-Manager-Profiles'
export { FrontDoorAndCDNProfiles } from '@threeveloper/azure-react-icons/dist/components/networking/10073-icon-service-Front-Door-and-CDN-Profiles'
export { CDNProfiles }           from '@threeveloper/azure-react-icons/dist/components/networking/00056-icon-service-CDN-Profiles'

// ── WAN / hub-and-spoke ───────────────────────────────────────────────────────
export { VirtualWANs }   from '@threeveloper/azure-react-icons/dist/components/networking/10353-icon-service-Virtual-WANs'
export { VirtualWANHub } from '@threeveloper/azure-react-icons/dist/components/networking/00860-icon-service-Virtual-WAN-Hub'

// ── Security & inspection ─────────────────────────────────────────────────────
export { Firewalls }           from '@threeveloper/azure-react-icons/dist/components/networking/10084-icon-service-Firewalls'
export { AzureFirewallPolicy } from '@threeveloper/azure-react-icons/dist/components/networking/00272-icon-service-Azure-Firewall-Policy'
export { VirtualRouter }       from '@threeveloper/azure-react-icons/dist/components/networking/02496-icon-service-Virtual-Router'

// ── Load balancing & gateways ─────────────────────────────────────────────────
export { LoadBalancers }          from '@threeveloper/azure-react-icons/dist/components/networking/10062-icon-service-Load-Balancers'
export { ApplicationGateways }    from '@threeveloper/azure-react-icons/dist/components/networking/10076-icon-service-Application-Gateways'
export { VirtualNetworkGateways } from '@threeveloper/azure-react-icons/dist/components/networking/10063-icon-service-Virtual-Network-Gateways'
export { LocalNetworkGateways }   from '@threeveloper/azure-react-icons/dist/components/networking/10077-icon-service-Local-Network-Gateways'
export { Connections }            from '@threeveloper/azure-react-icons/dist/components/networking/10081-icon-service-Connections'
export { ExpressRouteCircuits }   from '@threeveloper/azure-react-icons/dist/components/networking/10079-icon-service-ExpressRoute-Circuits'

// ── Private connectivity ──────────────────────────────────────────────────────
export { PrivateLink } from '@threeveloper/azure-react-icons/dist/components/networking/00427-icon-service-Private-Link'
export { Bastions }    from '@threeveloper/azure-react-icons/dist/components/networking/02422-icon-service-Bastions'

// ── Security resources ────────────────────────────────────────────────────────
export { KeyVaults }                from '@threeveloper/azure-react-icons/dist/components/security/10245-icon-service-Key-Vaults'
export { ApplicationSecurityGroups } from '@threeveloper/azure-react-icons/dist/components/security/10244-icon-service-Application-Security-Groups'

// ── Identity ──────────────────────────────────────────────────────────────────
export { ManagedIdentities } from '@threeveloper/azure-react-icons/dist/components/identity/10227-icon-service-Managed-Identities'

// ── Storage ───────────────────────────────────────────────────────────────────
export { StorageAccounts }      from '@threeveloper/azure-react-icons/dist/components/storage/10086-icon-service-Storage-Accounts'
export { AzureNetAppFiles }     from '@threeveloper/azure-react-icons/dist/components/storage/10096-icon-service-Azure-NetApp-Files'
export { RecoveryServicesVaults } from '@threeveloper/azure-react-icons/dist/components/storage/00017-icon-service-Recovery-Services-Vaults'

// ── Databases & caching ───────────────────────────────────────────────────────
export { SQLServer }                       from '@threeveloper/azure-react-icons/dist/components/databases/10132-icon-service-SQL-Server'
export { SQLDatabase }                     from '@threeveloper/azure-react-icons/dist/components/databases/10130-icon-service-SQL-Database'
export { SQLManagedInstance }              from '@threeveloper/azure-react-icons/dist/components/databases/10136-icon-service-SQL-Managed-Instance'
export { AzureCosmosDB }                   from '@threeveloper/azure-react-icons/dist/components/databases/10121-icon-service-Azure-Cosmos-DB'
export { AzureDatabasePostgreSQLServer }   from '@threeveloper/azure-react-icons/dist/components/databases/10131-icon-service-Azure-Database-PostgreSQL-Server'
export { AzureDatabaseMySQLServer }        from '@threeveloper/azure-react-icons/dist/components/databases/10122-icon-service-Azure-Database-MySQL-Server'
export { AzureDatabaseMariaDBServer }      from '@threeveloper/azure-react-icons/dist/components/databases/10123-icon-service-Azure-Database-MariaDB-Server'
export { CacheRedis }                      from '@threeveloper/azure-react-icons/dist/components/databases/10137-icon-service-Cache-Redis'
export { AzureSynapseAnalytics }           from '@threeveloper/azure-react-icons/dist/components/databases/00606-icon-service-Azure-Synapse-Analytics'
export { AzurePurviewAccounts }            from '@threeveloper/azure-react-icons/dist/components/databases/02517-icon-service-Azure-Purview-Accounts'

// ── Integration & messaging ───────────────────────────────────────────────────
export { APIManagementServices } from '@threeveloper/azure-react-icons/dist/components/integration/10042-icon-service-API-Management-Services'
export { EventHubs }             from '@threeveloper/azure-react-icons/dist/components/analytics/00039-icon-service-Event-Hubs'
export { AzureServiceBus }       from '@threeveloper/azure-react-icons/dist/components/integration/10836-icon-service-Azure-Service-Bus'
export { EventGridTopics }       from '@threeveloper/azure-react-icons/dist/components/integration/10206-icon-service-Event-Grid-Topics'
export { EventGridDomains }      from '@threeveloper/azure-react-icons/dist/components/integration/10215-icon-service-Event-Grid-Domains'
export { LogicApps }             from '@threeveloper/azure-react-icons/dist/components/integration/02631-icon-service-Logic-Apps'
export { Relays }                from '@threeveloper/azure-react-icons/dist/components/integration/10209-icon-service-Relays'

// ── Analytics ─────────────────────────────────────────────────────────────────
export { AzureDatabricks }          from '@threeveloper/azure-react-icons/dist/components/analytics/10787-icon-service-Azure-Databricks'
export { DataFactories }            from '@threeveloper/azure-react-icons/dist/components/analytics/10126-icon-service-Data-Factories'
export { AzureDataExplorerClusters } from '@threeveloper/azure-react-icons/dist/components/analytics/10145-icon-service-Azure-Data-Explorer-Clusters'
export { HDInsightClusters }        from '@threeveloper/azure-react-icons/dist/components/analytics/10142-icon-service-HD-Insight-Clusters'
export { StreamAnalyticsJobs }      from '@threeveloper/azure-react-icons/dist/components/analytics/00042-icon-service-Stream-Analytics-Jobs'
export { AnalysisServices }         from '@threeveloper/azure-react-icons/dist/components/analytics/10148-icon-service-Analysis-Services'
export { LogAnalyticsWorkspaces }   from '@threeveloper/azure-react-icons/dist/components/analytics/00009-icon-service-Log-Analytics-Workspaces'

// ── Monitoring ────────────────────────────────────────────────────────────────
export { ApplicationInsights } from '@threeveloper/azure-react-icons/dist/components/monitor/00012-icon-service-Application-Insights'

// ── IoT ──────────────────────────────────────────────────────────────────────
export { IoTHub }                    from '@threeveloper/azure-react-icons/dist/components/iot/10182-icon-service-IoT-Hub'
export { DeviceProvisioningServices } from '@threeveloper/azure-react-icons/dist/components/iot/10369-icon-service-Device-Provisioning-Services'
export { DigitalTwins }              from '@threeveloper/azure-react-icons/dist/components/iot/01030-icon-service-Digital-Twins'
export { IoTCentralApplications }    from '@threeveloper/azure-react-icons/dist/components/iot/10184-icon-service-IoT-Central-Applications'

// ── AI & machine learning (directory name contains spaces) ────────────────────
export { MachineLearning }   from '@threeveloper/azure-react-icons/dist/components/ai + machine learning/10166-icon-service-Machine-Learning'
export { CognitiveServices } from '@threeveloper/azure-react-icons/dist/components/ai + machine learning/10162-icon-service-Cognitive-Services'
export { BotServices }       from '@threeveloper/azure-react-icons/dist/components/ai + machine learning/10165-icon-service-Bot-Services'
export { AzureOpenAI }       from '@threeveloper/azure-react-icons/dist/components/ai + machine learning/03438-icon-service-Azure-OpenAI'

// ── Management & operations (directory name contains spaces) ──────────────────
export { AutomationAccounts } from '@threeveloper/azure-react-icons/dist/components/management + governance/00022-icon-service-Automation-Accounts'
export { ArcMachines }        from '@threeveloper/azure-react-icons/dist/components/management + governance/01710-icon-service-Arc-Machines'
export { AzureArc }           from '@threeveloper/azure-react-icons/dist/components/management + governance/00756-icon-service-Azure-Arc'
