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

      const prompt = `
        أنت خبير زراعي متخصص في تشخيص أمراض النباتات.
        قم بتحليل هذه الصورة للنبات وحدد:
        1. اسم النبات
        2. المرض أو الآفة إن وجدت
        3. نوع الإصابة
        4. الأعراض المرئية
        5. خطة العلاج
        6. التوقيت المناسب للعلاج
        7. إرشادات الوقاية

        أجب فقط بـ JSON بالعربية بالتنسيق التالي بالضبط (لا تضف أي نص خارج JSON):
        {
          "plantName": "اسم النبات بالعربية",
          "diseaseName": "اسم المرض أو الآفة بالعربية",
          "diseaseType": "نوع الإصابة (فطري/بكتيري/حشري/نقص عناصر/فيروسي)",
          "confidence": 0.85,
          "symptoms": ["عرض 1", "عرض 2", "عرض 3"],
          "treatmentPlan": {
            "activeIngredient": "المادة الفعالة الموصى بها",
            "usageMethod": "طريقة الاستخدام والتطبيق",
            "dosage": "الجرعة لكل لتر ماء"
          },
          "timing": {
            "startTreatment": "وقت بدء العلاج",
            "frequency": "عدد مرات الرش",
            "interval": "الفترة بين كل رشة"
          },
          "prevention": ["إجراء وقائي 1", "إجراء وقائي 2", "إجراء وقائي 3"]
        }
      `;

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
