/**
 * Vendored subset of @pcc/spec types.
 *
 * Mirrors the DTO shapes documented in
 * C:\Users\globa\physical-capability-cloud\CLAUDE.md (Section 5) so the
 * Android shell stays decoupled from the PCC monorepo build. When the
 * official @pcc/spec npm package ships, swap these imports.
 *
 * Naming convention: keep the wire shape literal (snake_case where the
 * API uses it, camelCase otherwise) so JSON.parse responses can be cast
 * without translation. Optional fields really are optional — facades
 * enrich them but routes only return the base shape unless asked.
 */

export type AssuranceTier = 0 | 1 | 2 | 3;

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface ToleranceSpec {
  linear?: string;
  surface?: string;
  positional?: string;
}

export interface WorkEnvelope {
  x: number;
  y: number;
  z: number;
  unit: 'mm' | 'in';
}

export interface PricingModel {
  currency: string;
  baseCost: string;
  perMinute?: string;
  perGram?: string;
  perCm3?: string;
  minimum: string;
  mode?: 'fixed' | 'auction';
}

/** Mirrors CapabilityDTO from CLAUDE.md §5 */
export interface CapabilityDTO {
  id: string;
  kernelId: string;
  type: string;
  name: string;
  description?: string;
  materials: string[];
  tolerances?: ToleranceSpec;
  envelope?: WorkEnvelope;
  assuranceTiers: AssuranceTier[];
  pricing: PricingModel;
  location: GeoLocation;
  tags?: string[];
  // Enrichment (populated by facades)
  reputation?: number;
  queueDepth: number;
  available: boolean;
  estimatedWaitMinutes?: number;
  kernelName?: string;
  kernelStatus?: 'online' | 'offline' | 'maintenance' | 'stale';
}

/** Mirrors JobDTO from CLAUDE.md §5 */
export type JobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface JobDTO {
  id: string;
  capabilityId: string;
  kernelId: string;
  status: JobStatus;
  progress?: number;
  assuranceTier: AssuranceTier;
  createdAt: string;
  updatedAt?: string;
  // Enrichment
  kernelName?: string;
  capabilityType?: string;
  evidenceCount?: number;
  escrowStatus?: string;
  estimatedCompletion?: string;
}

export interface JobTimelineEvent {
  type: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface EvidenceSummaryDTO {
  id: string;
  jobId: string;
  bundleHash?: string;
  storageUri?: string;
  tier: AssuranceTier;
  createdAt: string;
  alcoaScore?: number;
}

export interface EscrowSummaryDTO {
  id: string;
  jobId: string;
  status: 'created' | 'funded' | 'active' | 'completed' | 'disputed' | 'refunded';
  totalAmount: string;
  currency: string;
  milestoneCount: number;
  releasedCount: number;
  disputedCount: number;
  challengeWindowEnd?: string;
}

export interface JobDetailDTO extends JobDTO {
  timeline: JobTimelineEvent[];
  evidenceBundles: EvidenceSummaryDTO[];
  escrow?: EscrowSummaryDTO;
}

/** Mirrors KernelDTO from CLAUDE.md §5 */
export interface KernelDTO {
  id: string;
  name: string;
  operatorAddress: string;
  location: GeoLocation;
  physicalAddress: string;
  maxAssuranceTier: AssuranceTier;
  status: 'online' | 'offline' | 'maintenance' | 'suspended';
  lastHeartbeat: string;
  version: string;
  // Enrichment
  capabilityCount: number;
  capabilityTypes: string[];
  reputation?: number;
  totalJobsCompleted: number;
  isStale: boolean;
  activeJobCount?: number;
}

export interface DeviceStatusDTO {
  id: string;
  type: string;
  model?: string;
  status: 'idle' | 'busy' | 'error' | 'offline' | 'maintenance';
  healthStatus: 'healthy' | 'degraded' | 'offline' | 'unknown';
  adapterType?: string;
  capabilities: string[];
}

export interface KernelHealthSnapshot extends KernelDTO {
  devices: DeviceStatusDTO[];
  recentJobs: JobDTO[];
  uptimePercent?: number;
}

/** PaginatedResult<T> per Result<T> pattern in CLAUDE.md §6 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

/** Standard error envelope from the gateway */
export interface GatewayError {
  error?: string;
  message: string;
  code?: string;
  details?: unknown;
}

/** Types-only export marker so Vite/Vitest don't choke on empty modules */
export type __PCCSpec = unknown;
