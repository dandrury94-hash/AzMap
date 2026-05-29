import { useState } from 'react'

// ─── Script boilerplate ───────────────────────────────────────────────────────

const PS_HEAD = `$ErrorActionPreference = "Stop"
Write-Host "Checking Azure login..." -ForegroundColor Cyan
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) { Write-Host "Not logged in. Run 'az login' first." -ForegroundColor Red; exit 1 }
Write-Host "  OK: $($account.user.name)" -ForegroundColor Green
$all = [System.Collections.Generic.List[object]]::new()`

const PS_FOOT = `
$out = "azmap-export-$(Get-Date -Format 'yyyy-MM-dd-HHmm').json"
$all | ConvertTo-Json -Depth 20 | Out-File $out -Encoding utf8NoBOM
Write-Host "Saved $($all.Count) resources → $out" -ForegroundColor Green`

const BASH_HEAD = `#!/usr/bin/env bash
set -euo pipefail
merge() { jq -s '.[0] + .[1]' <(echo "$1") <(echo "$2"); }

echo "Checking Azure login..."
ACCOUNT=$(az account show --output json 2>/dev/null) || {
  echo "Not logged in. Run 'az login' first." >&2; exit 1
}
echo "  OK: $(echo "$ACCOUNT" | jq -r '.user.name')"
ALL='[]'`

const BASH_FOOT = `
OUT="azmap-export-$(date +%Y-%m-%d-%H%M).json"
echo "$ALL" | jq '.' > "$OUT"
echo "Saved $(echo "$ALL" | jq 'length') resources → $OUT"`

// ─── Types ────────────────────────────────────────────────────────────────────

type Opt = { id: string; label: string; hint: string; defaultOn?: boolean }
type OptGroup = { label: string; opts: Opt[] }
type LayerConfig = {
  description: string
  optGroups: OptGroup[]
  genPs: (sel: Set<string>) => string
  genBash: (sel: Set<string>) => string
  extracts: string[]
  note?: string
}

// ─── Generic loop builders ────────────────────────────────────────────────────
// items = [az command (with $s.id / $SUB_ID already interpolated), display label]

function psSubLoop(items: [string, string][]): string {
  if (!items.length) return '# Select at least one option above.'
  // `az rest` responses come back as { value: [...] }; plain list commands return arrays directly.
  // The inline `if ($r.value)` unwraps either shape transparently.
  const body = items.map(([cmd, lbl]) =>
    `    $r = ${cmd} | ConvertFrom-Json; if ($r.value) { $r = $r.value }\n    $all.AddRange($r); Write-Host "    ${lbl}: $($r.Count)" -ForegroundColor Gray`
  ).join('\n')
  return [PS_HEAD, '',
`$subs = az account list --output json | ConvertFrom-Json
Write-Host "$($subs.Count) subscription(s)" -ForegroundColor Cyan
foreach ($s in $subs) {
    Write-Host "  $($s.name)" -ForegroundColor White
${body}
}`, '', PS_FOOT].join('\n')
}

function bashSubLoop(items: [string, string][]): string {
  if (!items.length) return '# Select at least one option above.'
  // `az rest` responses come back as { value: [...] }; unwrap when present.
  const body = items.map(([cmd, lbl]) =>
    `    R=$(${cmd})\n    if echo "$R" | jq -e 'has("value")' >/dev/null 2>&1; then R=$(echo "$R" | jq '.value'); fi\n    echo "    ${lbl}: $(echo "$R" | jq 'length')"\n    ALL=$(merge "$ALL" "$R")`
  ).join('\n')
  return [BASH_HEAD, '',
`SUBS=$(az account list --output json)
echo "$(echo "$SUBS" | jq 'length') subscription(s)"

while IFS=$'\\t' read -r SUB_ID SUB_NAME; do
    echo "  $SUB_NAME"
${body}
done < <(echo "$SUBS" | jq -r '.[] | [.id, .name] | @tsv')`, '', BASH_FOOT].join('\n')
}

// Extracts selected items from a command map in definition order
function pickCmds<T>(map: [string, T][], sel: Set<string>): T[] {
  return map.filter(([id]) => sel.has(id)).map(([, v]) => v)
}

// ─── Identity & Management generators ────────────────────────────────────────

function identityPs(sel: Set<string>): string {
  const mg = sel.has('mgs'), sub = sel.has('subs'), rg = sel.has('rgs')
  if (!mg && !sub && !rg) return '# Select at least one option above.'
  const lines: string[] = [PS_HEAD, '']
  if (mg) lines.push(
`# Management groups
Write-Host "Management groups..." -ForegroundColor Cyan
try {
    $mgs = az account management-group list --output json | ConvertFrom-Json
    $all.AddRange($mgs)
    Write-Host "  $($mgs.Count) management group(s)" -ForegroundColor Green
} catch { Write-Host "  Skipped — requires Management Group Reader role" -ForegroundColor Yellow }
`)
  if (sub || rg) lines.push(
`# Subscriptions
Write-Host "Subscriptions..." -ForegroundColor Cyan
$subs = az account list --output json | ConvertFrom-Json
${sub ? '$all.AddRange($subs)' : '# not added to output — used for iteration only'}
Write-Host "  $($subs.Count) subscription(s)" -ForegroundColor Green
`)
  if (rg) lines.push(
`# Resource groups
Write-Host "Resource groups..." -ForegroundColor Cyan
foreach ($s in $subs) {
    Write-Host "  $($s.name)" -ForegroundColor Gray
    $rgs = az group list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($rgs)
}
`)
  lines.push(PS_FOOT)
  return lines.join('\n')
}

function identityBash(sel: Set<string>): string {
  const mg = sel.has('mgs'), sub = sel.has('subs'), rg = sel.has('rgs')
  if (!mg && !sub && !rg) return '# Select at least one option above.'
  const lines: string[] = [BASH_HEAD, '']
  if (mg) lines.push(
`# Management groups
echo "Management groups..."
if MG=$(az account management-group list --output json 2>/dev/null); then
    echo "  $(echo "$MG" | jq 'length') management group(s)"
    ALL=$(merge "$ALL" "$MG")
else
    echo "  Skipped — requires Management Group Reader role"
fi
`)
  if (sub || rg) lines.push(
`# Subscriptions
echo "Subscriptions..."
SUBS=$(az account list --output json)
echo "  $(echo "$SUBS" | jq 'length') subscription(s)"
${sub ? 'ALL=$(merge "$ALL" "$SUBS")' : '# not added to output — used for iteration only'}
`)
  if (rg) lines.push(
`# Resource groups
echo "Resource groups..."
while IFS=$'\\t' read -r SUB_ID SUB_NAME; do
    echo "  $SUB_NAME"
    RGS=$(az group list --subscription "$SUB_ID" --output json)
    echo "    $(echo "$RGS" | jq 'length') resource group(s)"
    ALL=$(merge "$ALL" "$RGS")
done < <(echo "$SUBS" | jq -r '.[] | [.id, .name] | @tsv')
`)
  lines.push(BASH_FOOT)
  return lines.join('\n')
}

// ─── Network Topology generators ─────────────────────────────────────────────

const NET_PS_MAP: [string, [string, string]][] = [
  ['vnets',      ['az network vnet list --subscription $s.id --output json',                                                                   'Virtual Networks']],
  ['nics',       ['az network nic list --subscription $s.id --output json',                                                                    'Network Interfaces']],
  ['pip',        ['az network public-ip list --subscription $s.id --output json',                                                              'Public IPs']],
  ['pip_prefix', ['az network public-ip prefix list --subscription $s.id --output json',                                                       'Public IP Prefixes']],
  ['nat',        ['az network nat gateway list --subscription $s.id --output json',                                                            'NAT Gateways']],
  ['rt',         ['az network route-table list --subscription $s.id --output json',                                                            'Route Tables']],
  ['dns',        ['az network dns zone list --subscription $s.id --output json',                                                               'DNS Zones']],
  ['pdns',       ['az network private-dns zone list --subscription $s.id --output json',                                                       'Private DNS Zones']],
  ['lb',         ['az network lb list --subscription $s.id --output json',                                                                     'Load Balancers']],
  ['agw',        ['az network application-gateway list --subscription $s.id --output json',                                                    'Application Gateways']],
  ['tm',         ['az network traffic-manager profile list --subscription $s.id --output json',                                                'Traffic Manager']],
  ['fd',         ['az network front-door list --subscription $s.id --output json',                                                             'Front Door']],
  ['cdn',        ['az cdn profile list --subscription $s.id --output json',                                                                    'CDN Profiles']],
  ['vpngw',      ['az rest --method get --url "https://management.azure.com/subscriptions/$($s.id)/providers/Microsoft.Network/virtualNetworkGateways?api-version=2023-11-01" --output json',   'VPN/ER Gateways']],
  ['lgw',        ['az rest --method get --url "https://management.azure.com/subscriptions/$($s.id)/providers/Microsoft.Network/localNetworkGateways?api-version=2023-11-01" --output json',    'Local Network Gateways']],
  ['gconn',      ['az rest --method get --url "https://management.azure.com/subscriptions/$($s.id)/providers/Microsoft.Network/connections?api-version=2023-11-01" --output json',             'Gateway Connections']],
  ['erc',        ['az network express-route list --subscription $s.id --output json',                                                          'ExpressRoute Circuits']],
  ['vwan',       ['az network vwan list --subscription $s.id --output json',                                                                   'Virtual WANs']],
  ['vhub',       ['az network vhub list --subscription $s.id --output json',                                                                   'Virtual Hubs']],
]

const NET_BASH_MAP: [string, [string, string]][] = NET_PS_MAP.map(([id, [cmd, lbl]]) => [
  // Replace PS-style $($s.id) first (REST URLs), then plain $s.id (az CLI args).
  id, [cmd.replace(/\$\(\$s\.id\)/g, '$SUB_ID').replace(/\$s\.id/g, '"$SUB_ID"'), lbl],
])

function networkPs(sel: Set<string>):   string { return psSubLoop(pickCmds(NET_PS_MAP, sel)) }
function networkBash(sel: Set<string>): string { return bashSubLoop(pickCmds(NET_BASH_MAP, sel)) }

// ─── Security generators ──────────────────────────────────────────────────────

const SEC_PS_MAP: [string, [string, string]][] = [
  ['nsg',     ['az network nsg list --subscription $s.id --output json',                                                              'Network Security Groups']],
  ['asg',     ['az resource list --subscription $s.id --resource-type Microsoft.Network/applicationSecurityGroups --output json',     'Application Security Groups']],
  ['azfw',    ['az network firewall list --subscription $s.id --output json',                                                         'Azure Firewalls']],
  ['fwpol',   ['az resource list --subscription $s.id --resource-type Microsoft.Network/firewallPolicies --output json',              'Firewall Policies']],
  ['bastion', ['az network bastion list --subscription $s.id --output json',                                                          'Bastion Hosts']],
  ['pe',      ['az network private-endpoint list --subscription $s.id --output json',                                                 'Private Endpoints']],
  ['ddos',    ['az resource list --subscription $s.id --resource-type Microsoft.Network/ddosProtectionPlans --output json',           'DDoS Protection Plans']],
  ['kv',      ['az keyvault list --subscription $s.id --output json',                                                                 'Key Vaults']],
  ['mi',      ['az identity list --subscription $s.id --output json',                                                                 'Managed Identities']],
]

const SEC_BASH_MAP: [string, [string, string]][] = SEC_PS_MAP.map(([id, [cmd, lbl]]) => [
  id, [cmd.replace('$s.id', '"$SUB_ID"'), lbl],
])

function securityPs(sel: Set<string>):   string { return psSubLoop(pickCmds(SEC_PS_MAP, sel)) }
function securityBash(sel: Set<string>): string { return bashSubLoop(pickCmds(SEC_BASH_MAP, sel)) }

// ─── Compute & Workloads generators ──────────────────────────────────────────

const COMPUTE_PS_MAP: [string, [string, string]][] = [
  ['vms',      ['az vm list --subscription $s.id --output json',                                                                      'Virtual Machines']],
  ['vmss',     ['az vmss list --subscription $s.id --output json',                                                                    'VM Scale Sets']],
  ['avset',    ['az vm availability-set list --subscription $s.id --output json',                                                     'Availability Sets']],
  ['aks',      ['az aks list --subscription $s.id --output json',                                                                     'AKS Clusters']],
  ['aci',      ['az container list --subscription $s.id --output json',                                                               'Container Instances']],
  ['acr',      ['az acr list --subscription $s.id --output json',                                                                     'Container Registries']],
  ['cappsenv', ['az containerapp env list --subscription $s.id --output json',                                                        'Container App Environments']],
  ['capps',    ['az containerapp list --subscription $s.id --output json',                                                            'Container Apps']],
  ['sf',       ['az sf cluster list --subscription $s.id --output json',                                                              'Service Fabric Clusters']],
  ['batch',    ['az batch account list --subscription $s.id --output json',                                                           'Batch Accounts']],
  ['storage',  ['az storage account list --subscription $s.id --output json',                                                         'Storage Accounts']],
  ['netapp',   ['az netappfiles account list --subscription $s.id --output json',                                                     'NetApp Accounts']],
  ['sql',      ['az sql server list --subscription $s.id --output json',                                                              'SQL Servers']],
  ['sqlmi',    ['az sql mi list --subscription $s.id --output json',                                                                  'SQL Managed Instances']],
  ['cosmos',   ['az cosmosdb list --subscription $s.id --output json',                                                                'Cosmos DB Accounts']],
  ['postgres', ['az postgres flexible-server list --subscription $s.id --output json',                                                'PostgreSQL Servers']],
  ['mysql',    ['az mysql flexible-server list --subscription $s.id --output json',                                                   'MySQL Servers']],
  ['mariadb',  ['az mariadb server list --subscription $s.id --output json',                                                          'MariaDB Servers']],
  ['redis',    ['az redis list --subscription $s.id --output json',                                                                   'Redis Cache']],
  ['synapse',  ['az synapse workspace list --subscription $s.id --output json',                                                       'Synapse Workspaces']],
]

const COMPUTE_BASH_MAP: [string, [string, string]][] = COMPUTE_PS_MAP.map(([id, [cmd, lbl]]) => [
  id, [cmd.replace('$s.id', '"$SUB_ID"'), lbl],
])

function computePs(sel: Set<string>):   string { return psSubLoop(pickCmds(COMPUTE_PS_MAP, sel)) }
function computeBash(sel: Set<string>): string { return bashSubLoop(pickCmds(COMPUTE_BASH_MAP, sel)) }

// ─── Microservices generators ─────────────────────────────────────────────────

const MICRO_PS_MAP: [string, [string, string]][] = [
  ['webapp',   ['az webapp list --subscription $s.id --output json',                                                                  'App Services']],
  ['asp',      ['az appservice plan list --subscription $s.id --output json',                                                         'App Service Plans']],
  ['ase',      ['az resource list --subscription $s.id --resource-type Microsoft.Web/hostingEnvironments --output json',              'App Service Environments']],
  ['swa',      ['az staticwebapp list --subscription $s.id --output json',                                                            'Static Web Apps']],
  ['apim',     ['az apim list --subscription $s.id --output json',                                                                    'API Management']],
  ['logic',    ['az logic workflow list --subscription $s.id --output json',                                                          'Logic Apps']],
  ['relay',    ['az relay namespace list --subscription $s.id --output json',                                                         'Relay Namespaces']],
  ['evhub',    ['az eventhubs namespace list --subscription $s.id --output json',                                                     'Event Hub Namespaces']],
  ['sb',       ['az servicebus namespace list --subscription $s.id --output json',                                                    'Service Bus Namespaces']],
  ['egtopic',  ['az eventgrid topic list --subscription $s.id --output json',                                                         'Event Grid Topics']],
  ['egdomain', ['az eventgrid domain list --subscription $s.id --output json',                                                        'Event Grid Domains']],
  ['nh',       ['az notification-hub namespace list --subscription $s.id --output json',                                              'Notification Hub Namespaces']],
  ['signalr',  ['az signalr list --subscription $s.id --output json',                                                                 'SignalR Services']],
]

const MICRO_BASH_MAP: [string, [string, string]][] = MICRO_PS_MAP.map(([id, [cmd, lbl]]) => [
  id, [cmd.replace('$s.id', '"$SUB_ID"'), lbl],
])

function microPs(sel: Set<string>):   string { return psSubLoop(pickCmds(MICRO_PS_MAP, sel)) }
function microBash(sel: Set<string>): string { return bashSubLoop(pickCmds(MICRO_BASH_MAP, sel)) }

// ─── Analytics, AI & IoT generators ──────────────────────────────────────────

const ANALYTICS_PS_MAP: [string, [string, string]][] = [
  ['databricks', ['az databricks workspace list --subscription $s.id --output json',                                                  'Databricks Workspaces']],
  ['adf',        ['az datafactory factory list --subscription $s.id --output json',                                                   'Data Factories']],
  ['ade',        ['az kusto cluster list --subscription $s.id --output json',                                                         'Data Explorer Clusters']],
  ['hdi',        ['az hdinsight list --subscription $s.id --output json',                                                             'HDInsight Clusters']],
  ['asa',        ['az stream-analytics job list --subscription $s.id --output json',                                                  'Stream Analytics Jobs']],
  ['purview',    ['az purview account list --subscription $s.id --output json',                                                       'Purview Accounts']],
  ['ml',         ['az ml workspace list --subscription $s.id --output json',                                                          'ML Workspaces']],
  ['cog',        ['az cognitiveservices account list --subscription $s.id --output json',                                             'Cognitive Services']],
  ['search',     ['az search service list --subscription $s.id --output json',                                                        'AI Search Services']],
  ['bot',        ['az bot list --subscription $s.id --output json',                                                                   'Bot Services']],
  ['iothub',     ['az iot hub list --subscription $s.id --output json',                                                               'IoT Hubs']],
  ['dps',        ['az iot dps list --subscription $s.id --output json',                                                               'Device Provisioning Services']],
  ['dt',         ['az dt list --subscription $s.id --output json',                                                                    'Digital Twins']],
  ['iotcentral', ['az iot central app list --subscription $s.id --output json',                                                       'IoT Central Apps']],
]

const ANALYTICS_BASH_MAP: [string, [string, string]][] = ANALYTICS_PS_MAP.map(([id, [cmd, lbl]]) => [
  id, [cmd.replace('$s.id', '"$SUB_ID"'), lbl],
])

function analyticsPs(sel: Set<string>):   string { return psSubLoop(pickCmds(ANALYTICS_PS_MAP, sel)) }
function analyticsBash(sel: Set<string>): string { return bashSubLoop(pickCmds(ANALYTICS_BASH_MAP, sel)) }

// ─── BCP / DR generators ─────────────────────────────────────────────────────

function bcpPs(sel: Set<string>): string {
  const reg = sel.has('regions'), vnet = sel.has('vnets'), vm = sel.has('vms'), rsv = sel.has('rsv')
  if (!reg && !vnet && !vm && !rsv) return '# Select at least one option above.'
  const lines: string[] = [PS_HEAD, '']
  if (reg) lines.push(
`# Azure region pairing data (global — not per-subscription)
Write-Host "Azure regions..." -ForegroundColor Cyan
$regions = az account list-locations --output json | ConvertFrom-Json
$all.AddRange($regions)
Write-Host "  $($regions.Count) region(s)" -ForegroundColor Green
`)
  const loop: string[] = []
  if (vnet) loop.push(`    $r = az network vnet list --subscription $s.id --output json | ConvertFrom-Json\n    $all.AddRange($r); Write-Host "    VNets: $($r.Count)" -ForegroundColor Gray`)
  if (vm)   loop.push(`    $r = az vm list --subscription $s.id --output json | ConvertFrom-Json\n    $all.AddRange($r); Write-Host "    VMs: $($r.Count)" -ForegroundColor Gray`)
  if (rsv)  loop.push(`    $r = az backup vault list --subscription $s.id --output json | ConvertFrom-Json\n    $all.AddRange($r); Write-Host "    Recovery Vaults: $($r.Count)" -ForegroundColor Gray`)
  if (loop.length) lines.push(
`$subs = az account list --output json | ConvertFrom-Json
Write-Host "$($subs.Count) subscription(s)" -ForegroundColor Cyan
foreach ($s in $subs) {
    Write-Host "  $($s.name)" -ForegroundColor White
${loop.join('\n')}
}
`)
  lines.push(PS_FOOT)
  return lines.join('\n')
}

function bcpBash(sel: Set<string>): string {
  const reg = sel.has('regions'), vnet = sel.has('vnets'), vm = sel.has('vms'), rsv = sel.has('rsv')
  if (!reg && !vnet && !vm && !rsv) return '# Select at least one option above.'
  const lines: string[] = [BASH_HEAD, '']
  if (reg) lines.push(
`# Azure region pairing data (global — not per-subscription)
echo "Azure regions..."
REGIONS=$(az account list-locations --output json)
echo "  $(echo "$REGIONS" | jq 'length') region(s)"
ALL=$(merge "$ALL" "$REGIONS")
`)
  const loop: string[] = []
  if (vnet) loop.push(`    R=$(az network vnet list --subscription "$SUB_ID" --output json)\n    echo "    VNets: $(echo "$R" | jq 'length')"\n    ALL=$(merge "$ALL" "$R")`)
  if (vm)   loop.push(`    R=$(az vm list --subscription "$SUB_ID" --output json)\n    echo "    VMs: $(echo "$R" | jq 'length')"\n    ALL=$(merge "$ALL" "$R")`)
  if (rsv)  loop.push(`    R=$(az backup vault list --subscription "$SUB_ID" --output json)\n    echo "    Recovery Vaults: $(echo "$R" | jq 'length')"\n    ALL=$(merge "$ALL" "$R")`)
  if (loop.length) lines.push(
`SUBS=$(az account list --output json)
echo "$(echo "$SUBS" | jq 'length') subscription(s)"
while IFS=$'\\t' read -r SUB_ID SUB_NAME; do
    echo "  $SUB_NAME"
${loop.join('\n')}
done < <(echo "$SUBS" | jq -r '.[] | [.id, .name] | @tsv')
`)
  lines.push(BASH_FOOT)
  return lines.join('\n')
}

// ─── Quick Start script ───────────────────────────────────────────────────────

const QS_PS = `$ErrorActionPreference = "Stop"
Write-Host "Checking Azure login..." -ForegroundColor Cyan
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) { Write-Host "Run 'az login' first." -ForegroundColor Red; exit 1 }
Write-Host "  OK: $($account.user.name)" -ForegroundColor Green
$all = [System.Collections.Generic.List[object]]::new()

# Management groups (global — requires Management Group Reader)
Write-Host "Management groups..." -ForegroundColor Cyan
try {
    $mgs = az account management-group list --output json | ConvertFrom-Json
    $all.AddRange($mgs); Write-Host "  $($mgs.Count) found" -ForegroundColor Green
} catch { Write-Host "  Skipped — requires Management Group Reader" -ForegroundColor Yellow }

# Subscriptions (global)
Write-Host "Subscriptions..." -ForegroundColor Cyan
$subs = az account list --output json | ConvertFrom-Json
$all.AddRange($subs); Write-Host "  $($subs.Count) found" -ForegroundColor Green

foreach ($s in $subs) {
    Write-Host "  [$($s.name)]" -ForegroundColor White

    # Identity
    $r = az group list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    Resource Groups    : $($r.Count)" -ForegroundColor Gray

    # Network — core
    $r = az network vnet list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    Virtual Networks   : $($r.Count)" -ForegroundColor Gray

    $r = az network nic list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    Network Interfaces : $($r.Count)" -ForegroundColor Gray

    $r = az network public-ip list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    Public IPs         : $($r.Count)" -ForegroundColor Gray

    $r = az network lb list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    Load Balancers     : $($r.Count)" -ForegroundColor Gray

    $r = az network application-gateway list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    App Gateways       : $($r.Count)" -ForegroundColor Gray

    $r = az network nat gateway list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    NAT Gateways       : $($r.Count)" -ForegroundColor Gray

    $r = az network route-table list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    Route Tables       : $($r.Count)" -ForegroundColor Gray

    $r = az network dns zone list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    DNS Zones          : $($r.Count)" -ForegroundColor Gray

    $r = az network private-dns zone list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    Private DNS Zones  : $($r.Count)" -ForegroundColor Gray

    # Security
    $r = az network nsg list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    NSGs               : $($r.Count)" -ForegroundColor Gray

    $r = az network private-endpoint list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    Private Endpoints  : $($r.Count)" -ForegroundColor Gray

    $r = az keyvault list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    Key Vaults         : $($r.Count)" -ForegroundColor Gray

    $r = az identity list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    Managed Identities : $($r.Count)" -ForegroundColor Gray

    # Compute
    $r = az vm list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    Virtual Machines   : $($r.Count)" -ForegroundColor Gray

    $r = az aks list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    AKS Clusters       : $($r.Count)" -ForegroundColor Gray

    $r = az storage account list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    Storage Accounts   : $($r.Count)" -ForegroundColor Gray

    $r = az sql server list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    SQL Servers        : $($r.Count)" -ForegroundColor Gray

    # App services
    $r = az appservice plan list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    App Service Plans  : $($r.Count)" -ForegroundColor Gray

    $r = az webapp list --subscription $s.id --output json | ConvertFrom-Json
    $all.AddRange($r); Write-Host "    App Services       : $($r.Count)" -ForegroundColor Gray
}

$out = "azmap-export-$(Get-Date -Format 'yyyy-MM-dd-HHmm').json"
$all | ConvertTo-Json -Depth 20 | Out-File $out -Encoding utf8NoBOM
Write-Host "Saved $($all.Count) resources → $out" -ForegroundColor Green`

const QS_BASH = `#!/usr/bin/env bash
set -euo pipefail
merge() { jq -s '.[0] + .[1]' <(echo "$1") <(echo "$2"); }

echo "Checking Azure login..."
ACCOUNT=$(az account show --output json 2>/dev/null) || {
  echo "Run 'az login' first." >&2; exit 1
}
echo "  OK: $(echo "$ACCOUNT" | jq -r '.user.name')"
ALL='[]'

# Management groups (global — requires Management Group Reader)
echo "Management groups..."
if MG=$(az account management-group list --output json 2>/dev/null); then
    echo "  $(echo "$MG" | jq 'length') found"; ALL=$(merge "$ALL" "$MG")
else
    echo "  Skipped — requires Management Group Reader"
fi

# Subscriptions (global)
echo "Subscriptions..."
SUBS=$(az account list --output json)
echo "  $(echo "$SUBS" | jq 'length') found"
ALL=$(merge "$ALL" "$SUBS")

while IFS=$'\\t' read -r SUB_ID SUB_NAME; do
    echo "  [$SUB_NAME]"

    # Identity
    R=$(az group list --subscription "$SUB_ID" --output json)
    echo "    Resource Groups    : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    # Network — core
    R=$(az network vnet list --subscription "$SUB_ID" --output json)
    echo "    Virtual Networks   : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az network nic list --subscription "$SUB_ID" --output json)
    echo "    Network Interfaces : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az network public-ip list --subscription "$SUB_ID" --output json)
    echo "    Public IPs         : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az network lb list --subscription "$SUB_ID" --output json)
    echo "    Load Balancers     : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az network application-gateway list --subscription "$SUB_ID" --output json)
    echo "    App Gateways       : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az network nat gateway list --subscription "$SUB_ID" --output json)
    echo "    NAT Gateways       : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az network route-table list --subscription "$SUB_ID" --output json)
    echo "    Route Tables       : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az network dns zone list --subscription "$SUB_ID" --output json)
    echo "    DNS Zones          : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az network private-dns zone list --subscription "$SUB_ID" --output json)
    echo "    Private DNS Zones  : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    # Security
    R=$(az network nsg list --subscription "$SUB_ID" --output json)
    echo "    NSGs               : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az network private-endpoint list --subscription "$SUB_ID" --output json)
    echo "    Private Endpoints  : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az keyvault list --subscription "$SUB_ID" --output json)
    echo "    Key Vaults         : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az identity list --subscription "$SUB_ID" --output json)
    echo "    Managed Identities : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    # Compute
    R=$(az vm list --subscription "$SUB_ID" --output json)
    echo "    Virtual Machines   : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az aks list --subscription "$SUB_ID" --output json)
    echo "    AKS Clusters       : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az storage account list --subscription "$SUB_ID" --output json)
    echo "    Storage Accounts   : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az sql server list --subscription "$SUB_ID" --output json)
    echo "    SQL Servers        : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    # App services
    R=$(az appservice plan list --subscription "$SUB_ID" --output json)
    echo "    App Service Plans  : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

    R=$(az webapp list --subscription "$SUB_ID" --output json)
    echo "    App Services       : $(echo "$R" | jq 'length')"; ALL=$(merge "$ALL" "$R")

done < <(echo "$SUBS" | jq -r '.[] | [.id, .name] | @tsv')

OUT="azmap-export-$(date +%Y-%m-%d-%H%M).json"
echo "$ALL" | jq '.' > "$OUT"
echo "Saved $(echo "$ALL" | jq 'length') resources → $OUT"`

// ─── Shared UI components ─────────────────────────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(code.trim()).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="rounded border border-gray-700 bg-gray-950 group mt-2 w-full min-w-0">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider font-mono">{lang}</span>
        <button onClick={copy} className="text-xs text-gray-600 hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-xs text-gray-300 font-mono leading-relaxed">{code.trim()}</pre>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-amber-800/50 bg-amber-950/20 rounded px-4 py-3 text-xs text-amber-400 leading-relaxed">
      {children}
    </div>
  )
}

function Extracts({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs">
          <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
          <span className="text-gray-400">{item}</span>
        </li>
      ))}
    </ul>
  )
}

// ─── Script builder ───────────────────────────────────────────────────────────

function ScriptBuilder({ cfg, shell, onShellChange }: {
  cfg: LayerConfig
  shell: 'ps' | 'bash'
  onShellChange: (s: 'ps' | 'bash') => void
}) {
  const allOpts = cfg.optGroups.flatMap(g => g.opts)
  const defaults = new Set(allOpts.filter(o => o.defaultOn !== false).map(o => o.id))
  const [sel, setSel] = useState<Set<string>>(defaults)

  function toggle(id: string) {
    setSel(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  function toggleAll(ids: string[], on: boolean) {
    setSel(prev => {
      const next = new Set(prev)
      ids.forEach(id => on ? next.add(id) : next.delete(id))
      return next
    })
  }

  const script = shell === 'ps' ? cfg.genPs(sel) : cfg.genBash(sel)
  const lang   = shell === 'ps' ? 'powershell' : 'bash'
  const hint   = shell === 'ps'
    ? 'Save as azmap-collect.ps1 · Run: .\\azmap-collect.ps1'
    : 'Save as azmap-collect.sh · chmod +x azmap-collect.sh · ./azmap-collect.sh'

  const allIds  = allOpts.map(o => o.id)
  const allOn   = allIds.every(id => sel.has(id))
  const allOff  = allIds.every(id => !sel.has(id))

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400 leading-relaxed">{cfg.description}</p>

      {/* Shell selector */}
      <div className="flex gap-2">
        {(['ps', 'bash'] as const).map(s => (
          <button key={s} onClick={() => onShellChange(s)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              shell === s ? 'bg-blue-600 text-white' : 'border border-gray-700 text-gray-400 hover:text-gray-200'
            }`}>
            {s === 'ps' ? 'PowerShell' : 'Bash / zsh'}
          </button>
        ))}
      </div>

      {/* Checkboxes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Include in script</p>
          <div className="flex gap-3">
            <button onClick={() => toggleAll(allIds, true)}  disabled={allOn}
              className="text-xs text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors">Select all</button>
            <button onClick={() => toggleAll(allIds, false)} disabled={allOff}
              className="text-xs text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors">Clear all</button>
          </div>
        </div>

        {cfg.optGroups.map(group => {
          const groupIds = group.opts.map(o => o.id)
          const groupOn  = groupIds.every(id => sel.has(id))
          return (
            <div key={group.label} className="space-y-1">
              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">{group.label}</p>
                <button onClick={() => toggleAll(groupIds, !groupOn)}
                  className="text-[10px] text-gray-700 hover:text-gray-400 transition-colors">
                  {groupOn ? 'Clear' : 'Select'} group
                </button>
              </div>
              {group.opts.map(opt => (
                <label key={opt.id}
                  className={`flex items-start gap-3 px-4 py-2.5 rounded border cursor-pointer transition-colors ${
                    sel.has(opt.id)
                      ? 'border-blue-700 bg-blue-950/30'
                      : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                  }`}>
                  <input type="checkbox" checked={sel.has(opt.id)} onChange={() => toggle(opt.id)}
                    className="mt-0.5 accent-blue-500 flex-shrink-0" />
                  <div>
                    <span className={`text-sm font-medium ${sel.has(opt.id) ? 'text-gray-100' : 'text-gray-400'}`}>
                      {opt.label}
                    </span>
                    <p className="text-xs text-gray-600 mt-0.5">{opt.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          )
        })}
      </div>

      {/* Generated script */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Generated script</p>
        <CodeBlock code={script} lang={lang} />
        <p className="text-xs text-gray-600 mt-2">{hint}</p>
      </div>

      {/* What AzMap extracts */}
      <div className="pt-4 border-t border-gray-800">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">What AzMap extracts</p>
        <Extracts items={cfg.extracts} />
      </div>

      {cfg.note && <Note>{cfg.note}</Note>}
    </div>
  )
}

// ─── Layer configs ────────────────────────────────────────────────────────────

const IDENTITY_CFG: LayerConfig = {
  description: 'Collects the governance skeleton of your Azure estate — the hierarchy above your resources. Everything else depends on this layer.',
  optGroups: [{
    label: 'Governance hierarchy',
    opts: [
      { id: 'mgs',  label: 'Management Groups (including tenancy)', hint: 'Full MG hierarchy above subscriptions. Requires Management Group Reader role.' },
      { id: 'subs', label: 'All Subscriptions',                     hint: 'Every subscription your account has access to.' },
      { id: 'rgs',  label: 'All Resource Groups',                   hint: 'Every resource group, iterated across all subscriptions.' },
    ],
  }],
  genPs: identityPs, genBash: identityBash,
  extracts: [
    'Management group hierarchy and tenant root',
    'Subscription names and IDs (billing/RBAC boundaries)',
    'Resource group names, locations, and subscription membership',
    'Contains edges: Tenant → MG → Subscription → Region → Resource Group',
  ],
  note: 'Management group collection requires Management Group Reader (or higher) on the tenant root. If your account lacks this, uncheck that option — the script will still collect subscriptions and resource groups.',
}

const NETWORK_CFG: LayerConfig = {
  description: 'Collects the full virtual network fabric — address spaces, subnets, peerings, gateways, and DNS. Subnets and peerings are embedded inside VNet properties so no separate export step is needed.',
  optGroups: [
    {
      label: 'Core networking',
      opts: [
        { id: 'vnets',      label: 'Virtual Networks (includes subnets + peerings)', hint: 'Each VNet export contains its subnets and VNet peerings as nested properties.' },
        { id: 'nics',       label: 'Network Interfaces',                              hint: 'NICs hold IP addresses and connect VMs to subnets.' },
        { id: 'pip',        label: 'Public IP Addresses',                             hint: 'All static and dynamic public IPs across the subscription.' },
        { id: 'pip_prefix', label: 'Public IP Prefixes',                              hint: 'Reserved CIDR blocks for predictable public IP ranges.' },
        { id: 'nat',        label: 'NAT Gateways',                                    hint: 'Outbound SNAT gateways associated with subnets.' },
      ],
    },
    {
      label: 'Routing & DNS',
      opts: [
        { id: 'rt',   label: 'Route Tables',       hint: 'User-defined routes (UDRs) applied to subnets. Includes association lists.' },
        { id: 'dns',  label: 'DNS Zones',           hint: 'Public Azure DNS zones and their record sets.' },
        { id: 'pdns', label: 'Private DNS Zones',   hint: 'Private DNS zones linked to VNets for internal name resolution.' },
      ],
    },
    {
      label: 'Traffic & CDN',
      opts: [
        { id: 'lb',  label: 'Load Balancers',            hint: 'Standard and Basic LBs — frontend IP configs encode internal vs external placement.' },
        { id: 'agw', label: 'Application Gateways',      hint: 'Layer-7 load balancers with WAF support.' },
        { id: 'tm',  label: 'Traffic Manager Profiles',  hint: 'DNS-based global load balancing across endpoints.' },
        { id: 'fd',  label: 'Azure Front Door',          hint: 'Global HTTP/HTTPS routing and acceleration (classic Front Door).' },
        { id: 'cdn', label: 'CDN Profiles',              hint: 'Azure CDN endpoints for static asset delivery.' },
      ],
    },
    {
      label: 'Hybrid connectivity',
      opts: [
        { id: 'vpngw', label: 'VPN / ExpressRoute Gateways', hint: 'VNet gateways for site-to-site VPN and ExpressRoute circuits.' },
        { id: 'lgw',   label: 'Local Network Gateways',      hint: 'On-premises gateway representations for site-to-site connections.' },
        { id: 'gconn', label: 'Gateway Connections',         hint: 'The connection resources linking two gateways or a gateway to a local network.' },
        { id: 'erc',   label: 'ExpressRoute Circuits',       hint: 'Dedicated private connectivity circuits to Azure datacentres.' },
      ],
    },
    {
      label: 'Virtual WAN',
      opts: [
        { id: 'vwan', label: 'Virtual WANs',  hint: 'The top-level vWAN resource that owns all hubs.' },
        { id: 'vhub', label: 'Virtual Hubs',  hint: 'Hub resources inside a vWAN — own NVAs and hub-deployed firewalls.' },
      ],
    },
  ],
  genPs: networkPs, genBash: networkBash,
  extracts: [
    'VNet names, address spaces, and locations',
    'All subnets: name, CIDR prefix, NSG and Route Table associations',
    'VNet peering connections (PeeredWith edges)',
    'NIC private IPs and subnet placement (ConnectedTo edges)',
    'Load Balancer subnet placement for internal LBs',
    'VPN/ER Gateway subnet placement (GatewaySubnet)',
    'VirtualHub → VirtualWAN ownership (Contains edges)',
    'Route Table → Subnet associations (RoutesTo edges)',
    'NAT Gateway → Subnet associations (AttachedTo edges)',
  ],
  note: 'VPN Gateways, Local Network Gateways, and Gateway Connections use az rest ARM API calls (subscription-scope) to return full properties including subnet placement and peer gateway references. These commands require Contributor or Network Contributor role on the subscription.',
}

const SECURITY_CFG: LayerConfig = {
  description: 'Collects network security controls, inspection resources, and secret management infrastructure. NSG rules, firewall policies, and association lists are embedded in the exported payloads.',
  optGroups: [
    {
      label: 'Network security',
      opts: [
        { id: 'nsg',     label: 'Network Security Groups (includes all rules)',     hint: 'Each NSG export contains inbound and outbound security rules, plus subnet and NIC association lists.' },
        { id: 'asg',     label: 'Application Security Groups',                     hint: 'Named groups of NICs used as source/destination in NSG rules.' },
        { id: 'azfw',    label: 'Azure Firewalls',                                 hint: 'Stateful L3–L7 firewalls — VNet-deployed or hub-deployed in Secured vHub mode.' },
        { id: 'fwpol',   label: 'Firewall Policies',                               hint: 'Rule collections referenced by Azure Firewalls via DependsOn edges.' },
        { id: 'bastion', label: 'Azure Bastion Hosts',                             hint: 'Browser-based RDP/SSH gateways sitting in AzureBastionSubnet.' },
        { id: 'pe',      label: 'Private Endpoints',                               hint: 'Endpoints that bring PaaS service traffic onto the VNet fabric via a private IP.' },
        { id: 'ddos',    label: 'DDoS Protection Plans',                           hint: 'Standard DDoS plans associated with one or more VNets.' },
      ],
    },
    {
      label: 'Identity & secrets',
      opts: [
        { id: 'kv', label: 'Key Vaults',          hint: 'Key, secret, and certificate stores. Appear as nodes in topology for Private Endpoint visualisation.' },
        { id: 'mi', label: 'Managed Identities',  hint: 'User-assigned managed identities — appear as nodes that workloads may reference.' },
      ],
    },
  ],
  genPs: securityPs, genBash: securityBash,
  extracts: [
    'NSG inbound and outbound security rules (priority, protocol, ports, source, destination, access, direction)',
    'Subnet → NSG SecuredBy edges',
    'NIC → NSG SecuredBy edges',
    'Azure Firewall → FirewallPolicy DependsOn edges',
    'Azure Firewall subnet placement (VNet-deployed) or hub ownership (hub-deployed)',
    'Bastion → AzureBastionSubnet ConnectedTo edges',
    'Private Endpoint → subnet ConnectedTo edges',
  ],
  note: 'NSG subnet associations also appear inside VNet → Subnet properties. Export both NSGs and VNets for full coverage — AzMap deduplicates associations automatically.',
}

const COMPUTE_CFG: LayerConfig = {
  description: 'Collects virtual machines, container infrastructure, storage accounts, and databases. Storage and data services are included here because they are workload resources that belong to the same resource groups as your compute.',
  optGroups: [
    {
      label: 'Virtual machines',
      opts: [
        { id: 'vms',   label: 'Virtual Machines',                hint: 'VM properties include hardware profile, OS type, and NIC references.' },
        { id: 'vmss',  label: 'VM Scale Sets',                   hint: 'Identical VM groups with auto-scaling. Agent pools for AKS node VMs appear here.' },
        { id: 'avset', label: 'Availability Sets',               hint: 'Logical groupings that place VMs across fault and update domains.' },
      ],
    },
    {
      label: 'Containers & orchestration',
      opts: [
        { id: 'aks',      label: 'AKS Clusters',                      hint: 'Managed Kubernetes — agent pool VNet subnet integration is extracted as ConnectedTo edges.' },
        { id: 'aci',      label: 'Container Instances',                hint: 'Serverless containers (microsoft.containerinstance/containergroups).' },
        { id: 'acr',      label: 'Container Registries',              hint: 'Private Docker registries (microsoft.containerregistry/registries).' },
        { id: 'cappsenv', label: 'Container App Environments',        hint: 'The shared boundary for a group of Container Apps. VNet-injected environments show subnet placement.' },
        { id: 'capps',    label: 'Container Apps',                    hint: 'Individual apps within an environment — modelled as children of their environment (Contains edge).' },
      ],
    },
    {
      label: 'Platform compute',
      opts: [
        { id: 'sf',    label: 'Service Fabric Clusters',  hint: 'Microservice platform clusters (microsoft.servicefabric/clusters).' },
        { id: 'batch', label: 'Azure Batch Accounts',     hint: 'Large-scale parallel and HPC job processing.' },
        { id: 'dhost', label: 'Dedicated Hosts',          hint: 'Physical servers reserved for a single tenant (az vm host group list).' },
      ],
    },
    {
      label: 'Storage',
      opts: [
        { id: 'storage', label: 'Storage Accounts',      hint: 'Blob, Queue, Table, and File storage (microsoft.storage/storageaccounts).' },
        { id: 'netapp',  label: 'Azure NetApp Files',    hint: 'Enterprise NFS/SMB file shares (microsoft.netapp/netappaccounts).' },
      ],
    },
    {
      label: 'Databases & caching',
      opts: [
        { id: 'sql',      label: 'SQL Servers + Databases',        hint: 'Logical SQL Server resources (microsoft.sql/servers). Databases are nested sub-resources.' },
        { id: 'sqlmi',    label: 'SQL Managed Instances',          hint: 'Fully managed SQL Server engine inside a VNet (microsoft.sql/managedinstances).' },
        { id: 'cosmos',   label: 'Cosmos DB Accounts',             hint: 'Multi-model globally distributed database (microsoft.documentdb/databaseaccounts).' },
        { id: 'postgres', label: 'PostgreSQL Servers (Flex)',      hint: 'Flexible server variant (microsoft.dbforpostgresql/flexibleservers). Also maps classic servers.' },
        { id: 'mysql',    label: 'MySQL Servers (Flex)',           hint: 'Flexible server variant (microsoft.dbformysql/flexibleservers). Also maps classic servers.' },
        { id: 'mariadb',  label: 'MariaDB Servers',                hint: 'Legacy managed MariaDB (microsoft.dbformariadb/servers).' },
        { id: 'redis',    label: 'Redis Cache',                    hint: 'In-memory data structure store (microsoft.cache/redis).' },
        { id: 'synapse',  label: 'Azure Synapse Workspaces',       hint: 'Unified analytics platform combining SQL, Spark, and Data Explorer.' },
      ],
    },
  ],
  genPs: computePs, genBash: computeBash,
  extracts: [
    'VM → NIC AttachedTo edges (from VM networkProfile.networkInterfaces)',
    'NIC private IP addresses enriched into node metadata',
    'NIC → Subnet ConnectedTo edges',
    'NIC → Load Balancer AttachedTo edges (via backend pool membership)',
    'AKS agent pool → subnet ConnectedTo edges (per node pool)',
    'Container App → Container App Environment Contains edges',
    'Container App Environment → VNet subnet ConnectedTo edges (VNet-injected environments)',
  ],
}

const MICRO_CFG: LayerConfig = {
  description: 'Collects application hosting, API gateway, and messaging infrastructure. These services sit between your compute layer and your consumers — understanding their VNet integration and plan dependencies reveals the full application topology.',
  optGroups: [
    {
      label: 'App hosting',
      opts: [
        { id: 'webapp', label: 'App Services (Web Apps + Function Apps)', hint: 'Both web apps and function apps share the microsoft.web/sites type. VNet integration subnet and plan references are extracted as edges.' },
        { id: 'asp',    label: 'App Service Plans',                        hint: 'The compute substrate for App Services (microsoft.web/serverfarms). App Services show DependsOn edges to their plan.' },
        { id: 'ase',    label: 'App Service Environments (ASE)',           hint: 'Dedicated isolated environments with a private subnet (microsoft.web/hostingEnvironments).' },
        { id: 'swa',    label: 'Static Web Apps',                          hint: 'Globally distributed static hosting with built-in API backend (microsoft.web/staticsites).' },
      ],
    },
    {
      label: 'API & integration',
      opts: [
        { id: 'apim',  label: 'API Management Services', hint: 'Managed API gateway — VNet-injected instances show subnet placement.' },
        { id: 'logic', label: 'Logic Apps (Workflows)',  hint: 'Low-code workflow orchestration (microsoft.logic/workflows).' },
        { id: 'relay', label: 'Hybrid Relay Namespaces', hint: 'Azure Relay for hybrid on-premises connectivity (microsoft.relay/namespaces).' },
      ],
    },
    {
      label: 'Messaging & events',
      opts: [
        { id: 'evhub',    label: 'Event Hub Namespaces',          hint: 'High-throughput data streaming namespaces (microsoft.eventhub/namespaces).' },
        { id: 'sb',       label: 'Service Bus Namespaces',         hint: 'Enterprise messaging with queues and topics (microsoft.servicebus/namespaces).' },
        { id: 'egtopic',  label: 'Event Grid Topics',             hint: 'Custom event routing topics (microsoft.eventgrid/topics).' },
        { id: 'egdomain', label: 'Event Grid Domains',            hint: 'Multi-topic event routing domains (microsoft.eventgrid/domains).' },
        { id: 'nh',       label: 'Notification Hub Namespaces',   hint: 'Push notification infrastructure (microsoft.notificationhubs/namespaces).' },
        { id: 'signalr',  label: 'SignalR Service',               hint: 'Real-time WebSocket messaging (microsoft.signalrservice/signalr).' },
      ],
    },
  ],
  genPs: microPs, genBash: microBash,
  extracts: [
    'App Service → subnet ConnectedTo edges (regional VNet integration)',
    'App Service → App Service Plan DependsOn edges',
    'App Service Environment → dedicated subnet ConnectedTo edges',
    'API Management → subnet ConnectedTo edges (Internal/External VNet mode)',
    'Logic App workflow definitions preserved in rawPayload',
  ],
  note: 'Logic Apps with Standard hosting run as App Services — az logic workflow list returns Consumption-plan workflows. Standard Logic Apps also appear in az webapp list under microsoft.web/sites.',
}

const ANALYTICS_CFG: LayerConfig = {
  description: 'Collects analytics platforms, AI and machine learning infrastructure, and IoT services. These resources are typically compute-heavy but architecturally distinct — they depend on storage, networking, and identity resources from other layers.',
  optGroups: [
    {
      label: 'Analytics',
      opts: [
        { id: 'databricks', label: 'Azure Databricks Workspaces',    hint: 'Managed Spark clusters (microsoft.databricks/workspaces).' },
        { id: 'adf',        label: 'Azure Data Factory',             hint: 'ETL and data integration pipelines (microsoft.datafactory/factories).' },
        { id: 'ade',        label: 'Azure Data Explorer (Kusto)',    hint: 'Fast analytical query engine for time-series data (microsoft.kusto/clusters).' },
        { id: 'hdi',        label: 'HDInsight Clusters',             hint: 'Managed Hadoop, Spark, Hive, and Kafka clusters (microsoft.hdinsight/clusters).' },
        { id: 'asa',        label: 'Stream Analytics Jobs',          hint: 'Real-time event stream processing (microsoft.streamanalytics/streamingjobs).' },
        { id: 'purview',    label: 'Microsoft Purview Accounts',     hint: 'Data governance and data map (microsoft.purview/accounts).' },
      ],
    },
    {
      label: 'AI & machine learning',
      opts: [
        { id: 'ml',     label: 'ML Workspaces',          hint: 'Azure Machine Learning workspaces (microsoft.machinelearningservices/workspaces). Requires the ml CLI extension: az extension add -n ml.' },
        { id: 'cog',    label: 'Cognitive Services',     hint: 'All Cognitive Services accounts including Azure OpenAI (microsoft.cognitiveservices/accounts).' },
        { id: 'search', label: 'Azure AI Search',        hint: 'Managed search service (microsoft.search/searchservices).' },
        { id: 'bot',    label: 'Bot Services',           hint: 'Azure Bot Service registrations (microsoft.botservice/botservices).' },
      ],
    },
    {
      label: 'IoT',
      opts: [
        { id: 'iothub',     label: 'IoT Hubs',                      hint: 'Managed IoT device connectivity (microsoft.devices/iothubs).' },
        { id: 'dps',        label: 'Device Provisioning Services',  hint: 'Zero-touch device provisioning (microsoft.devices/provisioningservices).' },
        { id: 'dt',         label: 'Azure Digital Twins',           hint: 'Live environment modelling (microsoft.digitaltwins/digitaltwininstances). Requires: az extension add -n azure-iot.' },
        { id: 'iotcentral', label: 'IoT Central Apps',              hint: 'SaaS IoT application platform (microsoft.iotcentral/iotapps).' },
      ],
    },
  ],
  genPs: analyticsPs, genBash: analyticsBash,
  extracts: [
    'Databricks workspace VNet injection details preserved in rawPayload',
    'ML workspace resource group and subscription membership',
    'Cognitive Services accounts (includes Azure OpenAI deployments, kind field in rawPayload)',
    'IoT Hub and DPS node inventory for device fleet topology',
  ],
  note: 'Some commands require CLI extensions: az extension add -n ml (ML Workspaces), az extension add -n azure-iot (Digital Twins, IoT DPS). The script will fail on those lines if the extension is missing — uncheck those options if you do not need them.',
}

const BCP_CFG: LayerConfig = {
  description: 'Collects data for BCP/DR analysis. Azure does not have a single "DR export" — AzMap derives resilience signals by analysing your resource distribution across Azure paired regions.',
  optGroups: [{
    label: 'Resilience data',
    opts: [
      { id: 'regions', label: 'Azure Region Pairing Data',              hint: 'Global list of all Azure regions with their Microsoft-defined paired region.' },
      { id: 'vnets',   label: 'Virtual Networks (cross-region peerings)', hint: 'VNet peerings between regions are the strongest signal of deliberate cross-region HA connectivity.' },
      { id: 'vms',     label: 'Virtual Machines (deployment distribution)', hint: 'VM locations show whether workloads are spread across paired regions or concentrated in one.' },
      { id: 'rsv',     label: 'Recovery Services Vaults',               hint: 'Azure Backup and Site Recovery vaults (microsoft.recoveryservices/vaults).' },
    ],
  }],
  genPs: bcpPs, genBash: bcpBash,
  extracts: [
    'All Azure regions and their Microsoft-defined pair (e.g. UK South ↔ UK West)',
    'VNet peering connections across regions (PeeredWith edges)',
    'VM deployment distribution across regions',
    'Recovery Services Vault locations (backup/DR anchor points)',
    'Missing paired counterparts (SPOF signals) — derived by AzMap from the combined graph',
  ],
  note: 'For complete BCP/DR analysis, run the Network and Compute layer scripts as well. AzMap combines all layers in the graph and derives resilience signals from the combined data.',
}

// ─── Quick Start content ──────────────────────────────────────────────────────

function QuickStartContent({ shell, onShellChange }: { shell: 'ps' | 'bash'; onShellChange: (s: 'ps' | 'bash') => void }) {
  const script = shell === 'ps' ? QS_PS : QS_BASH
  const lang   = shell === 'ps' ? 'powershell' : 'bash'
  const hint   = shell === 'ps'
    ? 'Save as azmap-collect.ps1 · Run: .\\azmap-collect.ps1 (if blocked: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass)'
    : 'Save as azmap-collect.sh · chmod +x azmap-collect.sh · ./azmap-collect.sh · Requires jq (brew install jq or apt install jq)'
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400 leading-relaxed">
        The quickest path to a working topology. Collects the core of every major Azure layer — identity
        hierarchy, network fabric, security controls, compute, and app services — across all accessible
        subscriptions. Saves to a single dated JSON file ready to drop into Import. Use the layer scripts
        below for deeper coverage of specialised resources (vWAN, ExpressRoute, Analytics, BCP/DR).
      </p>
      <div className="flex gap-2">
        {(['ps', 'bash'] as const).map(s => (
          <button key={s} onClick={() => onShellChange(s)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              shell === s ? 'bg-blue-600 text-white' : 'border border-gray-700 text-gray-400 hover:text-gray-200'
            }`}>
            {s === 'ps' ? 'PowerShell' : 'Bash / zsh'}
          </button>
        ))}
      </div>
      <CodeBlock code={script} lang={lang} />
      <p className="text-xs text-gray-600">{hint}</p>
      <div className="pt-4 border-t border-gray-800">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">After running</p>
        <ol className="space-y-1.5 text-xs text-gray-400 list-none">
          {[
            'A file named azmap-export-YYYY-MM-DD-HHMM.json is created in the current directory.',
            'Open AzMap → Import → drop the file onto the import area.',
            'Click Import — AzMap processes the file and builds the graph.',
            'Go to Dashboard — layers light up as resource types are detected.',
            'Go to Topology — the diagram renders from your imported data.',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-900 text-blue-300 text-[10px] flex items-center justify-center font-bold">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <Note>Use the layer scripts below for more targeted collection — each generates a standalone script for a specific architectural layer with full checkbox control.</Note>
    </div>
  )
}

// ─── AzMap Native content ─────────────────────────────────────────────────────

function AzMapNativeContent() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400 leading-relaxed">
        The <code className="text-blue-300 font-mono">.azmap</code> format is a versioned JSON snapshot of
        AzMap's canonical graph — the full <code className="text-blue-300 font-mono">GraphNode[]</code> and{' '}
        <code className="text-blue-300 font-mono">GraphEdge[]</code> arrays with preserved raw Azure payloads.
        Layout is always recomputed from the graph on load — no stale coordinates.
      </p>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">File format</p>
        <CodeBlock lang="json" code={`{
  "version": "1",
  "nodes": [
    {
      "id": "/subscriptions/.../virtualnetworks/vnet1",
      "type": "VirtualNetwork",
      "name": "vnet1",
      "subscriptionId": "...",
      "resourceGroup": "rg-networking",
      "location": "uksouth",
      "rawPayload": { ... }
    }
  ],
  "edges": [
    {
      "id": "contains--rg-networking--virtualnetworks-vnet1",
      "source": ".../resourcegroups/rg-networking",
      "target": ".../virtualnetworks/vnet1",
      "relationshipType": "contains"
    }
  ]
}`} />
      </div>
      <div className="pt-4 border-t border-gray-800">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Use cases</p>
        <Extracts items={[
          'Save a point-in-time topology snapshot for later review',
          'Share a diagram without sharing Azure credentials',
          'Reload a previous session without re-running the collector script',
          'Archive a topology at a known-good state before infrastructure changes',
        ]} />
      </div>
      <Note>
        Export to <code className="font-mono">.azmap</code> is coming in a future release. Import is already supported —
        any file with a <code className="font-mono">{"{ nodes, edges }"}</code> shape is detected and loaded directly.
      </Note>
    </div>
  )
}

// ─── Nav config ───────────────────────────────────────────────────────────────

type SectionId = 'quickstart' | 'identity' | 'network' | 'security' | 'compute' | 'microservices' | 'analytics' | 'bcpdr' | 'azmap'

const NAV: { group: string; items: { id: SectionId; label: string; badge?: string }[] }[] = [
  { group: 'Getting started', items: [{ id: 'quickstart', label: 'Quick Start Script', badge: 'Recommended' }] },
  {
    group: 'By layer',
    items: [
      { id: 'identity',      label: 'Identity & Management'  },
      { id: 'network',       label: 'Network Topology'        },
      { id: 'security',      label: 'Security'                },
      { id: 'compute',       label: 'Compute & Workloads'     },
      { id: 'microservices', label: 'Microservices'           },
      { id: 'analytics',     label: 'Analytics, AI & IoT'    },
      { id: 'bcpdr',         label: 'BCP / DR'                },
    ],
  },
  { group: 'Formats', items: [{ id: 'azmap', label: 'AzMap Native (.azmap)' }] },
]

const TITLES: Record<SectionId, string> = {
  quickstart:    'Quick Start Script',
  identity:      'Identity & Management',
  network:       'Network Topology',
  security:      'Security',
  compute:       'Compute & Workloads',
  microservices: 'Microservices',
  analytics:     'Analytics, AI & IoT',
  bcpdr:         'BCP / DR',
  azmap:         'AzMap Native (.azmap)',
}

const LAYER_CFGS: Partial<Record<SectionId, LayerConfig>> = {
  identity:      IDENTITY_CFG,
  network:       NETWORK_CFG,
  security:      SECURITY_CFG,
  compute:       COMPUTE_CFG,
  microservices: MICRO_CFG,
  analytics:     ANALYTICS_CFG,
  bcpdr:         BCP_CFG,
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Tutorial() {
  const [active, setActive] = useState<SectionId>('quickstart')
  const [shell, setShell]   = useState<'ps' | 'bash'>('ps')

  const cfg = LAYER_CFGS[active]

  return (
    <div className="flex flex-1 min-h-0 min-w-0">
      <aside className="w-52 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col py-4 overflow-y-auto">
        {NAV.map(group => (
          <div key={group.group} className="mb-4">
            <p className="px-4 pb-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{group.group}</p>
            <div className="px-2 space-y-0.5">
              {group.items.map(item => (
                <button key={item.id} onClick={() => setActive(item.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    active === item.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                  }`}>
                  <span className="block font-medium leading-tight">{item.label}</span>
                  {item.badge && (
                    <span className={`text-xs ${active === item.id ? 'text-blue-200' : 'text-gray-600'}`}>{item.badge}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 py-8 min-w-0">
        <h1 className="text-2xl font-semibold mb-1">{TITLES[active]}</h1>
        <p className="text-xs text-gray-600 mb-8 uppercase tracking-wider">Tutorial · AzMap data collection</p>

        {active === 'quickstart' && <QuickStartContent shell={shell} onShellChange={setShell} />}
        {active === 'azmap'      && <AzMapNativeContent />}
        {cfg                     && <ScriptBuilder cfg={cfg} shell={shell} onShellChange={setShell} />}
      </div>
    </div>
  )
}
