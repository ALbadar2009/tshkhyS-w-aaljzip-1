import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface DiagnosisResult {
  plantName: string;
  diseaseName: string;
  diseaseType: string;
  confidence: number;
  symptoms: string[];
  treatmentPlan: {
    activeIngredient: string;
    usageMethod: string;
    dosage: string;
  };
  timing: {
    startTreatment: string;
    frequency: string;
    interval: string;
  };
  prevention: string[];
}

export async function diagnosePlant(imageBase64: string): Promise<DiagnosisResult> {
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
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plantName: { type: Type.STRING, description: "Name of the plant" },
          diseaseName: { type: Type.STRING, description: "Name of the disease or pest" },
          diseaseType: { type: Type.STRING, description: "Type: Fungal, Bacterial, Pest, etc." },
          confidence: { type: Type.NUMBER, description: "Confidence score 0-1" },
          symptoms: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of visible symptoms" },
          treatmentPlan: {
            type: Type.OBJECT,
            properties: {
              activeIngredient: { type: Type.STRING, description: "Recommended active ingredient" },
              usageMethod: { type: Type.STRING, description: "How to apply treatment" },
              dosage: { type: Type.STRING, description: "Dosage per liter" },
            },
            required: ["activeIngredient", "usageMethod", "dosage"],
          },
          timing: {
            type: Type.OBJECT,
            properties: {
              startTreatment: { type: Type.STRING, description: "When to start" },
              frequency: { type: Type.STRING, description: "How many times to spray" },
              interval: { type: Type.STRING, description: "Interval between sprays" },
            },
            required: ["startTreatment", "frequency", "interval"],
          },
          prevention: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Preventive measures" },
        },
        required: ["plantName", "diseaseName", "diseaseType", "confidence", "symptoms", "treatmentPlan", "timing", "prevention"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    throw new Error("فشل في تحليل النتيجة. حاول مرة أخرى.");
  }
}
