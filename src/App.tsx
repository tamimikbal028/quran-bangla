import { useState, useEffect, useRef } from "react";
import { QuranService } from "./services/quranService";
import { TimerService } from "./services/timerService";
import type { SurahMeta, LastRead } from "./types/quran";
import type { DailyReadingStats } from "./services/timerService";
import { Navbar } from "./components/Navbar";
import { SurahList } from "./components/SurahList";
import { SurahReader } from "./components/SurahReader";
import { DailyGoalModal } from "./components/DailyGoalModal";
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

  const unsavedSecondsRef = useRef<number>(0);

  // Initialize
  useEffect(() => {
    const list = QuranService.getAllSurahs();
    setSurahs(list);
    setLastRead(QuranService.getLastRead());
    setTimerStats(TimerService.getStats());
  }, []);

  // Timer Tick while reading a Surah
  useEffect(() => {
    if (!selectedSurahId || !isTimerRunning) return;

    const interval = setInterval(() => {
      // Pause if tab is inactive/hidden
      if (document.hidden) return;

      unsavedSecondsRef.current += 1;

      setTimerStats((prev) => {
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
        };
      });

      // Persist to storage every 5 seconds
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
    setLastRead(QuranService.getLastRead());
    setTimerStats(TimerService.getStats());
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

      {/* Navbar with Daily Goal Widget */}
      <Navbar
        currentSurahId={selectedSurahId}
        onBackToList={handleBackToList}
        timerStats={timerStats}
        isTimerRunning={isTimerRunning}
        onToggleTimer={() => setIsTimerRunning((r) => !r)}
        onOpenGoalModal={() => setIsGoalModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {selectedSurahId && currentSurahMeta ? (
          <SurahReader
            surahId={selectedSurahId}
            surahMeta={currentSurahMeta}
            targetAyah={targetAyah}
            onSelectSurah={(id) => handleSelectSurah(id)}
            onBackToList={handleBackToList}
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
        onStatsUpdated={(newStats) => setTimerStats(newStats)}
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
