export interface DiveResponse {
  layer: DiveLayer[];
  image: DiveImageStats;
  fileTree?: unknown;
  filetree?: unknown;
  tree?: unknown;
  fileSystem?: unknown;
  files?: unknown;
  root?: unknown;
}

export interface DiveImageStats {
  sizeBytes: number;
  inefficientBytes: number;
  efficiencyScore: number;
  fileReference: FileReference[];
}

export interface FileReference {
  count: number;
  sizeBytes: number;
  file: string;
}

export type FileChangeType = 'added' | 'modified' | 'removed' | 'unchanged' | 'unknown';

export type FileNodeType = 'file' | 'directory' | 'link' | 'unknown';

export interface FileTreeNode {
  name: string;
  path: string;
  sizeBytes?: number;
  fileType?: FileNodeType;
  change?: FileChangeType;
  children?: FileTreeNode[];
}

export interface LayerFileTree {
  layerId?: string;
  layerIndex?: number;
  command?: string;
  sizeBytes?: number;
  tree: FileTreeNode[];
}

export interface NormalizedFileTree {
  aggregate: FileTreeNode[];
  layers: LayerFileTree[];
}

export interface LayerChangeEntry {
  path: string;
  change: FileChangeType;
  sizeBytes?: number;
}

export interface DiveLayer {
  index: number;
  id: string;
  digestId: string;
  sizeBytes: number;
  command: string;
  fileTree?: unknown;
  filetree?: unknown;
  tree?: unknown;
  diffTree?: unknown;
  changes?: unknown;
  fileSystem?: unknown;
  files?: unknown;
  root?: unknown;
}

export interface AnalysisResult {
  image: Image;
  dive: DiveResponse;
}

export interface Image {
  name: string;
  id: string;
  fullId?: string;
  createdAt?: number;
  sizeBytes?: number;
  aliases: string[];
}

export type AnalysisSource = 'docker' | 'docker-archive';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface AnalyzeRequest {
  image?: string;
  imageId?: string;
  source: AnalysisSource;
  archivePath?: string;
}

export interface AnalyzeResponse {
  jobId: string;
  status: JobStatus;
}

export interface BulkAnalyzeTarget {
  image: string;
  imageId?: string;
}

export interface BulkAnalyzeRequest {
  days: number;
  forceReanalyze: boolean;
  visibleCount: number;
  eligibleCount: number;
  skippedOlderCount: number;
  skippedUnknownCreatedAtCount: number;
  skippedAlreadyAnalyzedCount: number;
  targets: BulkAnalyzeTarget[];
}

export interface BulkAnalyzeProgress {
  total: number;
  completed: number;
  currentTarget?: string;
  startedAt: number;
  cancelRequested?: boolean;
}

export interface BulkAnalyzeFailure {
  image: string;
  message: string;
}

export interface BulkAnalyzeReport {
  days: number;
  forceReanalyze: boolean;
  visibleCount: number;
  eligibleCount: number;
  skippedOlderCount: number;
  skippedUnknownCreatedAtCount: number;
  skippedAlreadyAnalyzedCount: number;
  cancelled: boolean;
  cancelledRemainingCount: number;
  startedAt: number;
  completedAt: number;
  succeeded: string[];
  failed: BulkAnalyzeFailure[];
}

export interface AnalysisStatusResponse {
  jobId: string;
  status: JobStatus;
  message?: string;
  elapsedSeconds: number;
}

export interface AnalysisErrorResponse {
  status?: JobStatus;
  message: string;
}

export interface HistorySummary {
  sizeBytes: number;
  inefficientBytes: number;
  efficiencyScore: number;
}

export interface HistoryMetadata {
  id: string;
  image: string;
  imageId?: string;
  source: AnalysisSource;
  createdAt: string;
  completedAt: string;
  summary: HistorySummary;
}

export interface HistoryEntry {
  metadata: HistoryMetadata;
  result: DiveResponse;
}

export type CompareSide = 'left' | 'right';

export interface CompareSelectionState {
  leftId?: string;
  rightId?: string;
}

export interface CompareMetricDelta {
  left: number;
  right: number;
  delta: number;
}

export interface CompareSummaryDelta {
  sizeBytes: CompareMetricDelta;
  inefficientBytes: CompareMetricDelta;
  efficiencyScore: CompareMetricDelta;
}

export type CompareLayerStatus = 'added' | 'removed' | 'modified' | 'unchanged';

export interface CompareLayerDelta {
  key: string;
  status: CompareLayerStatus;
  left?: DiveLayer;
  right?: DiveLayer;
  sizeBytesDelta: number;
}

export type ExportFormat = 'json' | 'csv' | 'html';

export interface ExportRequest {
  format: ExportFormat;
}

export interface ExportResponse {
  format: ExportFormat;
  filename: string;
  contentType: string;
}

export interface CIRulesRequest {
  lowestEfficiency?: number;
  highestWastedBytes?: string;
  highestUserWastedPercent?: number;
}

export interface CIRulesResponse {
  filename: string;
  content: string;
}
