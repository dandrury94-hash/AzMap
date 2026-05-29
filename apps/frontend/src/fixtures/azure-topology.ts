import type { GraphEdge, GraphNode } from '@azmap/shared'
import { RelationshipType, ResourceType } from '@azmap/shared'

// ─── Nodes ────────────────────────────────────────────────────────────────────

export const demoNodes: GraphNode[] = [

  {
    id: 'sub-prod',
    type: ResourceType.Subscription,
    name: 'Production',
    subscriptionId: 'sub-00000000-0000-0000-0000-000000000001',
  },

  // ── UK South ──────────────────────────────────────────────────────────────

  { id: 'region-uks', type: ResourceType.Region, name: 'UK South',
    subscriptionId: 'sub-00000000-0000-0000-0000-000000000001',
    metadata: { pairedRegion: 'UK West' } },

  { id: 'rg-uks', type: ResourceType.ResourceGroup, name: 'rg-webapp-uks',
    subscriptionId: 'sub-00000000-0000-0000-0000-000000000001', location: 'uksouth' },

  { id: 'vnet-uks', type: ResourceType.VirtualNetwork, name: 'vnet-uksouth',
    resourceGroup: 'rg-webapp-uks', location: 'uksouth',
    metadata: { addressSpace: '10.0.0.0/16' } },

  { id: 'snet-web-uks', type: ResourceType.Subnet, name: 'snet-web',
    resourceGroup: 'rg-webapp-uks', metadata: { addressPrefix: '10.0.1.0/24' } },

  { id: 'snet-app-uks', type: ResourceType.Subnet, name: 'snet-app',
    resourceGroup: 'rg-webapp-uks', metadata: { addressPrefix: '10.0.2.0/24' } },

  { id: 'nsg-web-uks', type: ResourceType.NetworkSecurityGroup, name: 'nsg-web-uks',
    resourceGroup: 'rg-webapp-uks', location: 'uksouth',
    rawPayload: { type: 'Microsoft.Network/networkSecurityGroups', location: 'uksouth',
      properties: { securityRules: [ { name: 'allow-https', properties: { priority: 100, protocol: 'Tcp', destinationPortRange: '443', access: 'Allow', direction: 'Inbound' } } ] } } },

  { id: 'nsg-app-uks', type: ResourceType.NetworkSecurityGroup, name: 'nsg-app-uks',
    resourceGroup: 'rg-webapp-uks', location: 'uksouth',
    rawPayload: { type: 'Microsoft.Network/networkSecurityGroups', location: 'uksouth',
      properties: { securityRules: [ { name: 'allow-internal', properties: { priority: 100, protocol: 'Tcp', destinationPortRange: '8080', access: 'Allow', direction: 'Inbound' } } ] } } },

  { id: 'vm-web-uks', type: ResourceType.VirtualMachine, name: 'vm-web-01',
    resourceGroup: 'rg-webapp-uks', location: 'uksouth',
    metadata: { size: 'Standard_B2s', os: 'Ubuntu 22.04' },
    rawPayload: { type: 'Microsoft.Compute/virtualMachines', location: 'uksouth',
      properties: { hardwareProfile: { vmSize: 'Standard_B2s' }, storageProfile: { osDisk: { osType: 'Linux' } } } } },

  { id: 'vm-app-uks', type: ResourceType.VirtualMachine, name: 'vm-app-01',
    resourceGroup: 'rg-webapp-uks', location: 'uksouth',
    metadata: { size: 'Standard_B4ms', os: 'Ubuntu 22.04' },
    rawPayload: { type: 'Microsoft.Compute/virtualMachines', location: 'uksouth',
      properties: { hardwareProfile: { vmSize: 'Standard_B4ms' }, storageProfile: { osDisk: { osType: 'Linux' } } } } },

  { id: 'nic-web-uks', type: ResourceType.NetworkInterface, name: 'nic-web-01',
    resourceGroup: 'rg-webapp-uks', metadata: { privateIp: '10.0.1.4' },
    rawPayload: { type: 'Microsoft.Network/networkInterfaces', properties: {
      ipConfigurations: [ { name: 'ipconfig1', properties: { privateIPAddress: '10.0.1.4', privateIPAllocationMethod: 'Static' } } ] } } },

  { id: 'nic-app-uks', type: ResourceType.NetworkInterface, name: 'nic-app-01',
    resourceGroup: 'rg-webapp-uks', metadata: { privateIp: '10.0.2.4' },
    rawPayload: { type: 'Microsoft.Network/networkInterfaces', properties: {
      ipConfigurations: [ { name: 'ipconfig1', properties: { privateIPAddress: '10.0.2.4', privateIPAllocationMethod: 'Static' } } ] } } },

  // ── UK West ───────────────────────────────────────────────────────────────

  { id: 'region-ukw', type: ResourceType.Region, name: 'UK West',
    subscriptionId: 'sub-00000000-0000-0000-0000-000000000001',
    metadata: { pairedRegion: 'UK South' } },

  { id: 'rg-ukw', type: ResourceType.ResourceGroup, name: 'rg-webapp-ukw',
    subscriptionId: 'sub-00000000-0000-0000-0000-000000000001', location: 'ukwest' },

  { id: 'vnet-ukw', type: ResourceType.VirtualNetwork, name: 'vnet-ukwest',
    resourceGroup: 'rg-webapp-ukw', location: 'ukwest',
    metadata: { addressSpace: '10.1.0.0/16' } },

  { id: 'snet-web-ukw', type: ResourceType.Subnet, name: 'snet-web',
    resourceGroup: 'rg-webapp-ukw', metadata: { addressPrefix: '10.1.1.0/24' } },

  { id: 'snet-app-ukw', type: ResourceType.Subnet, name: 'snet-app',
    resourceGroup: 'rg-webapp-ukw', metadata: { addressPrefix: '10.1.2.0/24' } },

  { id: 'nsg-web-ukw', type: ResourceType.NetworkSecurityGroup, name: 'nsg-web-ukw',
    resourceGroup: 'rg-webapp-ukw', location: 'ukwest',
    rawPayload: { type: 'Microsoft.Network/networkSecurityGroups', location: 'ukwest',
      properties: { securityRules: [ { name: 'allow-https', properties: { priority: 100, protocol: 'Tcp', destinationPortRange: '443', access: 'Allow', direction: 'Inbound' } } ] } } },

  { id: 'nsg-app-ukw', type: ResourceType.NetworkSecurityGroup, name: 'nsg-app-ukw',
    resourceGroup: 'rg-webapp-ukw', location: 'ukwest',
    rawPayload: { type: 'Microsoft.Network/networkSecurityGroups', location: 'ukwest',
      properties: { securityRules: [ { name: 'allow-internal', properties: { priority: 100, protocol: 'Tcp', destinationPortRange: '8080', access: 'Allow', direction: 'Inbound' } } ] } } },

  { id: 'vm-web-ukw', type: ResourceType.VirtualMachine, name: 'vm-web-01',
    resourceGroup: 'rg-webapp-ukw', location: 'ukwest',
    metadata: { size: 'Standard_B2s', os: 'Ubuntu 22.04' },
    rawPayload: { type: 'Microsoft.Compute/virtualMachines', location: 'ukwest',
      properties: { hardwareProfile: { vmSize: 'Standard_B2s' }, storageProfile: { osDisk: { osType: 'Linux' } } } } },

  { id: 'vm-app-ukw', type: ResourceType.VirtualMachine, name: 'vm-app-01',
    resourceGroup: 'rg-webapp-ukw', location: 'ukwest',
    metadata: { size: 'Standard_B4ms', os: 'Ubuntu 22.04' },
    rawPayload: { type: 'Microsoft.Compute/virtualMachines', location: 'ukwest',
      properties: { hardwareProfile: { vmSize: 'Standard_B4ms' }, storageProfile: { osDisk: { osType: 'Linux' } } } } },

  { id: 'nic-web-ukw', type: ResourceType.NetworkInterface, name: 'nic-web-01',
    resourceGroup: 'rg-webapp-ukw', metadata: { privateIp: '10.1.1.4' },
    rawPayload: { type: 'Microsoft.Network/networkInterfaces', properties: {
      ipConfigurations: [ { name: 'ipconfig1', properties: { privateIPAddress: '10.1.1.4', privateIPAllocationMethod: 'Static' } } ] } } },

  { id: 'nic-app-ukw', type: ResourceType.NetworkInterface, name: 'nic-app-01',
    resourceGroup: 'rg-webapp-ukw', metadata: { privateIp: '10.1.2.4' },
    rawPayload: { type: 'Microsoft.Network/networkInterfaces', properties: {
      ipConfigurations: [ { name: 'ipconfig1', properties: { privateIPAddress: '10.1.2.4', privateIPAllocationMethod: 'Static' } } ] } } },
]

// ─── Edges ────────────────────────────────────────────────────────────────────

export const demoEdges: GraphEdge[] = [

  // ── Containment ───────────────────────────────────────────────────────────
  // Subscription is the outer swimlane. Regions are transparent column dividers
  // inside it (label only, no box). When a second subscription is imported it
  // becomes a second swimlane row; each region still appears only once per subscription.

  { id: 'c-sub-ruks',       source: 'sub-prod',   target: 'region-uks',   relationshipType: RelationshipType.Contains },
  { id: 'c-sub-rukw',       source: 'sub-prod',   target: 'region-ukw',   relationshipType: RelationshipType.Contains },

  { id: 'c-ruks-rg',        source: 'region-uks', target: 'rg-uks',       relationshipType: RelationshipType.Contains },
  { id: 'c-rukw-rg',        source: 'region-ukw', target: 'rg-ukw',       relationshipType: RelationshipType.Contains },

  // RG owns everything in it — VNet, NSGs, VMs, NICs all sit in the RG
  { id: 'c-rg-vnet-uks',    source: 'rg-uks', target: 'vnet-uks',      relationshipType: RelationshipType.Contains },
  { id: 'c-rg-nsgweb-uks',  source: 'rg-uks', target: 'nsg-web-uks',  relationshipType: RelationshipType.Contains },
  { id: 'c-rg-nsgapp-uks',  source: 'rg-uks', target: 'nsg-app-uks',  relationshipType: RelationshipType.Contains },
  { id: 'c-rg-vmweb-uks',   source: 'rg-uks', target: 'vm-web-uks',   relationshipType: RelationshipType.Contains },
  { id: 'c-rg-vmapp-uks',   source: 'rg-uks', target: 'vm-app-uks',   relationshipType: RelationshipType.Contains },
  { id: 'c-rg-nicweb-uks',  source: 'rg-uks', target: 'nic-web-uks',  relationshipType: RelationshipType.Contains },
  { id: 'c-rg-nicapp-uks',  source: 'rg-uks', target: 'nic-app-uks',  relationshipType: RelationshipType.Contains },

  { id: 'c-rg-vnet-ukw',    source: 'rg-ukw', target: 'vnet-ukw',      relationshipType: RelationshipType.Contains },
  { id: 'c-rg-nsgweb-ukw',  source: 'rg-ukw', target: 'nsg-web-ukw',  relationshipType: RelationshipType.Contains },
  { id: 'c-rg-nsgapp-ukw',  source: 'rg-ukw', target: 'nsg-app-ukw',  relationshipType: RelationshipType.Contains },
  { id: 'c-rg-vmweb-ukw',   source: 'rg-ukw', target: 'vm-web-ukw',   relationshipType: RelationshipType.Contains },
  { id: 'c-rg-vmapp-ukw',   source: 'rg-ukw', target: 'vm-app-ukw',   relationshipType: RelationshipType.Contains },
  { id: 'c-rg-nicweb-ukw',  source: 'rg-ukw', target: 'nic-web-ukw',  relationshipType: RelationshipType.Contains },
  { id: 'c-rg-nicapp-ukw',  source: 'rg-ukw', target: 'nic-app-ukw',  relationshipType: RelationshipType.Contains },

  // VNet → Subnet (Subnet is a sub-resource of VNet, not an independent resource)
  { id: 'c-vnet-sweb-uks',  source: 'vnet-uks', target: 'snet-web-uks', relationshipType: RelationshipType.Contains },
  { id: 'c-vnet-sapp-uks',  source: 'vnet-uks', target: 'snet-app-uks', relationshipType: RelationshipType.Contains },
  { id: 'c-vnet-sweb-ukw',  source: 'vnet-ukw', target: 'snet-web-ukw', relationshipType: RelationshipType.Contains },
  { id: 'c-vnet-sapp-ukw',  source: 'vnet-ukw', target: 'snet-app-ukw', relationshipType: RelationshipType.Contains },

  // ── Operational relationships ─────────────────────────────────────────────

  // NSG applied to subnet (NSG is a separate resource — associated, not contained)
  { id: 'o-nsg-sweb-uks',   source: 'snet-web-uks', target: 'nsg-web-uks', relationshipType: RelationshipType.SecuredBy },
  { id: 'o-nsg-sapp-uks',   source: 'snet-app-uks', target: 'nsg-app-uks', relationshipType: RelationshipType.SecuredBy },
  { id: 'o-nsg-sweb-ukw',   source: 'snet-web-ukw', target: 'nsg-web-ukw', relationshipType: RelationshipType.SecuredBy },
  { id: 'o-nsg-sapp-ukw',   source: 'snet-app-ukw', target: 'nsg-app-ukw', relationshipType: RelationshipType.SecuredBy },

  // NIC connects to subnet (NIC holds the IP — VM is NOT directly connected to subnet)
  { id: 'o-nic-sweb-uks',   source: 'nic-web-uks', target: 'snet-web-uks', relationshipType: RelationshipType.ConnectedTo },
  { id: 'o-nic-sapp-uks',   source: 'nic-app-uks', target: 'snet-app-uks', relationshipType: RelationshipType.ConnectedTo },
  { id: 'o-nic-sweb-ukw',   source: 'nic-web-ukw', target: 'snet-web-ukw', relationshipType: RelationshipType.ConnectedTo },
  { id: 'o-nic-sapp-ukw',   source: 'nic-app-ukw', target: 'snet-app-ukw', relationshipType: RelationshipType.ConnectedTo },

  // VM attaches to NIC (NIC is the network adapter for the VM)
  { id: 'o-vm-nic-web-uks', source: 'vm-web-uks', target: 'nic-web-uks', relationshipType: RelationshipType.AttachedTo },
  { id: 'o-vm-nic-app-uks', source: 'vm-app-uks', target: 'nic-app-uks', relationshipType: RelationshipType.AttachedTo },
  { id: 'o-vm-nic-web-ukw', source: 'vm-web-ukw', target: 'nic-web-ukw', relationshipType: RelationshipType.AttachedTo },
  { id: 'o-vm-nic-app-ukw', source: 'vm-app-ukw', target: 'nic-app-ukw', relationshipType: RelationshipType.AttachedTo },

  // ── Cross-region HA ───────────────────────────────────────────────────────

  { id: 'x-vnet-peer',      source: 'vnet-uks',   target: 'vnet-ukw',   relationshipType: RelationshipType.PeeredWith  },
  { id: 'x-fo-vm-web',      source: 'vm-web-uks', target: 'vm-web-ukw', relationshipType: RelationshipType.FailsOverTo },
  { id: 'x-fo-vm-app',      source: 'vm-app-uks', target: 'vm-app-ukw', relationshipType: RelationshipType.FailsOverTo },
]
