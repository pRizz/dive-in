import React, { useEffect, useMemo, useState } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import {
  Typography,
  Card,
  CardActions,
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
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";

import Analysis from "./analysis";
import { extractId } from "./utils";
import {
  AnalysisResult,
  AnalysisSource,
  AnalyzeRequest,
  AnalyzeResponse,
  AnalysisStatusResponse,
  DiveResponse,
  Image,
  JobStatus,
} from "./models";

interface DockerImage {
  Labels: string[] | null;
  RepoTags: [string];
  Id: string;
  RepoDigests?: string[];
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function App() {
  const [analysis, setAnalysisResult] = useState<AnalysisResult | undefined>(
    undefined
  );
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

  const ddClient = useMemo(() => {
    try {
      return createDockerDesktopClient();
    } catch (error) {
      setClientError(getErrorMessage(error));
      return undefined;
    }
  }, []);

  const checkDiveInstallation = async () => {
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
  };

  const readImages = async () => {
    if (!ddClient) {
      return [];
    }
    return (await ddClient.docker.listImages()) as DockerImage[];
  };

  const getImages = async () => {
    if (!ddClient) {
      return;
    }
    const all = await readImages();
    const references = new Set<string>();
    const images = all.flatMap((i) => {
      const result: Image[] = [];
      const tags = i.RepoTags?.filter((tag) => tag !== "<none>:<none>") ?? [];
      tags.forEach((tag) => {
        if (!references.has(tag)) {
          references.add(tag);
          result.push({ name: tag, id: extractId(i.Id) });
        }
      });
      const digests =
        i.RepoDigests?.filter((digest) => digest !== "<none>@<none>") ?? [];
      digests.forEach((digest) => {
        if (!references.has(digest)) {
          references.add(digest);
          result.push({ name: digest, id: extractId(i.Id) });
        }
      });
      return result;
    });
    setImages(images);
  };

  const resetJobState = () => {
    setJobId(undefined);
    setJobStatus(undefined);
    setJobMessage(undefined);
    setJobTarget(undefined);
  };

  const fetchAnalysisResult = async (currentJobId: string) => {
    if (!ddClient?.extension?.vm?.service) {
      return;
    }
    try {
      const dive = (await ddClient.extension.vm.service.get(
        `/analysis/${currentJobId}/result`
      )) as DiveResponse;
      setAnalysisResult({
        image: {
          name: jobTarget ?? "Unknown image",
          id: currentJobId,
        },
        dive,
      });
    } catch (error) {
      setJobStatus("failed");
      setJobMessage(getErrorMessage(error));
    }
  };

  const startAnalysis = async (
    target: string,
    selectedSource: AnalysisSource
  ) => {
    if (!ddClient?.extension?.vm?.service) {
      setJobStatus("failed");
      setJobMessage("Backend API is unavailable.");
      return;
    }

    const payload: AnalyzeRequest =
      selectedSource === "docker-archive"
        ? { source: selectedSource, archivePath: target }
        : { source: selectedSource, image: target };

    setJobMessage(undefined);
    setAnalysisResult(undefined);
    setJobTarget(target);
    setJobStatus("queued");

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
  };

  function ImageCard(props: { image: Image }) {
    return (
      <>
        <Card sx={{ minWidth: 200 }} variant="outlined">
          <CardContent>
            <Typography
              sx={{ fontSize: 14 }}
              color="text.secondary"
              gutterBottom
            >
              {props.image.id}
            </Typography>
            <Typography variant="body1" component="div">
              {props.image.name}
            </Typography>
          </CardContent>
          <CardActions>
            <Box sx={{ position: "relative" }}>
              <Button
                variant="outlined"
                disabled={isJobActive}
                onClick={() => {
                  startAnalysis(props.image.name, "docker");
                }}
              >
                Analyze
                {isJobActive && jobTarget === props.image.name && (
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
          </CardActions>
          {jobTarget === props.image.name && jobStatus ? (
            <CardContent sx={{ pt: 0 }}>
              <Typography variant="caption" color="text.secondary">
                Status: {jobStatus}
              </Typography>
              {isJobActive ? <LinearProgress sx={{ mt: 1 }} /> : null}
            </CardContent>
          ) : null}
        </Card>
      </>
    );
  }

  const ImageList = () => (
    <>
      <Typography variant="h3" sx={{ mb: 2 }}>
        Choose an image below to get started
      </Typography>
      <Grid container spacing={2}>
        {images.map((image, i) => (
          <Grid item xs key={i}>
            <ImageCard image={image}></ImageCard>
          </Grid>
        ))}
      </Grid>
    </>
  );

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
          <Typography variant="caption" color="text.secondary">
            Status: {jobStatus}
          </Typography>
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
  }, [ddClient]);

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
  }, [ddClient, jobId, jobStatus]);

  const clearAnalysis = () => {
    setAnalysisResult(undefined);
    resetJobState();
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
  };

  const handleCancel = () => {
    resetJobState();
    setAnalysisResult(undefined);
  };

  const statusAlert = jobStatus ? (
    <Alert
      severity={jobStatus === "failed" ? "error" : "info"}
      action={
        jobStatus === "failed" ? (
          <Button color="inherit" size="small" onClick={handleRetry}>
            Retry
          </Button>
        ) : isJobActive ? (
          <Button color="inherit" size="small" onClick={handleCancel}>
            Stop waiting
          </Button>
        ) : null
      }
    >
      <Stack spacing={0.5}>
        <Typography variant="body2">
          Status: {jobStatus}
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
      <Typography variant="h1">Dive-In</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
        Use this Docker extension to helps you explore a docker image, layer
        contents, and discover ways to shrink the size of your Docker/OCI image.
      </Typography>
      <Divider sx={{ mt: 4, mb: 4 }} orientation="horizontal" flexItem />
      {!ddClient ? null : statusAlert}
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
          {clientError ? (
            <Alert severity="info">Details: {clientError}</Alert>
          ) : null}
          <Button variant="outlined" onClick={() => checkDiveInstallation()}>
            Retry check
          </Button>
        </Stack>
      ) : analysis ? (
        <Analysis onExit={clearAnalysis} analysis={analysis}></Analysis>
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
          {source === "docker" ? <ImageList></ImageList> : <ArchiveAnalyzer />}
        </Stack>
      )}
    </>
  );
}
