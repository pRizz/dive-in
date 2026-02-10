export type PromptCardCategory = 'caching' | 'size' | 'build-speed' | 'security';

export interface PromptTemplateDefinition {
  role: string;
  objective: string;
  requiredInputs: string[];
  tasks: string[];
  constraints: string[];
  outputFormat: string[];
}

export interface PromptCardDefinition {
  id: string;
  order: number;
  title: string;
  teaser: string;
  category: PromptCardCategory;
  tags: string[];
  useWhen: string;
  expectedImpact: string;
  prompt: PromptTemplateDefinition;
}
