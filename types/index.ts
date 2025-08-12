export interface Chapter {
  start: string;
  end: string;
  title: string;
}

export interface ParsedResult {
  chapters: Chapter[];
  isValid: boolean;
  errors: string[];
}

export interface GeneratedCommands {
  download: string;
  split: string[];
  batch: string;
  explanation: Record<string, string>;
}

export type InputMethod = 'freetext' | 'fields';
export type Step = 0 | 1 | 2;