import type { Express } from "express";
import { createServer, type Server } from "http";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/diagnose", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ message: "imageBase64 is required" });
      }

      const model = "gemini-3-flash-preview";

      const prompt = `
        Analyze this image of a plant. 
        Identify the plant and any visible diseases, pests, or nutrient deficiencies.
        
        CRITICAL: All text in the response MUST be in Arabic. 
        - plantName: Arabic name of the plant.
        - diseaseName: Arabic name of the disease or pest.
        - diseaseType: Arabic classification (e.g., فطري, بكتيري, حشري, نقص عناصر).
        - symptoms: List of symptoms in Arabic.
        - treatmentPlan: All treatment details in Arabic.
        - timing: All timing details in Arabic.
        - prevention: All prevention measures in Arabic.

        Return the result in JSON format matching the schema.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageBase64.split(",")[1] || imageBase64,
                },
              },
            ],
          },
        ],
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              plantName: { type: Type.STRING },
              diseaseName: { type: Type.STRING },
              diseaseType: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              symptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
              treatmentPlan: {
                type: Type.OBJECT,
                properties: {
                  activeIngredient: { type: Type.STRING },
                  usageMethod: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                },
                required: ["activeIngredient", "usageMethod", "dosage"],
              },
              timing: {
                type: Type.OBJECT,
                properties: {
                  startTreatment: { type: Type.STRING },
                  frequency: { type: Type.STRING },
                  interval: { type: Type.STRING },
                },
                required: ["startTreatment", "frequency", "interval"],
              },
              prevention: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["plantName", "diseaseName", "diseaseType", "confidence", "symptoms", "treatmentPlan", "timing", "prevention"],
          },
        },
      });

      const result = JSON.parse(response.text || "{}");
      return res.json(result);
    } catch (err: any) {
      console.error("Diagnosis error:", err);
      return res.status(500).json({ message: err.message || "فشل في تحليل الصورة" });
    }
  });

  return httpServer;
}
