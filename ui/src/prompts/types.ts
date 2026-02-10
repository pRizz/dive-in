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

export type SkillFormat = 'codex' | 'generic';
export type SkillBundleFormat = SkillFormat | 'both';

export interface GeneratedSkillText {
  codexSkillMarkdown: string;
  genericSkillMarkdown: string;
}

export interface GeneratedSkillFile {
  path: string;
  content: string;
}

export interface GeneratedSkillBundleManifestEntry {
  id: string;
  slug: string;
  title: string;
  category: PromptCardCategory;
  tags: string[];
  formats: SkillFormat[];
}

export interface GeneratedSkillBundleManifest {
  generatedAt: string;
  source: string;
  selectedFormat: SkillBundleFormat;
  totalSkills: number;
  skills: GeneratedSkillBundleManifestEntry[];
}
