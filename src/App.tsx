import { useState, useEffect, useRef } from "react";
import { QuranService } from "./services/quranService";
import { TimerService } from "./services/timerService";
import type { SurahMeta, LastRead, QuranLanguage } from "./types/quran";
import type { DailyReadingStats } from "./services/timerService";
import { Navbar } from "./components/Navbar";
import { SurahList } from "./components/SurahList";
import { SurahReader } from "./components/SurahReader";
import { DailyGoalModal } from "./components/DailyGoalModal";
import { CheckCircle2 } from "lucide-react";

function App() {
  const [language, setLanguage] = useState<QuranLanguage>(() =>
    QuranService.getLanguage(),
  );
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  const [targetAyah, setTargetAyah] = useState<number | undefined>(undefined);
  const [lastRead, setLastRead] = useState<LastRead | null>(() =>
    QuranService.getLastRead(QuranService.getLanguage()),
  );

  // Daily Timer & Goal State (Pure Local Storage, separated by language)
  const [timerStats, setTimerStats] = useState<DailyReadingStats>(() =>
    TimerService.getStats(QuranService.getLanguage()),
  );
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [goalCelebrationToast, setGoalCelebrationToast] =
    useState<boolean>(false);

  const unsavedSecondsRef = useRef<number>(0);
  const languageRef = useRef<QuranLanguage>(language);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // PWA Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(true);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    try {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
      }
    } catch (err) {
      console.log("Install prompt error:", err);
    }
  };

  // Initialize Local Data & Listen for Tab Visibility & Midnight Rollover
  useEffect(() => {
    const currentLang = languageRef.current;
    const list = QuranService.getAllSurahs();
    setSurahs(list);
    setLastRead(QuranService.getLastRead(currentLang));
    setTimerStats(TimerService.getStats(currentLang));

    // Clean up any legacy sync keys from localStorage
    try {
      localStorage.removeItem("quran_bn_user_creds");
      localStorage.removeItem("quran_bn_last_sync_time");
      localStorage.removeItem("quran_bn_pending_sync");
    } catch {
      // Ignore
    }

    // Refresh stats & check day rollover when returning to tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const currentStats = TimerService.getStats(languageRef.current);
        setTimerStats(currentStats);
      }
    };

    // Periodic check for midnight rollover even if tab stays open idle
    const rolloverInterval = setInterval(() => {
      const todayStr = TimerService.getTodayString();
      setTimerStats((prev) => {
        if (prev.date !== todayStr) {
          unsavedSecondsRef.current = 0;
          return TimerService.getStats(languageRef.current);
        }
        return prev;
      });
    }, 30000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(rolloverInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Timer Tick while reading a Surah (isolated per language)
  useEffect(() => {
    if (!selectedSurahId || !isTimerRunning) return;

    const activeLang = language;

    const interval = setInterval(() => {
      // Pause if tab is inactive/hidden
      if (document.hidden) return;

      const todayStr = TimerService.getTodayString();

      setTimerStats((prev) => {
        // Midnight rollover check during active reading
        if (prev.date !== todayStr) {
          unsavedSecondsRef.current = 0;
          return TimerService.getStats(activeLang);
        }

        unsavedSecondsRef.current += 1;
        const nextSec = prev.secondsToday + 1;
        const targetSec = prev.targetMinutes * 60;

        // Celebrate reaching goal
        if (prev.secondsToday < targetSec && nextSec >= targetSec) {
          setGoalCelebrationToast(true);
          setTimeout(() => setGoalCelebrationToast(false), 5000);
        }

        return {
          ...prev,
          secondsToday: nextSec,
          totalAllTimeSeconds: prev.totalAllTimeSeconds + 1,
          updatedAt: Date.now(),
        };
      });

      // Persist to local storage every 5 seconds
      if (unsavedSecondsRef.current >= 5) {
        TimerService.addSeconds(unsavedSecondsRef.current, activeLang);
        unsavedSecondsRef.current = 0;
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (unsavedSecondsRef.current > 0) {
        TimerService.addSeconds(unsavedSecondsRef.current, activeLang);
        unsavedSecondsRef.current = 0;
      }
    };
  }, [selectedSurahId, isTimerRunning, language]);

  const handleChangeLanguage = (newLang: QuranLanguage) => {
    if (newLang === language) return;

    // Flush any unsaved seconds for the current language before switching
    if (unsavedSecondsRef.current > 0) {
      TimerService.addSeconds(unsavedSecondsRef.current, language);
      unsavedSecondsRef.current = 0;
    }

    QuranService.setLanguage(newLang);
    setLanguage(newLang);
    setLastRead(QuranService.getLastRead(newLang));
    setTimerStats(TimerService.getStats(newLang));
  };

  const handleSelectSurah = (id: number, ayah?: number) => {
    setSelectedSurahId(id);
    setTargetAyah(ayah);
    setIsTimerRunning(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToList = () => {
    setSelectedSurahId(null);
    setTargetAyah(undefined);
    if (unsavedSecondsRef.current > 0) {
      TimerService.addSeconds(unsavedSecondsRef.current, language);
      unsavedSecondsRef.current = 0;
    }
    setLastRead(QuranService.getLastRead(language));
    setTimerStats(TimerService.getStats(language));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentSurahMeta = selectedSurahId
    ? QuranService.getSurahMeta(selectedSurahId)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Goal Celebration Toast */}
      {goalCelebrationToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-800 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-600 animate-in fade-in slide-in-from-top-4 duration-300 max-w-[90vw]">
          <div className="w-8 h-8 rounded-full bg-white text-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">মাশাআল্লাহ! অভিনন্দন!</h4>
            <p className="text-xs text-emerald-100">
              আপনার আজকের ({language === "ar" ? "আরবি" : "বাংলা"}){" "}
              {timerStats.targetMinutes} মিনিটের পড়ার লক্ষ্য পূরণ হয়েছে!
            </p>
          </div>
        </div>
      )}

      {/* Navbar with Language Switcher & Daily Goal Widget */}
      <Navbar
        currentSurahId={selectedSurahId}
        onBackToList={handleBackToList}
        language={language}
        onChangeLanguage={handleChangeLanguage}
        timerStats={timerStats}
        isTimerRunning={isTimerRunning}
        onToggleTimer={() => {
          setIsTimerRunning((r) => {
            const next = !r;
            if (!next && unsavedSecondsRef.current > 0) {
              TimerService.addSeconds(unsavedSecondsRef.current, language);
              unsavedSecondsRef.current = 0;
            }
            return next;
          });
        }}
        onOpenGoalModal={() => setIsGoalModalOpen(true)}
      />

      {/* PWA Offline Install Banner */}
      {installPrompt &&
        showInstallBanner &&
        !isInstalled &&
        !selectedSurahId && (
          <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-4 py-2.5 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2 truncate">
              <span className="text-base shrink-0">📱</span>
              <span className="truncate">
                ইন্টারনেট ছাড়াই প্রতিদিন পড়তে অ্যাপটি মোবাইলে ইনস্টল করুন
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallApp}
                className="px-3 py-1 bg-white text-emerald-900 font-bold rounded-lg hover:bg-emerald-50 active:scale-95 transition-all text-xs cursor-pointer shadow-xs"
              >
                ইনস্টল করুন
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-emerald-300 hover:text-white p-1 text-sm cursor-pointer"
                title="লুকান"
              >
                ✕
              </button>
            </div>
          </div>
        )}

      {/* Main Content Area */}
      <main className="flex-1">
        {selectedSurahId && currentSurahMeta ? (
          <SurahReader
            surahId={selectedSurahId}
            surahMeta={currentSurahMeta}
            language={language}
            targetAyah={targetAyah}
            onSelectSurah={(id) => handleSelectSurah(id)}
            onBackToList={handleBackToList}
            onLastReadUpdated={(lr) => {
              setLastRead(lr);
            }}
          />
        ) : (
          <SurahList
            surahs={surahs}
            language={language}
            onChangeLanguage={handleChangeLanguage}
            onSelectSurah={handleSelectSurah}
            lastRead={lastRead}
            timerStats={timerStats}
            onOpenGoalModal={() => setIsGoalModalOpen(true)}
          />
        )}
      </main>

      {/* Daily Goal & Timer Modal */}
      <DailyGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        language={language}
        stats={timerStats}
        onStatsUpdated={(newStats, wasReset) => {
          if (wasReset) {
            unsavedSecondsRef.current = 0;
          }
          setTimerStats(newStats);
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 space-y-2">
        <p className="font-medium text-slate-700">
          আল-কুরআন — সহজ ও বিশুদ্ধ বাংলা অনুবাদ এবং ইন্দো-পাক আরবি তিলাওয়াত
        </p>
        <p className="text-slate-400">
          প্রতিদিন অন্তত ২০ মিনিট পাঠের লক্ষ্য • অফলাইন ও দ্রুতগতির সুবিধা
        </p>
      </footer>
    </div>
  );
}

export default App;
