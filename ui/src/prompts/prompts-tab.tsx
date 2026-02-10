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
  Stack,
  Typography,
} from '@mui/material';
import { buildPromptText } from './build-prompt-text';
import { copyToClipboard } from './copy-to-clipboard';
import { promptCards } from './load-prompt-cards';
import PromptDetailDialog from './prompt-detail-dialog';
import { PromptCardCategory, PromptCardDefinition } from './types';

const COPY_FEEDBACK_MS = 1800;
const PROMPT_CARD_TITLE_SX = {
  fontSize: { xs: '1.25rem', sm: '1.4rem', lg: '1.55rem' },
  fontWeight: 700,
  lineHeight: 1.15,
  letterSpacing: '-0.01em',
  overflowWrap: 'anywhere',
};

function categoryLabel(category: PromptCardCategory): string {
  if (category === 'build-speed') {
    return 'Build speed';
  }
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export default function PromptsTab() {
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(undefined);
  const [copyError, setCopyError] = useState<string | undefined>(undefined);
  const [copiedByCardId, setCopiedByCardId] = useState<Record<string, boolean>>({});
  const copyResetTimersRef = useRef<Map<string, number>>(new Map());

  const selectedCard = useMemo(
    () => promptCards.find((card) => card.id === selectedCardId),
    [selectedCardId],
  );

  useEffect(() => {
    return () => {
      copyResetTimersRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      copyResetTimersRef.current.clear();
    };
  }, []);

  const markCardCopied = (cardId: string) => {
    setCopiedByCardId((previous) => ({
      ...previous,
      [cardId]: true,
    }));

    const existingTimer = copyResetTimersRef.current.get(cardId);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedByCardId((previous) => {
        const next = { ...previous };
        delete next[cardId];
        return next;
      });
      copyResetTimersRef.current.delete(cardId);
    }, COPY_FEEDBACK_MS);

    copyResetTimersRef.current.set(cardId, timeoutId);
  };

  const handleCopyCard = async (
    card: PromptCardDefinition,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    setCopyError(undefined);
    try {
      await copyToClipboard(buildPromptText(card));
      markCardCopied(card.id);
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h3">Dockerfile AI Prompts</Typography>
          <Typography variant="body2" color="text.secondary">
            Copy a prompt or open a card for full details.
          </Typography>
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
                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Button size="small" onClick={(event) => void handleCopyCard(card, event)}>
                    {copiedByCardId[card.id] ? 'Copied' : 'Copy'}
                  </Button>
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
    </>
  );
}
