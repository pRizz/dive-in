import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { buildPromptText } from './build-prompt-text';
import { copyToClipboard } from './copy-to-clipboard';
import { PromptCardCategory, PromptCardDefinition } from './types';

const COPY_FEEDBACK_MS = 1800;

function categoryLabel(category: PromptCardCategory): string {
  if (category === 'build-speed') {
    return 'Build speed';
  }
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function PromptList(props: { heading: string; items: string[] }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2">{props.heading}</Typography>
      <Box component="ol" sx={{ mt: 0, mb: 0, pl: 2.5 }}>
        {props.items.map((item) => (
          <li key={`${props.heading}-${item}`}>
            <Typography variant="body2" color="text.secondary">
              {item}
            </Typography>
          </li>
        ))}
      </Box>
    </Stack>
  );
}

export default function PromptDetailDialog(props: {
  open: boolean;
  card?: PromptCardDefinition;
  onClose: () => void;
}) {
  const { open, card, onClose } = props;
  const [copyError, setCopyError] = useState<string | undefined>(undefined);
  const [isCopied, setCopied] = useState(false);
  const resetCopyTimerRef = useRef<number | undefined>(undefined);

  const promptText = useMemo(() => (card ? buildPromptText(card) : ''), [card]);

  useEffect(() => {
    setCopyError(undefined);
    setCopied(false);
    if (resetCopyTimerRef.current !== undefined) {
      window.clearTimeout(resetCopyTimerRef.current);
      resetCopyTimerRef.current = undefined;
    }
  }, [open, card?.id]);

  useEffect(() => {
    return () => {
      if (resetCopyTimerRef.current !== undefined) {
        window.clearTimeout(resetCopyTimerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!card) {
      return;
    }
    setCopyError(undefined);
    try {
      await copyToClipboard(promptText);
      setCopied(true);
      if (resetCopyTimerRef.current !== undefined) {
        window.clearTimeout(resetCopyTimerRef.current);
      }
      resetCopyTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        resetCopyTimerRef.current = undefined;
      }, COPY_FEEDBACK_MS);
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{card?.title ?? 'Prompt details'}</DialogTitle>
      <DialogContent>
        {card ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {card.teaser}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={categoryLabel(card.category)} size="small" />
                {card.tags.map((tag) => (
                  <Chip key={`${card.id}-${tag}`} label={tag} size="small" variant="outlined" />
                ))}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Use when: {card.useWhen}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Expected impact: {card.expectedImpact}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Role</Typography>
              <Typography variant="body2" color="text.secondary">
                {card.prompt.role}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Objective</Typography>
              <Typography variant="body2" color="text.secondary">
                {card.prompt.objective}
              </Typography>
            </Stack>
            <PromptList heading="Required inputs" items={card.prompt.requiredInputs} />
            <PromptList heading="Tasks" items={card.prompt.tasks} />
            <PromptList heading="Constraints" items={card.prompt.constraints} />
            <PromptList heading="Output format" items={card.prompt.outputFormat} />
            <TextField
              label="Copy-ready prompt"
              value={promptText}
              multiline
              minRows={12}
              fullWidth
              InputProps={{
                readOnly: true,
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                },
              }}
            />
            {copyError ? <Alert severity="warning">{copyError}</Alert> : null}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={() => void handleCopy()} disabled={!card}>
          {isCopied ? 'Copied' : 'Copy prompt'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
