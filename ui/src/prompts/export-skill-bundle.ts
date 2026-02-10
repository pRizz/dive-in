import { buildSkillText, toSkillSlug } from './build-skill-text';
import {
  GeneratedSkillBundleManifest,
  GeneratedSkillBundleManifestEntry,
  GeneratedSkillFile,
  PromptCardDefinition,
  SkillBundleFormat,
  SkillFormat,
} from './types';

const BUNDLE_ROOT = 'deep-dive-skills';
const BUNDLE_SOURCE = 'Deep Dive Prompts Tab';

function selectedFormatsForBundle(bundleFormat: SkillBundleFormat): SkillFormat[] {
  if (bundleFormat === 'both') {
    return ['codex', 'generic'];
  }
  return [bundleFormat];
}

function buildBundleReadme(bundleFormat: SkillBundleFormat): string {
  return [
    '# Deep Dive Skills Bundle',
    '',
    `Generated from the Deep Dive Prompts tab. Export format: ${bundleFormat}.`,
    '',
    '## What is included',
    '- `manifest.json`: metadata for all generated skills',
    '- `codex/<slug>/SKILL.md`: Codex-compatible skill files',
    '- `generic/<slug>.md`: generic markdown skill files',
    '',
    '## How to use',
    '1. Choose a file from `codex` or `generic`.',
    '2. Paste into your AI workflow or save into your own skill library.',
    '3. For Codex skills, keep the file name as `SKILL.md` in a folder per skill.',
  ].join('\n');
}

function buildManifest(
  promptCards: PromptCardDefinition[],
  bundleFormat: SkillBundleFormat,
  includedFormats: SkillFormat[],
): GeneratedSkillBundleManifest {
  const skills: GeneratedSkillBundleManifestEntry[] = promptCards.map((card) => ({
    id: card.id,
    slug: toSkillSlug(card),
    title: card.title,
    category: card.category,
    tags: card.tags,
    formats: includedFormats,
  }));

  return {
    generatedAt: new Date().toISOString(),
    source: BUNDLE_SOURCE,
    selectedFormat: bundleFormat,
    totalSkills: promptCards.length,
    skills,
  };
}

export function buildSkillBundleFiles(
  promptCards: PromptCardDefinition[],
  bundleFormat: SkillBundleFormat,
): {
  files: GeneratedSkillFile[];
  manifest: GeneratedSkillBundleManifest;
} {
  const selectedFormats = selectedFormatsForBundle(bundleFormat);
  const files: GeneratedSkillFile[] = [];
  const manifest = buildManifest(promptCards, bundleFormat, selectedFormats);

  files.push({
    path: `${BUNDLE_ROOT}/README.md`,
    content: buildBundleReadme(bundleFormat),
  });
  files.push({
    path: `${BUNDLE_ROOT}/manifest.json`,
    content: JSON.stringify(manifest, null, 2),
  });

  promptCards.forEach((card) => {
    const skillSlug = toSkillSlug(card);
    const skillText = buildSkillText(card);

    if (selectedFormats.includes('codex')) {
      files.push({
        path: `${BUNDLE_ROOT}/codex/${skillSlug}/SKILL.md`,
        content: skillText.codexSkillMarkdown,
      });
    }
    if (selectedFormats.includes('generic')) {
      files.push({
        path: `${BUNDLE_ROOT}/generic/${skillSlug}.md`,
        content: skillText.genericSkillMarkdown,
      });
    }
  });

  return { files, manifest };
}

export async function createSkillBundleZip(
  promptCards: PromptCardDefinition[],
  bundleFormat: SkillBundleFormat,
): Promise<{ blob: Blob; filename: string; manifest: GeneratedSkillBundleManifest }> {
  const { files, manifest } = buildSkillBundleFiles(promptCards, bundleFormat);
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  files.forEach((file) => {
    zip.file(file.path, file.content);
  });

  const bytes = await zip.generateAsync({ type: 'uint8array' });
  const blob = new Blob([bytes], { type: 'application/zip' });

  return {
    blob,
    filename: `${BUNDLE_ROOT}-${bundleFormat}.zip`,
    manifest,
  };
}
