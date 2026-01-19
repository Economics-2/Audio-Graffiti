
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateGraffitiVisual = async (title: string, description: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Create a unique, vibrant, semi-transparent graffiti-style icon or avatar for an audio recording titled "${title}". The vibe is ${description}. Style: futuristic neon street art, high-tech glitch, floating digital artifact. No background, high contrast, circular composition.`
          }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return `https://picsum.photos/seed/${encodeURIComponent(title)}/400/400`;
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    return `https://picsum.photos/seed/${encodeURIComponent(title)}/400/400`;
  }
};

export const analyzeAudioContent = async (audioBase64: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/webm',
              data: audioBase64
            }
          },
          {
            text: "Analyze this audio clip. Identify the mood, dominant sounds, and atmosphere. Provide a 1-sentence poetic description for a street art visual representation."
          }
        ]
      }
    });
    return response.text || "A digital fragment of a moment frozen in space.";
  } catch (error) {
    console.error("Gemini Audio Analysis Error:", error);
    return "Ambient sound fragment.";
  }
};

/**
 * Uses Google Maps Grounding to describe the user's current environment.
 */
export const getNearbyContext = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Describe the vibe and notable characteristics of the immediate area around these coordinates. Focus on architectural style, community atmosphere, and any nearby landmarks that define the spirit of this place.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude, longitude }
          }
        }
      },
    });
    return response.text || "A mysterious urban intersection.";
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return "The urban jungle.";
  }
};

/**
 * Uses Google Search Grounding to find interesting things happening nearby for recording inspiration.
 */
export const getTrendingIdeas = async (locationDescription: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `What are some interesting current events, local stories, or trending 'vibes' in ${locationDescription}? Suggest 3 creative themes for a 'sound graffiti' recording that would resonate with people visiting this spot today.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return response.text || "Capture the passing whispers of the wind.";
  } catch (error) {
    console.error("Search Grounding Error:", error);
    return "Capture the hidden rhythms of this city block.";
  }
};
