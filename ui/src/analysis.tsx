import { useCallback, useEffect, useRef, useState } from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
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
import {
  calculateFinalImageEfficiency,
  calculatePercent,
  formatBytes,
  formatPercent,
  getErrorMessage,
} from './utils';
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

const DIVE_EFFICIENCY_TOOLTIP =
  "Dive's cross-layer score. It compares each path's smallest observed size against all observed bytes for that path across layers. Duplicate, overwritten, and removed paths lower the score.";
const FINAL_IMAGE_EFFICIENCY_TOOLTIP =
  'Final-image ratio derived from summary bytes only: 1 - (Wasted space / Total size). Higher means less of the final image is reported as wasted.';
const WASTED_SPACE_TOOLTIP =
  'Dive-reported inefficient bytes. This includes duplicate, overwritten, and removed file paths that consumed bytes across layers.';
const EFFICIENCY_RING_SIZE = 'clamp(132px, 16vw, 196px)';

function MetricLabelWithTooltip(props: { label: string; tooltip: string; fontSize?: number }) {
  const labelFontSize = props.fontSize ?? 14;

  return (
    <Tooltip title={props.tooltip}>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          cursor: 'help',
          mb: 1,
          color: 'text.secondary',
        }}
      >
        <Typography component="span" sx={{ fontSize: labelFontSize }} color="inherit">
          {props.label}
        </Typography>
        <InfoOutlinedIcon sx={{ fontSize: '0.95rem', color: 'text.disabled' }} />
      </Box>
    </Tooltip>
  );
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
  const efficientBytes = Math.max(dive.image.sizeBytes - dive.image.inefficientBytes, 0);
  const efficientShare = calculatePercent(efficientBytes, dive.image.sizeBytes);
  const layerCount = dive.layer.length;
  const finalImageEfficiency = calculateFinalImageEfficiency(
    dive.image.inefficientBytes,
    dive.image.sizeBytes,
  );
  return (
    <>
      <Stack direction="column" spacing={4} alignItems="baseline">
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
          <Button sx={{ maxWidth: 180 }} variant="outlined" onClick={props.onExit}>
            Back to images
          </Button>
          <Button variant="outlined" onClick={props.onOpenExport} disabled={!props.historyId}>
            Export
          </Button>
          <Button variant="outlined" onClick={props.onOpenCIGate} disabled={!props.historyId}>
            CI Gate
          </Button>
          <Typography variant="h3">Analysis of {image.name}</Typography>
        </Stack>
        <Stack
          direction="row"
          alignItems="stretch"
          spacing={3}
          flexWrap="wrap"
          rowGap={3}
          sx={{
            width: '100%',
            '& > *': {
              flex: { xs: '1 1 100%', sm: '1 1 220px' },
              minWidth: { xs: 0, sm: 220 },
            },
          }}
        >
          <Card variant="outlined">
            <CardContent
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 0.5,
              }}
            >
              <Typography sx={{ fontSize: 15 }} color="text.secondary" gutterBottom>
                Total Size
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '2.35rem', sm: '2.65rem' },
                  lineHeight: 1.1,
                }}
              >
                {formatBytes(dive.image.sizeBytes)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Efficient bytes: {formatBytes(efficientBytes)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Layers analyzed: {layerCount}
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 0.5,
              }}
            >
              <MetricLabelWithTooltip
                label="Wasted space"
                tooltip={WASTED_SPACE_TOOLTIP}
                fontSize={15}
              />
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '2.35rem', sm: '2.65rem' },
                  lineHeight: 1.1,
                }}
              >
                {formatBytes(dive.image.inefficientBytes)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                {formatPercent(wastedPercent)} of total image size
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Efficient share: {formatPercent(efficientShare)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Estimated efficient bytes: {formatBytes(efficientBytes)}
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <MetricLabelWithTooltip
                label="Dive Efficiency Score"
                tooltip={DIVE_EFFICIENCY_TOOLTIP}
              />
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5 }}>
                <CircularProgressWithLabel
                  value={dive.image.efficiencyScore * 100}
                  size={EFFICIENCY_RING_SIZE}
                  labelInset={13}
                ></CircularProgressWithLabel>
              </Box>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <MetricLabelWithTooltip
                label="Final Image Efficiency"
                tooltip={FINAL_IMAGE_EFFICIENCY_TOOLTIP}
              />
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5 }}>
                <CircularProgressWithLabel
                  value={finalImageEfficiency * 100}
                  size={EFFICIENCY_RING_SIZE}
                  labelInset={13}
                ></CircularProgressWithLabel>
              </Box>
            </CardContent>
          </Card>
        </Stack>
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            Dive Efficiency Score measures cross-layer reuse and penalizes duplicated, overwritten,
            or removed paths.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Formula concept: <code>sum(min size per path) / sum(all observed sizes per path)</code>{' '}
            across layers. Large single-copy folders like <code>node_modules</code> can still
            produce a high Dive score.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Final Image Efficiency is <code>1 - (Wasted space / Total size)</code>.
          </Typography>
        </Stack>
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
        <Stack spacing={1.25} sx={{ width: '100%' }}>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ fontSize: { xs: '1rem', sm: '1.08rem' }, fontWeight: 600 }}
          >
            Helpful links
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ fontSize: { xs: '1rem', sm: '1.08rem' }, lineHeight: 1.65 }}
          >
            Dive docs:{' '}
            <Link
              href="https://github.com/pRizz/dive"
              target="_blank"
              rel="noreferrer"
              sx={{ fontSize: 'inherit', fontWeight: 500 }}
            >
              pRizz/dive
            </Link>
            <Typography
              component="span"
              aria-hidden="true"
              sx={{ mx: 0.9, fontSize: '1.1rem', color: 'text.disabled' }}
            >
              ·
            </Typography>
            Layer changes docs:{' '}
            <Link
              href="https://github.com/pRizz/dive#file-tree"
              target="_blank"
              rel="noreferrer"
              sx={{ fontSize: 'inherit', fontWeight: 500 }}
            >
              pRizz/dive
            </Link>
            <Typography
              component="span"
              aria-hidden="true"
              sx={{ mx: 0.9, fontSize: '1.1rem', color: 'text.disabled' }}
            >
              ·
            </Typography>
            <Link
              href="https://github.com/wagoodman/dive"
              target="_blank"
              rel="noreferrer"
              sx={{ fontSize: 'inherit', fontWeight: 500 }}
            >
              wagoodman/dive
            </Link>{' '}
            (upstream)
          </Typography>
        </Stack>
      </Stack>
    </>
  );
}
