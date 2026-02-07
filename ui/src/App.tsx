import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";
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
  LinearProgress,
  Link,
  MenuItem,
  Switch,
  Radio,
  RadioGroup,
  Tab,
  Tabs,
  TextField,
} from "@mui/material";

import Analysis from "./analysis";
import CompareView from "./compare";
import CIGateDialog from "./cigatedialog";
import ExportDialog from "./exportdialog";
import HistoryList from "./history";
import { GITHUB_URL, LINKEDIN_URL, MEDIUM_URL, TWITTER_URL } from "./constants";
import { extractId, formatBytes, formatRelativeTimeFromNow, getErrorMessage } from "./utils";
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
} from "./models";

interface DockerImage {
  Labels: string[] | null;
  RepoTags: [string];
  Id: string;
  RepoDigests?: string[];
  Created?: number;
  CreatedAt?: string;
  Size?: number;
}

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

const imageChipSx = {
  height: "auto",
  "& .MuiChip-label": {
    fontSize: "0.8rem",
    lineHeight: 1.1,
    paddingInline: 2,
    paddingBlock: 1,
  },
};

interface ImageCardProps {
  image: Image;
  historyEntry?: HistoryMetadata;
  isJobActive: boolean;
  jobTarget?: string;
  jobStatus?: JobStatus;
  jobMessage?: string;
  jobElapsedSeconds?: number;
  openHistoryEntry: (id: string) => void;
  startAnalysis: (
    target: string,
    selectedSource: AnalysisSource,
    maybeImageId?: string
  ) => void;
}

function ImageCard(props: ImageCardProps) {
  const createdLabel = props.image.createdAt
    ? new Date(props.image.createdAt).toLocaleString()
    : undefined;
  const createdRelative = props.image.createdAt
    ? formatRelativeTimeFromNow(props.image.createdAt)
    : undefined;
  const sizeLabel =
    typeof props.image.sizeBytes === "number"
      ? formatBytes(props.image.sizeBytes)
      : undefined;
  const aliases = props.image.aliases.filter((alias) => alias !== props.image.name);
  const elapsedLabel = formatElapsed(props.jobElapsedSeconds);
  const statusLabel = elapsedLabel
    ? `Status: ${props.jobStatus} (${elapsedLabel})`
    : `Status: ${props.jobStatus}`;

  return (
    <>
      <Card
        sx={{ minWidth: 200, height: "100%", display: "flex", flexDirection: "column" }}
        variant="outlined"
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ flex: 1 }}
        >
          <CardContent sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              component="div"
              sx={{ fontWeight: 500, overflowWrap: "anywhere" }}
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
                sx={{ display: "block", overflowWrap: "anywhere" }}
              >
                Aliases: {aliases.join(", ")}
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
          <CardActions sx={{ justifyContent: "flex-end", pr: 2, flexShrink: 0 }}>
            <Stack direction="column" spacing={1} alignItems="stretch">
              {props.historyEntry ? (
                <Button
                  variant="contained"
                  color="primary"
                  disabled={props.isJobActive}
                  onClick={() => props.openHistoryEntry(props.historyEntry?.id ?? "")}
                  fullWidth
                >
                  View analysis
                </Button>
              ) : null}
              <Box sx={{ position: "relative" }}>
                <Button
                  variant={props.historyEntry ? "outlined" : "contained"}
                  color="primary"
                  disabled={props.isJobActive}
                  onClick={() => {
                    props.startAnalysis(props.image.name, "docker", props.image.fullId);
                  }}
                  fullWidth
                >
                  {props.historyEntry ? "Re-analyze" : "Analyze"}
                  {props.isJobActive && props.jobTarget === props.image.name && (
                    <CircularProgress
                      size={24}
                      sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        marginTop: "-12px",
                        marginLeft: "-12px",
                      }}
                    />
                  )}
                </Button>
              </Box>
            </Stack>
          </CardActions>
        </Stack>
        {props.jobTarget === props.image.name && props.jobStatus ? (
          <CardContent sx={{ pt: 0 }}>
            {props.jobMessage ? (
              <>
                <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                  {props.jobMessage}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {statusLabel}
                </Typography>
              </>
            ) : (
              <Typography variant="caption" color="text.secondary">
                {statusLabel}
              </Typography>
            )}
            {props.isJobActive ? <LinearProgress sx={{ mt: 1 }} /> : null}
          </CardContent>
        ) : null}
      </Card>
    </>
  );
}

interface ImageListProps {
  images: Image[];
  historyEntries: HistoryMetadata[];
  isJobActive: boolean;
  jobTarget?: string;
  jobStatus?: JobStatus;
  jobMessage?: string;
  jobElapsedSeconds?: number;
  openHistoryEntry: (id: string) => void;
  startAnalysis: (
    target: string,
    selectedSource: AnalysisSource,
    maybeImageId?: string
  ) => void;
  getImages: () => void;
}

function ImageList(props: ImageListProps) {
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "created" | "size">("created");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isSingleColumn, setSingleColumn] = useState(true);
  const historyByImageRef = useMemo(() => {
    const map = new Map<string, HistoryMetadata>();
    props.historyEntries.forEach((entry) => {
      if (entry.source !== "docker") {
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
  const filteredImages = useMemo(() => {
    const trimmed = filter.trim().toLowerCase();
    if (!trimmed) {
      return props.images;
    }
    return props.images.filter((image) => {
      if (image.name.toLowerCase().includes(trimmed)) {
        return true;
      }
      return image.aliases.some((alias) =>
        alias.toLowerCase().includes(trimmed)
      );
    });
  }, [filter, props.images]);
  const sortedImages = useMemo(() => {
    const copy = [...filteredImages];
    const direction = sortDirection === "asc" ? 1 : -1;
    copy.sort((left, right) => {
      if (sortBy === "name") {
        return left.name.localeCompare(right.name) * direction;
      }
      if (sortBy === "created") {
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

  return (
    <>
      <Typography variant="h3" sx={{ mb: 2 }}>
        Choose an image below to get started
      </Typography>
      <Stack
        direction="row"
        spacing={2}
        flexWrap="wrap"
        alignItems="center"
        sx={{ mb: 2 }}
      >
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
          onChange={(event) =>
            setSortBy(event.target.value as "name" | "created" | "size")
          }
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
          onChange={(event) =>
            setSortDirection(event.target.value as "asc" | "desc")
          }
          size="small"
          sx={{ minWidth: 140 }}
          disabled={props.isJobActive}
        >
          <MenuItem value="asc">Ascending</MenuItem>
          <MenuItem value="desc">Descending</MenuItem>
        </TextField>
        <Button
          variant="outlined"
          onClick={props.getImages}
          disabled={props.isJobActive}
        >
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
      </Stack>
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
              const historyEntry = image.fullId
                ? historyByImageRef.get(image.fullId)
                : undefined;
              return (
                <Grid
                  item
                  xs={12}
                  md={isSingleColumn ? 12 : 6}
                  key={`${image.id}-${image.name}`}
                >
                  <ImageCard
                    image={image}
                    historyEntry={historyEntry}
                    isJobActive={props.isJobActive}
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
  const [analysis, setAnalysisResult] = useState<AnalysisResult | undefined>(
    undefined
  );
  const [activeTab, setActiveTab] = useState<"analysis" | "history">("analysis");
  const [isCheckingDive, setCheckingDive] = useState<boolean>(false);
  const [images, setImages] = useState<Image[]>([]);
  const [isDiveInstalled, setDiveInstalled] = useState<boolean>(false);
  const [clientError, setClientError] = useState<string | undefined>(
    undefined
  );
  const [source, setSource] = useState<AnalysisSource>("docker");
  const [archivePath, setArchivePath] = useState<string>("");
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [jobStatus, setJobStatus] = useState<JobStatus | undefined>(undefined);
  const [jobMessage, setJobMessage] = useState<string | undefined>(undefined);
  const [jobTarget, setJobTarget] = useState<string | undefined>(undefined);
  const [jobElapsedSeconds, setJobElapsedSeconds] = useState<number | undefined>(
    undefined
  );
  const [historyEntries, setHistoryEntries] = useState<HistoryMetadata[]>([]);
  const [historyError, setHistoryError] = useState<string | undefined>(
    undefined
  );
  const [isHistoryLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<
    string | undefined
  >(undefined);
  const [compareSelection, setCompareSelection] =
    useState<CompareSelectionState>({});
  const [compareIds, setCompareIds] = useState<
    { leftId: string; rightId: string } | undefined
  >(undefined);
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const [isCIGateDialogOpen, setCIGateDialogOpen] = useState(false);
  const listScrollYRef = useRef(0);

  const ddClient = useMemo(() => {
    try {
      return createDockerDesktopClient();
    } catch (error) {
      setClientError(getErrorMessage(error));
      return undefined;
    }
  }, []);

  const checkDiveInstallation = useCallback(async () => {
    if (!ddClient?.extension?.vm?.service) {
      return;
    }
    setCheckingDive(true);
    try {
      await ddClient.extension.vm.service.get("/checkdive");
      setDiveInstalled(true);
      setClientError(undefined);
    } catch (error) {
      setDiveInstalled(false);
      setClientError(getErrorMessage(error));
    } finally {
      setCheckingDive(false);
    }
  }, [ddClient]);

  const isDiveMissing = clientError?.includes("Dive is not found");

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
      if (typeof image.Created === "number" && Number.isFinite(image.Created)) {
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
      const sizeBytes = typeof i.Size === "number" ? i.Size : undefined;
      const tags = i.RepoTags?.filter((tag) => tag !== "<none>:<none>") ?? [];
      const digests =
        i.RepoDigests?.filter((digest) => digest !== "<none>@<none>") ?? [];
      const aliases = [...tags, ...digests];
      if (aliases.length === 0) {
        return;
      }
      const existing = byImageId.get(i.Id);
      const nextAliases = new Set([...(existing?.aliases ?? []), ...aliases]);
      const preferTag =
        tags.length > 0 &&
        (!existing ||
          existing.name.startsWith("sha256:") ||
          existing.name.includes("@sha256:"));
      const primaryName =
        preferTag && tags.length > 0
          ? tags[0]
          : existing?.name ?? aliases[0] ?? extractId(i.Id);
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
      const data = (await ddClient.extension.vm.service.get(
        "/history"
      )) as HistoryMetadata[];
      setHistoryEntries(data);
      setHistoryError(undefined);
    } catch (error) {
      setHistoryError(getErrorMessage(error));
    } finally {
      setHistoryLoading(false);
    }
  }, [ddClient]);

  const clearHistorySelections = (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }
    setCompareSelection((prev) => {
      const next = { ...prev };
      if (ids.includes(prev.leftId ?? "")) {
        delete next.leftId;
      }
      if (ids.includes(prev.rightId ?? "")) {
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
      setHistoryError("Backend API is unavailable.");
      return;
    }
    const confirmed = window.confirm(
      "Delete this history entry from this machine?"
    );
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
      setHistoryError("Backend API is unavailable.");
      return;
    }
    const confirmed = window.confirm(
      "Delete all history entries from this machine?"
    );
    if (!confirmed) {
      return;
    }
    setHistoryLoading(true);
    try {
      await ddClient.extension.vm.service.delete("/history");
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
      setHistoryError("Backend API is unavailable.");
      return;
    }
    try {
      saveListScrollPosition();
      scrollToTop();
      setActiveTab("analysis");
      const entry = (await ddClient.extension.vm.service.get(
        `/history/${id}`
      )) as HistoryEntry;
      setCompareIds(undefined);
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const downloadFile = (data: BlobPart, filename: string, contentType: string) => {
    const blob = new Blob([data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const normalizeExportData = (data: unknown): BlobPart => {
    if (typeof data === "string") {
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
      throw new Error("Backend API is unavailable.");
    }
    if (!selectedHistoryId) {
      throw new Error("Select an analysis entry to export.");
    }
    const response = (await ddClient.extension.vm.service.post(
      `/history/${selectedHistoryId}/export`,
      { format }
    )) as ExportResponse;
    const exported = await ddClient.extension.vm.service.get(
      `/history/${selectedHistoryId}/export/${format}`
    );
    downloadFile(
      normalizeExportData(exported),
      response.filename,
      response.contentType
    );
  };

  const handleGenerateCIRules = async (
    payload: CIRulesRequest
  ): Promise<CIRulesResponse> => {
    if (!ddClient?.extension?.vm?.service) {
      throw new Error("Backend API is unavailable.");
    }
    return (await ddClient.extension.vm.service.post(
      "/ci/rules",
      payload
    )) as CIRulesResponse;
  };

  const handleDownloadCIRules = (content: string, filename: string) => {
    downloadFile(content, filename, "application/x-yaml");
  };

  const fetchAnalysisResult = useCallback(async (currentJobId: string) => {
    if (!ddClient?.extension?.vm?.service) {
      return;
    }
    try {
      const dive = (await ddClient.extension.vm.service.get(
        `/analysis/${currentJobId}/result`
      )) as DiveResponse;
      saveListScrollPosition();
      scrollToTop();
      setAnalysisResult({
        image: {
          name: jobTarget ?? "Unknown image",
          id: currentJobId,
          aliases: [],
        },
        dive,
      });
      setSelectedHistoryId(currentJobId);
      setActiveTab("analysis");
      await fetchHistory();
    } catch (error) {
      setJobStatus("failed");
      setJobMessage(getErrorMessage(error));
    }
  }, [ddClient, fetchHistory, jobTarget]);

  const startAnalysis = useCallback(async (
    target: string,
    selectedSource: AnalysisSource,
    maybeImageId?: string
  ) => {
    if (!ddClient?.extension?.vm?.service) {
      setJobStatus("failed");
      setJobMessage("Backend API is unavailable.");
      return;
    }

    const payload: AnalyzeRequest =
      selectedSource === "docker-archive"
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
    setJobStatus("queued");
    setJobElapsedSeconds(0);

    try {
      const data = (await ddClient.extension.vm.service.post(
        "/analyze",
        payload
      )) as AnalyzeResponse;
      setJobId(data.jobId);
      setJobStatus(data.status);
    } catch (error) {
      setJobStatus("failed");
      setJobMessage(getErrorMessage(error));
    }
  }, [ddClient]);

  const ArchiveAnalyzer = () => (
    <Stack spacing={2}>
      <TextField
        label="Archive path"
        helperText="Enter the full local path to a docker-archive tar file."
        value={archivePath}
        disabled={isJobActive}
        onChange={(event) => setArchivePath(event.target.value)}
        fullWidth
      />
      <Box sx={{ position: "relative" }}>
        <Button
          variant="outlined"
          disabled={isJobActive || archivePath.trim() === ""}
          onClick={() => startAnalysis(archivePath.trim(), "docker-archive")}
        >
          Analyze archive
          {isJobActive && jobTarget === archivePath.trim() && (
            <CircularProgress
              size={24}
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                marginTop: "-12px",
                marginLeft: "-12px",
              }}
            />
          )}
        </Button>
      </Box>
      {jobTarget === archivePath.trim() && jobStatus ? (
        <Stack spacing={1}>
          {jobMessage ? (
            <>
              <Typography variant="body2" color="text.primary">
                {jobMessage}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Status: {jobStatus}
                {jobElapsedSeconds !== undefined
                  ? ` (${formatElapsed(jobElapsedSeconds) ?? "0s"})`
                  : ""}
              </Typography>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Status: {jobStatus}
              {jobElapsedSeconds !== undefined
                ? ` (${formatElapsed(jobElapsedSeconds) ?? "0s"})`
                : ""}
            </Typography>
          )}
          {isJobActive ? <LinearProgress /> : null}
        </Stack>
      ) : null}
    </Stack>
  );

  useEffect(() => {
    if (!ddClient) {
      return;
    }
    if (!ddClient.extension?.vm?.service) {
      setClientError("Backend service is unavailable.");
      return;
    }
    checkDiveInstallation();
    getImages();
    fetchHistory();
  }, [checkDiveInstallation, ddClient, fetchHistory, getImages]);

  useEffect(() => {
    if (!ddClient?.extension?.vm?.service || !jobId) {
      return;
    }
    if (jobStatus !== "queued" && jobStatus !== "running") {
      return;
    }

    let isCancelled = false;
    const pollStatus = async () => {
      let status: AnalysisStatusResponse;
      try {
        status = (await ddClient.extension.vm.service.get(
          `/analysis/${jobId}/status`
        )) as AnalysisStatusResponse;
      } catch (error) {
        if (!isCancelled) {
          setJobStatus("failed");
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

      if (status.status === "succeeded") {
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
      window.scrollTo({ top: listScrollYRef.current, left: 0, behavior: "auto" });
    });
  };

  const updateCompareSelection = (side: CompareSide, id: string) => {
    setCompareSelection((prev) => {
      const next = { ...prev };
      if (side === "left") {
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
      [side === "left" ? "leftId" : "rightId"]: undefined,
    }));
  };

  const openCompareView = (leftId: string, rightId: string) => {
    saveListScrollPosition();
    scrollToTop();
    setAnalysisResult(undefined);
    resetJobState();
    setSelectedHistoryId(undefined);
    setCompareIds({ leftId, rightId });
    setActiveTab("analysis");
  };

  const isJobActive = jobStatus === "queued" || jobStatus === "running";

  const errorHint = (() => {
    if (!jobMessage) {
      return undefined;
    }
    const lowered = jobMessage.toLowerCase();
    if (lowered.includes("timed out")) {
      return "Try a smaller image or rerun when the engine is less busy.";
    }
    if (lowered.includes("binary not found")) {
      return "Install the Dive CLI in the backend VM, then retry.";
    }
    if (lowered.includes("archive")) {
      return "Double-check the archive path and ensure the file exists.";
    }
    return undefined;
  })();

  const handleRetry = () => {
    resetJobState();
    setAnalysisResult(undefined);
    setSelectedHistoryId(undefined);
  };

  const statusAlert =
    jobStatus === "failed" ? (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={handleRetry}>
            Retry
          </Button>
        }
      >
        <Stack spacing={0.5}>
          <Typography variant="body2">
            Status: {jobStatus}
            {jobElapsedSeconds !== undefined
              ? ` (${formatElapsed(jobElapsedSeconds) ?? "0s"})`
              : ""}
            {jobTarget ? ` — ${jobTarget}` : ""}
          </Typography>
          {jobMessage ? (
            <Typography variant="body2">{jobMessage}</Typography>
          ) : null}
          {errorHint ? (
            <Typography variant="body2">{errorHint}</Typography>
          ) : null}
        </Stack>
      </Alert>
    ) : null;

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        flexWrap="wrap"
      >
        <Typography
          variant="h1"
          sx={{ display: "flex", alignItems: "center", gap: 2 }}
        >
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
      {!ddClient ? null : statusAlert}
      {!ddClient ? null : (
        <>
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
        </>
      )}
      {!ddClient ? (
        <Stack spacing={2}>
          <Alert severity="error">
            This UI must be run inside Docker Desktop. The extension API client
            is unavailable in a regular browser.
          </Alert>
          <Alert severity="info">
            Load the extension in Docker Desktop, then re-open this tab. See
            README for local dev steps.
          </Alert>
          {clientError ? (
            <Alert severity="warning">Details: {clientError}</Alert>
          ) : null}
        </Stack>
      ) : null}
      {isCheckingDive ? (
        <Stack sx={{ mt: 4 }} direction="column" alignItems="center">
          <CircularProgress />
        </Stack>
      ) : (
        <></>
      )}
      {!ddClient ? null : !isDiveInstalled ? (
        <Stack spacing={2}>
          <Alert severity="warning">
            Dive is not available in the backend VM. Install it and try again.
          </Alert>
          {isDiveMissing ? (
            <Alert severity="info">
              Install Dive in the backend VM image, rebuild the extension, and
              reinstall it in Docker Desktop. Basic install options:
              <Box component="ul" sx={{ pl: 2, mt: 1, mb: 0 }}>
                <li>macOS (Homebrew): <code>brew install dive</code></li>
                <li>
                  Ubuntu/Debian: download the latest <code>.deb</code> and run{" "}
                  <code>sudo apt install ./dive_&lt;version&gt;_linux_amd64.deb</code>
                </li>
                <li>
                  RHEL/CentOS: download the latest <code>.rpm</code> and run{" "}
                  <code>rpm -i dive_&lt;version&gt;_linux_amd64.rpm</code>
                </li>
              </Box>
              For more options (Windows, Arch, Nix, Docker), see the Dive install
              docs (fork of{" "}
              <Link href="https://github.com/wagoodman/dive" target="_blank" rel="noopener noreferrer">
                wagoodman/dive
              </Link>
              ).
              <Box sx={{ mt: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    ddClient?.host.openExternal(
                      "https://github.com/pRizz/dive#installation"
                    )
                  }
                >
                  Open Dive install docs
                </Button>
              </Box>
            </Alert>
          ) : null}
          {clientError ? (
            <Alert severity="info">Details: {clientError}</Alert>
          ) : null}
          <Button variant="outlined" onClick={() => checkDiveInstallation()}>
            Retry check
          </Button>
        </Stack>
      ) : (
        <>
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            aria-label="Analysis and history tabs"
            sx={{
              "& .MuiTab-root": {
                fontSize: "2rem",
                fontWeight: 500,
                textTransform: "none",
              },
            }}
          >
            <Tab label="Analysis" value="analysis" />
            <Tab label="History" value="history" />
          </Tabs>
          <Box role="tabpanel" hidden={activeTab !== "analysis"} sx={{ mt: 3 }}>
            {analysis ? (
              <Stack spacing={2}>
                {jobStatus && jobTarget && !isJobActive ? (
                  <Typography variant="body2" color="text.secondary">
                    Status: {jobStatus}
                    {jobElapsedSeconds !== undefined
                      ? ` (${formatElapsed(jobElapsedSeconds) ?? "0s"})`
                      : ""}
                    {jobTarget ? ` — ${jobTarget}` : ""}
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
                  <FormLabel id="analysis-source-label">
                    Analysis source
                  </FormLabel>
                  <RadioGroup
                    row
                    aria-labelledby="analysis-source-label"
                    value={source}
                    onChange={(event) =>
                      setSource(event.target.value as AnalysisSource)
                    }
                  >
                    <FormControlLabel
                      value="docker"
                      control={<Radio />}
                      label="Docker engine"
                    />
                    <FormControlLabel
                      value="docker-archive"
                      control={<Radio />}
                      label="Docker archive"
                    />
                  </RadioGroup>
                </FormControl>
                {source === "docker" ? (
                  <ImageList
                    images={images}
                    historyEntries={historyEntries}
                    isJobActive={isJobActive}
                    jobTarget={jobTarget}
                    jobStatus={jobStatus}
                    jobMessage={jobMessage}
                    jobElapsedSeconds={jobElapsedSeconds}
                    openHistoryEntry={openHistoryEntry}
                    startAnalysis={startAnalysis}
                    getImages={getImages}
                  />
                ) : (
                  <ArchiveAnalyzer />
                )}
              </Stack>
            )}
          </Box>
          <Box role="tabpanel" hidden={activeTab !== "history"} sx={{ mt: 3 }}>
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
        </>
      )}
      <Divider sx={{ mt: 6, mb: 3 }} />
      <Stack spacing={1} sx={{ textAlign: "center", pb: 4 }}>
        <Typography variant="body2" color="text.secondary">
          All analysis runs locally in Docker Desktop.{" "}
          <Typography component="span" color="text.primary">
            Your images never leave your machine.
          </Typography>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Built on top of the excellent Dive CLI:{" "}
          <Link
            href="https://github.com/pRizz/dive"
            target="_blank"
            rel="noopener noreferrer"
          >
            pRizz/dive
          </Link>
          , a fork of{" "}
          <Link href="https://github.com/wagoodman/dive" target="_blank" rel="noopener noreferrer">
            wagoodman/dive
          </Link>
          .
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Made by{" "}
          <Typography component="span" color="text.primary">
            Peter Ryszkiewicz
          </Typography>
          {" "}forked from{" "}
          <Link href="https://github.com/prakhar1989/dive-in" target="_blank" rel="noopener noreferrer">
            Prakhar Srivastav&apos;s work
          </Link>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Free &amp; open source on{" "}
          <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            GitHub
          </Link>
          .
        </Typography>
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
