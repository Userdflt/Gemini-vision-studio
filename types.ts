export const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];

export enum GenerationMode {
  PromptAndImage = 'promptAndImage',
  PromptOnly = 'promptOnly',
  ImageOnly = 'imageOnly',
}

export interface GeneratedContent {
  checklist: string[];
  finalPrompt: string;
  assumptions: string[];
  questions: string[];
}

export type AgentContext = 'default' | 'inpainting' | 'floorplan' | 'relatedScene' | 'background';