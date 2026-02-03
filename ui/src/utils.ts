import {
  CompareLayerDelta,
  CompareMetricDelta,
  CompareSummaryDelta,
  DiveResponse,
  FileChangeType,
  FileNodeType,
  FileTreeNode,
  FileReference,
  HistorySummary,
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

export function formatRelativeTimeFromNow(timestampMs: number) {
  const nowMs = Date.now();
  const diffMs = timestampMs - nowMs;
  const diffSeconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const units: Array<{ limit: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { limit: 60, unit: "second" },
    { limit: 3600, unit: "minute" },
    { limit: 86400, unit: "hour" },
    { limit: 2592000, unit: "day" },
    { limit: 31536000, unit: "month" },
    { limit: Infinity, unit: "year" },
  ];

  let value = diffSeconds;
  let unit: Intl.RelativeTimeFormatUnit = "second";

  for (const entry of units) {
    if (absSeconds < entry.limit) {
      unit = entry.unit;
      if (unit === "minute") {
        value = Math.round(diffSeconds / 60);
      } else if (unit === "hour") {
        value = Math.round(diffSeconds / 3600);
      } else if (unit === "day") {
        value = Math.round(diffSeconds / 86400);
      } else if (unit === "month") {
        value = Math.round(diffSeconds / 2592000);
      } else if (unit === "year") {
        value = Math.round(diffSeconds / 31536000);
      }
      break;
    }
  }

  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
    value,
    unit
  );
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

export function getErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") {
      return maybeMessage;
    }
    const maybeCapitalMessage = (error as { Message?: unknown }).Message;
    if (typeof maybeCapitalMessage === "string") {
      return maybeCapitalMessage;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
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

  const linkName = toStringValue(
    readFirstValue(raw, ["linkName", "symlinkTarget", "linkTarget"])
  );
  const isDir = toBoolean(readFirstValue(raw, ["isDir", "isDirectory", "dir"]));
  const isFile = toBoolean(readFirstValue(raw, ["isFile", "file"]));
  const isLink =
    toBoolean(readFirstValue(raw, ["isLink", "symlink"])) ??
    Boolean(linkName);

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
    "fileList",
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
  // Check top-level keys first
  const topLevelCandidates = [
    dive.fileTree,
    dive.filetree,
    dive.tree,
    dive.fileSystem,
    dive.files,
    dive.root,
  ];
  
  // Also check nested under image object (Dive may store aggregate tree here)
  const imageRecord = dive.image as unknown as Record<string, unknown>;
  const imageCandidates = imageRecord
    ? [
        imageRecord.fileTree,
        imageRecord.filetree,
        imageRecord.tree,
        imageRecord.fileSystem,
        imageRecord.files,
        imageRecord.root,
      ]
    : [];
  
  const aggregateCandidates = [...topLevelCandidates, ...imageCandidates];

  let aggregate = normalizeFileTreeNodes(
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
      sizeBytes: layer.sizeBytes,
      tree: normalizeFileTreeNodes(
        layerCandidates.find((candidate) => Boolean(candidate))
      ),
    };
  });

  if (aggregate.length === 0) {
    const fallbackLayer = layers.find((layer) => layer.tree.length > 0);
    if (fallbackLayer) {
      aggregate = fallbackLayer.tree;
    }
  }

  return { aggregate, layers };
}

type TreeBuilderNode = FileTreeNode & {
  childrenMap?: Map<string, TreeBuilderNode>;
};

function ensureChild(
  parent: TreeBuilderNode,
  name: string,
  path: string,
  fileType: FileNodeType
): TreeBuilderNode {
  if (!parent.childrenMap) {
    parent.childrenMap = new Map();
  }
  const existing = parent.childrenMap.get(name);
  if (existing) {
    return existing;
  }
  const node: TreeBuilderNode = {
    name,
    path,
    fileType,
    change: "unknown",
  };
  parent.childrenMap.set(name, node);
  return node;
}

function finalizeTree(node: TreeBuilderNode): FileTreeNode {
  const children = node.childrenMap
    ? Array.from(node.childrenMap.values())
        .map((child) => finalizeTree(child))
        .sort((left, right) => left.name.localeCompare(right.name))
    : undefined;
  const { childrenMap, ...rest } = node;
  if (children && children.length > 0) {
    if (rest.fileType === "directory") {
      const summedSize = children.reduce((total, child) => {
        if (typeof child.sizeBytes === "number") {
          return total + child.sizeBytes;
        }
        return total;
      }, 0);
      if (summedSize > 0) {
        rest.sizeBytes = summedSize;
      }
    }
    return { ...rest, children };
  }
  return rest;
}

function buildTreeFromFlatList(entries: FileTreeNode[]): FileTreeNode[] {
  // Build a hierarchical tree from a flat file list:
  // 1) Insert each path into a map-backed tree (no duplicates).
  // 2) On finalize, walk back up to aggregate directory sizes from children.
  // This keeps the whole transformation O(N) for N nodes.
  const root: TreeBuilderNode = {
    name: "root",
    path: "",
    fileType: "directory",
    change: "unknown",
    childrenMap: new Map(),
  };

  entries.forEach((entry) => {
    const path = entry.path || entry.name;
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) {
      return;
    }
    let current = root;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      const nextPath = parts.slice(0, i + 1).join("/");
      const nodeType: FileNodeType = isLeaf
        ? entry.fileType ?? "unknown"
        : "directory";
      const child = ensureChild(current, part, nextPath, nodeType);
      if (isLeaf) {
        child.sizeBytes = entry.sizeBytes;
        child.change = entry.change ?? "unknown";
      }
      current = child;
    }
  });

  return finalizeTree(root).children ?? [];
}

export function hasDiveFileList(dive: DiveResponse): boolean {
  return (dive.layer ?? []).some((layer) => {
    const record = layer as unknown as Record<string, unknown>;
    return Array.isArray(record.fileList);
  });
}

/**
 * Builds per-layer trees and an aggregate tree using only fileList data.
 * This is a fallback when Dive does not provide native tree structures.
 */
export function buildDiveFileTreesFromFileList(
  dive: DiveResponse
): NormalizedFileTree {
  const aggregate = buildAggregateTreeFromFileList(dive.layer ?? []);
  const layers = (dive.layer ?? []).map((layer) => {
    const flatNodes = getFileListEntries(layer);
    return {
      layerId: layer.id,
      layerIndex: layer.index,
      command: layer.command,
      sizeBytes: layer.sizeBytes,
      tree: buildTreeFromFlatList(flatNodes),
    };
  });

  return {
    aggregate,
    layers,
  };
}

/**
 * Extracts the fileList entries for a layer, normalizing the shape into file tree nodes.
 */
function getFileListEntries(layer: DiveLayer): FileTreeNode[] {
  const record = layer as unknown as Record<string, unknown>;
  return normalizeFileTreeNodes(record.fileList);
}

/**
 * Normalizes file list paths so they can be used as stable map keys.
 */
function normalizeFileListPath(pathValue: string): string | undefined {
  const trimmed = pathValue.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Merges layer fileList entries using last-layer-wins semantics per path.
 */
function collectFileListEntriesByPath(
  layers: DiveLayer[]
): Map<string, FileTreeNode> {
  const entriesByPath = new Map<string, FileTreeNode>();

  layers.forEach((layer) => {
    const flatNodes = getFileListEntries(layer);
    flatNodes.forEach((entry) => {
      const rawKey = entry.path || entry.name;
      if (!rawKey) {
        return;
      }
      const key = normalizeFileListPath(rawKey);
      if (!key) {
        return;
      }
      entriesByPath.set(key, entry);
    });
  });

  return entriesByPath;
}

/**
 * Builds the aggregate (final filesystem) tree from fileList data.
 */
function buildAggregateTreeFromFileList(layers: DiveLayer[]): FileTreeNode[] {
  const entriesByPath = collectFileListEntriesByPath(layers);

  if (entriesByPath.size === 0) {
    return [];
  }

  const prunedEntries = pruneEntriesByTerminalPaths(entriesByPath);
  return buildTreeFromFlatList(prunedEntries);
}

/**
 * Removes descendants when a non-directory entry claims a path.
 *
 * Algorithm:
 * 1) Sort paths so descendants are grouped after their prefixes.
 * 2) Track the most recent non-directory path (terminal prefix).
 * 3) Skip any entries that live under an active terminal prefix.
 *
 * This keeps the final filesystem view consistent when a later layer
 * replaces a directory with a file or symlink.
 */
export function pruneEntriesByTerminalPaths(
  entriesByPath: Map<string, FileTreeNode>
): FileTreeNode[] {
  const entries = Array.from(entriesByPath.entries())
    .map(([path, entry]) => ({ path, entry }))
    .sort((left, right) => left.path.localeCompare(right.path));

  const pruned: FileTreeNode[] = [];
  let activeTerminalPrefix: string | undefined;

  for (const { path, entry } of entries) {
    if (activeTerminalPrefix && path.startsWith(`${activeTerminalPrefix}/`)) {
      continue;
    }
    if (activeTerminalPrefix && !path.startsWith(`${activeTerminalPrefix}/`)) {
      activeTerminalPrefix = undefined;
    }
    pruned.push(entry);
    if (entry.fileType !== "directory") {
      activeTerminalPrefix = path;
    }
  }

  return pruned;
}

/**
 * Combines Dive's native trees with fileList-derived trees when available.
 * Prefers native aggregate/layer trees, falling back to fileList trees only
 * when a native tree is missing.
 */
export function buildDiveFileTrees(dive: DiveResponse): NormalizedFileTree {
  const normalized = normalizeDiveFileTrees(dive);
  if (!hasDiveFileList(dive)) {
    return normalized;
  }

  const fileListTrees = buildDiveFileTreesFromFileList(dive);
  const aggregate =
    normalized.aggregate.length > 0 ? normalized.aggregate : fileListTrees.aggregate;

  const baseLayers =
    normalized.layers.length > 0 ? normalized.layers : fileListTrees.layers;
  const layers = baseLayers.map((layer, index) => {
    if (layer.tree.length > 0) {
      return layer;
    }
    const fallback = fileListTrees.layers[index];
    if (!fallback || fallback.tree.length === 0) {
      return layer;
    }
    return {
      ...layer,
      tree: fallback.tree,
    };
  });

  return { aggregate, layers };
}

export function buildWastedFileReferences(
  nodes: FileTreeNode[]
): FileReference[] {
  const entries = new Map<string, { count: number; sizeBytes: number }>();
  const visit = (node: FileTreeNode) => {
    const isDirectory = node.fileType === "directory";
    if (node.children && node.children.length > 0) {
      node.children.forEach(visit);
    }
    if (isDirectory) {
      return;
    }
    if (node.change !== "removed" && node.change !== "modified") {
      return;
    }
    if (!node.path || typeof node.sizeBytes !== "number") {
      return;
    }
    const existing = entries.get(node.path);
    if (existing) {
      existing.count += 1;
      existing.sizeBytes += node.sizeBytes;
    } else {
      entries.set(node.path, { count: 1, sizeBytes: node.sizeBytes });
    }
  };
  nodes.forEach(visit);
  return Array.from(entries.entries())
    .map(([file, data]) => ({ file, count: data.count, sizeBytes: data.sizeBytes }))
    .sort((left, right) => right.sizeBytes - left.sizeBytes);
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
