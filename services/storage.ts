
import { GraffitiPin } from '../types';

const STORAGE_KEY = 'audio_graffiti_pins_v1';

export const savePin = (pin: GraffitiPin) => {
  const pins = getPins();
  pins.push(pin);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
};

export const getPins = (): GraffitiPin[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const clearPins = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// Seed initial data if empty
export const seedPins = () => {
  const current = getPins();
  if (current.length === 0) {
    const mockPins: GraffitiPin[] = [
      {
        id: '1',
        latitude: 37.7749, // SF default if location fails
        longitude: -122.4194,
        audioData: '',
        title: 'Neon Echoes',
        creator: 'Echo_Maker',
        timestamp: Date.now(),
        visualPrompt: 'A futuristic floating boombox in synthwave style',
        visualImageUrl: 'https://picsum.photos/seed/echo/200/200'
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockPins));
  }
};
