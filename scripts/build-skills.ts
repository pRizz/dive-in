import { readdir, readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildGeneratedRepoSkillFiles,
  buildGeneratedRepoSkillsIndexReadmeFile,
  GENERATED_REPO_SKILL_PREFIX,
  REPO_SKILLS_ROOT,
  toGeneratedRepoSkillDirectoryName,
} from '../ui/src/prompts/build-repo-skills';
import { loadPromptCardsFromEntries } from '../ui/src/prompts/prompt-card-validation';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const PROMPT_DATA_DIR = path.join(REPO_ROOT, 'ui/src/prompts/data');
const REPO_SKILLS_DIR = path.join(REPO_ROOT, REPO_SKILLS_ROOT);

interface PromptCardEntry {
  sourcePath: string;
  rawValue: unknown;
}

function toForwardSlashPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

async function loadPromptCardEntries(): Promise<PromptCardEntry[]> {
  const dirEntries = await readdir(PROMPT_DATA_DIR, { withFileTypes: true });
  const fileNames = dirEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const promptEntries: PromptCardEntry[] = [];
  for (const fileName of fileNames) {
    const absolutePath = path.join(PROMPT_DATA_DIR, fileName);
    const sourcePath = toForwardSlashPath(path.relative(REPO_ROOT, absolutePath));
    const rawJson = await readFile(absolutePath, 'utf8');

    try {
      promptEntries.push({
        sourcePath,
        rawValue: JSON.parse(rawJson) as unknown,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid JSON in ${sourcePath}: ${message}`);
    }
  }

  return promptEntries;
}

async function cleanupStaleGeneratedSkillDirectories(expectedDirectoryNames: Set<string>) {
  const dirEntries = await readdir(REPO_SKILLS_DIR, { withFileTypes: true });
  const removedDirectories: string[] = [];

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (!entry.name.startsWith(GENERATED_REPO_SKILL_PREFIX)) {
      continue;
    }
    if (expectedDirectoryNames.has(entry.name)) {
      continue;
    }

    await rm(path.join(REPO_SKILLS_DIR, entry.name), { recursive: true, force: true });
    removedDirectories.push(entry.name);
  }

  return removedDirectories.sort((left, right) => left.localeCompare(right));
}

async function writeGeneratedSkillFiles(files: { path: string; content: string }[]) {
  for (const file of files) {
    const absolutePath = path.join(REPO_ROOT, file.path);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.content, 'utf8');
  }
}

async function main() {
  const promptEntries = await loadPromptCardEntries();
  const promptCards = loadPromptCardsFromEntries(promptEntries);
  const generatedSkillFiles = buildGeneratedRepoSkillFiles(promptCards);
  const generatedIndexReadmeFile = buildGeneratedRepoSkillsIndexReadmeFile(promptCards);
  const generatedFiles = [...generatedSkillFiles, generatedIndexReadmeFile];

  await mkdir(REPO_SKILLS_DIR, { recursive: true });

  const expectedDirectories = new Set(
    promptCards.map((promptCard) => toGeneratedRepoSkillDirectoryName(promptCard)),
  );
  const removedDirectories = await cleanupStaleGeneratedSkillDirectories(expectedDirectories);

  await writeGeneratedSkillFiles(generatedFiles);

  console.log(
    `Generated ${generatedSkillFiles.length} Codex skill files and README index in ${toForwardSlashPath(
      REPO_SKILLS_ROOT,
    )}.`,
  );
  if (removedDirectories.length > 0) {
    console.log(`Removed stale generated skill directories: ${removedDirectories.join(', ')}.`);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
