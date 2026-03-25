import { useState, useRef, useEffect } from "react";
import { Camera, History, AlertCircle, CheckCircle2, RefreshCw, ChevronLeft, Info, Share2, Droplets, Scale, Zap, Image as ImageIcon, Sprout } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { diagnosePlant, DiagnosisResult } from "./lib/gemini";

interface HistoryItem extends DiagnosisResult {
  id: string;
  date: string;
  image: string;
}

const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    {/* Outer Glow */}
    <div className="absolute inset-0 bg-green-500/15 blur-xl rounded-full" />
    
    <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 drop-shadow-md">
      {/* Tree Trunk */}
      <path 
        d="M46 72 L54 72 L56 92 L44 92 Z" 
        fill="#14532d" 
      />
      
      {/* Tree Canopy (Overlapping Circles for a lush look) */}
      <circle cx="50" cy="35" r="22" fill="#16a34a" />
      <circle cx="35" cy="52" r="18" fill="#15803d" />
      <circle cx="65" cy="52" r="18" fill="#15803d" />
      <circle cx="50" cy="55" r="20" fill="#22c55e" />

      {/* Magnifying Glass (Small, in the middle of the canopy) */}
      <g transform="translate(50, 48)">
        {/* Frame */}
        <circle cx="0" cy="0" r="11" fill="white" stroke="#064e3b" strokeWidth="2.5" />
        {/* Glass */}
        <circle cx="0" cy="0" r="8.5" fill="#f0fdf4" />
        {/* Handle */}
        <path 
          d="M7.5 7.5 L15 15" 
          stroke="#064e3b" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
        />
        {/* Shine on glass */}
        <path 
          d="M-4 -3 Q-3 -5 -1 -4" 
          stroke="#22c55e" 
          strokeWidth="1.2" 
          strokeLinecap="round" 
          opacity="0.6"
        />
      </g>
    </svg>
  </div>
);

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
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
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
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
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
      } catch (err) {
        // Final fallback to mailto
        const mailtoLink = `mailto:?subject=تشخيص نبات تشخيص وعلاج&body=${encodeURIComponent(shareText)}`;
        window.location.href = mailtoLink;
      }
    };

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'تشخيص نبات تشخيص وعلاج',
          text: shareText,
          url: window.location.origin,
        });
      } catch (err: any) {
        // Ignore user cancellation
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          await fallbackCopy();
        }
      }
    } else {
      await fallbackCopy();
    }
  };

  return (
    <div className="min-h-screen bg-cream text-ink selection:bg-olive/20 font-sans relative overflow-hidden" dir="rtl">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-pattern pointer-events-none" />

      {/* Header */}
      <header className="p-8 flex justify-between items-center max-w-4xl mx-auto relative z-10">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
          <motion.div 
            whileHover={{ rotate: 15 }}
            className="flex items-center justify-center"
          >
            <Logo className="w-14 h-14" />
          </motion.div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold display tracking-tight leading-none">تشخيص وعلاج</h1>
            <span className="text-[10px] uppercase tracking-[0.2em] text-olive font-bold opacity-60">ذكاء زراعي</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setView("designer_message");
              }}
              className="mt-2 text-xs font-bold text-olive/60 hover:text-olive transition-colors flex items-center gap-1"
            >
              <Info size={12} />
              <span>رسالة تهمك</span>
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={() => setView(view === "history" ? "main" : "history")}
            className="w-12 h-12 flex items-center justify-center bg-white border border-olive/10 rounded-2xl shadow-sm hover:bg-olive hover:text-white transition-all active:scale-95"
          >
            <History size={22} />
          </button>
          <span className="text-[10px] font-bold text-ink/40 uppercase tracking-wider">السجل</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-24 relative z-10">
        <AnimatePresence mode="wait">
          {view === "main" && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-8"
            >
              <div className="space-y-8 text-right">
                <div className="space-y-4">
                  <motion.span 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="inline-block px-4 py-1 bg-olive/10 text-olive rounded-full text-xs font-bold uppercase tracking-widest"
                  >
                    مستقبلك الزراعي يبدأ هنا
                  </motion.span>
                  <h2 className="text-3xl md:text-4xl naskh font-bold leading-tight text-ink">
                    شخّص الإصابة بلمسة واحدة
                  </h2>
                </div>
              </div>

              <div className="space-y-6">
                <div className="card-organic p-4 border-2 border-dashed border-olive/20 hover:border-olive/40 transition-colors max-w-md mx-auto">
                    {!image ? (
                      <div className="w-full aspect-[3/2] flex flex-col items-center justify-center gap-4">
                        {!showUploadOptions ? (
                          <button
                            onClick={() => setShowUploadOptions(true)}
                            className="w-full h-full flex flex-col items-center justify-center gap-4 group"
                          >
                            <div className="w-16 h-16 bg-olive/5 rounded-2xl flex items-center justify-center text-olive group-hover:bg-olive group-hover:text-white transition-all duration-500 group-hover:rotate-12">
                              <Camera size={32} strokeWidth={1.5} />
                            </div>
                            <div className="text-center space-y-1">
                              <span className="block text-lg font-bold display">قم بتصوير مكان الإصابة</span>
                              <span className="block text-[10px] text-ink/40">اضغط للبدء بالتشخيص</span>
                            </div>
                          </button>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 w-full h-full p-2">
                            <button
                              onClick={() => cameraInputRef.current?.click()}
                              className="flex flex-col items-center justify-center gap-2 bg-olive/5 rounded-2xl hover:bg-olive hover:text-white transition-all group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center text-olive group-hover:bg-white group-hover:text-olive transition-colors">
                                <Camera size={20} />
                              </div>
                              <span className="text-[10px] font-bold">تصوير بالكاميرا</span>
                            </button>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="flex flex-col items-center justify-center gap-2 bg-olive/5 rounded-2xl hover:bg-olive hover:text-white transition-all group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center text-olive group-hover:bg-white group-hover:text-olive transition-colors">
                                <ImageIcon size={20} />
                              </div>
                              <span className="text-[10px] font-bold">رفع من جهازك</span>
                            </button>
                            <button 
                              onClick={() => setShowUploadOptions(false)}
                              className="col-span-2 text-[10px] font-bold text-ink/40 hover:text-olive transition-colors"
                            >
                              إلغاء
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative aspect-[3/2] w-full rounded-2xl overflow-hidden shadow-xl group">
                          <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-olive/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button 
                              onClick={() => { setImage(null); setShowUploadOptions(true); }}
                              className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-olive hover:scale-110 transition-transform shadow-lg"
                            >
                              <RefreshCw size={24} />
                            </button>
                            <button 
                              onClick={() => setImage(null)}
                              className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-500 hover:scale-110 transition-transform shadow-lg"
                            >
                              <AlertCircle size={24} />
                            </button>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => image && processImage(image)}
                          className="btn-olive w-full py-4 font-bold text-lg shadow-lg flex items-center justify-center gap-3"
                        >
                          <Zap size={20} />
                          بدء التحليل الذكي
                        </button>
                      </div>
                    )}
                  
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    ref={cameraInputRef}
                    onChange={handleImageUpload}
                  />
                </div>

                <div className="bg-white/40 backdrop-blur-sm border border-olive/5 rounded-3xl p-6 flex gap-4 items-start">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0">
                    <Info size={20} />
                  </div>
                  <p className="text-xs text-ink/60 leading-relaxed">
                    <span className="font-bold text-ink block mb-1">ملاحظة هامة:</span>
                    التشخيص يعتمد على زاوية تصويرك وقد يخطئ في الحالات المتشابهة
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {view === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <button 
                  onClick={reset}
                  className="flex items-center gap-2 text-olive font-bold hover:gap-3 transition-all"
                >
                  <ChevronLeft size={20} className="rotate-180" />
                  <span>العودة للرئيسية</span>
                </button>
                <button 
                  onClick={handleShare}
                  className="btn-olive px-6 py-3 flex items-center gap-2 text-sm font-bold"
                >
                  <Share2 size={18} />
                  <span>مشاركة التقرير</span>
                </button>
              </div>

              <div className="card-organic overflow-hidden border-none shadow-2xl bg-white/80 backdrop-blur-xl">
                {image && (
                  <div className="aspect-[16/10] w-full relative group overflow-hidden">
                    <img 
                      src={image} 
                      alt="Plant" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                )}

                {/* Diagnosis Header - Moved below image */}
                <div className="bg-olive/5 border-b border-olive/10 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="text-center md:text-right space-y-2">
                    <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                      <AlertCircle size={12} />
                      <span>{result.diseaseType}</span>
                    </div>
                    <h3 className="text-4xl md:text-5xl display font-black text-ink leading-tight">
                      {result.diseaseName}
                    </h3>
                    <p className="text-olive serif italic text-xl font-medium">
                      {result.plantName}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-olive/5">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase font-black text-ink/40 tracking-widest leading-none">دقة التشخيص</span>
                      <span className="text-3xl font-black text-accent leading-none mt-1">{(result.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-accent/20">
                      <CheckCircle2 size={28} />
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-12 space-y-16">
                  {/* Actionable Treatment Section */}
                  <section className="space-y-8">
                    <div className="flex items-center justify-between border-b border-olive/10 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-olive text-white rounded-2xl flex items-center justify-center shadow-xl shadow-olive/20">
                          <Zap size={28} />
                        </div>
                        <div>
                          <h4 className="text-2xl font-black display text-ink">خطة العلاج الفورية</h4>
                          <p className="text-sm text-ink/40 font-medium">اتبع هذه الخطوات للسيطرة على الإصابة</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-olive/[0.03] border border-olive/5 p-8 rounded-[32px] space-y-4 hover:bg-olive/[0.05] transition-colors group">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-olive shadow-sm group-hover:scale-110 transition-transform">
                          <Droplets size={24} />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-ink/30 uppercase tracking-widest">المادة الفعالة</span>
                          <p className="text-2xl font-black text-olive display leading-tight">{result.treatmentPlan.activeIngredient}</p>
                        </div>
                      </div>

                      <div className="bg-accent/[0.03] border border-accent/5 p-8 rounded-[32px] space-y-4 hover:bg-accent/[0.05] transition-colors group">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-accent shadow-sm group-hover:scale-110 transition-transform">
                          <Scale size={24} />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-ink/30 uppercase tracking-widest">الجرعة الموصى بها</span>
                          <p className="text-2xl font-black text-accent display leading-tight">{result.treatmentPlan.dosage}</p>
                        </div>
                      </div>

                      <div className="bg-ink/[0.02] border border-ink/5 p-8 rounded-[32px] space-y-4 hover:bg-ink/[0.04] transition-colors group">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-ink shadow-sm group-hover:scale-110 transition-transform">
                          <Info size={24} />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-ink/30 uppercase tracking-widest">طريقة الاستخدام</span>
                          <p className="text-lg font-bold text-ink leading-snug">{result.treatmentPlan.usageMethod}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Symptoms & Prevention Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <section className="space-y-8 bg-cream/30 p-8 rounded-[40px] border border-olive/5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-500/10 text-red-600 rounded-2xl flex items-center justify-center">
                          <AlertCircle size={24} />
                        </div>
                        <h4 className="text-xl font-black display">الأعراض المكتشفة</h4>
                      </div>
                      <div className="space-y-3">
                        {result.symptoms.map((s, i) => (
                          <motion.div 
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.1 }}
                            key={i} 
                            className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-olive/5"
                          >
                            <div className="w-8 h-8 rounded-xl bg-red-500/5 flex items-center justify-center shrink-0">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                            </div>
                            <span className="text-sm font-bold text-ink/80">{s}</span>
                          </motion.div>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-8 bg-olive/5 p-8 rounded-[40px] border border-olive/5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-olive/10 text-olive rounded-2xl flex items-center justify-center">
                          <CheckCircle2 size={24} />
                        </div>
                        <h4 className="text-xl font-black display">إرشادات الوقاية</h4>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {result.prevention.map((p, i) => (
                          <motion.span 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.1 }}
                            key={i} 
                            className="bg-white text-olive px-6 py-3 rounded-2xl text-sm font-black border border-olive/10 shadow-sm hover:shadow-md transition-shadow cursor-default"
                          >
                            {p}
                          </motion.span>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Timing Timeline */}
                  <section className="space-y-8 pt-8 border-t border-olive/10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent/10 text-accent rounded-2xl flex items-center justify-center">
                        <RefreshCw size={24} />
                      </div>
                      <h4 className="text-xl font-black display">الجدول الزمني للعلاج</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {[
                        { label: "موعد البدء", value: result.timing.startTreatment, icon: Zap, color: "bg-accent/10 text-accent" },
                        { label: "عدد المرات", value: result.timing.frequency, icon: RefreshCw, color: "bg-olive/10 text-olive" },
                        { label: "الفترة البينية", value: result.timing.interval, icon: History, color: "bg-ink/5 text-ink" }
                      ].map((item, i) => (
                        <div key={i} className="bg-white border border-olive/5 p-6 rounded-[32px] flex items-center gap-5 shadow-sm hover:shadow-md transition-all">
                          <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center shrink-0`}>
                            <item.icon size={28} />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-ink/30 block uppercase tracking-widest font-black">{item.label}</span>
                            <p className="text-xl font-black leading-tight text-ink">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}

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
                  <h3 className="text-3xl display font-bold">سجل التشخيصات</h3>
                  <p className="text-sm text-ink/40">تتبع حالة نباتاتك عبر الزمن</p>
                </div>
                <button onClick={() => setView("main")} className="btn-olive px-6 py-2 text-sm font-bold">إغلاق</button>
              </div>

              {history.length === 0 ? (
                <div className="card-organic py-32 text-center space-y-6">
                  <div className="w-24 h-24 bg-olive/5 rounded-[40px] flex items-center justify-center mx-auto text-olive/20">
                    <History size={48} strokeWidth={1} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-bold display">لا يوجد سجل حتى الآن</p>
                    <p className="text-sm text-ink/40">ابدأ بتشخيص أول نبات لتراه هنا</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {history.map((item) => (
                    <motion.div 
                      whileHover={{ y: -4 }}
                      key={item.id}
                      onClick={() => {
                        setResult(item);
                        setImage(item.image);
                        setView("result");
                      }}
                      className="card-organic p-4 flex gap-5 cursor-pointer hover:border-olive/30 transition-all group"
                    >
                      <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                        <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex flex-col justify-center space-y-1">
                        <span className="text-[10px] font-bold text-olive/60 uppercase tracking-widest">{item.date}</span>
                        <h4 className="text-lg font-bold display leading-tight">{item.diseaseName}</h4>
                        <span className="text-sm text-ink/40 italic serif">{item.plantName}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

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
                  className="flex items-center gap-2 text-olive font-bold hover:gap-3 transition-all"
                >
                  <ChevronLeft size={20} className="rotate-180" />
                  <span>العودة للرئيسية</span>
                </button>
              </div>

              <div className="card-organic p-8 md:p-12 space-y-8 bg-white/80 backdrop-blur-xl border-none shadow-2xl">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-olive/10 rounded-2xl flex items-center justify-center text-olive">
                    <Sprout size={32} />
                  </div>
                  <h2 className="text-4xl font-black display text-ink">رسالة تهمك</h2>
                </div>

                <div className="space-y-6 text-lg leading-relaxed text-ink/80 font-medium">
                  <p>انطلق تطوير هذا التطبيق من واقع العمل الميداني، حيث تتكرر تحديات تشخيص الأمراض النباتية ودقتها، وما يترتب عليها من قرارات تؤثر بشكل مباشر على جودة الإنتاج وكفاءته.</p>
                  <p>تقوم فكرة التطبيق على تبسيط عملية التشخيص، من خلال تحليل صور النباتات وتحويلها إلى مؤشر تشخيصي مبدئي، يتبعه توجيه عملي يساعد المستخدم على اتخاذ خطوات أولية مدروسة نحو المعالجة بشكل أسرع وأكثر دقة.</p>
                  <p>ولا يهدف هذا التطبيق إلى استبدال الخبرة الزراعية، بل يأتي كأداة مساندة تعزز من كفاءة اتخاذ القرار، وتقلل من احتمالية الخطأ، مع التأكيد أن جميع النتائج تظل إرشادية وتخضع للتقييم وفق كل حالة وظروفها.</p>
                  <p>ويأتي هذا العمل امتدادًا لتوجهات رؤية المملكة 2030 في دعم التحول الرقمي، وتمكين التقنيات الحديثة لخدمة القطاع الزراعي، بما يسهم في رفع كفاءته وتحسين مخرجاته.</p>
                  <p>الهدف من هذا التطبيق هو تقديم قيمة عملية للمختصين والمزارعين، من خلال توفير الوقت والجهد، وتحسين جودة التشخيص، ودعم القرارات المبنية على المعرفة.</p>
                </div>

                <div className="pt-8 border-t border-olive/10 space-y-2">
                  <p className="font-black text-xl text-ink">أخوكم</p>
                  <p className="font-black text-xl text-ink">الفني الزراعي</p>
                  <p className="font-black text-2xl text-olive">محمد علي حفظي</p>
                  <p className="text-ink/60 font-bold">فرع وزارة البيئة والمياه والزراعة بمنطقة جازان</p>
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
            className="fixed inset-0 bg-cream/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 border-4 border-olive/10 border-t-olive rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <Logo className="w-full h-full opacity-40" />
              </div>
            </div>
            <div className="mt-8 space-y-2">
              <h3 className="text-xl font-bold serif">جاري تحليل الصورة...</h3>
              <p className="text-sm text-ink/60 max-w-xs">
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
            className="fixed bottom-8 left-6 right-6 z-50"
          >
            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex gap-3 items-center text-red-700 shadow-lg max-w-md mx-auto">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-sm font-medium">{error}</p>
              <button onClick={() => setError(null)} className="mr-auto">
                <RefreshCw size={16} />
              </button>
            </div>
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
            className="fixed bottom-8 left-6 right-6 z-50"
          >
            <div className="bg-olive border border-olive/20 p-4 rounded-2xl flex gap-3 items-center text-white shadow-lg max-w-md mx-auto">
              <CheckCircle2 size={20} className="shrink-0" />
              <p className="text-sm font-medium">{notification}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

