import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CompareSelectionState, CompareSide, HistoryMetadata } from "./models";
import { formatBytes, formatPercent } from "./utils";

export default function HistoryList(props: {
  entries: HistoryMetadata[];
  isLoading: boolean;
  error?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  compareSelection?: CompareSelectionState;
  onCompareSelect?: (side: CompareSide, id: string) => void;
  onCompareClear?: (side: CompareSide) => void;
  onCompare?: (leftId: string, rightId: string) => void;
  disabled?: boolean;
}) {
  const {
    entries,
    isLoading,
    error,
    onSelect,
    onDelete,
    onDeleteAll,
    compareSelection,
    onCompareSelect,
    onCompareClear,
    onCompare,
    disabled,
  } = props;
  const [filter, setFilter] = useState("");
  const chipLabelSx = {
    height: "auto",
    "& .MuiChip-label": {
      fontSize: "0.95rem",
      lineHeight: 1.4,
      paddingInline: 2,
      paddingBlock: 1,
    },
  };

  const filteredEntries = useMemo(() => {
    const trimmed = filter.trim().toLowerCase();
    if (!trimmed) {
      return entries;
    }
    return entries.filter((entry) =>
      entry.image.toLowerCase().includes(trimmed)
    );
  }, [entries, filter]);

  const compareReady = Boolean(
    compareSelection?.leftId && compareSelection?.rightId
  );

  const selectionHint = (() => {
    if (!compareSelection?.leftId && !compareSelection?.rightId) {
      return "Select a baseline and a target to compare.";
    }
    if (compareSelection?.leftId && !compareSelection?.rightId) {
      return "Select a target image to compare against the baseline.";
    }
    if (!compareSelection?.leftId && compareSelection?.rightId) {
      return "Select a baseline image to compare against the target.";
    }
    return undefined;
  })();

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
        <Typography variant="h3">History</Typography>
        <Button
          variant="outlined"
          color="error"
          onClick={onDeleteAll}
          disabled={disabled || entries.length === 0}
        >
          Delete all
        </Button>
        <Button
          variant="contained"
          onClick={() =>
            compareSelection?.leftId &&
            compareSelection?.rightId &&
            onCompare?.(compareSelection.leftId, compareSelection.rightId)
          }
          disabled={disabled || !compareReady}
        >
          Compare
        </Button>
        <TextField
          label="Filter by image/tag"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          size="small"
          sx={{ minWidth: 240 }}
          disabled={disabled}
        />
      </Stack>
      <Alert severity="info">
        History is stored in the extension volume under `/data/history` and is
        retained across restarts. Delete entries here to remove them from this
        machine.
      </Alert>
      {selectionHint ? (
        <Typography variant="body2" color="text.secondary">
          {selectionHint}
        </Typography>
      ) : null}
      {error ? <Alert severity="warning">{error}</Alert> : null}
      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Loading history...
        </Typography>
      ) : filteredEntries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No saved analyses yet.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {filteredEntries.map((entry) => {
            const completedAt = new Date(entry.completedAt).toLocaleString();
            const efficiency = formatPercent(entry.summary.efficiencyScore);
            const isBaseline = compareSelection?.leftId === entry.id;
            const isTarget = compareSelection?.rightId === entry.id;
            return (
              <Card key={entry.id} variant="outlined">
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="h6">{entry.image}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed: {completedAt}
                    </Typography>
                    {isBaseline || isTarget ? (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {isBaseline ? (
                          <Chip label="Baseline" size="medium" color="primary" />
                        ) : null}
                        {isTarget ? (
                          <Chip label="Target" size="medium" color="secondary" />
                        ) : null}
                      </Stack>
                    ) : null}
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        label={`Size: ${formatBytes(entry.summary.sizeBytes)}`}
                        size="medium"
                        sx={chipLabelSx}
                      />
                      <Chip
                        label={`Wasted: ${formatBytes(
                          entry.summary.inefficientBytes
                        )}`}
                        size="medium"
                        sx={chipLabelSx}
                      />
                      <Chip
                        label={`Efficiency: ${efficiency}`}
                        size="medium"
                        sx={chipLabelSx}
                      />
                      <Chip label={entry.source} size="medium" sx={chipLabelSx} />
                    </Stack>
                  </Stack>
                </CardContent>
                <CardActions>
                  <Button
                    size="medium"
                    variant="outlined"
                    onClick={() => onSelect(entry.id)}
                    disabled={disabled}
                  >
                    Open analysis
                  </Button>
                  <Button
                    size="medium"
                    variant="outlined"
                    color="error"
                    onClick={() => onDelete(entry.id)}
                    disabled={disabled}
                  >
                    Delete
                  </Button>
                  <Button
                    size="medium"
                    variant={isBaseline ? "contained" : "outlined"}
                    onClick={() =>
                      isBaseline
                        ? onCompareClear?.("left")
                        : onCompareSelect?.("left", entry.id)
                    }
                    disabled={disabled}
                  >
                    {isBaseline ? "Baseline" : "Set baseline"}
                  </Button>
                  <Button
                    size="medium"
                    variant={isTarget ? "contained" : "outlined"}
                    onClick={() =>
                      isTarget
                        ? onCompareClear?.("right")
                        : onCompareSelect?.("right", entry.id)
                    }
                    disabled={disabled}
                  >
                    {isTarget ? "Target" : "Set target"}
                  </Button>
                </CardActions>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
