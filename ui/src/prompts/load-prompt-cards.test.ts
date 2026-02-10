import { describe, expect, it } from 'vitest';
import { loadPromptCardsFromModules } from './load-prompt-cards';

function createPromptCard(overrides?: Partial<Record<string, unknown>>) {
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

describe('loadPromptCardsFromModules', () => {
  it('loads valid prompt cards and sorts by order then title', () => {
    const cards = loadPromptCardsFromModules({
      './data/02.json': {
        default: createPromptCard({ id: 'second', order: 2, title: 'Second' }),
      },
      './data/01.json': {
        default: createPromptCard({ id: 'first', order: 1, title: 'First' }),
      },
      './data/03.json': {
        default: createPromptCard({ id: 'third', order: 2, title: 'Alpha within order two' }),
      },
    });

    expect(cards.map((card) => card.id)).toEqual(['first', 'third', 'second']);
  });

  it('throws a descriptive validation error when a required field is missing', () => {
    expect(() =>
      loadPromptCardsFromModules({
        './data/invalid.json': {
          default: createPromptCard({ title: undefined }),
        },
      }),
    ).toThrowError(/invalid\.json/);
    expect(() =>
      loadPromptCardsFromModules({
        './data/invalid.json': {
          default: createPromptCard({ title: undefined }),
        },
      }),
    ).toThrowError(/title/);
  });

  it('throws when prompt ids are duplicated', () => {
    expect(() =>
      loadPromptCardsFromModules({
        './data/one.json': {
          default: createPromptCard({ id: 'duplicate-id', order: 1 }),
        },
        './data/two.json': {
          default: createPromptCard({ id: 'duplicate-id', order: 2 }),
        },
      }),
    ).toThrowError(/Duplicate prompt id "duplicate-id"/);
  });
});
