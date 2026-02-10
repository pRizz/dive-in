import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Chip,
  Grid,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { GITHUB_ISSUES_URL, GITHUB_URL } from '../constants';
import { buildPromptText } from './build-prompt-text';
import { buildSkillText } from './build-skill-text';
import { copyToClipboard } from './copy-to-clipboard';
import { downloadBlobFile } from './download-file';
import ExportSkillsDialog from './export-skills-dialog';
import { createSkillBundleZip } from './export-skill-bundle';
import { promptCards } from './load-prompt-cards';
import PromptDetailDialog from './prompt-detail-dialog';
import { PromptCardCategory, PromptCardDefinition, SkillBundleFormat } from './types';

const COPY_FEEDBACK_MS = 1800;
const PROMPT_CARD_TITLE_SX = {
  fontSize: { xs: '1.25rem', sm: '1.4rem', lg: '1.55rem' },
  fontWeight: 700,
  lineHeight: 1.15,
  letterSpacing: '-0.01em',
  overflowWrap: 'anywhere',
};
const PROMPTS_AND_SKILLS_DOCS_URL = `${GITHUB_URL}/blob/main/docs/prompts-and-skills.md`;

type PromptsTabProps = {
  hostPlatform?: string;
};

function categoryLabel(category: PromptCardCategory): string {
  if (category === 'build-speed') {
    return 'Build speed';
  }
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function resolveDockerDesktopLinkTip(hostPlatform?: string): string {
  if (hostPlatform === 'darwin') {
    return 'Tip (Docker Desktop): use ⌘ Command-click to open links in your browser.';
  }
  if (hostPlatform === 'win32' || hostPlatform === 'linux') {
    return 'Tip (Docker Desktop): use ⌃ Control-click to open links in your browser.';
  }
  return 'Tip (Docker Desktop): use ⌘/⌃ Command/Control-click to open links in your browser.';
}

export default function PromptsTab(props: PromptsTabProps) {
  const { hostPlatform } = props;
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(undefined);
  const [copyError, setCopyError] = useState<string | undefined>(undefined);
  const [copiedPromptByCardId, setCopiedPromptByCardId] = useState<Record<string, boolean>>({});
  const [copiedSkillByCardId, setCopiedSkillByCardId] = useState<Record<string, boolean>>({});
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const dockerDesktopLinkTip = useMemo(
    () => resolveDockerDesktopLinkTip(hostPlatform),
    [hostPlatform],
  );
  const promptCopyResetTimersRef = useRef<Map<string, number>>(new Map());
  const skillCopyResetTimersRef = useRef<Map<string, number>>(new Map());

  const selectedCard = useMemo(
    () => promptCards.find((card) => card.id === selectedCardId),
    [selectedCardId],
  );

  useEffect(() => {
    return () => {
      promptCopyResetTimersRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      promptCopyResetTimersRef.current.clear();
      skillCopyResetTimersRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      skillCopyResetTimersRef.current.clear();
    };
  }, []);

  const markCardCopied = (
    cardId: string,
    setCopiedState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    timersRef: React.MutableRefObject<Map<string, number>>,
  ) => {
    setCopiedState((previous) => ({
      ...previous,
      [cardId]: true,
    }));

    const existingTimer = timersRef.current.get(cardId);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedState((previous) => {
        const next = { ...previous };
        delete next[cardId];
        return next;
      });
      timersRef.current.delete(cardId);
    }, COPY_FEEDBACK_MS);

    timersRef.current.set(cardId, timeoutId);
  };

  const handleCopyPromptCard = async (
    card: PromptCardDefinition,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    setCopyError(undefined);
    try {
      await copyToClipboard(buildPromptText(card));
      markCardCopied(card.id, setCopiedPromptByCardId, promptCopyResetTimersRef);
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCopySkillCard = async (
    card: PromptCardDefinition,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    setCopyError(undefined);
    try {
      await copyToClipboard(buildSkillText(card).codexSkillMarkdown);
      markCardCopied(card.id, setCopiedSkillByCardId, skillCopyResetTimersRef);
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleExportSkills = async (format: SkillBundleFormat) => {
    const { blob, filename } = await createSkillBundleZip(promptCards, format);
    downloadBlobFile(blob, filename);
  };

  return (
    <>
      <Stack spacing={2}>
        <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
          <Stack spacing={0.5}>
            <Typography variant="body2">
              Skills are reusable instruction playbooks. Copy one from any card, or export all
              skills for batch import.
            </Typography>
            <Typography variant="body2">
              Learn how to use/import skills in{' '}
              <Link href={PROMPTS_AND_SKILLS_DOCS_URL} target="_blank" rel="noopener noreferrer">
                prompts & skills docs
              </Link>
              .
            </Typography>
            <Typography variant="body2">
              Want a new prompt or skill?{' '}
              <Link href={GITHUB_ISSUES_URL} target="_blank" rel="noopener noreferrer">
                Request it on GitHub Issues
              </Link>
              .
            </Typography>
            <Typography variant="body2">{dockerDesktopLinkTip}</Typography>
          </Stack>
        </Alert>
        <Stack
          direction="row"
          spacing={2}
          flexWrap="wrap"
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Stack spacing={0.5}>
            <Typography variant="h3">Dockerfile AI Prompts</Typography>
            <Typography variant="body2" color="text.secondary">
              Copy a prompt or open a card for full details. Have an idea?{' '}
              <Link href={GITHUB_ISSUES_URL} target="_blank" rel="noopener noreferrer">
                Suggest a prompt in GitHub Issues
              </Link>
              .
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={() => setExportDialogOpen(true)}>
            Export all skills
          </Button>
        </Stack>
        {copyError ? <Alert severity="warning">{copyError}</Alert> : null}
        <Grid container spacing={2} alignItems="stretch">
          {promptCards.map((card) => (
            <Grid item xs={12} sm={6} lg={4} key={card.id}>
              <Card
                variant="outlined"
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <CardActionArea
                  onClick={() => setSelectedCardId(card.id)}
                  aria-label={`Open prompt details for ${card.title}`}
                  sx={{ height: '100%', alignItems: 'stretch' }}
                >
                  <CardContent sx={{ height: '100%' }}>
                    <Stack spacing={1}>
                      <Typography component="h4" variant="h4" sx={PROMPT_CARD_TITLE_SX}>
                        {card.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.teaser}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip label={categoryLabel(card.category)} size="small" />
                        {card.tags.map((tag) => (
                          <Chip
                            key={`${card.id}-${tag}`}
                            label={tag}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Use when: {card.useWhen}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Expected impact: {card.expectedImpact}
                      </Typography>
                    </Stack>
                  </CardContent>
                </CardActionArea>
                <CardActions sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stack direction="row" spacing={0.5}>
                    <Button
                      size="small"
                      onClick={(event) => void handleCopyPromptCard(card, event)}
                    >
                      {copiedPromptByCardId[card.id] ? 'Copied prompt' : 'Copy prompt'}
                    </Button>
                    <Button size="small" onClick={(event) => void handleCopySkillCard(card, event)}>
                      {copiedSkillByCardId[card.id] ? 'Copied skill' : 'Copy skill'}
                    </Button>
                  </Stack>
                  <Button size="small" onClick={() => setSelectedCardId(card.id)}>
                    View details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Stack>
      <PromptDetailDialog
        open={Boolean(selectedCard)}
        card={selectedCard}
        onClose={() => setSelectedCardId(undefined)}
      />
      <ExportSkillsDialog
        open={isExportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExportSkills}
      />
    </>
  );
}
