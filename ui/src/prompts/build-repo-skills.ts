import { buildCodexSkillMarkdown, toSkillSlug } from './build-skill-text';
import { GeneratedSkillFile, PromptCardDefinition } from './types';

export const GENERATED_REPO_SKILL_PREFIX = 'deep-dive-';
export const REPO_SKILLS_ROOT = '.codex/skills';
export const REPO_SKILLS_INDEX_README_PATH = `${REPO_SKILLS_ROOT}/README.md`;
export const REPO_SKILLS_RAW_BASE_URL =
  'https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills';

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

function buildIndexReadmeContent(promptCards: PromptCardDefinition[]): string {
  const sortedPromptCards = sortPromptCards(promptCards);
  const firstSlug =
    sortedPromptCards.length > 0
      ? toGeneratedRepoSkillDirectoryName(sortedPromptCards[0])
      : 'deep-dive-your-skill-slug';
  const firstRawUrl = `${REPO_SKILLS_RAW_BASE_URL}/${firstSlug}/SKILL.md`;

  const lines = [
    '# Deep Dive Generated Codex Skills',
    '',
    '> Generated file: run `just build-skills` to refresh. Commit changes in this directory when skill sources or generation logic change.',
    '',
    '## Install destinations',
    '- User-global (recommended): `~/.agents/skills/<slug>/SKILL.md`',
    '- Project-local: `<repo>/.codex/skills/<slug>/SKILL.md`',
    '',
    '## Raw URL template',
    `- \`${REPO_SKILLS_RAW_BASE_URL}/<slug>/SKILL.md\``,
    '',
    '## Example install command (user-global)',
    '```bash',
    `mkdir -p ~/.agents/skills/${firstSlug}`,
    `curl -fsSL "${firstRawUrl}" -o ~/.agents/skills/${firstSlug}/SKILL.md`,
    '```',
    '',
    '## Available skills',
    '',
    '| Slug | Repo path | Raw URL |',
    '|---|---|---|',
    ...sortedPromptCards.map((card) => {
      const slug = toGeneratedRepoSkillDirectoryName(card);
      const repoPath = `${REPO_SKILLS_ROOT}/${slug}/SKILL.md`;
      const rawUrl = `${REPO_SKILLS_RAW_BASE_URL}/${slug}/SKILL.md`;
      return `| \`${slug}\` | \`${repoPath}\` | \`${rawUrl}\` |`;
    }),
  ];

  return ensureTrailingNewline(lines.join('\n'));
}

export function buildGeneratedRepoSkillsIndexReadmeFile(
  promptCards: PromptCardDefinition[],
): GeneratedSkillFile {
  return {
    path: REPO_SKILLS_INDEX_README_PATH,
    content: buildIndexReadmeContent(promptCards),
  };
}
