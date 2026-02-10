import { PromptCardCategory, PromptCardDefinition, PromptTemplateDefinition } from './types';

const VALID_CATEGORIES: PromptCardCategory[] = ['caching', 'size', 'build-speed', 'security'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertString(
  value: unknown,
  fieldPath: string,
  sourcePath: string,
  options?: { allowEmpty?: boolean },
): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid prompt card in ${sourcePath}: "${fieldPath}" must be a string.`);
  }
  const trimmed = value.trim();
  if (options?.allowEmpty) {
    return value;
  }
  if (!trimmed) {
    throw new Error(`Invalid prompt card in ${sourcePath}: "${fieldPath}" must not be empty.`);
  }
  return value;
}

function assertNumber(value: unknown, fieldPath: string, sourcePath: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid prompt card in ${sourcePath}: "${fieldPath}" must be a number.`);
  }
  return value;
}

function assertStringArray(value: unknown, fieldPath: string, sourcePath: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid prompt card in ${sourcePath}: "${fieldPath}" must be an array.`);
  }
  if (value.length === 0) {
    throw new Error(`Invalid prompt card in ${sourcePath}: "${fieldPath}" must not be empty.`);
  }
  return value.map((item, index) =>
    assertString(item, `${fieldPath}[${index}]`, sourcePath, { allowEmpty: false }),
  );
}

function assertCategory(value: unknown, sourcePath: string): PromptCardCategory {
  const category = assertString(value, 'category', sourcePath);
  if (!VALID_CATEGORIES.includes(category as PromptCardCategory)) {
    throw new Error(
      `Invalid prompt card in ${sourcePath}: "category" must be one of ${VALID_CATEGORIES.join(
        ', ',
      )}.`,
    );
  }
  return category as PromptCardCategory;
}

function parsePromptTemplate(raw: unknown, sourcePath: string): PromptTemplateDefinition {
  if (!isRecord(raw)) {
    throw new Error(`Invalid prompt card in ${sourcePath}: "prompt" must be an object.`);
  }

  return {
    role: assertString(raw.role, 'prompt.role', sourcePath),
    objective: assertString(raw.objective, 'prompt.objective', sourcePath),
    requiredInputs: assertStringArray(raw.requiredInputs, 'prompt.requiredInputs', sourcePath),
    tasks: assertStringArray(raw.tasks, 'prompt.tasks', sourcePath),
    constraints: assertStringArray(raw.constraints, 'prompt.constraints', sourcePath),
    outputFormat: assertStringArray(raw.outputFormat, 'prompt.outputFormat', sourcePath),
  };
}

function extractModuleValue(moduleValue: unknown): unknown {
  if (isRecord(moduleValue) && 'default' in moduleValue) {
    return moduleValue.default;
  }
  return moduleValue;
}

export function validatePromptCard(raw: unknown, sourcePath: string): PromptCardDefinition {
  if (!isRecord(raw)) {
    throw new Error(`Invalid prompt card in ${sourcePath}: root value must be an object.`);
  }

  return {
    id: assertString(raw.id, 'id', sourcePath),
    order: assertNumber(raw.order, 'order', sourcePath),
    title: assertString(raw.title, 'title', sourcePath),
    teaser: assertString(raw.teaser, 'teaser', sourcePath),
    category: assertCategory(raw.category, sourcePath),
    tags: assertStringArray(raw.tags, 'tags', sourcePath),
    useWhen: assertString(raw.useWhen, 'useWhen', sourcePath),
    expectedImpact: assertString(raw.expectedImpact, 'expectedImpact', sourcePath),
    prompt: parsePromptTemplate(raw.prompt, sourcePath),
  };
}

export function loadPromptCardsFromModules(
  modules: Record<string, unknown>,
): PromptCardDefinition[] {
  const cardsWithSources = Object.entries(modules).map(([sourcePath, moduleValue]) => ({
    sourcePath,
    card: validatePromptCard(extractModuleValue(moduleValue), sourcePath),
  }));

  const idToSource = new Map<string, string>();
  cardsWithSources.forEach(({ sourcePath, card }) => {
    const previousSource = idToSource.get(card.id);
    if (previousSource) {
      throw new Error(
        `Duplicate prompt id "${card.id}" found in ${previousSource} and ${sourcePath}.`,
      );
    }
    idToSource.set(card.id, sourcePath);
  });

  return cardsWithSources
    .map((entry) => entry.card)
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));
}

const promptCardModules = import.meta.glob('./data/*.json', { eager: true });

export const promptCards = loadPromptCardsFromModules(promptCardModules);
