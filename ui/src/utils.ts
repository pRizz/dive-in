import {
  CompareLayerDelta,
  CompareMetricDelta,
  CompareSummaryDelta,
  DiveResponse,
  FileChangeType,
  FileNodeType,
  FileTreeNode,
  HistorySummary,
  LayerFileTree,
  NormalizedFileTree,
  DiveLayer,
} from "./models";

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatPercent(value: number, decimals = 1) {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${(value * 100).toFixed(decimals)}%`;
}

export function calculatePercent(part: number, total: number) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return part / total;
}

export function extractId(id: string) {
  return id.replace("sha256:", "").substring(0, 12);
}

export function joinUrl(base: string, path: string) {
  const trimmedBase = base.replace(/\/$/, "");
  const trimmedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFirstValue(
  record: Record<string, unknown>,
  keys: string[]
): unknown {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
    const altKey = key.toLowerCase();
    if (altKey in record) {
      return record[altKey];
    }
    const upperKey = key.toUpperCase();
    if (upperKey in record) {
      return record[upperKey];
    }
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1"].includes(normalized)) {
      return true;
    }
    if (["false", "no", "0"].includes(normalized)) {
      return false;
    }
  }
  return undefined;
}

function getNameFromPath(pathValue: string) {
  const normalized = pathValue.split("/").filter(Boolean);
  if (normalized.length === 0) {
    return pathValue;
  }
  return normalized[normalized.length - 1];
}

export function normalizeChangeType(value: unknown): FileChangeType {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["add", "added", "new", "create", "created", "a"].includes(normalized)) {
      return "added";
    }
    if (
      ["modify", "modified", "change", "changed", "update", "updated", "m"].includes(
        normalized
      )
    ) {
      return "modified";
    }
    if (
      ["remove", "removed", "delete", "deleted", "del", "d"].includes(normalized)
    ) {
      return "removed";
    }
    if (["same", "unchanged", "nochange", "none", "u"].includes(normalized)) {
      return "unchanged";
    }
  }
  return "unknown";
}

export function normalizeFileNodeType(
  value: unknown,
  flags?: { isDir?: boolean; isFile?: boolean; isLink?: boolean }
): FileNodeType {
  if (flags?.isDir) {
    return "directory";
  }
  if (flags?.isFile) {
    return "file";
  }
  if (flags?.isLink) {
    return "link";
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["dir", "directory", "folder"].includes(normalized)) {
      return "directory";
    }
    if (["file", "regular"].includes(normalized)) {
      return "file";
    }
    if (["link", "symlink"].includes(normalized)) {
      return "link";
    }
  }
  return "unknown";
}

function normalizeFileTreeNode(raw: unknown): FileTreeNode | null {
  if (typeof raw === "string") {
    return {
      name: getNameFromPath(raw),
      path: raw,
      fileType: "unknown",
      change: "unknown",
    };
  }
  if (!isRecord(raw)) {
    return null;
  }

  const name =
    toStringValue(
      readFirstValue(raw, ["name", "file", "filename", "label"])
    ) ?? "";
  const path =
    toStringValue(
      readFirstValue(raw, ["path", "fullPath", "absolutePath", "filePath"])
    ) ?? "";
  const derivedPath = path || name;
  const nodePath = derivedPath || "unknown";
  const nodeName = name || (derivedPath ? getNameFromPath(derivedPath) : "unknown");

  const size = toNumber(
    readFirstValue(raw, ["sizeBytes", "size", "bytes", "totalSize", "fileSize"])
  );

  const change = normalizeChangeType(
    readFirstValue(raw, ["change", "changeType", "status", "diffType", "diff"])
  );

  const isDir = toBoolean(readFirstValue(raw, ["isDir", "isDirectory", "dir"]));
  const isFile = toBoolean(readFirstValue(raw, ["isFile", "file"]));
  const isLink = toBoolean(readFirstValue(raw, ["isLink", "symlink"]));

  const fileType = normalizeFileNodeType(
    readFirstValue(raw, ["fileType", "type", "kind", "nodeType"]),
    {
      isDir,
      isFile,
      isLink,
    }
  );

  const childrenRaw = readFirstValue(raw, [
    "children",
    "entries",
    "files",
    "nodes",
    "tree",
    "fileTree",
    "filetree",
    "contents",
  ]);
  const children = normalizeFileTreeNodes(childrenRaw);

  return {
    name: nodeName,
    path: nodePath,
    sizeBytes: size,
    fileType,
    change,
    children: children.length > 0 ? children : undefined,
  };
}

export function normalizeFileTreeNodes(raw: unknown): FileTreeNode[] {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => normalizeFileTreeNode(entry))
      .filter((entry): entry is FileTreeNode => Boolean(entry));
  }
  const normalized = normalizeFileTreeNode(raw);
  return normalized ? [normalized] : [];
}

export function normalizeDiveFileTrees(dive: DiveResponse): NormalizedFileTree {
  const aggregateCandidates = [
    dive.fileTree,
    dive.filetree,
    dive.tree,
    dive.fileSystem,
    dive.files,
    dive.root,
  ];

  const aggregate = normalizeFileTreeNodes(
    aggregateCandidates.find((candidate) => Boolean(candidate))
  );

  const layers = (dive.layer ?? []).map((layer) => {
    const layerRecord = layer as unknown as Record<string, unknown>;
    const layerCandidates = [
      layerRecord.fileTree,
      layerRecord.filetree,
      layerRecord.tree,
      layerRecord.diffTree,
      layerRecord.changes,
      layerRecord.fileSystem,
      layerRecord.files,
      layerRecord.root,
    ];

    return {
      layerId: layer.id,
      layerIndex: layer.index,
      command: layer.command,
      tree: normalizeFileTreeNodes(
        layerCandidates.find((candidate) => Boolean(candidate))
      ),
    };
  });

  return { aggregate, layers };
}

function toMetricDelta(left?: number, right?: number): CompareMetricDelta {
  const safeLeft = Number.isFinite(left) ? (left as number) : 0;
  const safeRight = Number.isFinite(right) ? (right as number) : 0;
  return {
    left: safeLeft,
    right: safeRight,
    delta: safeRight - safeLeft,
  };
}

export function buildCompareSummaryDelta(
  left?: HistorySummary,
  right?: HistorySummary
): CompareSummaryDelta {
  return {
    sizeBytes: toMetricDelta(left?.sizeBytes, right?.sizeBytes),
    inefficientBytes: toMetricDelta(left?.inefficientBytes, right?.inefficientBytes),
    efficiencyScore: toMetricDelta(left?.efficiencyScore, right?.efficiencyScore),
  };
}

function getLayerMatchKey(layer: DiveLayer): string {
  if (layer.digestId && layer.digestId.trim().length > 0) {
    return layer.digestId;
  }
  if (layer.id && layer.id.trim().length > 0) {
    return layer.id;
  }
  return String(layer.index ?? "unknown");
}

export function matchLayersForCompare(
  leftLayers: DiveLayer[] = [],
  rightLayers: DiveLayer[] = []
): CompareLayerDelta[] {
  const leftMap = new Map<string, DiveLayer>();
  const rightMap = new Map<string, DiveLayer>();
  const orderedKeys: string[] = [];

  rightLayers.forEach((layer) => {
    const key = getLayerMatchKey(layer);
    rightMap.set(key, layer);
    orderedKeys.push(key);
  });

  leftLayers.forEach((layer) => {
    const key = getLayerMatchKey(layer);
    leftMap.set(key, layer);
    if (!rightMap.has(key)) {
      orderedKeys.push(key);
    }
  });

  return orderedKeys.map((key) => {
    const left = leftMap.get(key);
    const right = rightMap.get(key);
    const leftSize = Number.isFinite(left?.sizeBytes) ? left?.sizeBytes ?? 0 : 0;
    const rightSize = Number.isFinite(right?.sizeBytes) ? right?.sizeBytes ?? 0 : 0;
    let status: CompareLayerDelta["status"] = "unchanged";
    if (left && !right) {
      status = "removed";
    } else if (!left && right) {
      status = "added";
    } else if (
      left?.sizeBytes !== right?.sizeBytes ||
      left?.command !== right?.command
    ) {
      status = "modified";
    }
    return {
      key,
      status,
      left,
      right,
      sizeBytesDelta: rightSize - leftSize,
    };
  });
}