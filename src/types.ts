export type EnhancementType = 'image-upscale' | 'face-restore' | 'colorize' | 'video-upscale' | 'rife';

export interface PredictionState {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output: string | string[] | null;
  error: string | null;
}

export interface EnhancementOption {
  id: EnhancementType;
  title: string;
  description: string;
  mediaType: 'image' | 'video';
}
