import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  Sparkles,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Award,
  Zap,
  BookOpen,
} from "lucide-react";

export const OnboardingModal: React.FC = () => {
  const { user } = useAuth();
  const { language, setLanguage } = useTheme();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [level, setLevel] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">("BEGINNER");
  const [goal, setGoal] = useState<string>("khqr_rails");

  useEffect(() => {
    if (!user) return;
    const completed = localStorage.getItem(`elms_onboarded_${user.id}`);
    if (!completed) {
      setOpen(true);
    }
  }, [user]);

  const handleFinish = () => {
    if (user) {
      localStorage.setItem(`elms_onboarded_${user.id}`, "true");
      localStorage.setItem(`elms_pref_level_${user.id}`, level);
      localStorage.setItem(`elms_pref_goal_${user.id}`, goal);
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Progress header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <Sparkles className="h-4 w-4" />
            <span>Welcome to ELMS FinTech</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? "w-6 bg-emerald-600" : s < step ? "w-2 bg-emerald-300" : "w-2 bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Language Preference */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Choose your preferred language
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Select the language you want to explore course catalogs, assessments, and financial tools in.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`p-4 rounded-2xl border text-left transition ${
                  language === "en"
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <span className="text-2xl block mb-2">🇺🇸</span>
                <span className="font-bold text-sm block">English</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">International FinTech Standard</span>
              </button>

              <button
                type="button"
                onClick={() => setLanguage("km")}
                className={`p-4 rounded-2xl border text-left transition ${
                  language === "km"
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <span className="text-2xl block mb-2">🇰🇭</span>
                <span className="font-bold text-sm block">ភាសាខ្មែរ</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">សម្រាប់សិក្ខាកាមកម្ពុជា</span>
              </button>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="btn-primary inline-flex items-center gap-2 text-xs sm:text-sm px-6 py-2.5 rounded-xl font-bold"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Experience Level */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              What is your current financial background?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              We personalize course suggestions and practice difficulty to your background.
            </p>

            <div className="space-y-2.5 pt-1">
              {[
                {
                  id: "BEGINNER",
                  title: "Beginner / Personal Finance",
                  desc: "Students, newcomers, and individuals seeking financial literacy & budgeting.",
                },
                {
                  id: "INTERMEDIATE",
                  title: "Banking & Credit Analyst",
                  desc: "Credit officers, loan appraisers, and CBC risk analysts.",
                },
                {
                  id: "ADVANCED",
                  title: "FinTech Engineer & Treasury",
                  desc: "Developers and leaders integrating Bakong KHQR rails and NBC prudential ratios.",
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setLevel(opt.id as any)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                    level === opt.id
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`h-4 w-4 mt-0.5 rounded-full border flex items-center justify-center ${
                      level === opt.id ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
                    }`}
                  >
                    {level === opt.id && <span className="h-1.5 w-1.5 bg-white rounded-full" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm">{opt.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="btn-primary inline-flex items-center gap-2 text-xs sm:text-sm px-6 py-2.5 rounded-xl font-bold"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Learning Goal */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Select your primary learning objective
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              You can explore all modules anytime, but this highlights relevant tools on your dashboard.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {[
                { id: "khqr_rails", title: "Master KHQR & Bakong", icon: Zap },
                { id: "cbc_scoring", title: "Credit Risk & CBC Scoring", icon: ShieldCheck },
                { id: "nbc_regulations", title: "NBC Regulatory Compliance", icon: BookOpen },
                { id: "financial_modeling", title: "Loan Amortization & Modeling", icon: Award },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setGoal(item.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center gap-3 ${
                    goal === item.id
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <item.icon className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs font-bold leading-tight">{item.title}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                onClick={() => setStep(2)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                className="btn-primary inline-flex items-center gap-2 text-xs sm:text-sm px-6 py-2.5 rounded-xl font-bold"
              >
                <CheckCircle className="h-4 w-4" /> Start Learning Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
