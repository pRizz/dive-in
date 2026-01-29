import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CIRulesRequest, CIRulesResponse } from "./models";
import { getErrorMessage } from "./utils";

export default function CIGateDialog(props: {
  open: boolean;
  onClose: () => void;
  onGenerate: (payload: CIRulesRequest) => Promise<CIRulesResponse>;
  onDownload: (content: string, filename: string) => void;
}) {
  const { open, onClose, onGenerate, onDownload } = props;
  const [lowestEfficiency, setLowestEfficiency] = useState("");
  const [highestWastedBytes, setHighestWastedBytes] = useState("");
  const [highestUserWastedPercent, setHighestUserWastedPercent] = useState("");
  const [preview, setPreview] = useState("");
  const [filename, setFilename] = useState(".dive-ci");
  const [error, setError] = useState<string | undefined>(undefined);
  const [isGenerating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) {
      setLowestEfficiency("");
      setHighestWastedBytes("");
      setHighestUserWastedPercent("");
      setPreview("");
      setFilename(".dive-ci");
      setError(undefined);
      setGenerating(false);
    }
  }, [open]);

  const parseNumber = (value: string, field: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      throw new Error(`${field} must be a number`);
    }
    return parsed;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(undefined);
    try {
      const payload: CIRulesRequest = {
        lowestEfficiency: parseNumber(lowestEfficiency, "Lowest efficiency"),
        highestWastedBytes: highestWastedBytes.trim() || undefined,
        highestUserWastedPercent: parseNumber(
          highestUserWastedPercent,
          "Highest wasted percent"
        ),
      };
      const response = await onGenerate(payload);
      setPreview(response.content);
      setFilename(response.filename);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!preview) {
      return;
    }
    onDownload(preview, filename);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate CI gate rules</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Set one or more thresholds to generate a `.dive-ci` file.
          </Typography>
          <Alert severity="info">
            Save the generated `.dive-ci` at the root of your repository. Dive reads
            it during CI runs (for example, in GitHub Actions) to fail builds when
            the image exceeds the thresholds you set here.
          </Alert>
          <TextField
            label="Lowest efficiency (0-1)"
            value={lowestEfficiency}
            onChange={(event) => setLowestEfficiency(event.target.value)}
            placeholder="0.95"
            type="number"
            inputProps={{ step: "0.01", min: "0", max: "1" }}
            fullWidth
          />
          <TextField
            label="Highest wasted bytes"
            value={highestWastedBytes}
            onChange={(event) => setHighestWastedBytes(event.target.value)}
            placeholder="20MB"
            fullWidth
          />
          <TextField
            label="Highest wasted percent (0-1)"
            value={highestUserWastedPercent}
            onChange={(event) => setHighestUserWastedPercent(event.target.value)}
            placeholder="0.2"
            type="number"
            inputProps={{ step: "0.01", min: "0", max: "1" }}
            fullWidth
          />
          <Button
            variant="outlined"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate preview"}
          </Button>
          {preview ? (
            <TextField
              label="Preview"
              value={preview}
              multiline
              minRows={6}
              InputProps={{ readOnly: true }}
              fullWidth
            />
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isGenerating}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleDownload}
          disabled={!preview || isGenerating}
        >
          Download .dive-ci
        </Button>
      </DialogActions>
    </Dialog>
  );
}
