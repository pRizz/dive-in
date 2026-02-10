import { describe, expect, it } from 'vitest';
import { buildSkillBundleFiles, createSkillBundleZip } from './export-skill-bundle';
import { promptCards } from './load-prompt-cards';

describe('buildSkillBundleFiles', () => {
  const cards = promptCards.slice(0, 2);

  it('builds codex-only files', () => {
    const { files } = buildSkillBundleFiles(cards, 'codex');
    const paths = files.map((file) => file.path);

    expect(paths).toContain('deep-dive-skills/README.md');
    expect(paths).toContain('deep-dive-skills/manifest.json');
    expect(paths.some((path) => path.includes('/codex/'))).toBe(true);
    expect(paths.some((path) => path.includes('/generic/'))).toBe(false);
  });

  it('builds generic-only files', () => {
    const { files } = buildSkillBundleFiles(cards, 'generic');
    const paths = files.map((file) => file.path);

    expect(paths.some((path) => path.includes('/generic/'))).toBe(true);
    expect(paths.some((path) => path.includes('/codex/'))).toBe(false);
  });

  it('builds both codex and generic files', () => {
    const { files, manifest } = buildSkillBundleFiles(cards, 'both');
    const paths = files.map((file) => file.path);

    expect(paths.some((path) => path.includes('/generic/'))).toBe(true);
    expect(paths.some((path) => path.includes('/codex/'))).toBe(true);
    expect(manifest.totalSkills).toBe(cards.length);
  });

  it('produces a zip with expected files', async () => {
    const { blob, filename } = await createSkillBundleZip(cards, 'both');

    expect(filename).toBe('deep-dive-skills-both.zip');
    expect(blob.type).toBe('application/zip');

    const { default: JSZip } = await import('jszip');
    const parsed = await JSZip.loadAsync(blob as Blob);

    expect(parsed.file('deep-dive-skills/README.md')).toBeTruthy();
    expect(parsed.file('deep-dive-skills/manifest.json')).toBeTruthy();
    expect(
      Object.keys(parsed.files).some((path) => path.startsWith('deep-dive-skills/codex/')),
    ).toBe(true);
    expect(
      Object.keys(parsed.files).some((path) => path.startsWith('deep-dive-skills/generic/')),
    ).toBe(true);
  });
});
