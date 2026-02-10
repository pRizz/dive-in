import { describe, expect, it } from 'vitest';
import { buildSkillText } from './build-skill-text';
import { promptCards } from './load-prompt-cards';

describe('buildSkillText', () => {
  it('generates codex skill markdown with required sections', () => {
    const card = promptCards[0];
    const output = buildSkillText(card);

    expect(output.codexSkillMarkdown).toContain(`# ${card.title}`);
    expect(output.codexSkillMarkdown).toContain('## Purpose');
    expect(output.codexSkillMarkdown).toContain('## When to use');
    expect(output.codexSkillMarkdown).toContain('## Required inputs');
    expect(output.codexSkillMarkdown).toContain('## Steps');
    expect(output.codexSkillMarkdown).toContain('## Constraints');
    expect(output.codexSkillMarkdown).toContain('## Expected output');
    expect(output.codexSkillMarkdown).toContain(card.useWhen);
  });

  it('generates generic skill markdown with required sections', () => {
    const card = promptCards[1];
    const output = buildSkillText(card);

    expect(output.genericSkillMarkdown).toContain(`# ${card.title}`);
    expect(output.genericSkillMarkdown).toContain('## Context');
    expect(output.genericSkillMarkdown).toContain('## Objective');
    expect(output.genericSkillMarkdown).toContain('## Inputs');
    expect(output.genericSkillMarkdown).toContain('## Instructions');
    expect(output.genericSkillMarkdown).toContain('## Constraints');
    expect(output.genericSkillMarkdown).toContain('## Response format');
    expect(output.genericSkillMarkdown).toContain(card.prompt.objective);
  });
});
