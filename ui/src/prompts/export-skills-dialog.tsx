import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { SkillBundleFormat } from './types';

export default function ExportSkillsDialog(props: {
  open: boolean;
  onClose: () => void;
  onExport: (format: SkillBundleFormat) => Promise<void>;
}) {
  const { open, onClose, onExport } = props;
  const [format, setFormat] = useState<SkillBundleFormat>('both');
  const [isExporting, setExporting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      setFormat('both');
      setError(undefined);
      setExporting(false);
    }
  }, [open]);

  const handleExport = async () => {
    setExporting(true);
    setError(undefined);
    try {
      await onExport(format);
      onClose();
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : String(exportError));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Export all skills</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Choose which skill formats to include in the zip bundle.
          </Typography>
          <FormControl>
            <RadioGroup
              value={format}
              onChange={(event) => setFormat(event.target.value as SkillBundleFormat)}
            >
              <FormControlLabel value="both" control={<Radio />} label="Both" />
              <FormControlLabel value="codex" control={<Radio />} label="Codex" />
              <FormControlLabel value="generic" control={<Radio />} label="Generic" />
            </RadioGroup>
          </FormControl>
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isExporting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void handleExport()} disabled={isExporting}>
          {isExporting ? 'Exporting...' : 'Export skills'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
