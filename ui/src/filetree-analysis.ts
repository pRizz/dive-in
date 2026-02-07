import { DiveResponse } from "./models";
import { buildDiveFileTrees, buildWastedFileReferences } from "./utils";
import { FileTreeArtifacts } from "./filetree-worker.types";

export function computeFileTreeArtifacts(dive: DiveResponse): FileTreeArtifacts {
  const fileTreeData = buildDiveFileTrees(dive);
  const wastedFileReferences = buildWastedFileReferences(fileTreeData.aggregate);

  return {
    fileTreeData,
    wastedFileReferences,
  };
}
