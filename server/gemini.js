import { GoogleGenAI } from "@google/genai";

export const MODEL = "gemini-3.5-flash-lite";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
