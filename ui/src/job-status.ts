import { JobStatus } from "./models";

export interface FormatJobStatusOptions {
  jobStatus: JobStatus | string;
  jobMessage?: string;
  elapsedLabel?: string;
  target?: string;
}

export interface JobStatusDisplay {
  statusLine: string;
  detailMessage?: string;
  isActive: boolean;
  isFailure: boolean;
}

const FRIENDLY_STATUS_LABELS: Record<JobStatus, string> = {
  queued: "Queued for analysis",
  running: "Analyzing image",
  succeeded: "Analysis complete",
  failed: "Analysis failed",
};

function isKnownJobStatus(status: string): status is JobStatus {
  return status in FRIENDLY_STATUS_LABELS;
}

function toTitleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function isRedundantRunningMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized === "analyzing image" || normalized === "analysis running";
}

export function formatJobStatusDisplay(
  options: FormatJobStatusOptions
): JobStatusDisplay {
  const rawStatus = options.jobStatus.trim().toLowerCase();
  const knownStatus = isKnownJobStatus(rawStatus) ? rawStatus : undefined;
  const isActive = rawStatus === "queued" || rawStatus === "running";
  const isFailure = rawStatus === "failed";
  const message = options.jobMessage?.trim();

  let baseLabel = knownStatus
    ? FRIENDLY_STATUS_LABELS[knownStatus]
    : toTitleCase(rawStatus || "unknown");

  if (
    rawStatus === "running" &&
    message &&
    !isRedundantRunningMessage(message)
  ) {
    baseLabel = `${baseLabel} — ${message}`;
  }

  let statusLine = `Status: ${baseLabel}`;
  if (options.elapsedLabel) {
    statusLine += ` (${options.elapsedLabel})`;
  }
  if (options.target) {
    statusLine += ` — ${options.target}`;
  }

  return {
    statusLine,
    detailMessage: isFailure ? message : undefined,
    isActive,
    isFailure,
  };
}
