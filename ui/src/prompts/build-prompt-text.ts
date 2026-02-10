import { PromptCardDefinition } from './types';

function toNumberedList(items: string[]): string[] {
  return items.map((item, index) => `${index + 1}. ${item}`);
}

export function buildPromptText(promptCard: PromptCardDefinition): string {
  return [
    `Prompt Title: ${promptCard.title}`,
    '',
    'Role:',
    promptCard.prompt.role,
    '',
    'Objective:',
    promptCard.prompt.objective,
    '',
    'Required Inputs:',
    ...toNumberedList(promptCard.prompt.requiredInputs),
    '',
    'Tasks:',
    ...toNumberedList(promptCard.prompt.tasks),
    '',
    'Constraints:',
    ...toNumberedList(promptCard.prompt.constraints),
    '',
    'Output Format:',
    ...toNumberedList(promptCard.prompt.outputFormat),
  ].join('\n');
}
