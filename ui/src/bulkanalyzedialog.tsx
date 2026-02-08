import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { BulkAnalyzeRequest, BulkAnalyzeTarget, Image } from './models';

const DEFAULT_DAYS_INPUT = '3';
const DAY_MS = 24 * 60 * 60 * 1000;

interface DaysValidation {
  days?: number;
  error?: string;
}

function validateDays(rawValue: string): DaysValidation {
  const trimmed = rawValue.trim();
  if (trimmed === '') {
    return { error: 'Days is required.' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { error: 'Days must be a whole number.' };
  }
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) {
    return { error: 'Days must be a safe integer value.' };
  }
  if (parsed < 0) {
    return { error: 'Days must be zero or greater.' };
  }
  return { days: parsed };
}

function buildRequest(
  visibleImages: Image[],
  analyzedImageIds: Set<string>,
  days: number,
  forceReanalyze: boolean,
): BulkAnalyzeRequest {
  const cutoffMs = Date.now() - days * DAY_MS;
  const targets: BulkAnalyzeTarget[] = [];
  let skippedOlderCount = 0;
  let skippedUnknownCreatedAtCount = 0;
  let skippedAlreadyAnalyzedCount = 0;

  visibleImages.forEach((image) => {
    if (typeof image.createdAt !== 'number' || !Number.isFinite(image.createdAt)) {
      skippedUnknownCreatedAtCount += 1;
      return;
    }
    if (image.createdAt < cutoffMs) {
      skippedOlderCount += 1;
      return;
    }
    if (!forceReanalyze && image.fullId && analyzedImageIds.has(image.fullId)) {
      skippedAlreadyAnalyzedCount += 1;
      return;
    }
    targets.push({
      image: image.name,
      imageId: image.fullId,
    });
  });

  return {
    days,
    forceReanalyze,
    visibleCount: visibleImages.length,
    eligibleCount: targets.length,
    skippedOlderCount,
    skippedUnknownCreatedAtCount,
    skippedAlreadyAnalyzedCount,
    targets,
  };
}

export default function BulkAnalyzeDialog(props: {
  open: boolean;
  visibleImages: Image[];
  analyzedImageIds: Set<string>;
  disabled?: boolean;
  onClose: () => void;
  onConfirm: (request: BulkAnalyzeRequest) => void;
}) {
  const { open, visibleImages, analyzedImageIds, disabled = false, onClose, onConfirm } = props;
  const [daysInput, setDaysInput] = useState(DEFAULT_DAYS_INPUT);
  const [forceReanalyze, setForceReanalyze] = useState(false);
  const validation = useMemo(() => validateDays(daysInput), [daysInput]);
  const preview = useMemo(
    () =>
      validation.days === undefined
        ? undefined
        : buildRequest(visibleImages, analyzedImageIds, validation.days, forceReanalyze),
    [visibleImages, analyzedImageIds, validation.days, forceReanalyze],
  );

  useEffect(() => {
    if (!open) {
      setDaysInput(DEFAULT_DAYS_INPUT);
      setForceReanalyze(false);
    }
  }, [open]);

  const handleConfirm = () => {
    if (!preview) {
      return;
    }
    onConfirm(preview);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Bulk analyze recent images</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Analyze images newer than X days"
            value={daysInput}
            onChange={(event) => setDaysInput(event.target.value)}
            type="number"
            inputProps={{ min: 0, step: 1 }}
            error={Boolean(validation.error)}
            helperText={validation.error ?? 'Inclusive cutoff: built at or after now - X days.'}
            disabled={disabled}
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={forceReanalyze}
                onChange={(event) => setForceReanalyze(event.target.checked)}
                disabled={disabled}
              />
            }
            label="Force re-analyze already analyzed images"
          />
          {preview ? (
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                Visible images: {preview.visibleCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Eligible to analyze: {preview.eligibleCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Skipped as older: {preview.skippedOlderCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Skipped (unknown build time): {preview.skippedUnknownCreatedAtCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Skipped (already analyzed): {preview.skippedAlreadyAnalyzedCount}
              </Typography>
              {preview.eligibleCount === 0 ? (
                <Alert severity="info">No visible images match this cutoff.</Alert>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={disabled}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={Boolean(validation.error) || disabled}
        >
          Start bulk analysis
        </Button>
      </DialogActions>
    </Dialog>
  );
}
