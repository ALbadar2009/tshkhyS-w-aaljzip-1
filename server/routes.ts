import type { Express } from "express";
import { createServer, type Server } from "http";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/diagnose", async (req, res) => {
    try {
      const { imageBase64, plantHint } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ message: "imageBase64 is required" });
      }

      const plantLine = plantHint
        ? `المستخدم أخبرك أن النبات هو: "${plantHint}" — استخدم هذا الاسم مباشرة في plantName واجعله الأساس في تشخيصك.`
        : `قواعد صارمة لاسم النبات (plantName): اكتب الاسم العربي الشائع المعروف عند المزارعين (مثل: طماطم، مانجو، نخيل، زيتون، قمح، بطاطس، فلفل، باذنجان، خيار، برتقال، تفاح، رمان، عنب، موز). لا تستخدم الأسماء العلمية اللاتينية أبداً. إذا لم تعرف النوع اكتب الفصيلة العامة مثل: شجرة حمضيات، نبات زينة، نبات شوكي.`;

      const prompt = `أنت خبير زراعي متخصص في تشخيص أمراض النباتات. حلّل الصورة المرفقة وأجب فقط بـ JSON بالعربية.

${plantLine}

أجب بهذا JSON فقط بدون أي نص خارجه:
{"plantName":"PLANT_NAME","diseaseName":"اسم المرض أو الآفة أو لا يوجد مرض","diseaseType":"فطري أو بكتيري أو حشري أو نقص عناصر أو فيروسي أو لا يوجد","confidence":0.90,"symptoms":["عرض 1","عرض 2","عرض 3"],"treatmentPlan":{"activeIngredient":"المادة الفعالة أو لا ينطبق","usageMethod":"طريقة الاستخدام","dosage":"الجرعة لكل لتر ماء"},"timing":{"startTreatment":"موعد البدء","frequency":"عدد المرات","interval":"الفترة بين الجرعات"},"prevention":["وقاية 1","وقاية 2","وقاية 3"]}`;

      const imageData = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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

      // Normalize uncommon or incorrect plant names to well-known Arabic names
      const nameMap: Record<string, string> = {
        "قرض": "سنط (أكاسيا)",
        "صريص": "صُرَيص (نبات بري)",
        "فيكس": "نبات الفيكس",
        "فيكوس": "نبات الفيكس",
        "Ficus": "نبات الفيكس",
        "كازوارينا": "شجرة الكازوارينا",
        "يوكالبتوس": "كينا",
        "اكاسيا": "سنط",
        "أكاسيا": "سنط",
        "بروسوبيس": "غاف",
        "دليب": "نخيل دليب",
        "سدر": "شجرة السدر",
        "ثمام": "نبات الثمام",
        "عتم": "شجرة العتم",
        "ضرو": "شجرة الضرو",
        "رتم": "نبات الرتم",
        "أرطى": "شجرة الأرطى",
        "طلح": "شجرة الطلح",
        "عوسج": "شجرة العوسج",
      };

      if (result.plantName && nameMap[result.plantName]) {
        result.plantName = nameMap[result.plantName];
      }

      return res.json(result);
    } catch (err: any) {
      console.error("Diagnosis error:", err);
      return res.status(500).json({ message: err.message || "فشل في تحليل الصورة" });
    }
  });

  return httpServer;
}
