import { loadPromptCardsFromModules } from './prompt-card-validation';

const promptCardModules = import.meta.glob('./data/*.json', { eager: true });

export { loadPromptCardsFromModules } from './prompt-card-validation';
export const promptCards = loadPromptCardsFromModules(promptCardModules);
