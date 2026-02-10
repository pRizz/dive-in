import { describe, expect, it } from 'vitest';
import {
  buildGeneratedRepoSkillFiles,
  GENERATED_REPO_SKILL_PREFIX,
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
