import type { ResourceType } from './resources'
import type { RelationshipType } from './relationships'

export type GraphNode = {
  id: string
  type: ResourceType
  name: string

  subscriptionId?: string
  resourceGroup?: string
  location?: string

  tags?: Record<string, string>
  metadata?: Record<string, unknown>
  rawPayload?: unknown
}

export type GraphEdge = {
  id: string
  source: string
  target: string
  relationshipType: RelationshipType
  metadata?: Record<string, unknown>
}
