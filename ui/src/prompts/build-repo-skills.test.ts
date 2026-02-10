import { describe, expect, it } from 'vitest';
import {
  buildGeneratedRepoSkillFiles,
  buildGeneratedRepoSkillsIndexReadmeFile,
  GENERATED_REPO_SKILL_PREFIX,
  REPO_SKILLS_INDEX_README_PATH,
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
    expect(readmeFile.content).toContain('`~/.agents/skills/<slug>/SKILL.md`');
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
