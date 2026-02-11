import { describe, expect, it } from 'vitest';
import {
  buildGeneratedRepoSkillFiles,
  buildGeneratedRepoSkillsIndexReadmeFile,
  buildGeneratedRepoSkillsInstallScriptFile,
  CODEX_SKILLS_CREATE_URL,
  CODEX_SKILLS_INSTALL_URL,
  CODEX_SKILLS_OVERVIEW_URL,
  GENERATED_REPO_SKILL_PREFIX,
  REPO_SKILLS_INDEX_README_PATH,
  REPO_SKILLS_INSTALL_SCRIPT_PATH,
  REPO_SKILLS_INSTALL_SCRIPT_URL,
  REPO_SKILLS_RAW_BASE_URL,
  REPO_SKILLS_ROOT,
  toGeneratedRepoSkillDirectoryName,
} from './build-repo-skills';
import { PromptCardDefinition } from './types';

function createPromptCard(overrides?: Partial<PromptCardDefinition>): PromptCardDefinition {
  return {
    id: 'sample-id',
    order: 1,
    title: 'Sample title',
    teaser: 'Sample teaser',
    category: 'size',
    tags: ['one'],
    useWhen: 'Use this when builds are slow.',
    expectedImpact: 'Lower image size.',
    prompt: {
      role: 'Role',
      objective: 'Objective',
      requiredInputs: ['Input'],
      tasks: ['Task'],
      constraints: ['Constraint'],
      outputFormat: ['Output'],
    },
    ...(overrides ?? {}),
  };
}

describe('buildGeneratedRepoSkillFiles', () => {
  it('builds deterministic paths and ordering', () => {
    const files = buildGeneratedRepoSkillFiles([
      createPromptCard({ id: 'second', order: 2, title: 'Zulu card' }),
      createPromptCard({ id: 'first', order: 1, title: 'Alpha card' }),
      createPromptCard({ id: 'third', order: 2, title: 'Beta card' }),
    ]);

    expect(files.map((file) => file.path)).toEqual([
      `${REPO_SKILLS_ROOT}/deep-dive-first/SKILL.md`,
      `${REPO_SKILLS_ROOT}/deep-dive-third/SKILL.md`,
      `${REPO_SKILLS_ROOT}/deep-dive-second/SKILL.md`,
    ]);
  });

  it('generates codex markdown with frontmatter and trailing newline', () => {
    const [file] = buildGeneratedRepoSkillFiles([
      createPromptCard({
        id: 'optimize-layer-caching',
        title: 'Optimize Dockerfile Layer Caching',
        teaser: 'Teaser for caching',
      }),
    ]);

    expect(file.path).toBe(`${REPO_SKILLS_ROOT}/deep-dive-optimize-layer-caching/SKILL.md`);
    expect(file.content.startsWith('---\nname: optimize-layer-caching')).toBe(true);
    expect(file.content).toContain('description: "Teaser for caching"');
    expect(file.content).toContain('## Use this when');
    expect(file.content.endsWith('\n')).toBe(true);
  });
});

describe('toGeneratedRepoSkillDirectoryName', () => {
  it('prefixes generated skill directories to avoid collisions', () => {
    const directoryName = toGeneratedRepoSkillDirectoryName(
      createPromptCard({ id: 'harden-runtime-image' }),
    );

    expect(directoryName).toBe(`${GENERATED_REPO_SKILL_PREFIX}harden-runtime-image`);
  });
});

describe('buildGeneratedRepoSkillsIndexReadmeFile', () => {
  it('builds a deterministic README with install guidance and raw URLs', () => {
    const readmeFile = buildGeneratedRepoSkillsIndexReadmeFile([
      createPromptCard({
        id: 'zeta-skill',
        order: 2,
        title: 'Zeta Skill',
      }),
      createPromptCard({
        id: 'alpha-skill',
        order: 1,
        title: 'Alpha Skill',
      }),
    ]);

    expect(readmeFile.path).toBe(REPO_SKILLS_INDEX_README_PATH);
    expect(readmeFile.content).toContain('Generated file: run `just build-skills`');
    expect(readmeFile.content).toContain('One-command global install');
    expect(readmeFile.content).toContain(`curl -fsSL "${REPO_SKILLS_INSTALL_SCRIPT_URL}" | bash`);
    expect(readmeFile.content).toContain('## Use in Codex');
    expect(readmeFile.content).toContain('In Codex, type `/`.');
    expect(readmeFile.content).toContain('`deep-dive-*` skill');
    expect(readmeFile.content).toContain(CODEX_SKILLS_OVERVIEW_URL);
    expect(readmeFile.content).toContain(CODEX_SKILLS_CREATE_URL);
    expect(readmeFile.content).toContain(CODEX_SKILLS_INSTALL_URL);
    expect(readmeFile.content).toContain('`~/.codex/skills/<slug>/SKILL.md`');
    expect(readmeFile.content).toContain('`<repo>/.codex/skills/<slug>/SKILL.md`');
    expect(readmeFile.content).toContain(
      `${REPO_SKILLS_RAW_BASE_URL}/deep-dive-alpha-skill/SKILL.md`,
    );
    expect(readmeFile.content).toContain('| `deep-dive-alpha-skill` |');
    expect(readmeFile.content).toContain('| `deep-dive-zeta-skill` |');
    expect(readmeFile.content.endsWith('\n')).toBe(true);
    expect(readmeFile.content.indexOf('deep-dive-alpha-skill')).toBeLessThan(
      readmeFile.content.indexOf('deep-dive-zeta-skill'),
    );
  });
});

describe('buildGeneratedRepoSkillsInstallScriptFile', () => {
  it('builds installer script with strict mode, global default, and deterministic skill list', () => {
    const installScriptFile = buildGeneratedRepoSkillsInstallScriptFile([
      createPromptCard({ id: 'zeta-skill', order: 2, title: 'Zeta Skill' }),
      createPromptCard({ id: 'alpha-skill', order: 1, title: 'Alpha Skill' }),
    ]);

    expect(installScriptFile.path).toBe(REPO_SKILLS_INSTALL_SCRIPT_PATH);
    expect(installScriptFile.content.startsWith('#!/usr/bin/env bash\nset -Eeuo pipefail')).toBe(
      true,
    );
    expect(installScriptFile.content).toContain('DEFAULT_INSTALL_ROOT="${HOME}/.codex/skills"');
    expect(installScriptFile.content).toContain(REPO_SKILLS_INSTALL_SCRIPT_URL);
    expect(installScriptFile.content).toContain(
      `${REPO_SKILLS_RAW_BASE_URL}/deep-dive-alpha-skill/SKILL.md`,
    );
    expect(installScriptFile.content).toContain(
      `${REPO_SKILLS_RAW_BASE_URL}/deep-dive-zeta-skill/SKILL.md`,
    );
    expect(installScriptFile.content).toContain('Install summary: installed=');
    expect(installScriptFile.content).toContain('Restart Codex to pick up new skills.');
    expect(installScriptFile.content.endsWith('\n')).toBe(true);
    expect(installScriptFile.content.indexOf('deep-dive-alpha-skill')).toBeLessThan(
      installScriptFile.content.indexOf('deep-dive-zeta-skill'),
    );
  });
});
