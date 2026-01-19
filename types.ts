
export interface GraffitiPin {
  id: string;
  latitude: number;
  longitude: number;
  audioData: string; // Base64
  title: string;
  creator: string;
  timestamp: number;
  visualPrompt: string;
  visualImageUrl?: string;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type AppView = 'map' | 'ar' | 'record' | 'collection';
