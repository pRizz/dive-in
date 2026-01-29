import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { CompareLayerDelta, HistoryEntry } from "./models";
import {
  buildCompareSummaryDelta,
  extractId,
  formatBytes,
  formatPercent,
  matchLayersForCompare,
} from "./utils";

type ExtensionClient = {
  host?: {
    openExternal?: (url: string) => Promise<void> | void;
  };
  extension?: {
    vm?: {
      service?: {
        get: (path: string) => Promise<unknown>;
      };
    };
  };
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const formatSignedBytes = (bytes: number) => {
  const sign = bytes > 0 ? "+" : bytes < 0 ? "-" : "";
  return `${sign}${formatBytes(Math.abs(bytes))}`;
};

const formatSignedPercent = (value: number) => {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatPercent(Math.abs(value))}`;
};

const statusColorMap: Record<
  CompareLayerDelta["status"],
  "success" | "error" | "warning" | "default"
> = {
  added: "success",
  removed: "error",
  modified: "warning",
  unchanged: "default",
};

export default function CompareView(props: {
  leftId: string;
  rightId: string;
  onBack: () => void;
  client?: ExtensionClient;
}) {
  const { leftId, rightId, onBack, client } = props;
  const [leftEntry, setLeftEntry] = useState<HistoryEntry | undefined>(undefined);
  const [rightEntry, setRightEntry] = useState<HistoryEntry | undefined>(
    undefined
  );
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [scoutError, setScoutError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchEntries = async () => {
      if (!client?.extension?.vm?.service) {
        setError("Backend API is unavailable.");
        return;
      }
      setLoading(true);
      setError(undefined);
      try {
        const [left, right] = await Promise.all([
          client.extension.vm.service.get(`/history/${leftId}`),
          client.extension.vm.service.get(`/history/${rightId}`),
        ]);
        setLeftEntry(left as HistoryEntry);
        setRightEntry(right as HistoryEntry);
      } catch (fetchError) {
        setError(getErrorMessage(fetchError));
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [client, leftId, rightId]);

  const summaryDelta = useMemo(
    () =>
      buildCompareSummaryDelta(
        leftEntry?.metadata.summary,
        rightEntry?.metadata.summary
      ),
    [leftEntry, rightEntry]
  );

  const layerDeltas = useMemo(
    () =>
      matchLayersForCompare(
        leftEntry?.result.layer ?? [],
        rightEntry?.result.layer ?? []
      ),
    [leftEntry, rightEntry]
  );

  const handleOpenScout = async () => {
    setScoutError(undefined);
    if (!client?.host?.openExternal) {
      setScoutError(
        "Docker Scout requires Docker Desktop sign-in and Scout enablement."
      );
      return;
    }
    try {
      await client.host.openExternal("https://scout.docker.com/");
    } catch (openError) {
      setScoutError(getErrorMessage(openError));
    }
  };

  const scoutUnavailable = !client?.host?.openExternal;

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Button variant="outlined" onClick={onBack}>
          Back to history
        </Button>
        <Typography variant="h3">Compare history</Typography>
      </Stack>
      {error ? <Alert severity="warning">{error}</Alert> : null}
      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Loading comparison...
        </Typography>
      ) : null}
      {leftEntry && rightEntry ? (
        <>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="overline">Baseline</Typography>
                  <Typography variant="h6">{leftEntry.metadata.image}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed:{" "}
                    {new Date(leftEntry.metadata.completedAt).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Source: {leftEntry.metadata.source}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="overline">Target</Typography>
                  <Typography variant="h6">{rightEntry.metadata.image}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed:{" "}
                    {new Date(rightEntry.metadata.completedAt).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Source: {rightEntry.metadata.source}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
          <Divider />
          <Stack spacing={2}>
            <Typography variant="h3">Summary deltas</Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Total size
                  </Typography>
                  <Typography variant="h5">
                    {formatBytes(summaryDelta.sizeBytes.right)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Baseline {formatBytes(summaryDelta.sizeBytes.left)} • Δ{" "}
                    {formatSignedBytes(summaryDelta.sizeBytes.delta)}
                  </Typography>
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Wasted space
                  </Typography>
                  <Typography variant="h5">
                    {formatBytes(summaryDelta.inefficientBytes.right)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Baseline {formatBytes(summaryDelta.inefficientBytes.left)} • Δ{" "}
                    {formatSignedBytes(summaryDelta.inefficientBytes.delta)}
                  </Typography>
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Efficiency score
                  </Typography>
                  <Typography variant="h5">
                    {formatPercent(summaryDelta.efficiencyScore.right)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Baseline {formatPercent(summaryDelta.efficiencyScore.left)} • Δ{" "}
                    {formatSignedPercent(summaryDelta.efficiencyScore.delta)}
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Stack>
          <Stack spacing={2}>
            <Typography variant="h3">Layer deltas</Typography>
            {layerDeltas.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No layer data available for comparison.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Layer</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Baseline size</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Target size</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Delta</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Command</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {layerDeltas.map((delta) => {
                      const leftLayer = delta.left;
                      const rightLayer = delta.right;
                      const layerId =
                        leftLayer?.id ?? rightLayer?.id ?? delta.key;
                      return (
                        <TableRow key={delta.key} hover>
                          <TableCell>
                            <Chip
                              label={delta.status}
                              size="small"
                              color={statusColorMap[delta.status]}
                            />
                          </TableCell>
                          <TableCell>{extractId(layerId)}</TableCell>
                          <TableCell>
                            {leftLayer ? formatBytes(leftLayer.sizeBytes) : "—"}
                          </TableCell>
                          <TableCell>
                            {rightLayer ? formatBytes(rightLayer.sizeBytes) : "—"}
                          </TableCell>
                          <TableCell>{formatSignedBytes(delta.sizeBytesDelta)}</TableCell>
                          <TableCell>
                            {(rightLayer?.command ?? leftLayer?.command ?? "").slice(
                              0,
                              120
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
          <Stack spacing={2}>
            <Typography variant="h3">Docker Scout</Typography>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={handleOpenScout}
                disabled={scoutUnavailable}
              >
                Open in Scout
              </Button>
              {scoutUnavailable ? (
                <Typography variant="body2" color="text.secondary">
                  Docker Scout requires Docker Desktop sign-in and enablement.
                </Typography>
              ) : null}
            </Stack>
            {scoutError ? <Alert severity="warning">{scoutError}</Alert> : null}
          </Stack>
        </>
      ) : null}
    </Stack>
  );
}
