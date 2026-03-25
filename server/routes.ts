import type { Express } from "express";
import { createServer, type Server } from "http";
import { GoogleGenAI } from "@google/genai";

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

      const prompt = `أنت خبير زراعي. حلّل صورة النبات وأجب فقط بـ JSON بالعربية بهذا التنسيق بالضبط بدون أي نص خارجه:
{"plantName":"الاسم العربي الشائع للنبات فقط (مثل: طماطم، مانجو، قمح) وليس الاسم العلمي","diseaseName":"اسم المرض أو الآفة","diseaseType":"فطري أو بكتيري أو حشري أو نقص عناصر أو فيروسي","confidence":0.90,"symptoms":["عرض 1","عرض 2","عرض 3"],"treatmentPlan":{"activeIngredient":"المادة الفعالة","usageMethod":"طريقة الاستخدام","dosage":"الجرعة لكل لتر ماء"},"timing":{"startTreatment":"موعد البدء","frequency":"عدد المرات","interval":"الفترة بين الجرعات"},"prevention":["وقاية 1","وقاية 2","وقاية 3"]}`;

      const imageData = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageData,
                },
              },
            ],
          },
        ],
      });

      const text = response.text || "";
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                        text.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, text];
      const jsonText = jsonMatch[1] || text;
      const result = JSON.parse(jsonText.trim());
      return res.json(result);
    } catch (err: any) {
      console.error("Diagnosis error:", err);
      return res.status(500).json({ message: err.message || "فشل في تحليل الصورة" });
    }
  });

  return httpServer;
}
