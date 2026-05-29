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
  const includeCodex = bundleFormat === 'codex' || bundleFormat === 'both';
  const includeGeneric = bundleFormat === 'generic' || bundleFormat === 'both';

  const lines = [
    '# Deep Dive Skills Bundle',
    '',
    `Generated from the Deep Dive Prompts tab. Export format: ${bundleFormat}.`,
    '',
    '## What is included',
    '- `manifest.json`: metadata for all generated skills',
  ];

  if (includeCodex) {
    lines.push('- `codex/<slug>/SKILL.md`: Codex-compatible skill files');
  }
  if (includeGeneric) {
    lines.push('- `generic/<slug>.md`: generic markdown skill files');
  }

  lines.push('');

  if (includeCodex) {
    lines.push(
      '## Import into Codex',
      '1. Unzip this bundle.',
      '2. Copy folders from `deep-dive-skills/codex/<slug>/SKILL.md` into either `~/.agents/skills/<slug>/SKILL.md` (user-global, recommended) or `<repo>/.codex/skills/<slug>/SKILL.md` (project-local), preserving `<slug>/SKILL.md`.',
      '3. Restart Codex.',
      '',
    );
  }

  if (includeGeneric) {
    lines.push(
      '## Use in Other AI Apps/CLIs',
      '1. Use files from `deep-dive-skills/generic/*.md`.',
      '2. Paste into the system/developer/custom-instructions area of your target AI app or CLI.',
      '3. Optionally keep these files as reusable prompt library snippets.',
      '',
    );
  }

  lines.push(
    '## Troubleshooting',
    '- If a skill does not appear in Codex, confirm it is in `~/.agents/skills/<skill-slug>/SKILL.md` or `<repo>/.codex/skills/<skill-slug>/SKILL.md`, then restart Codex.',
    '- If you exported only one format, re-export as `Both` to get both Codex and Generic files.',
  );

  return lines.join('\n');
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
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([buffer], { type: 'application/zip' });

  return {
    blob,
    filename: `${BUNDLE_ROOT}-${bundleFormat}.zip`,
    manifest,
  };
}
