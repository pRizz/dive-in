import { describe, expect, it } from "vitest";
import { DiveLayer, DiveResponse } from "./models";
import { computeFileTreeArtifacts } from "./filetree-analysis";

function createBaseDiveResponse(): Omit<DiveResponse, "layer"> {
  return {
    image: {
      sizeBytes: 1024,
      inefficientBytes: 256,
      efficiencyScore: 0.75,
      fileReference: [],
    },
  };
}

describe("computeFileTreeArtifacts", () => {
  it("returns aggregate tree and wasted references from native tree data", () => {
    const dive: DiveResponse = {
      ...createBaseDiveResponse(),
      fileTree: [
        {
          name: "app",
          path: "/app",
          fileType: "directory",
          children: [
            {
              name: "main.js",
              path: "/app/main.js",
              sizeBytes: 100,
              fileType: "file",
              change: "removed",
            },
          ],
        },
      ],
      layer: [
        {
          index: 0,
          id: "layer-0",
          digestId: "sha256:layer0",
          sizeBytes: 100,
          command: "COPY . /app",
          tree: [],
        },
      ],
    };

    const artifacts = computeFileTreeArtifacts(dive);

    expect(artifacts.fileTreeData.aggregate.length).toBeGreaterThan(0);
    expect(artifacts.wastedFileReferences).toEqual([
      {
        file: "/app/main.js",
        count: 1,
        sizeBytes: 100,
      },
    ]);
  });

  it("falls back to fileList data when native tree data is absent", () => {
    const layerWithFileList = {
      index: 0,
      id: "layer-0",
      digestId: "sha256:layer0",
      sizeBytes: 42,
      command: "RUN touch app/main.js",
      fileList: [
        {
          name: "main.js",
          path: "app/main.js",
          sizeBytes: 42,
          fileType: "file",
          change: "removed",
        },
      ],
    } as unknown as DiveLayer;

    const dive: DiveResponse = {
      ...createBaseDiveResponse(),
      layer: [layerWithFileList],
    };

    const artifacts = computeFileTreeArtifacts(dive);

    expect(artifacts.fileTreeData.aggregate.length).toBeGreaterThan(0);
    expect(artifacts.wastedFileReferences).toEqual([
      {
        file: "app/main.js",
        count: 1,
        sizeBytes: 42,
      },
    ]);
  });
});
