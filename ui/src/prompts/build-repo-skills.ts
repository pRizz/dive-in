import { buildCodexSkillMarkdown, toSkillSlug } from './build-skill-text';
import { GeneratedSkillFile, PromptCardDefinition } from './types';

export const GENERATED_REPO_SKILL_PREFIX = 'deep-dive-';
export const REPO_SKILLS_ROOT = '.codex/skills';

function ensureTrailingNewline(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return normalized.endsWith('\n') ? normalized : `${normalized}\n`;
}

function sortPromptCards(promptCards: PromptCardDefinition[]): PromptCardDefinition[] {
  return [...promptCards].sort(
    (left, right) => left.order - right.order || left.title.localeCompare(right.title),
  );
}

export function toGeneratedRepoSkillDirectoryName(promptCard: PromptCardDefinition): string {
  return `${GENERATED_REPO_SKILL_PREFIX}${toSkillSlug(promptCard)}`;
}

export function buildGeneratedRepoSkillFiles(
  promptCards: PromptCardDefinition[],
): GeneratedSkillFile[] {
  return sortPromptCards(promptCards).map((card) => ({
    path: `${REPO_SKILLS_ROOT}/${toGeneratedRepoSkillDirectoryName(card)}/SKILL.md`,
    content: ensureTrailingNewline(buildCodexSkillMarkdown(card)),
  }));
}
