import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { AnalysisResult, DiveResponse, FileReference, NormalizedFileTree } from './models';
import { calculatePercent, formatBytes, formatPercent, getErrorMessage } from './utils';
import CircularProgressWithLabel from './ring';
import ImageTable from './imagetable';
import LayersTable from './layerstable';
import FileTree from './filetree';
import { computeFileTreeArtifacts } from './filetree-analysis';
import {
  FileTreeArtifacts,
  FileTreeWorkerRequest,
  FileTreeWorkerResponse,
} from './filetree-worker.types';

type FileTreeLoadStatus = 'loading' | 'ready' | 'error';

const WORKER_FALLBACK_WARNING =
  'File tree analysis worker was unavailable, so processing ran on the main thread. You may notice UI lag.';

function createEmptyFileTreeData(): NormalizedFileTree {
  return {
    aggregate: [],
    layers: [],
  };
}

export default function Analysis(props: {
  analysis: AnalysisResult;
  onExit: () => any;
  onOpenExport: () => void;
  onOpenCIGate: () => void;
  historyId?: string;
}) {
  const { image, dive } = props.analysis;
  const [fileTreeStatus, setFileTreeStatus] = useState<FileTreeLoadStatus>('loading');
  const [fileTreeData, setFileTreeData] = useState<NormalizedFileTree>(() =>
    createEmptyFileTreeData(),
  );
  const [wastedFileReferences, setWastedFileReferences] = useState<FileReference[]>([]);
  const [fileTreeWarning, setFileTreeWarning] = useState<string | undefined>(undefined);
  const [fileTreeError, setFileTreeError] = useState<string | undefined>(undefined);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingDiveByRequestRef = useRef<Map<number, DiveResponse>>(new Map());

  const applyFileTreeArtifacts = useCallback(
    (requestId: number, artifacts: FileTreeArtifacts, warning?: string): boolean => {
      if (requestId !== requestIdRef.current) {
        return false;
      }
      pendingDiveByRequestRef.current.delete(requestId);
      setFileTreeData(artifacts.fileTreeData);
      setWastedFileReferences(artifacts.wastedFileReferences);
      setFileTreeStatus('ready');
      setFileTreeError(undefined);
      setFileTreeWarning(warning);
      return true;
    },
    [],
  );

  const failFileTreeAnalysis = useCallback((requestId: number, message: string) => {
    if (requestId !== requestIdRef.current) {
      return;
    }
    pendingDiveByRequestRef.current.delete(requestId);
    setFileTreeStatus('error');
    setFileTreeError(message);
    setFileTreeWarning(undefined);
  }, []);

  const computeOnMainThread = useCallback(
    (requestId: number, requestDive: DiveResponse, warningMessage: string) => {
      setTimeout(() => {
        try {
          const artifacts = computeFileTreeArtifacts(requestDive);
          applyFileTreeArtifacts(requestId, artifacts, warningMessage);
        } catch (error) {
          failFileTreeAnalysis(requestId, getErrorMessage(error));
        }
      }, 0);
    },
    [applyFileTreeArtifacts, failFileTreeAnalysis],
  );

  const fallbackForRequest = useCallback(
    (requestId: number, reason?: string) => {
      const requestDive = pendingDiveByRequestRef.current.get(requestId);
      if (!requestDive) {
        return;
      }
      const warning = reason ? `${WORKER_FALLBACK_WARNING} (${reason})` : WORKER_FALLBACK_WARNING;
      computeOnMainThread(requestId, requestDive, warning);
    },
    [computeOnMainThread],
  );

  useEffect(() => {
    const pendingRequests = pendingDiveByRequestRef.current;
    try {
      const worker = new Worker(new URL('./filetree.worker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent<FileTreeWorkerResponse>) => {
        const response = event.data;
        if (response.type === 'success') {
          applyFileTreeArtifacts(response.requestId, {
            fileTreeData: response.fileTreeData,
            wastedFileReferences: response.wastedFileReferences,
          });
          return;
        }
        fallbackForRequest(response.requestId, response.message);
      };

      worker.onerror = (event: ErrorEvent) => {
        worker.terminate();
        if (workerRef.current === worker) {
          workerRef.current = null;
        }
        const reason = event.message ? event.message : undefined;
        fallbackForRequest(requestIdRef.current, reason);
      };

      worker.onmessageerror = () => {
        worker.terminate();
        if (workerRef.current === worker) {
          workerRef.current = null;
        }
        fallbackForRequest(requestIdRef.current, 'worker message could not be read');
      };
    } catch {
      workerRef.current = null;
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      pendingRequests.clear();
    };
  }, [applyFileTreeArtifacts, fallbackForRequest]);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    pendingDiveByRequestRef.current.set(requestId, dive);
    setFileTreeStatus('loading');
    setFileTreeError(undefined);
    setFileTreeWarning(undefined);
    setFileTreeData(createEmptyFileTreeData());
    setWastedFileReferences([]);

    const worker = workerRef.current;
    if (!worker) {
      fallbackForRequest(requestId, 'worker unavailable');
      return;
    }

    try {
      const request: FileTreeWorkerRequest = {
        type: 'compute',
        requestId,
        dive,
      };
      worker.postMessage(request);
    } catch (error) {
      fallbackForRequest(requestId, getErrorMessage(error));
    }
  }, [dive, fallbackForRequest]);

  const downloadDiveJson = () => {
    const data = JSON.stringify(dive, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dive-${image.name.replace(/[^a-z0-9-_.]+/gi, '_')}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };
  const isFileTreeEmpty = fileTreeData.aggregate.length === 0;
  const wastedPercent = calculatePercent(dive.image.inefficientBytes, dive.image.sizeBytes);
  return (
    <>
      <Stack direction="column" spacing={4} alignItems="baseline">
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button sx={{ maxWidth: 180 }} variant="outlined" onClick={props.onExit}>
            Back to images
          </Button>
          <Button variant="outlined" onClick={props.onOpenExport} disabled={!props.historyId}>
            Export
          </Button>
          <Button variant="outlined" onClick={props.onOpenCIGate} disabled={!props.historyId}>
            CI Gate
          </Button>
        </Stack>
        <Typography variant="h3">Analyzing: {image.name}</Typography>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Helpful links
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Dive docs:{' '}
            <Link href="https://github.com/pRizz/dive" target="_blank" rel="noreferrer">
              pRizz/dive
            </Link>
            <Typography
              component="span"
              aria-hidden="true"
              sx={{ mx: 0.75, fontSize: '1rem', color: 'text.disabled' }}
            >
              ·
            </Typography>
            Layer changes docs:{' '}
            <Link href="https://github.com/pRizz/dive#file-tree" target="_blank" rel="noreferrer">
              pRizz/dive
            </Link>
            <Typography
              component="span"
              aria-hidden="true"
              sx={{ mx: 0.75, fontSize: '1rem', color: 'text.disabled' }}
            >
              ·
            </Typography>
            <Link href="https://github.com/wagoodman/dive" target="_blank" rel="noreferrer">
              wagoodman/dive
            </Link>{' '}
            (upstream)
          </Typography>
        </Stack>
        <Stack direction="row" spacing={3} flexWrap="wrap" rowGap={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                Total Size
              </Typography>
              <Typography variant="h2">{formatBytes(dive.image.sizeBytes)}</Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                Wasted space
              </Typography>
              <Typography variant="h2">{formatBytes(dive.image.inefficientBytes)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatPercent(wastedPercent)} of total image size
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Tooltip title="Shows how much of the image size is used efficiently. Higher is better.">
                <Typography
                  sx={{ fontSize: 14, cursor: 'help' }}
                  color="text.secondary"
                  gutterBottom
                >
                  Efficiency Score
                </Typography>
              </Tooltip>
              <CircularProgressWithLabel
                value={dive.image.efficiencyScore * 100}
              ></CircularProgressWithLabel>
            </CardContent>
          </Card>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Metrics are derived from Dive analysis results.
        </Typography>
        <Stack spacing={2}>
          <Typography variant="h3">Layer file tree</Typography>
          {fileTreeWarning ? <Alert severity="warning">{fileTreeWarning}</Alert> : null}
          {fileTreeStatus === 'error' ? (
            <Alert severity="error">
              Unable to build file tree: {fileTreeError ?? 'Unknown error.'}
            </Alert>
          ) : (
            <Box sx={{ width: '100%', position: 'relative' }}>
              {fileTreeStatus === 'ready' ? (
                <FileTree aggregateTree={fileTreeData.aggregate} layers={fileTreeData.layers} />
              ) : (
                <Box
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    minHeight: 260,
                  }}
                />
              )}
              {fileTreeStatus === 'loading' ? (
                <Box
                  sx={(theme) => ({
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    zIndex: 1,
                    borderRadius: 1,
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(18, 18, 18, 0.72)'
                        : 'rgba(255, 255, 255, 0.72)',
                  })}
                >
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary">
                    Building file tree...
                  </Typography>
                </Box>
              ) : null}
            </Box>
          )}
          <Typography variant="caption" color="text.secondary">
            Heads up: expanding very large folders (like node_modules) can make the UI laggy.
          </Typography>
          {fileTreeStatus === 'ready' && isFileTreeEmpty ? (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                No aggregate file tree data detected. You can download the raw Dive JSON to inspect
                the shape that was returned.
              </Typography>
              <Button variant="outlined" onClick={downloadDiveJson}>
                Download Dive JSON
              </Button>
            </Stack>
          ) : null}
        </Stack>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h3">Largest Files (sorted by size)</Typography>
            <Typography variant="body2" color="text.secondary">
              Showing the top 20 files by size in the final image.
            </Typography>
          </Stack>
          <ImageTable rows={dive.image.fileReference} limit={20}></ImageTable>
        </Stack>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h3">Largest Wasted Files</Typography>
            <Typography variant="body2" color="text.secondary">
              Removed or overwritten files that contribute to wasted space.
            </Typography>
          </Stack>
          {fileTreeStatus === 'loading' ? (
            <Typography variant="body2" color="text.secondary">
              Crunching wasted file references...
            </Typography>
          ) : fileTreeStatus === 'error' ? (
            <Typography variant="body2" color="text.secondary">
              Wasted file analysis is unavailable because file tree analysis failed.
            </Typography>
          ) : wastedFileReferences.length > 0 ? (
            <ImageTable rows={wastedFileReferences}></ImageTable>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No removed or overwritten files detected in the Dive file tree.
            </Typography>
          )}
        </Stack>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h3">Layers</Typography>
            <Typography variant="body2" color="text.secondary">
              Each layer shows its size contribution and the build command that created it. Click
              column headers to sort by index or size.
            </Typography>
          </Stack>
          <LayersTable rows={dive.layer}></LayersTable>
        </Stack>
      </Stack>
    </>
  );
}
