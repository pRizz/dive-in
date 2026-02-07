/// <reference lib="webworker" />

import { computeFileTreeArtifacts } from "./filetree-analysis";
import {
  FileTreeWorkerRequest,
  FileTreeWorkerResponse,
} from "./filetree-worker.types";
import { getErrorMessage } from "./utils";

const workerScope = globalThis as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<FileTreeWorkerRequest>) => {
  const request = event.data;

  if (request.type !== "compute") {
    return;
  }

  try {
    const artifacts = computeFileTreeArtifacts(request.dive);
    const response: FileTreeWorkerResponse = {
      type: "success",
      requestId: request.requestId,
      fileTreeData: artifacts.fileTreeData,
      wastedFileReferences: artifacts.wastedFileReferences,
    };
    workerScope.postMessage(response);
  } catch (error) {
    const response: FileTreeWorkerResponse = {
      type: "error",
      requestId: request.requestId,
      message: getErrorMessage(error),
    };
    workerScope.postMessage(response);
  }
};

export {};
