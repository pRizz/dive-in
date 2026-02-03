import { describe, expect, it } from "vitest";
import { FileTreeNode } from "./models";
import { pruneEntriesByTerminalPaths } from "./utils";

function toEntry(path: string, fileType: FileTreeNode["fileType"]): FileTreeNode {
  return {
    name: path.split("/").pop() ?? path,
    path,
    fileType,
    change: "unknown",
  };
}

function toPathList(nodes: FileTreeNode[]): string[] {
  return nodes.map((node) => node.path).sort();
}

describe("pruneEntriesByTerminalPaths", () => {
  it("removes descendants when a file replaces a directory", () => {
    const entries = new Map<string, FileTreeNode>([
      ["opt", toEntry("opt", "file")],
      ["opt/bin", toEntry("opt/bin", "directory")],
      ["opt/bin/tool", toEntry("opt/bin/tool", "file")],
      ["etc/config", toEntry("etc/config", "file")],
    ]);

    const pruned = pruneEntriesByTerminalPaths(entries);

    expect(toPathList(pruned)).toEqual(["etc/config", "opt"]);
  });

  it("keeps descendants when the path is a directory", () => {
    const entries = new Map<string, FileTreeNode>([
      ["srv", toEntry("srv", "directory")],
      ["srv/app", toEntry("srv/app", "directory")],
      ["srv/app/config", toEntry("srv/app/config", "file")],
    ]);

    const pruned = pruneEntriesByTerminalPaths(entries);

    expect(toPathList(pruned)).toEqual(["srv", "srv/app", "srv/app/config"]);
  });

  it("treats symlinks as terminal paths", () => {
    const entries = new Map<string, FileTreeNode>([
      ["var", toEntry("var", "link")],
      ["var/log", toEntry("var/log", "file")],
      ["usr/bin", toEntry("usr/bin", "file")],
    ]);

    const pruned = pruneEntriesByTerminalPaths(entries);

    expect(toPathList(pruned)).toEqual(["usr/bin", "var"]);
  });
});
