import { DiveResponse, FileReference, NormalizedFileTree } from "./models";

export interface FileTreeArtifacts {
  fileTreeData: NormalizedFileTree;
  wastedFileReferences: FileReference[];
}

export interface ComputeFileTreeRequest {
  type: "compute";
  requestId: number;
  dive: DiveResponse;
}

export interface ComputeFileTreeSuccess {
  type: "success";
  requestId: number;
  fileTreeData: NormalizedFileTree;
  wastedFileReferences: FileReference[];
}

export interface ComputeFileTreeError {
  type: "error";
  requestId: number;
  message: string;
}

export type FileTreeWorkerRequest = ComputeFileTreeRequest;
export type FileTreeWorkerResponse =
  | ComputeFileTreeSuccess
  | ComputeFileTreeError;
