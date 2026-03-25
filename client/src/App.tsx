import { useState, useRef, useEffect } from "react";
import { Camera, History, AlertCircle, CheckCircle2, RefreshCw, ChevronLeft, Info, Share2, Droplets, Scale, Zap, Image as ImageIcon, Sprout } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

interface HistoryItem extends DiagnosisResult {
  id: string;
  date: string;
  image: string;
}

const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <div className="absolute inset-0 bg-green-500/15 blur-xl rounded-full" />
    <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 drop-shadow-md">
      <path d="M46 72 L54 72 L56 92 L44 92 Z" fill="#14532d" />
      <circle cx="50" cy="35" r="22" fill="#16a34a" />
      <circle cx="35" cy="52" r="18" fill="#15803d" />
      <circle cx="65" cy="52" r="18" fill="#15803d" />
      <circle cx="50" cy="55" r="20" fill="#22c55e" />
      <g transform="translate(50, 48)">
        <circle cx="0" cy="0" r="11" fill="white" stroke="#064e3b" strokeWidth="2.5" />
        <circle cx="0" cy="0" r="8.5" fill="#f0fdf4" />
        <path d="M7.5 7.5 L15 15" stroke="#064e3b" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M-4 -3 Q-3 -5 -1 -4" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      </g>
    </svg>
  </div>
);

async function diagnosePlant(imageBase64: string): Promise<DiagnosisResult> {
  const response = await fetch("/api/diagnose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "فشل في التشخيص");
  }
  return response.json();
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [view, setView] = useState<"main" | "history" | "result" | "designer_message">("main");
  const [showUploadOptions, setShowUploadOptions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem("wiqaya_history");
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error("Failed to parse history", e); }
    }
  }, []);

  const saveToHistory = (newResult: DiagnosisResult, img: string) => {
    const newItem: HistoryItem = {
      ...newResult,
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("ar-SA"),
      image: img,
    };
    const updatedHistory = [newItem, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem("wiqaya_history", JSON.stringify(updatedHistory));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setImage(compressedBase64);
          setShowUploadOptions(false);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imgBase64: string) => {
    setLoading(true);
    setError(null);
    try {
      const diagnosis = await diagnosePlant(imgBase64);
      setResult(diagnosis);
      saveToHistory(diagnosis, imgBase64);
      setView("result");
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء التشخيص");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setView("main");
    setShowUploadOptions(false);
  };

  const handleShare = async () => {
    if (!result) return;
    const shareText = `تشخيص وعلاج:
النبات: ${result.plantName}
الحالة: ${result.diseaseName}
نوع الإصابة: ${result.diseaseType}
خطة العلاج: ${result.treatmentPlan.activeIngredient} (${result.treatmentPlan.dosage})

تم التشخيص عبر تطبيق تشخيص وعلاج الذكي.
رابط التطبيق: ${window.location.origin}`;

    const fallbackCopy = async () => {
      try {
        await navigator.clipboard.writeText(shareText);
        setNotification("تم نسخ الملخص إلى الحافظة بنجاح");
        setTimeout(() => setNotification(null), 3000);
      } catch {
        const mailtoLink = `mailto:?subject=تشخيص نبات تشخيص وعلاج&body=${encodeURIComponent(shareText)}`;
        window.location.href = mailtoLink;
      }
    };

    if (navigator.share) {
      try {
        await navigator.share({ title: "تشخيص نبات تشخيص وعلاج", text: shareText, url: window.location.origin });
      } catch (err: any) {
        if (err.name !== "AbortError") await fallbackCopy();
      }
    } else {
      await fallbackCopy();
    }
  };

  return (
    <div
      className="min-h-screen text-foreground selection:bg-primary/20 font-sans relative overflow-hidden"
      style={{ backgroundColor: "#f5f5f0" }}
      dir="rtl"
    >
      <div className="absolute inset-0 bg-pattern pointer-events-none" />

      {/* Header */}
      <header className="p-6 md:p-8 flex justify-between items-center max-w-4xl mx-auto relative z-10">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
          <motion.div whileHover={{ rotate: 15 }} className="flex items-center justify-center">
            <Logo className="w-12 h-12 md:w-14 md:h-14" />
          </motion.div>
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold display tracking-tight leading-none" style={{ color: "#1a1a1a" }}>تشخيص وعلاج</h1>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60" style={{ color: "#5A5A40" }}>ذكاء زراعي</span>
            <button
              onClick={(e) => { e.stopPropagation(); setView("designer_message"); }}
              className="mt-1 text-xs font-bold hover:opacity-100 transition-opacity flex items-center gap-1 opacity-50"
              style={{ color: "#5A5A40" }}
              data-testid="button-designer-message"
            >
              <Info size={12} />
              <span>رسالة تهمك</span>
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setView(view === "history" ? "main" : "history")}
            className="w-12 h-12 flex items-center justify-center bg-white border rounded-2xl shadow-sm transition-all active:scale-95"
            style={{ borderColor: "rgba(90,90,64,0.12)" }}
            data-testid="button-history"
          >
            <History size={22} style={{ color: "#5A5A40" }} />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-40">السجل</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 pb-24 relative z-10">
        <AnimatePresence mode="wait">

          {/* Main View */}
          {view === "main" && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center py-6"
            >
              <div className="space-y-6 text-right order-2 lg:order-1">
                <div className="space-y-4">
                  <motion.span
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
                    style={{ backgroundColor: "rgba(90,90,64,0.10)", color: "#5A5A40" }}
                  >
                    مستقبلك الزراعي يبدأ هنا
                  </motion.span>
                  <h2 className="text-3xl md:text-4xl naskh font-bold leading-tight" style={{ color: "#1a1a1a" }}>
                    شخّص الإصابة بلمسة واحدة
                  </h2>
                  <p className="text-base leading-relaxed opacity-60" style={{ color: "#1a1a1a" }}>
                    التقط صورة للنبات المصاب وسيقوم الذكاء الاصطناعي بتحليل الحالة وتقديم خطة علاجية فورية
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: Camera, label: "التقط صورة", desc: "بكاميرا هاتفك" },
                    { icon: Zap, label: "تحليل فوري", desc: "بالذكاء الاصطناعي" },
                    { icon: CheckCircle2, label: "خطة علاج", desc: "مخصصة وفورية" },
                  ].map((item, i) => (
                    <div key={i} className="text-center space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(90,90,64,0.08)" }}>
                        <item.icon size={22} style={{ color: "#5A5A40" }} />
                      </div>
                      <p className="text-xs font-bold" style={{ color: "#1a1a1a" }}>{item.label}</p>
                      <p className="text-[10px] opacity-50" style={{ color: "#1a1a1a" }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5 order-1 lg:order-2">
                <div className="card-organic p-4 border-2 border-dashed max-w-md mx-auto" style={{ borderColor: "rgba(90,90,64,0.2)" }}>
                  {!image ? (
                    <div className="w-full aspect-[3/2] flex flex-col items-center justify-center gap-4">
                      {!showUploadOptions ? (
                        <button
                          onClick={() => setShowUploadOptions(true)}
                          className="w-full h-full flex flex-col items-center justify-center gap-4 group"
                          data-testid="button-start-upload"
                        >
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:rotate-12" style={{ backgroundColor: "rgba(90,90,64,0.06)", color: "#5A5A40" }}>
                            <Camera size={32} strokeWidth={1.5} />
                          </div>
                          <div className="text-center space-y-1">
                            <span className="block text-lg font-bold display" style={{ color: "#1a1a1a" }}>قم بتصوير مكان الإصابة</span>
                            <span className="block text-[10px] opacity-40" style={{ color: "#1a1a1a" }}>اضغط للبدء بالتشخيص</span>
                          </div>
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 w-full h-full p-2">
                          <button
                            onClick={() => cameraInputRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-2 rounded-2xl transition-all group py-6"
                            style={{ backgroundColor: "rgba(90,90,64,0.06)" }}
                            data-testid="button-camera"
                          >
                            <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center transition-colors" style={{ color: "#5A5A40" }}>
                              <Camera size={20} />
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: "#1a1a1a" }}>تصوير بالكاميرا</span>
                          </button>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-2 rounded-2xl transition-all group py-6"
                            style={{ backgroundColor: "rgba(90,90,64,0.06)" }}
                            data-testid="button-upload-file"
                          >
                            <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center transition-colors" style={{ color: "#5A5A40" }}>
                              <ImageIcon size={20} />
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: "#1a1a1a" }}>رفع من جهازك</span>
                          </button>
                          <button
                            onClick={() => setShowUploadOptions(false)}
                            className="col-span-2 text-[10px] font-bold transition-colors opacity-40"
                            style={{ color: "#5A5A40" }}
                            data-testid="button-cancel-upload"
                          >
                            إلغاء
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative aspect-[3/2] w-full rounded-2xl overflow-hidden shadow-xl group">
                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4" style={{ backgroundColor: "rgba(90,90,64,0.25)" }}>
                          <button
                            onClick={() => { setImage(null); setShowUploadOptions(true); }}
                            className="w-12 h-12 bg-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                            style={{ color: "#5A5A40" }}
                            data-testid="button-change-image"
                          >
                            <RefreshCw size={24} />
                          </button>
                          <button
                            onClick={() => setImage(null)}
                            className="w-12 h-12 bg-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg text-red-500"
                            data-testid="button-remove-image"
                          >
                            <AlertCircle size={24} />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => image && processImage(image)}
                        className="btn-olive w-full py-4 font-bold text-lg shadow-lg flex items-center justify-center gap-3"
                        data-testid="button-diagnose"
                      >
                        <Zap size={20} />
                        بدء التحليل الذكي
                      </button>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} data-testid="input-file" />
                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleImageUpload} data-testid="input-camera" />
                </div>

                <div className="backdrop-blur-sm border rounded-3xl p-5 flex gap-4 items-start max-w-md mx-auto" style={{ backgroundColor: "rgba(255,255,255,0.5)", borderColor: "rgba(90,90,64,0.07)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(212,163,115,0.12)", color: "#D4A373" }}>
                    <Info size={18} />
                  </div>
                  <p className="text-xs leading-relaxed opacity-70" style={{ color: "#1a1a1a" }}>
                    <span className="font-bold block mb-0.5" style={{ color: "#1a1a1a", opacity: 1 }}>ملاحظة هامة:</span>
                    التشخيص يعتمد على زاوية تصويرك وقد يخطئ في الحالات المتشابهة
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Result View */}
          {view === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <button
                  onClick={reset}
                  className="flex items-center gap-2 font-bold hover:gap-3 transition-all"
                  style={{ color: "#5A5A40" }}
                  data-testid="button-back-home"
                >
                  <ChevronLeft size={20} className="rotate-180" />
                  <span>العودة للرئيسية</span>
                </button>
                <button
                  onClick={handleShare}
                  className="btn-olive px-6 py-3 flex items-center gap-2 text-sm font-bold"
                  data-testid="button-share"
                >
                  <Share2 size={18} />
                  <span>مشاركة التقرير</span>
                </button>
              </div>

              <div className="card-organic overflow-hidden border-none shadow-2xl" style={{ backgroundColor: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)" }}>
                {image && (
                  <div className="aspect-[16/10] w-full relative group overflow-hidden">
                    <img src={image} alt="Plant" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                )}

                <div className="border-b p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6" style={{ backgroundColor: "rgba(90,90,64,0.04)", borderColor: "rgba(90,90,64,0.10)" }}>
                  <div className="text-center md:text-right space-y-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: "rgba(212,163,115,0.12)", color: "#D4A373" }}>
                      <AlertCircle size={12} />
                      <span data-testid="text-disease-type">{result.diseaseType}</span>
                    </div>
                    <h3 className="text-4xl md:text-5xl display font-black leading-tight" style={{ color: "#1a1a1a" }} data-testid="text-disease-name">
                      {result.diseaseName}
                    </h3>
                    <p className="serif italic text-xl font-medium" style={{ color: "#5A5A40" }} data-testid="text-plant-name">
                      {result.plantName}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border" style={{ borderColor: "rgba(90,90,64,0.06)" }}>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase font-black tracking-widest leading-none opacity-40">دقة التشخيص</span>
                      <span className="text-3xl font-black leading-none mt-1" style={{ color: "#D4A373" }} data-testid="text-confidence">
                        {(result.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: "#D4A373", boxShadow: "0 4px 16px rgba(212,163,115,0.3)" }}>
                      <CheckCircle2 size={28} />
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-10 space-y-14">
                  {/* Treatment */}
                  <section className="space-y-8">
                    <div className="flex items-center gap-4 pb-5 border-b" style={{ borderColor: "rgba(90,90,64,0.10)" }}>
                      <div className="w-12 h-12 text-white rounded-2xl flex items-center justify-center shadow-xl" style={{ backgroundColor: "#5A5A40", boxShadow: "0 4px 16px rgba(90,90,64,0.25)" }}>
                        <Zap size={26} />
                      </div>
                      <div>
                        <h4 className="text-2xl font-black display" style={{ color: "#1a1a1a" }}>خطة العلاج الفورية</h4>
                        <p className="text-sm opacity-40">اتبع هذه الخطوات للسيطرة على الإصابة</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {[
                        { icon: Droplets, label: "المادة الفعالة", value: result.treatmentPlan.activeIngredient, color: "#5A5A40", bg: "rgba(90,90,64,0.04)", border: "rgba(90,90,64,0.06)" },
                        { icon: Scale, label: "الجرعة الموصى بها", value: result.treatmentPlan.dosage, color: "#D4A373", bg: "rgba(212,163,115,0.04)", border: "rgba(212,163,115,0.06)" },
                        { icon: Info, label: "طريقة الاستخدام", value: result.treatmentPlan.usageMethod, color: "#1a1a1a", bg: "rgba(26,26,26,0.02)", border: "rgba(26,26,26,0.05)" },
                      ].map((item, i) => (
                        <div key={i} className="p-7 rounded-[28px] space-y-4 transition-all group border" style={{ backgroundColor: item.bg, borderColor: item.border }}>
                          <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform" style={{ color: item.color }}>
                            <item.icon size={22} />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">{item.label}</span>
                            <p className="text-xl font-black leading-tight" style={{ color: item.color }} data-testid={`text-treatment-${i}`}>{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Symptoms & Prevention */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <section className="space-y-6 p-7 rounded-[36px] border" style={{ backgroundColor: "rgba(245,245,240,0.5)", borderColor: "rgba(90,90,64,0.06)" }}>
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.10)", color: "#dc2626" }}>
                          <AlertCircle size={22} />
                        </div>
                        <h4 className="text-xl font-black display" style={{ color: "#1a1a1a" }}>الأعراض المكتشفة</h4>
                      </div>
                      <div className="space-y-3">
                        {result.symptoms.map((s, i) => (
                          <motion.div
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.08 }}
                            key={i}
                            className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border"
                            style={{ borderColor: "rgba(90,90,64,0.06)" }}
                            data-testid={`text-symptom-${i}`}
                          >
                            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(239,68,68,0.07)" }}>
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                            </div>
                            <span className="text-sm font-bold opacity-80">{s}</span>
                          </motion.div>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-6 p-7 rounded-[36px] border" style={{ backgroundColor: "rgba(90,90,64,0.03)", borderColor: "rgba(90,90,64,0.06)" }}>
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(90,90,64,0.10)", color: "#5A5A40" }}>
                          <CheckCircle2 size={22} />
                        </div>
                        <h4 className="text-xl font-black display" style={{ color: "#1a1a1a" }}>إرشادات الوقاية</h4>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {result.prevention.map((p, i) => (
                          <motion.span
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.08 }}
                            key={i}
                            className="bg-white px-5 py-2.5 rounded-2xl text-sm font-black border shadow-sm hover:shadow-md transition-shadow cursor-default"
                            style={{ color: "#5A5A40", borderColor: "rgba(90,90,64,0.10)" }}
                            data-testid={`text-prevention-${i}`}
                          >
                            {p}
                          </motion.span>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Timing */}
                  <section className="space-y-7 pt-8 border-t" style={{ borderColor: "rgba(90,90,64,0.10)" }}>
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(212,163,115,0.12)", color: "#D4A373" }}>
                        <RefreshCw size={22} />
                      </div>
                      <h4 className="text-xl font-black display" style={{ color: "#1a1a1a" }}>الجدول الزمني للعلاج</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      {[
                        { label: "موعد البدء", value: result.timing.startTreatment, icon: Zap, bg: "rgba(212,163,115,0.08)", color: "#D4A373" },
                        { label: "عدد المرات", value: result.timing.frequency, icon: RefreshCw, bg: "rgba(90,90,64,0.06)", color: "#5A5A40" },
                        { label: "الفترة البينية", value: result.timing.interval, icon: History, bg: "rgba(26,26,26,0.04)", color: "#1a1a1a" },
                      ].map((item, i) => (
                        <div key={i} className="bg-white border p-5 rounded-[28px] flex items-center gap-5 shadow-sm hover:shadow-md transition-all" style={{ borderColor: "rgba(90,90,64,0.06)" }}>
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: item.bg, color: item.color }}>
                            <item.icon size={24} />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] opacity-30 block uppercase tracking-widest font-black">{item.label}</span>
                            <p className="text-lg font-black leading-tight" style={{ color: "#1a1a1a" }} data-testid={`text-timing-${i}`}>{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {/* History View */}
          {view === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-3xl display font-bold" style={{ color: "#1a1a1a" }}>سجل التشخيصات</h3>
                  <p className="text-sm opacity-40">تتبع حالة نباتاتك عبر الزمن</p>
                </div>
                <button onClick={() => setView("main")} className="btn-olive px-6 py-2.5 text-sm font-bold" data-testid="button-close-history">إغلاق</button>
              </div>

              {history.length === 0 ? (
                <div className="card-organic py-28 text-center space-y-6">
                  <div className="w-24 h-24 rounded-[36px] flex items-center justify-center mx-auto" style={{ backgroundColor: "rgba(90,90,64,0.06)", color: "rgba(90,90,64,0.25)" }}>
                    <History size={44} strokeWidth={1} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-bold display" style={{ color: "#1a1a1a" }}>لا يوجد سجل حتى الآن</p>
                    <p className="text-sm opacity-40">ابدأ بتشخيص أول نبات لتراه هنا</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {history.map((item) => (
                    <motion.div
                      whileHover={{ y: -4 }}
                      key={item.id}
                      onClick={() => { setResult(item); setImage(item.image); setView("result"); }}
                      className="card-organic p-4 flex gap-5 cursor-pointer transition-all group"
                      data-testid={`card-history-${item.id}`}
                    >
                      <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                        <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="flex flex-col justify-center space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: "#5A5A40" }}>{item.date}</span>
                        <h4 className="text-lg font-bold display leading-tight" style={{ color: "#1a1a1a" }}>{item.diseaseName}</h4>
                        <span className="text-sm opacity-40 italic serif">{item.plantName}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Designer Message View */}
          {view === "designer_message" && (
            <motion.div
              key="designer_message"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setView("main")}
                  className="flex items-center gap-2 font-bold hover:gap-3 transition-all"
                  style={{ color: "#5A5A40" }}
                  data-testid="button-back-from-message"
                >
                  <ChevronLeft size={20} className="rotate-180" />
                  <span>العودة للرئيسية</span>
                </button>
              </div>

              <div className="card-organic p-7 md:p-12 space-y-8 border-none shadow-2xl" style={{ backgroundColor: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)" }}>
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(90,90,64,0.10)", color: "#5A5A40" }}>
                    <Sprout size={32} />
                  </div>
                  <h2 className="text-4xl font-black display" style={{ color: "#1a1a1a" }}>رسالة تهمك</h2>
                </div>

                <div className="space-y-6 text-lg leading-relaxed opacity-75" style={{ color: "#1a1a1a" }}>
                  <p>انطلق تطوير هذا التطبيق من واقع العمل الميداني، حيث تتكرر تحديات تشخيص الأمراض النباتية ودقتها، وما يترتب عليها من قرارات تؤثر بشكل مباشر على جودة الإنتاج وكفاءته.</p>
                  <p>تقوم فكرة التطبيق على تبسيط عملية التشخيص، من خلال تحليل صور النباتات وتحويلها إلى مؤشر تشخيصي مبدئي، يتبعه توجيه عملي يساعد المستخدم على اتخاذ خطوات أولية مدروسة نحو المعالجة بشكل أسرع وأكثر دقة.</p>
                  <p>ولا يهدف هذا التطبيق إلى استبدال الخبرة الزراعية، بل يأتي كأداة مساندة تعزز من كفاءة اتخاذ القرار، وتقلل من احتمالية الخطأ، مع التأكيد أن جميع النتائج تظل إرشادية وتخضع للتقييم وفق كل حالة وظروفها.</p>
                  <p>ويأتي هذا العمل امتدادًا لتوجهات رؤية المملكة 2030 في دعم التحول الرقمي، وتمكين التقنيات الحديثة لخدمة القطاع الزراعي، بما يسهم في رفع كفاءته وتحسين مخرجاته.</p>
                  <p>الهدف من هذا التطبيق هو تقديم قيمة عملية للمختصين والمزارعين، من خلال توفير الوقت والجهد، وتحسين جودة التشخيص، ودعم القرارات المبنية على المعرفة.</p>
                </div>

                <div className="pt-7 border-t space-y-2" style={{ borderColor: "rgba(90,90,64,0.10)" }}>
                  <p className="font-black text-xl" style={{ color: "#1a1a1a" }}>أخوكم</p>
                  <p className="font-black text-xl" style={{ color: "#1a1a1a" }}>الفني الزراعي</p>
                  <p className="font-black text-2xl" style={{ color: "#5A5A40" }}>محمد علي حفظي</p>
                  <p className="font-bold opacity-60" style={{ color: "#1a1a1a" }}>فرع وزارة البيئة والمياه والزراعة بمنطقة جازان</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center"
            style={{ backgroundColor: "rgba(245,245,240,0.85)" }}
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 rounded-full border-4"
                style={{ borderColor: "rgba(90,90,64,0.12)", borderTopColor: "#5A5A40" }}
              />
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <Logo className="w-full h-full opacity-40" />
              </div>
            </div>
            <div className="mt-8 space-y-2">
              <h3 className="text-xl font-bold serif" style={{ color: "#1a1a1a" }}>جاري تحليل الصورة...</h3>
              <p className="text-sm opacity-50 max-w-xs" style={{ color: "#1a1a1a" }}>
                نقوم الآن بالفحص وتحديد الأعراض بدقة.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white shadow-xl rounded-2xl px-6 py-4 border"
            style={{ borderColor: "rgba(239,68,68,0.15)" }}
          >
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
              <AlertCircle size={18} />
            </div>
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: "#1a1a1a" }}>{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-[10px] font-bold mr-4 opacity-40 hover:opacity-100 transition-opacity"
              data-testid="button-close-error"
            >
              إغلاق
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white shadow-xl rounded-2xl px-6 py-4 border"
            style={{ borderColor: "rgba(90,90,64,0.12)" }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: "#5A5A40" }}>
              <CheckCircle2 size={18} />
            </div>
            <p className="text-sm font-bold" style={{ color: "#1a1a1a" }}>{notification}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
