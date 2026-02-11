import { buildCodexSkillMarkdown, toSkillSlug } from './build-skill-text';
import { GeneratedSkillFile, PromptCardDefinition } from './types';

export const GENERATED_REPO_SKILL_PREFIX = 'deep-dive-';
export const REPO_SKILLS_ROOT = '.codex/skills';
export const REPO_SKILLS_INDEX_README_PATH = `${REPO_SKILLS_ROOT}/README.md`;
export const REPO_SKILLS_INSTALL_SCRIPT_PATH = `${REPO_SKILLS_ROOT}/install-all.sh`;
export const REPO_SKILLS_RAW_BASE_URL =
  'https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills';
export const REPO_SKILLS_INSTALL_SCRIPT_URL = `${REPO_SKILLS_RAW_BASE_URL}/install-all.sh`;
export const CODEX_SKILLS_OVERVIEW_URL = 'https://developers.openai.com/codex/skills';
export const CODEX_SKILLS_CREATE_URL = 'https://developers.openai.com/codex/skills#create-a-skill';
export const CODEX_SKILLS_INSTALL_URL = 'https://developers.openai.com/codex/skills#install-skills';

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
    '## One-command global install',
    '```bash',
    `curl -fsSL "${REPO_SKILLS_INSTALL_SCRIPT_URL}" | bash`,
    '```',
    'Review before running if desired:',
    '```bash',
    `curl -fsSL "${REPO_SKILLS_INSTALL_SCRIPT_URL}" -o /tmp/deep-dive-skills-install-all.sh`,
    'bash /tmp/deep-dive-skills-install-all.sh',
    '```',
    '',
    '## Use in Codex',
    '1. In Codex, type `/`.',
    '2. Select the relevant installed `deep-dive-*` skill from the picker.',
    '3. Submit your request.',
    '',
    '## Official Codex Skills docs',
    `- Overview: \`${CODEX_SKILLS_OVERVIEW_URL}\``,
    `- Create a skill: \`${CODEX_SKILLS_CREATE_URL}\``,
    `- Install skills: \`${CODEX_SKILLS_INSTALL_URL}\``,
    '',
    '## Install destinations',
    '- User-global (default installer target): `~/.codex/skills/<slug>/SKILL.md`',
    '- Project-local: `<repo>/.codex/skills/<slug>/SKILL.md`',
    '- Override installer target with `DEEP_DIVE_SKILLS_INSTALL_ROOT=/custom/path`',
    '',
    '## Raw URL template',
    `- \`${REPO_SKILLS_RAW_BASE_URL}/<slug>/SKILL.md\``,
    '',
    '## Example manual install command (user-global)',
    '```bash',
    `mkdir -p ~/.codex/skills/${firstSlug}`,
    `curl -fsSL "${firstRawUrl}" -o ~/.codex/skills/${firstSlug}/SKILL.md`,
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

function buildInstallScriptContent(promptCards: PromptCardDefinition[]): string {
  const skillEntries = sortPromptCards(promptCards).map((card) => {
    const slug = toGeneratedRepoSkillDirectoryName(card);
    const rawUrl = `${REPO_SKILLS_RAW_BASE_URL}/${slug}/SKILL.md`;
    return `${slug}|${rawUrl}`;
  });

  const lines = [
    '#!/usr/bin/env bash',
    'set -Eeuo pipefail',
    '',
    `SCRIPT_SOURCE_URL="${REPO_SKILLS_INSTALL_SCRIPT_URL}"`,
    `SKILL_RAW_BASE_URL="${REPO_SKILLS_RAW_BASE_URL}"`,
    'DEFAULT_INSTALL_ROOT="${HOME}/.codex/skills"',
    'INSTALL_ROOT="${DEEP_DIVE_SKILLS_INSTALL_ROOT:-${DEFAULT_INSTALL_ROOT}}"',
    '',
    'log_info() { printf "[deep-dive][info] %s\\n" "$*"; }',
    'log_warn() { printf "[deep-dive][warn] %s\\n" "$*" >&2; }',
    'log_error() { printf "[deep-dive][error] %s\\n" "$*" >&2; }',
    'die() { log_error "$*"; exit 1; }',
    '',
    'require_cmd() {',
    '  local cmd="$1"',
    '  command -v "${cmd}" >/dev/null 2>&1 || die "Missing required command: ${cmd}. Install it and re-run this installer."',
    '}',
    '',
    'require_cmd curl',
    'require_cmd mktemp',
    'require_cmd cmp',
    'require_cmd mkdir',
    'require_cmd mv',
    'require_cmd rm',
    '',
    '[[ -n "${HOME:-}" ]] || die "HOME is not set. Set HOME or provide DEEP_DIVE_SKILLS_INSTALL_ROOT and re-run."',
    'mkdir -p "${INSTALL_ROOT}" || die "Failed to create install root: ${INSTALL_ROOT}. Check permissions or choose another path via DEEP_DIVE_SKILLS_INSTALL_ROOT."',
    '',
    'TMP_BASE="${TMPDIR:-/tmp}"',
    'TEMP_DIR="$(mktemp -d "${TMP_BASE%/}/deep-dive-skills.XXXXXX")" || die "Failed to create temporary directory under ${TMP_BASE}."',
    'cleanup() { rm -rf "${TEMP_DIR}"; }',
    'trap cleanup EXIT',
    '',
    'SKILLS=(',
    ...skillEntries.map((entry) => `  "${entry}"`),
    ')',
    '',
    'installed_count=0',
    'updated_count=0',
    'unchanged_count=0',
    'failed_count=0',
    '',
    'log_info "Starting Deep Dive global skill install."',
    'log_info "Installer source: ${SCRIPT_SOURCE_URL}"',
    'log_info "Skill raw base URL: ${SKILL_RAW_BASE_URL}"',
    'log_info "Install root: ${INSTALL_ROOT}"',
    'log_info "Temporary directory: ${TEMP_DIR}"',
    'log_info "Skill count: ${#SKILLS[@]}"',
    '',
    'for skill_entry in "${SKILLS[@]}"; do',
    '  skill_slug="${skill_entry%%|*}"',
    '  source_url="${skill_entry#*|}"',
    '  target_dir="${INSTALL_ROOT}/${skill_slug}"',
    '  target_file="${target_dir}/SKILL.md"',
    '  temp_file="${TEMP_DIR}/${skill_slug}.md"',
    '  had_existing=0',
    '  [[ -f "${target_file}" ]] && had_existing=1',
    '',
    '  log_info "Processing ${skill_slug}"',
    '  log_info "  source: ${source_url}"',
    '  log_info "  target: ${target_file}"',
    '',
    '  if ! curl -fsSL "${source_url}" -o "${temp_file}"; then',
    '    log_error "  result: failed to download. Check network access and verify the URL is reachable."',
    '    failed_count=$((failed_count + 1))',
    '    continue',
    '  fi',
    '',
    '  if (( had_existing == 1 )) && cmp -s "${target_file}" "${temp_file}"; then',
    '    log_info "  result: unchanged (already up to date)"',
    '    unchanged_count=$((unchanged_count + 1))',
    '    continue',
    '  fi',
    '',
    '  if ! mkdir -p "${target_dir}"; then',
    '    log_error "  result: failed to create target directory. Check permissions or set DEEP_DIVE_SKILLS_INSTALL_ROOT."',
    '    failed_count=$((failed_count + 1))',
    '    continue',
    '  fi',
    '',
    '  if ! mv "${temp_file}" "${target_file}"; then',
    '    log_error "  result: failed to write target file. Check disk space and permissions, then re-run."',
    '    failed_count=$((failed_count + 1))',
    '    continue',
    '  fi',
    '',
    '  if (( had_existing == 1 )); then',
    '    log_info "  result: updated"',
    '    updated_count=$((updated_count + 1))',
    '  else',
    '    log_info "  result: installed"',
    '    installed_count=$((installed_count + 1))',
    '  fi',
    'done',
    '',
    'log_info "Install summary: installed=${installed_count}, updated=${updated_count}, unchanged=${unchanged_count}, failed=${failed_count}"',
    'if (( failed_count > 0 )); then',
    '  die "Completed with failures. Resolve the errors above and re-run the installer."',
    'fi',
    '',
    'log_info "All Deep Dive skills are installed in ${INSTALL_ROOT}."',
    'log_warn "Restart Codex to pick up new skills."',
  ];

  return ensureTrailingNewline(lines.join('\n'));
}

export function buildGeneratedRepoSkillsInstallScriptFile(
  promptCards: PromptCardDefinition[],
): GeneratedSkillFile {
  return {
    path: REPO_SKILLS_INSTALL_SCRIPT_PATH,
    content: buildInstallScriptContent(promptCards),
  };
}
