import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createDockerDesktopClient } from '@docker/extension-api-client/dist/index.js';
import {
  Typography,
  Card,
  CardActions,
  Chip,
  Divider,
  Stack,
  Grid,
  CircularProgress,
  Alert,
  Box,
  Button,
  CardContent,
  FormControl,
  FormControlLabel,
  FormLabel,
  Fade,
  LinearProgress,
  Link,
  MenuItem,
  Switch,
  Radio,
  RadioGroup,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';

import Analysis from './analysis';
import BulkAnalyzeDialog from './bulkanalyzedialog';
import CompareView from './compare';
import CIGateDialog from './cigatedialog';
import ExportDialog from './exportdialog';
import HistoryList from './history';
import {
  DOCKER_HUB_EXTENSION_URL,
  GITHUB_ISSUES_URL,
  GITHUB_URL,
  LINKEDIN_URL,
  MEDIUM_URL,
  README_BADGES,
  TWITTER_URL,
} from './constants';
import { extractId, formatBytes, formatRelativeTimeFromNow, getErrorMessage } from './utils';
import { formatJobStatusDisplay } from './job-status';
import { classifyBootstrapFailure } from './bootstrap-state';
import {
  AnalysisResult,
  AnalysisSource,
  AnalyzeRequest,
  AnalyzeResponse,
  AnalysisStatusResponse,
  DiveResponse,
  ExportFormat,
  ExportResponse,
  HistoryEntry,
  HistoryMetadata,
  Image,
  CIRulesRequest,
  CIRulesResponse,
  CompareSelectionState,
  CompareSide,
  JobStatus,
  BulkAnalyzeRequest,
  BulkAnalyzeProgress,
  BulkAnalyzeReport,
  BulkAnalyzeFailure,
} from './models';

interface DockerImage {
  Labels: string[] | null;
  RepoTags: [string];
  Id: string;
  RepoDigests?: string[];
  Created?: number;
  CreatedAt?: string;
  Size?: number;
}

type BootstrapPhase =
  | 'booting'
  | 'ready'
  | 'client_unavailable'
  | 'backend_unavailable'
  | 'dive_missing';

const formatElapsed = (elapsedSeconds?: number) => {
  if (elapsedSeconds === undefined) {
    return undefined;
  }
  const totalSeconds = Math.max(0, Math.floor(elapsedSeconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const sleep = async (ms: number) => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

const imageChipSx = {
  height: 'auto',
  '& .MuiChip-label': {
    fontSize: '0.8rem',
    lineHeight: 1.1,
    paddingInline: 2,
    paddingBlock: 1,
  },
};

interface ImageCardProps {
  image: Image;
  historyEntry?: HistoryMetadata;
  isSingleJobActive: boolean;
  disableAnalyzeAction: boolean;
  jobTarget?: string;
  jobStatus?: JobStatus;
  jobMessage?: string;
  jobElapsedSeconds?: number;
  openHistoryEntry: (id: string) => void;
  startAnalysis: (target: string, selectedSource: AnalysisSource, maybeImageId?: string) => void;
}

function ImageCard(props: ImageCardProps) {
  const createdLabel = props.image.createdAt
    ? new Date(props.image.createdAt).toLocaleString()
    : undefined;
  const createdRelative = props.image.createdAt
    ? formatRelativeTimeFromNow(props.image.createdAt)
    : undefined;
  const sizeLabel =
    typeof props.image.sizeBytes === 'number' ? formatBytes(props.image.sizeBytes) : undefined;
  const aliases = props.image.aliases.filter((alias) => alias !== props.image.name);
  const elapsedLabel = formatElapsed(props.jobElapsedSeconds);
  const statusDisplay = props.jobStatus
    ? formatJobStatusDisplay({
        jobStatus: props.jobStatus,
        jobMessage: props.jobMessage,
        elapsedLabel,
      })
    : undefined;

  return (
    <>
      <Card
        sx={{ minWidth: 200, height: '100%', display: 'flex', flexDirection: 'column' }}
        variant="outlined"
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flex: 1 }}>
          <CardContent sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              component="div"
              sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}
              gutterBottom
            >
              {props.image.name}
            </Typography>
            <Typography sx={{ fontSize: 14 }} color="text.secondary">
              {props.image.id}
            </Typography>
            {aliases.length > 0 ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', overflowWrap: 'anywhere' }}
              >
                Aliases: {aliases.join(', ')}
              </Typography>
            ) : null}
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              {createdLabel ? (
                <Chip label={`Built: ${createdLabel}`} size="small" sx={imageChipSx} />
              ) : null}
              {createdRelative ? (
                <Chip label={`Age: ${createdRelative}`} size="small" sx={imageChipSx} />
              ) : null}
              {sizeLabel ? (
                <Chip label={`Size: ${sizeLabel}`} size="small" sx={imageChipSx} />
              ) : null}
            </Stack>
          </CardContent>
          <CardActions sx={{ justifyContent: 'flex-end', pr: 2, flexShrink: 0 }}>
            <Stack direction="column" spacing={1} alignItems="stretch">
              {props.historyEntry ? (
                <Button
                  variant="contained"
                  color="primary"
                  disabled={props.isSingleJobActive}
                  onClick={() => props.openHistoryEntry(props.historyEntry?.id ?? '')}
                  fullWidth
                >
                  View analysis
                </Button>
              ) : null}
              <Box sx={{ position: 'relative' }}>
                <Button
                  variant={props.historyEntry ? 'outlined' : 'contained'}
                  color="primary"
                  disabled={props.disableAnalyzeAction}
                  onClick={() => {
                    props.startAnalysis(props.image.name, 'docker', props.image.fullId);
                  }}
                  fullWidth
                >
                  {props.historyEntry ? 'Re-analyze' : 'Analyze'}
                  {props.isSingleJobActive && props.jobTarget === props.image.name && (
                    <CircularProgress
                      size={24}
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginTop: '-12px',
                        marginLeft: '-12px',
                      }}
                    />
                  )}
                </Button>
              </Box>
            </Stack>
          </CardActions>
        </Stack>
        {props.jobTarget === props.image.name && statusDisplay ? (
          <CardContent sx={{ pt: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {statusDisplay.statusLine}
            </Typography>
            {statusDisplay.detailMessage ? (
              <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
                {statusDisplay.detailMessage}
              </Typography>
            ) : null}
            {props.isSingleJobActive ? <LinearProgress sx={{ mt: 1 }} /> : null}
          </CardContent>
        ) : null}
      </Card>
    </>
  );
}

interface ImageListProps {
  images: Image[];
  historyEntries: HistoryMetadata[];
  isSingleJobActive: boolean;
  isBulkRunning: boolean;
  isJobActive: boolean;
  jobTarget?: string;
  jobStatus?: JobStatus;
  jobMessage?: string;
  jobElapsedSeconds?: number;
  openHistoryEntry: (id: string) => void;
  startAnalysis: (target: string, selectedSource: AnalysisSource, maybeImageId?: string) => void;
  onStartBulkAnalyze: (request: BulkAnalyzeRequest) => Promise<void>;
  getImages: () => void;
}

function ImageList(props: ImageListProps) {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'size'>('created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isSingleColumn, setSingleColumn] = useState(true);
  const [isBulkDialogOpen, setBulkDialogOpen] = useState(false);
  const historyByImageRef = useMemo(() => {
    const map = new Map<string, HistoryMetadata>();
    props.historyEntries.forEach((entry) => {
      if (entry.source !== 'docker') {
        return;
      }
      const key = entry.imageId || entry.image;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, entry);
        return;
      }
      const existingTime = Date.parse(existing.completedAt);
      const nextTime = Date.parse(entry.completedAt);
      if (Number.isFinite(nextTime) && nextTime > existingTime) {
        map.set(key, entry);
      }
    });
    return map;
  }, [props.historyEntries]);
  const analyzedImageIds = useMemo(() => {
    const ids = new Set<string>();
    props.historyEntries.forEach((entry) => {
      if (entry.source === 'docker' && entry.imageId) {
        ids.add(entry.imageId);
      }
    });
    return ids;
  }, [props.historyEntries]);
  const filteredImages = useMemo(() => {
    const trimmed = filter.trim().toLowerCase();
    if (!trimmed) {
      return props.images;
    }
    return props.images.filter((image) => {
      if (image.name.toLowerCase().includes(trimmed)) {
        return true;
      }
      return image.aliases.some((alias) => alias.toLowerCase().includes(trimmed));
    });
  }, [filter, props.images]);
  const sortedImages = useMemo(() => {
    const copy = [...filteredImages];
    const direction = sortDirection === 'asc' ? 1 : -1;
    copy.sort((left, right) => {
      if (sortBy === 'name') {
        return left.name.localeCompare(right.name) * direction;
      }
      if (sortBy === 'created') {
        const leftValue = left.createdAt ?? 0;
        const rightValue = right.createdAt ?? 0;
        return (leftValue - rightValue) * direction;
      }
      const leftValue = left.sizeBytes ?? 0;
      const rightValue = right.sizeBytes ?? 0;
      return (leftValue - rightValue) * direction;
    });
    return copy;
  }, [filteredImages, sortBy, sortDirection]);

  const handleStartBulkAnalyze = (request: BulkAnalyzeRequest) => {
    setBulkDialogOpen(false);
    void props.onStartBulkAnalyze(request);
  };

  return (
    <>
      <Typography variant="h3" sx={{ mb: 2 }}>
        Choose an image below to get started
      </Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center" sx={{ mb: 2 }}>
        <TextField
          label="Filter by image name"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          size="small"
          sx={{ minWidth: 240 }}
          disabled={props.isJobActive}
        />
        <TextField
          select
          label="Sort by"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as 'name' | 'created' | 'size')}
          size="small"
          sx={{ minWidth: 160 }}
          disabled={props.isJobActive}
        >
          <MenuItem value="name">Name</MenuItem>
          <MenuItem value="created">Build time</MenuItem>
          <MenuItem value="size">Size</MenuItem>
        </TextField>
        <TextField
          select
          label="Direction"
          value={sortDirection}
          onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}
          size="small"
          sx={{ minWidth: 140 }}
          disabled={props.isJobActive}
        >
          <MenuItem value="asc">Ascending</MenuItem>
          <MenuItem value="desc">Descending</MenuItem>
        </TextField>
        <Button variant="outlined" onClick={props.getImages} disabled={props.isJobActive}>
          Refresh list
        </Button>
        <FormControlLabel
          control={
            <Switch
              checked={isSingleColumn}
              onChange={(event) => setSingleColumn(event.target.checked)}
              disabled={props.isJobActive}
            />
          }
          label="Single column"
        />
        <Button
          variant="outlined"
          onClick={() => setBulkDialogOpen(true)}
          disabled={props.isJobActive}
        >
          Bulk Analyze...
        </Button>
      </Stack>
      <BulkAnalyzeDialog
        open={isBulkDialogOpen}
        visibleImages={sortedImages}
        analyzedImageIds={analyzedImageIds}
        disabled={props.isJobActive}
        onClose={() => setBulkDialogOpen(false)}
        onConfirm={handleStartBulkAnalyze}
      />
      {props.images.length === 0 ? (
        <Alert severity="info">
          No images found. Build or pull an image with Docker, then refresh the list.
        </Alert>
      ) : sortedImages.length === 0 ? (
        <Alert severity="info">
          No images match the current filter. Clear the filter to see all images.
        </Alert>
      ) : (
        <Box sx={{ mx: isSingleColumn ? { xs: 0, md: 6 } : 0 }}>
          <Grid container spacing={2} alignItems="stretch">
            {sortedImages.map((image) => {
              const historyEntry = image.fullId ? historyByImageRef.get(image.fullId) : undefined;
              return (
                <Grid item xs={12} md={isSingleColumn ? 12 : 6} key={`${image.id}-${image.name}`}>
                  <ImageCard
                    image={image}
                    historyEntry={historyEntry}
                    isSingleJobActive={props.isSingleJobActive}
                    disableAnalyzeAction={props.isSingleJobActive || props.isBulkRunning}
                    jobTarget={props.jobTarget}
                    jobStatus={props.jobStatus}
                    jobMessage={props.jobMessage}
                    jobElapsedSeconds={props.jobElapsedSeconds}
                    openHistoryEntry={props.openHistoryEntry}
                    startAnalysis={props.startAnalysis}
                  />
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}
    </>
  );
}

export function App() {
  const [analysis, setAnalysisResult] = useState<AnalysisResult | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'analysis' | 'history'>('analysis');
  const [bootstrapPhase, setBootstrapPhase] = useState<BootstrapPhase>('booting');
  const [images, setImages] = useState<Image[]>([]);
  const [isDiveInstalled, setDiveInstalled] = useState<boolean>(false);
  const [clientError, setClientError] = useState<string | undefined>(undefined);
  const [source, setSource] = useState<AnalysisSource>('docker');
  const [archivePath, setArchivePath] = useState<string>('');
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [jobStatus, setJobStatus] = useState<JobStatus | undefined>(undefined);
  const [jobMessage, setJobMessage] = useState<string | undefined>(undefined);
  const [jobTarget, setJobTarget] = useState<string | undefined>(undefined);
  const [jobElapsedSeconds, setJobElapsedSeconds] = useState<number | undefined>(undefined);
  const [historyEntries, setHistoryEntries] = useState<HistoryMetadata[]>([]);
  const [historyError, setHistoryError] = useState<string | undefined>(undefined);
  const [isHistoryLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | undefined>(undefined);
  const [compareSelection, setCompareSelection] = useState<CompareSelectionState>({});
  const [compareIds, setCompareIds] = useState<{ leftId: string; rightId: string } | undefined>(
    undefined,
  );
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const [isCIGateDialogOpen, setCIGateDialogOpen] = useState(false);
  const [isBulkRunning, setBulkRunning] = useState(false);
  const [bulkCancelRequested, setBulkCancelRequested] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkAnalyzeProgress | undefined>(undefined);
  const [bulkReport, setBulkReport] = useState<BulkAnalyzeReport | undefined>(undefined);
  const listScrollYRef = useRef(0);
  const pendingDetailScrollTopRef = useRef(false);
  const bulkCancelRequestedRef = useRef(false);

  const ddClient = useMemo(() => {
    try {
      return createDockerDesktopClient();
    } catch (error) {
      setClientError(getErrorMessage(error));
      return undefined;
    }
  }, []);

  const readImages = useCallback(async () => {
    if (!ddClient) {
      return [];
    }
    return (await ddClient.docker.listImages()) as DockerImage[];
  }, [ddClient]);

  const getImages = useCallback(async () => {
    if (!ddClient) {
      return;
    }
    const all = await readImages();
    const byImageId = new Map<string, Image>();
    const parseCreatedAt = (image: DockerImage) => {
      if (typeof image.Created === 'number' && Number.isFinite(image.Created)) {
        return image.Created * 1000;
      }
      if (image.CreatedAt) {
        const parsed = Date.parse(image.CreatedAt);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
      return undefined;
    };
    all.forEach((i) => {
      const createdAt = parseCreatedAt(i);
      const sizeBytes = typeof i.Size === 'number' ? i.Size : undefined;
      const tags = i.RepoTags?.filter((tag) => tag !== '<none>:<none>') ?? [];
      const digests = i.RepoDigests?.filter((digest) => digest !== '<none>@<none>') ?? [];
      const aliases = [...tags, ...digests];
      if (aliases.length === 0) {
        return;
      }
      const existing = byImageId.get(i.Id);
      const nextAliases = new Set([...(existing?.aliases ?? []), ...aliases]);
      const preferTag =
        tags.length > 0 &&
        (!existing || existing.name.startsWith('sha256:') || existing.name.includes('@sha256:'));
      const primaryName =
        preferTag && tags.length > 0 ? tags[0] : (existing?.name ?? aliases[0] ?? extractId(i.Id));
      const nextImage: Image = {
        name: primaryName,
        id: extractId(i.Id),
        fullId: i.Id,
        createdAt: existing?.createdAt ?? createdAt,
        sizeBytes: existing?.sizeBytes ?? sizeBytes,
        aliases: Array.from(nextAliases),
      };
      byImageId.set(i.Id, nextImage);
    });
    setImages(Array.from(byImageId.values()));
  }, [ddClient, readImages]);

  const fetchHistory = useCallback(async () => {
    if (!ddClient?.extension?.vm?.service) {
      return;
    }
    setHistoryLoading(true);
    try {
      const data = (await ddClient.extension.vm.service.get('/history')) as HistoryMetadata[];
      setHistoryEntries(data);
      setHistoryError(undefined);
    } catch (error) {
      setHistoryError(getErrorMessage(error));
    } finally {
      setHistoryLoading(false);
    }
  }, [ddClient]);

  const bootstrapApp = useCallback(async () => {
    if (!ddClient) {
      setBootstrapPhase('client_unavailable');
      return;
    }
    if (!ddClient.extension?.vm?.service) {
      setClientError('Backend service is unavailable.');
      setBootstrapPhase('backend_unavailable');
      return;
    }

    setBootstrapPhase('booting');
    setClientError(undefined);

    try {
      await ddClient.extension.vm.service.get('/checkdive');
      setDiveInstalled(true);
      setClientError(undefined);
    } catch (error) {
      const message = getErrorMessage(error);
      setDiveInstalled(false);
      setClientError(message);
      setBootstrapPhase(classifyBootstrapFailure(message));
      return;
    }

    const [imagesResult] = await Promise.allSettled([getImages(), fetchHistory()]);
    if (imagesResult.status === 'rejected') {
      setClientError(getErrorMessage(imagesResult.reason));
    }

    setBootstrapPhase('ready');
  }, [ddClient, fetchHistory, getImages]);

  const clearHistorySelections = (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }
    setCompareSelection((prev) => {
      const next = { ...prev };
      if (ids.includes(prev.leftId ?? '')) {
        delete next.leftId;
      }
      if (ids.includes(prev.rightId ?? '')) {
        delete next.rightId;
      }
      return next;
    });
    if (selectedHistoryId && ids.includes(selectedHistoryId)) {
      setSelectedHistoryId(undefined);
      setAnalysisResult(undefined);
      setCompareIds(undefined);
      resetJobState();
    }
  };

  const deleteHistoryEntry = async (id: string) => {
    if (!ddClient?.extension?.vm?.service) {
      setHistoryError('Backend API is unavailable.');
      return;
    }
    const confirmed = window.confirm('Delete this history entry from this machine?');
    if (!confirmed) {
      return;
    }
    setHistoryLoading(true);
    try {
      await ddClient.extension.vm.service.delete(`/history/${id}`);
      setHistoryEntries((prev) => prev.filter((entry) => entry.id !== id));
      clearHistorySelections([id]);
      setHistoryError(undefined);
    } catch (error) {
      setHistoryError(getErrorMessage(error));
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteAllHistory = async () => {
    if (!ddClient?.extension?.vm?.service) {
      setHistoryError('Backend API is unavailable.');
      return;
    }
    const confirmed = window.confirm('Delete all history entries from this machine?');
    if (!confirmed) {
      return;
    }
    setHistoryLoading(true);
    try {
      await ddClient.extension.vm.service.delete('/history');
      clearHistorySelections(historyEntries.map((entry) => entry.id));
      setHistoryEntries([]);
      setHistoryError(undefined);
    } catch (error) {
      setHistoryError(getErrorMessage(error));
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryEntry = async (id: string) => {
    if (!ddClient?.extension?.vm?.service) {
      setHistoryError('Backend API is unavailable.');
      return;
    }
    try {
      saveListScrollPosition();
      setActiveTab('analysis');
      const entry = (await ddClient.extension.vm.service.get(`/history/${id}`)) as HistoryEntry;
      setCompareIds(undefined);
      queueDetailScrollTop();
      setAnalysisResult({
        image: {
          name: entry.metadata.image,
          id: entry.metadata.id,
          aliases: [],
        },
        dive: entry.result,
      });
      setSelectedHistoryId(entry.metadata.id);
      resetJobState();
    } catch (error) {
      setHistoryError(getErrorMessage(error));
    }
  };

  const resetJobState = () => {
    setJobId(undefined);
    setJobStatus(undefined);
    setJobMessage(undefined);
    setJobTarget(undefined);
    setJobElapsedSeconds(undefined);
  };

  const saveListScrollPosition = () => {
    listScrollYRef.current = window.scrollY;
  };

  const queueDetailScrollTop = () => {
    pendingDetailScrollTopRef.current = true;
  };

  const downloadFile = (data: BlobPart, filename: string, contentType: string) => {
    const blob = new Blob([data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const normalizeExportData = (data: unknown): BlobPart => {
    if (typeof data === 'string') {
      return data;
    }
    if (data instanceof Uint8Array) {
      return new Uint8Array(data).buffer;
    }
    if (data instanceof ArrayBuffer) {
      return data;
    }
    return JSON.stringify(data, null, 2);
  };

  const handleExport = async (format: ExportFormat) => {
    if (!ddClient?.extension?.vm?.service) {
      throw new Error('Backend API is unavailable.');
    }
    if (!selectedHistoryId) {
      throw new Error('Select an analysis entry to export.');
    }
    const response = (await ddClient.extension.vm.service.post(
      `/history/${selectedHistoryId}/export`,
      { format },
    )) as ExportResponse;
    const exported = await ddClient.extension.vm.service.get(
      `/history/${selectedHistoryId}/export/${format}`,
    );
    downloadFile(normalizeExportData(exported), response.filename, response.contentType);
  };

  const handleGenerateCIRules = async (payload: CIRulesRequest): Promise<CIRulesResponse> => {
    if (!ddClient?.extension?.vm?.service) {
      throw new Error('Backend API is unavailable.');
    }
    return (await ddClient.extension.vm.service.post('/ci/rules', payload)) as CIRulesResponse;
  };

  const handleDownloadCIRules = (content: string, filename: string) => {
    downloadFile(content, filename, 'application/x-yaml');
  };

  const fetchAnalysisResult = useCallback(
    async (currentJobId: string) => {
      if (!ddClient?.extension?.vm?.service) {
        return;
      }
      try {
        const dive = (await ddClient.extension.vm.service.get(
          `/analysis/${currentJobId}/result`,
        )) as DiveResponse;
        saveListScrollPosition();
        queueDetailScrollTop();
        setAnalysisResult({
          image: {
            name: jobTarget ?? 'Unknown image',
            id: currentJobId,
            aliases: [],
          },
          dive,
        });
        setSelectedHistoryId(currentJobId);
        setActiveTab('analysis');
        await fetchHistory();
      } catch (error) {
        setJobStatus('failed');
        setJobMessage(getErrorMessage(error));
      }
    },
    [ddClient, fetchHistory, jobTarget],
  );

  const startAnalysis = useCallback(
    async (target: string, selectedSource: AnalysisSource, maybeImageId?: string) => {
      if (!ddClient?.extension?.vm?.service) {
        setJobStatus('failed');
        setJobMessage('Backend API is unavailable.');
        return;
      }

      const payload: AnalyzeRequest =
        selectedSource === 'docker-archive'
          ? { source: selectedSource, archivePath: target }
          : {
              source: selectedSource,
              image: target,
              imageId: maybeImageId,
            };

      setJobMessage(undefined);
      setAnalysisResult(undefined);
      setSelectedHistoryId(undefined);
      setJobTarget(target);
      setJobStatus('queued');
      setJobElapsedSeconds(0);

      try {
        const data = (await ddClient.extension.vm.service.post(
          '/analyze',
          payload,
        )) as AnalyzeResponse;
        setJobId(data.jobId);
        setJobStatus(data.status);
      } catch (error) {
        setJobStatus('failed');
        setJobMessage(getErrorMessage(error));
      }
    },
    [ddClient],
  );

  const waitForJobTerminalStatus = useCallback(
    async (currentJobId: string): Promise<AnalysisStatusResponse> => {
      if (!ddClient?.extension?.vm?.service) {
        throw new Error('Backend API is unavailable.');
      }
      while (true) {
        const status = (await ddClient.extension.vm.service.get(
          `/analysis/${currentJobId}/status`,
        )) as AnalysisStatusResponse;
        if (status.status !== 'queued' && status.status !== 'running') {
          return status;
        }
        await sleep(1000);
      }
    },
    [ddClient],
  );

  const requestBulkCancel = useCallback(() => {
    if (!isBulkRunning || bulkCancelRequested) {
      return;
    }
    bulkCancelRequestedRef.current = true;
    setBulkCancelRequested(true);
    setBulkProgress((prev) => (prev ? { ...prev, cancelRequested: true } : prev));
  }, [bulkCancelRequested, isBulkRunning]);

  const startBulkAnalyze = useCallback(
    async (request: BulkAnalyzeRequest) => {
      const startedAt = Date.now();
      const failures: BulkAnalyzeFailure[] = [];
      const succeeded: string[] = [];
      const service = ddClient?.extension?.vm?.service;
      let cancelled = false;
      let cancelledRemainingCount = 0;

      setBulkReport(undefined);
      setBulkProgress(undefined);
      setBulkCancelRequested(false);
      bulkCancelRequestedRef.current = false;

      if (!service) {
        request.targets.forEach((target) => {
          failures.push({
            image: target.image,
            message: 'Backend API is unavailable.',
          });
        });
        setBulkReport({
          ...request,
          cancelled: false,
          cancelledRemainingCount: 0,
          startedAt,
          completedAt: Date.now(),
          succeeded,
          failed: failures,
        });
        return;
      }

      setJobId(undefined);
      setJobStatus(undefined);
      setJobMessage(undefined);
      setJobTarget(undefined);
      setJobElapsedSeconds(undefined);
      setBulkRunning(true);
      setBulkProgress({
        total: request.targets.length,
        completed: 0,
        startedAt,
        cancelRequested: false,
      });

      try {
        for (let index = 0; index < request.targets.length; index += 1) {
          if (bulkCancelRequestedRef.current) {
            cancelled = true;
            cancelledRemainingCount = request.targets.length - index;
            break;
          }
          const target = request.targets[index];
          setBulkProgress({
            total: request.targets.length,
            completed: index,
            currentTarget: target.image,
            startedAt,
            cancelRequested: bulkCancelRequestedRef.current,
          });
          try {
            const payload: AnalyzeRequest = {
              source: 'docker',
              image: target.image,
              imageId: target.imageId,
            };
            const data = (await service.post('/analyze', payload)) as AnalyzeResponse;
            const terminalStatus = await waitForJobTerminalStatus(data.jobId);
            if (terminalStatus.status === 'succeeded') {
              succeeded.push(target.image);
            } else {
              failures.push({
                image: target.image,
                message: terminalStatus.message?.trim() || 'Analysis failed.',
              });
            }
          } catch (error) {
            failures.push({
              image: target.image,
              message: getErrorMessage(error),
            });
          }
          setBulkProgress({
            total: request.targets.length,
            completed: index + 1,
            startedAt,
            cancelRequested: bulkCancelRequestedRef.current,
          });
        }
        await fetchHistory();
      } finally {
        setBulkRunning(false);
        setBulkCancelRequested(false);
        bulkCancelRequestedRef.current = false;
        setBulkProgress(undefined);
        setBulkReport({
          ...request,
          cancelled,
          cancelledRemainingCount,
          startedAt,
          completedAt: Date.now(),
          succeeded,
          failed: failures,
        });
      }
    },
    [ddClient, fetchHistory, waitForJobTerminalStatus],
  );

  const ArchiveAnalyzer = () => {
    const archiveTarget = archivePath.trim();
    const archiveStatusDisplay =
      jobTarget === archiveTarget && jobStatus
        ? formatJobStatusDisplay({
            jobStatus,
            jobMessage,
            elapsedLabel: formatElapsed(jobElapsedSeconds),
          })
        : undefined;

    return (
      <Stack spacing={2}>
        <TextField
          label="Archive path"
          helperText="Enter the full local path to a docker-archive tar file."
          value={archivePath}
          disabled={isJobActive}
          onChange={(event) => setArchivePath(event.target.value)}
          fullWidth
        />
        <Box sx={{ position: 'relative' }}>
          <Button
            variant="outlined"
            disabled={isJobActive || archiveTarget === ''}
            onClick={() => startAnalysis(archiveTarget, 'docker-archive')}
          >
            Analyze archive
            {isJobActive && jobTarget === archiveTarget && (
              <CircularProgress
                size={24}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  marginTop: '-12px',
                  marginLeft: '-12px',
                }}
              />
            )}
          </Button>
        </Box>
        {archiveStatusDisplay ? (
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              {archiveStatusDisplay.statusLine}
            </Typography>
            {archiveStatusDisplay.detailMessage ? (
              <Typography variant="body2" color="text.primary">
                {archiveStatusDisplay.detailMessage}
              </Typography>
            ) : null}
            {isJobActive ? <LinearProgress /> : null}
          </Stack>
        ) : null}
      </Stack>
    );
  };

  useEffect(() => {
    bootstrapApp();
  }, [bootstrapApp]);

  useEffect(() => {
    if (source === 'docker') {
      return;
    }
    bulkCancelRequestedRef.current = false;
    setBulkCancelRequested(false);
    setBulkProgress(undefined);
    setBulkReport(undefined);
    setBulkRunning(false);
  }, [source]);

  useEffect(() => {
    if (!ddClient?.extension?.vm?.service || !jobId) {
      return;
    }
    if (jobStatus !== 'queued' && jobStatus !== 'running') {
      return;
    }

    let isCancelled = false;
    const pollStatus = async () => {
      let status: AnalysisStatusResponse;
      try {
        status = (await ddClient.extension.vm.service.get(
          `/analysis/${jobId}/status`,
        )) as AnalysisStatusResponse;
      } catch (error) {
        if (!isCancelled) {
          setJobStatus('failed');
          setJobMessage(getErrorMessage(error));
        }
        return;
      }
      if (isCancelled) {
        return;
      }
      setJobStatus(status.status);
      setJobMessage(status.message);
      setJobElapsedSeconds(status.elapsedSeconds);

      if (status.status === 'succeeded') {
        await fetchAnalysisResult(jobId);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [ddClient, fetchAnalysisResult, jobId, jobStatus]);

  const clearAnalysis = () => {
    setAnalysisResult(undefined);
    resetJobState();
    setSelectedHistoryId(undefined);
    requestAnimationFrame(() => {
      window.scrollTo({ top: listScrollYRef.current, left: 0, behavior: 'auto' });
    });
  };

  const updateCompareSelection = (side: CompareSide, id: string) => {
    setCompareSelection((prev) => {
      const next = { ...prev };
      if (side === 'left') {
        next.leftId = id;
        if (prev.rightId === id) {
          next.rightId = undefined;
        }
      } else {
        next.rightId = id;
        if (prev.leftId === id) {
          next.leftId = undefined;
        }
      }
      return next;
    });
  };

  const clearCompareSelection = (side: CompareSide) => {
    setCompareSelection((prev) => ({
      ...prev,
      [side === 'left' ? 'leftId' : 'rightId']: undefined,
    }));
  };

  const openCompareView = (leftId: string, rightId: string) => {
    saveListScrollPosition();
    queueDetailScrollTop();
    setAnalysisResult(undefined);
    resetJobState();
    setSelectedHistoryId(undefined);
    setCompareIds({ leftId, rightId });
    setActiveTab('analysis');
  };

  useLayoutEffect(() => {
    if (!pendingDetailScrollTopRef.current) {
      return;
    }
    if (activeTab !== 'analysis') {
      return;
    }
    if (!analysis && !compareIds) {
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    pendingDetailScrollTopRef.current = false;
  }, [activeTab, analysis, compareIds]);

  const isSingleJobActive = jobStatus === 'queued' || jobStatus === 'running';
  const isJobActive = isSingleJobActive || isBulkRunning;
  const tabsEnabled = bootstrapPhase === 'ready' && !!ddClient && isDiveInstalled;

  const errorHint = (() => {
    if (!jobMessage) {
      return undefined;
    }
    const lowered = jobMessage.toLowerCase();
    if (lowered.includes('timed out')) {
      return 'Try a smaller image or rerun when the engine is less busy.';
    }
    if (lowered.includes('binary not found')) {
      return 'Install the Dive CLI in the backend VM, then retry.';
    }
    if (lowered.includes('archive')) {
      return 'Double-check the archive path and ensure the file exists.';
    }
    return undefined;
  })();

  const handleRetry = () => {
    resetJobState();
    setAnalysisResult(undefined);
    setSelectedHistoryId(undefined);
  };

  const failedStatusDisplay =
    jobStatus === 'failed'
      ? formatJobStatusDisplay({
          jobStatus,
          jobMessage,
          elapsedLabel: formatElapsed(jobElapsedSeconds),
          target: jobTarget,
        })
      : undefined;

  const completedStatusDisplay =
    jobStatus && jobTarget && !isSingleJobActive
      ? formatJobStatusDisplay({
          jobStatus,
          jobMessage,
          elapsedLabel: formatElapsed(jobElapsedSeconds),
          target: jobTarget,
        })
      : undefined;

  const statusAlert =
    failedStatusDisplay && !isBulkRunning ? (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={handleRetry}>
            Retry
          </Button>
        }
      >
        <Stack spacing={0.5}>
          <Typography variant="body2">{failedStatusDisplay.statusLine}</Typography>
          {failedStatusDisplay.detailMessage ? (
            <Typography variant="body2">{failedStatusDisplay.detailMessage}</Typography>
          ) : null}
          {errorHint ? <Typography variant="body2">{errorHint}</Typography> : null}
        </Stack>
      </Alert>
    ) : null;

  return (
    <>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={2}
        flexWrap="wrap"
        sx={{ rowGap: 1 }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          aria-label="Analysis and history tabs"
          sx={{
            '& .MuiTab-root': {
              fontSize: '2rem',
              fontWeight: 500,
              textTransform: 'none',
            },
          }}
        >
          <Tab label="Analysis" value="analysis" disabled={!tabsEnabled} />
          <Tab label="History" value="history" disabled={!tabsEnabled} />
        </Tabs>
        <Typography variant="h1" sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
          <Box
            component="img"
            src="scuba.svg"
            alt="Deep Dive"
            aria-hidden="true"
            sx={{ height: 48, width: 48 }}
          />
          Deep Dive
        </Typography>
      </Stack>
      <Divider sx={{ mt: 4, mb: 4 }} orientation="horizontal" flexItem />
      {bootstrapPhase === 'booting' ? (
        <Stack sx={{ mt: 8 }} direction="column" alignItems="center" spacing={2}>
          <Box
            component="img"
            src="scuba.svg"
            alt="Deep Dive"
            aria-hidden="true"
            sx={{ height: 64, width: 64 }}
          />
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Loading Deep Dive...
          </Typography>
        </Stack>
      ) : null}
      {bootstrapPhase === 'client_unavailable' ? (
        <Stack spacing={2}>
          <Alert severity="error">
            This UI must be run inside Docker Desktop. The extension API client is unavailable in a
            regular browser.
          </Alert>
          <Alert severity="info">
            Load the extension in Docker Desktop, then re-open this tab. See README for local dev
            steps.
          </Alert>
          {clientError ? <Alert severity="warning">Details: {clientError}</Alert> : null}
        </Stack>
      ) : null}
      {bootstrapPhase === 'backend_unavailable' ? (
        <Stack spacing={2}>
          <Alert severity="error">Backend service is unavailable.</Alert>
          <Alert severity="info">
            Ensure the extension backend VM is running, then retry initialization.
          </Alert>
          {clientError ? <Alert severity="warning">Details: {clientError}</Alert> : null}
          <Button variant="outlined" onClick={() => void bootstrapApp()}>
            Retry initialization
          </Button>
        </Stack>
      ) : null}
      {bootstrapPhase === 'dive_missing' ? (
        <Stack spacing={2}>
          <Alert severity="warning">
            Dive is not available in the backend VM. Install it and try again.
          </Alert>
          <Alert severity="info">
            Install Dive in the backend VM image, rebuild the extension, and reinstall it in Docker
            Desktop. Basic install options:
            <Box component="ul" sx={{ pl: 2, mt: 1, mb: 0 }}>
              <li>
                macOS (Homebrew): <code>brew install dive</code>
              </li>
              <li>
                Ubuntu/Debian: download the latest <code>.deb</code> and run{' '}
                <code>sudo apt install ./dive_&lt;version&gt;_linux_amd64.deb</code>
              </li>
              <li>
                RHEL/CentOS: download the latest <code>.rpm</code> and run{' '}
                <code>rpm -i dive_&lt;version&gt;_linux_amd64.rpm</code>
              </li>
            </Box>
            For more options (Windows, Arch, Nix, Docker), see the Dive install docs (fork of{' '}
            <Link
              href="https://github.com/wagoodman/dive"
              target="_blank"
              rel="noopener noreferrer"
            >
              wagoodman/dive
            </Link>
            ).
            <Box sx={{ mt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  ddClient?.host.openExternal('https://github.com/pRizz/dive#installation')
                }
              >
                Open Dive install docs
              </Button>
            </Box>
          </Alert>
          {clientError ? <Alert severity="info">Details: {clientError}</Alert> : null}
          <Button variant="outlined" onClick={() => void bootstrapApp()}>
            Retry check
          </Button>
        </Stack>
      ) : null}
      {bootstrapPhase === 'ready' ? (
        <Fade in appear timeout={200}>
          <Box>
            {statusAlert}
            <ExportDialog
              open={isExportDialogOpen}
              onClose={() => setExportDialogOpen(false)}
              onExport={handleExport}
            />
            <CIGateDialog
              open={isCIGateDialogOpen}
              onClose={() => setCIGateDialogOpen(false)}
              onGenerate={handleGenerateCIRules}
              onDownload={handleDownloadCIRules}
            />
            <Box role="tabpanel" hidden={activeTab !== 'analysis'} sx={{ mt: 3 }}>
              {source === 'docker' && bulkProgress ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      Bulk analysis in progress: {bulkProgress.completed}/{bulkProgress.total}{' '}
                      completed.
                    </Typography>
                    {bulkProgress.currentTarget ? (
                      <Typography variant="body2" color="text.secondary">
                        Current image: {bulkProgress.currentTarget}
                      </Typography>
                    ) : null}
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box sx={{ flex: 1 }}>
                        {bulkProgress.total > 0 ? (
                          <LinearProgress
                            variant="determinate"
                            value={(bulkProgress.completed / bulkProgress.total) * 100}
                          />
                        ) : (
                          <LinearProgress />
                        )}
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={bulkProgress.cancelRequested}
                        onClick={requestBulkCancel}
                      >
                        {bulkProgress.cancelRequested ? 'Stopping...' : 'Cancel bulk'}
                      </Button>
                    </Stack>
                    {bulkProgress.cancelRequested ? (
                      <Typography variant="body2" color="text.secondary">
                        Stopping after current image finishes.
                      </Typography>
                    ) : null}
                  </Stack>
                </Alert>
              ) : null}
              {source === 'docker' && !analysis && !compareIds && bulkReport ? (
                <Alert
                  severity={
                    bulkReport.failed.length > 0 || bulkReport.cancelled ? 'warning' : 'success'
                  }
                  action={
                    <Button color="inherit" size="small" onClick={() => setBulkReport(undefined)}>
                      Dismiss
                    </Button>
                  }
                  sx={{ mb: 2 }}
                >
                  <Stack spacing={0.75}>
                    <Typography variant="body2">
                      {bulkReport.cancelled
                        ? `Bulk analysis cancelled for images newer than ${bulkReport.days} days.`
                        : `Bulk analysis complete for images newer than ${bulkReport.days} days.`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Force re-analyze: {bulkReport.forceReanalyze ? 'Yes' : 'No'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Visible: {bulkReport.visibleCount} | Eligible: {bulkReport.eligibleCount}
                      {' | '}Skipped older: {bulkReport.skippedOlderCount}
                      {' | '}Skipped unknown build time: {bulkReport.skippedUnknownCreatedAtCount}
                      {' | '}Skipped already analyzed: {bulkReport.skippedAlreadyAnalyzedCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Succeeded: {bulkReport.succeeded.length} | Failed: {bulkReport.failed.length}
                    </Typography>
                    {bulkReport.cancelled ? (
                      <Typography variant="body2" color="text.secondary">
                        Remaining not run: {bulkReport.cancelledRemainingCount}
                      </Typography>
                    ) : null}
                    {bulkReport.failed.length > 0 ? (
                      <Box component="ul" sx={{ mt: 0, mb: 0, pl: 2.5 }}>
                        {bulkReport.failed.map((failure) => (
                          <li key={`${failure.image}-${failure.message}`}>
                            <Typography variant="body2">
                              {failure.image}: {failure.message}
                            </Typography>
                          </li>
                        ))}
                      </Box>
                    ) : null}
                  </Stack>
                </Alert>
              ) : null}
              {analysis ? (
                <Stack spacing={2}>
                  {completedStatusDisplay ? (
                    <Typography variant="body2" color="text.secondary">
                      {completedStatusDisplay.statusLine}
                    </Typography>
                  ) : null}
                  <Analysis
                    onExit={clearAnalysis}
                    analysis={analysis}
                    onOpenExport={() => setExportDialogOpen(true)}
                    onOpenCIGate={() => setCIGateDialogOpen(true)}
                    historyId={selectedHistoryId}
                  ></Analysis>
                </Stack>
              ) : compareIds ? (
                <CompareView
                  leftId={compareIds.leftId}
                  rightId={compareIds.rightId}
                  onBack={() => setCompareIds(undefined)}
                  client={ddClient}
                />
              ) : (
                <Stack spacing={3}>
                  <FormControl disabled={isJobActive}>
                    <FormLabel id="analysis-source-label">Analysis source</FormLabel>
                    <RadioGroup
                      row
                      aria-labelledby="analysis-source-label"
                      value={source}
                      onChange={(event) => setSource(event.target.value as AnalysisSource)}
                    >
                      <FormControlLabel value="docker" control={<Radio />} label="Docker engine" />
                      <FormControlLabel
                        value="docker-archive"
                        control={<Radio />}
                        label="Docker archive"
                      />
                    </RadioGroup>
                  </FormControl>
                  {source === 'docker' ? (
                    <ImageList
                      images={images}
                      historyEntries={historyEntries}
                      isSingleJobActive={isSingleJobActive}
                      isBulkRunning={isBulkRunning}
                      isJobActive={isJobActive}
                      jobTarget={jobTarget}
                      jobStatus={jobStatus}
                      jobMessage={jobMessage}
                      jobElapsedSeconds={jobElapsedSeconds}
                      openHistoryEntry={openHistoryEntry}
                      startAnalysis={startAnalysis}
                      onStartBulkAnalyze={startBulkAnalyze}
                      getImages={getImages}
                    />
                  ) : (
                    <ArchiveAnalyzer />
                  )}
                </Stack>
              )}
            </Box>
            <Box role="tabpanel" hidden={activeTab !== 'history'} sx={{ mt: 3 }}>
              <HistoryList
                entries={historyEntries}
                isLoading={isHistoryLoading}
                error={historyError}
                onSelect={openHistoryEntry}
                onDelete={deleteHistoryEntry}
                onDeleteAll={deleteAllHistory}
                compareSelection={compareSelection}
                onCompareSelect={updateCompareSelection}
                onCompareClear={clearCompareSelection}
                onCompare={openCompareView}
                disabled={isJobActive}
              />
            </Box>
          </Box>
        </Fade>
      ) : null}
      <Divider sx={{ mt: 6, mb: 3 }} />
      <Stack spacing={1} sx={{ textAlign: 'center', pb: 4 }}>
        <Typography variant="body2" color="text.secondary">
          All analysis runs locally in Docker Desktop.{' '}
          <Typography component="span" color="text.primary">
            Your images never leave your machine.
          </Typography>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Built on top of the Dive CLI:{' '}
          <Link href="https://github.com/pRizz/dive" target="_blank" rel="noopener noreferrer">
            pRizz/dive
          </Link>
          <Typography
            component="span"
            aria-hidden="true"
            sx={{ mx: 0.75, fontSize: '1rem', color: 'text.disabled' }}
          >
            ·
          </Typography>
          <Link href="https://github.com/wagoodman/dive" target="_blank" rel="noopener noreferrer">
            wagoodman/dive
          </Link>{' '}
          (upstream).
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Made by{' '}
          <Typography component="span" color="text.primary">
            Peter Ryszkiewicz
          </Typography>{' '}
          forked from{' '}
          <Link
            href="https://github.com/prakhar1989/dive-in"
            target="_blank"
            rel="noopener noreferrer"
          >
            Prakhar Srivastav&apos;s work
          </Link>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Enjoying Deep Dive?{' '}
          <Link href={DOCKER_HUB_EXTENSION_URL} target="_blank" rel="noopener noreferrer">
            Like it on Docker Hub
          </Link>{' '}
          or{' '}
          <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            star it on GitHub
          </Link>
          , or share feedback in{' '}
          <Link href={GITHUB_ISSUES_URL} target="_blank" rel="noopener noreferrer">
            Issues
          </Link>
          .
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ px: 1 }}
        >
          {README_BADGES.map((badge) => (
            <Link
              key={badge.label}
              href={badge.href}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ lineHeight: 0 }}
            >
              <Box
                component="img"
                src={badge.imageUrl}
                alt={badge.label}
                sx={{ display: 'block', height: 20, width: 'auto' }}
              />
            </Link>
          ))}
        </Stack>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            GitHub
          </Link>
          <Link href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </Link>
          <Link href={TWITTER_URL} target="_blank" rel="noopener noreferrer">
            Twitter/X
          </Link>
          <Link href={MEDIUM_URL} target="_blank" rel="noopener noreferrer">
            Medium
          </Link>
        </Stack>
      </Stack>
    </>
  );
}
