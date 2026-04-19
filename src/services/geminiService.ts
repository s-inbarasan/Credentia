/// <reference types="vite/client" />
import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI | null => {
  if (_ai) return _ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. AI features are disabled.');
    return null;
  }
  _ai = new GoogleGenAI({ apiKey });
  return _ai;
};

export const getCyberResponse = async (prompt: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  const ai = getAI();
  if (!ai) {
    return "The AI Mentor is currently unavailable. Please ensure the GEMINI_API_KEY is configured in your Vercel environment variables.";
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: history.concat([{ role: 'user', parts: [{ text: prompt }] }]),
      config: {
        systemInstruction: "You are CREDENTIA Cyber AI Mentor, a professional cybersecurity assistant. Provide simple yet technical explanations about password safety, phishing, data privacy, and cyber attacks. Always structure your answers with Headings, Bullet points, Step-by-step explanations, and Practical examples. Always include a disclaimer that this is for educational purposes only. Keep responses concise, professional, and helpful.",
      }
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Gemini Frontend Error:", error);
    if (error instanceof Error && error.message.includes("API key not valid")) {
      return "Critical: The AI Mentor is currently offline due to an invalid API configuration. Please check the project settings.";
    }
    return "The neural link is unstable. Please check your network connection and try again.";
  }
};
