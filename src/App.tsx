import { useState, useEffect, useRef } from "react";
import { QuranService } from "./services/quranService";
import { TimerService } from "./services/timerService";
import type { SurahMeta, LastRead } from "./types/quran";
import type { DailyReadingStats } from "./services/timerService";
import { Navbar } from "./components/Navbar";
import { SurahList } from "./components/SurahList";
import { SurahReader } from "./components/SurahReader";
import { DailyGoalModal } from "./components/DailyGoalModal";
import { SyncModal } from "./components/SyncModal";
import { SyncService } from "./services/syncService";
import { CheckCircle2 } from "lucide-react";

function App() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  const [targetAyah, setTargetAyah] = useState<number | undefined>(undefined);
  const [lastRead, setLastRead] = useState<LastRead | null>(null);

  // Daily Timer & Goal State
  const [timerStats, setTimerStats] = useState<DailyReadingStats>(
    TimerService.getStats(),
  );
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [goalCelebrationToast, setGoalCelebrationToast] =
    useState<boolean>(false);

  // Sync State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isSyncConnected, setIsSyncConnected] = useState<boolean>(
    () => !!SyncService.getCredentials(),
  );
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(
    () => SyncService.getCredentials()?.username || null,
  );

  const unsavedSecondsRef = useRef<number>(0);

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

  // Initialize & Background Cloud Sync
  useEffect(() => {
    const list = QuranService.getAllSurahs();
    setSurahs(list);
    setLastRead(QuranService.getLastRead());
    setTimerStats(TimerService.getStats());

    // Auto-sync if connected
    const creds = SyncService.getCredentials();
    if (creds) {
      setIsSyncConnected(true);
      setLoggedInUsername(creds.username);
      SyncService.pullData().then((res) => {
        if (res.ok && res.hasChanges) {
          if (res.mergedLastRead !== undefined) setLastRead(res.mergedLastRead);
          if (res.mergedStats) setTimerStats(res.mergedStats);
        }
      });
    }

    // Pull when returning to tab & check day rollover
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const currentStats = TimerService.getStats();
        setTimerStats(currentStats);

        if (SyncService.getCredentials()) {
          SyncService.pullData().then((res) => {
            if (res.ok && res.hasChanges) {
              if (res.mergedLastRead !== undefined)
                setLastRead(res.mergedLastRead);
              if (res.mergedStats) setTimerStats(res.mergedStats);
            }
          });
        }
      }
    };

    // Auto-sync pending data when internet comes back online
    const handleOnline = () => {
      if (SyncService.getCredentials()) {
        SyncService.syncPending();
      }
    };

    // Periodic check for midnight rollover even if tab stays open idle
    const rolloverInterval = setInterval(() => {
      const todayStr = TimerService.getTodayString();
      setTimerStats((prev) => {
        if (prev.date !== todayStr) {
          unsavedSecondsRef.current = 0;
          return TimerService.getStats();
        }
        return prev;
      });
    }, 30000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    return () => {
      clearInterval(rolloverInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Timer Tick while reading a Surah
  useEffect(() => {
    if (!selectedSurahId || !isTimerRunning) return;

    const interval = setInterval(() => {
      // Pause if tab is inactive/hidden
      if (document.hidden) return;

      const todayStr = TimerService.getTodayString();

      setTimerStats((prev) => {
        // Midnight rollover check during active reading
        if (prev.date !== todayStr) {
          unsavedSecondsRef.current = 0;
          return TimerService.getStats();
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

      // Persist to local storage every 5 seconds (NO network call)
      if (unsavedSecondsRef.current >= 5) {
        TimerService.addSeconds(unsavedSecondsRef.current);
        unsavedSecondsRef.current = 0;
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (unsavedSecondsRef.current > 0) {
        TimerService.addSeconds(unsavedSecondsRef.current);
        unsavedSecondsRef.current = 0;
      }
      // Sync to cloud ONLY when timer stops or reader is closed
      if (SyncService.getCredentials()) {
        SyncService.pushData();
      }
    };
  }, [selectedSurahId, isTimerRunning]);

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
      TimerService.addSeconds(unsavedSecondsRef.current);
      unsavedSecondsRef.current = 0;
    }
    setLastRead(QuranService.getLastRead());
    setTimerStats(TimerService.getStats());
    if (isSyncConnected) {
      SyncService.pushData();
    }
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
              আপনার আজকের {timerStats.targetMinutes} মিনিটের পড়ার লক্ষ্য পূরণ
              হয়েছে!
            </p>
          </div>
        </div>
      )}

      {/* Navbar with Daily Goal Widget & Cloud Sync */}
      <Navbar
        currentSurahId={selectedSurahId}
        onBackToList={handleBackToList}
        timerStats={timerStats}
        isTimerRunning={isTimerRunning}
        onToggleTimer={() => {
          setIsTimerRunning((r) => {
            const next = !r;
            // When timer is paused/turned off, save seconds and push to cloud
            if (!next) {
              if (unsavedSecondsRef.current > 0) {
                TimerService.addSeconds(unsavedSecondsRef.current);
                unsavedSecondsRef.current = 0;
              }
              if (SyncService.getCredentials()) {
                SyncService.pushData();
              }
            }
            return next;
          });
        }}
        onOpenGoalModal={() => setIsGoalModalOpen(true)}
        isSyncConnected={isSyncConnected}
        loggedInUsername={loggedInUsername}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
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
            targetAyah={targetAyah}
            onSelectSurah={(id) => handleSelectSurah(id)}
            onBackToList={handleBackToList}
            onLastReadUpdated={(lr) => {
              setLastRead(lr);
              if (isSyncConnected) {
                SyncService.pushData();
              }
            }}
          />
        ) : (
          <SurahList
            surahs={surahs}
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
        stats={timerStats}
        onStatsUpdated={(newStats, wasReset) => {
          if (wasReset) {
            unsavedSecondsRef.current = 0;
          }
          setTimerStats(newStats);
          if (isSyncConnected) {
            SyncService.pushData();
          }
        }}
      />

      {/* Cloud Sync / Account Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => {
          setIsSyncModalOpen(false);
          const current = SyncService.getCredentials();
          setIsSyncConnected(!!current);
          setLoggedInUsername(current?.username || null);
        }}
        onDataSynced={({ lastRead: lr, timerStats: ts }) => {
          if (lr !== undefined) setLastRead(lr);
          if (ts) setTimerStats(ts);
          const current = SyncService.getCredentials();
          setIsSyncConnected(!!current);
          setLoggedInUsername(current?.username || null);
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 space-y-2">
        <p className="font-medium text-slate-700">
          আল-কুরআন — সহজ ও বিশুদ্ধ বাংলা অনুবাদ
        </p>
        <p className="text-slate-400">
          প্রতিদিন অন্তত ২০ মিনিট পাঠের লক্ষ্য • অফলাইন ও দ্রুতগতির সুবিধা
        </p>
      </footer>
    </div>
  );
}

export default App;
