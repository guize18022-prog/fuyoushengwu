import { GoogleGenAI } from "@google/genai";
import { SpeciesInfo } from "../types";

const createClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateEvolutionLore = async (level: number, baseInfo: SpeciesInfo): Promise<string> => {
  const client = createClient();
  if (!client) return baseInfo.description;

  try {
    const prompt = `
      You are the narrator of a biological evolution game.
      The player has just evolved to Level ${level} / 5.
      Species Name: ${baseInfo.name}.
      Base Characteristics: ${baseInfo.description}.
      
      Generate a short, atmospheric, and inspiring description (max 2 sentences) for this new evolutionary stage. 
      Focus on their new capabilities or their place in the food chain. 
      The tone should be scientific yet mythical.
      Return ONLY the text.
    `;

    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text.trim() || baseInfo.description;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return baseInfo.description;
  }
};
