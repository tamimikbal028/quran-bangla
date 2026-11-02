import React from "react";
import {
  BookOpen,
  Search,
  ArrowLeft,
  Clock,
  Flame,
  Pause,
  Play,
} from "lucide-react";
import type { DailyReadingStats } from "../services/timerService";
import { formatTimeMMSS, toBengaliNumber } from "../utils/bengali";

interface NavbarProps {
  currentSurahId: number | null;
  onBackToList: () => void;
  timerStats: DailyReadingStats;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  onOpenGoalModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSurahId,
  onBackToList,
  timerStats,
  isTimerRunning,
  onToggleTimer,
  onOpenGoalModal,
}) => {
  const targetSeconds = timerStats.targetMinutes * 60;
  const isGoalReached = timerStats.secondsToday >= targetSeconds;

  return (
    <header className="border-b border-emerald-900/10 bg-white/95 backdrop-blur-md sticky top-0 z-40 transition-shadow">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          {currentSurahId !== null && (
            <button
              onClick={onBackToList}
              className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
              title="সকল সূরায় ফিরে যান"
              aria-label="সকল সূরায় ফিরে যান"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={onBackToList}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-sm shadow-emerald-700/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight block leading-tight group-hover:text-emerald-800 transition-colors">
                আল-কুরআন - বাংলা
              </span>
              <span className="text-[11px] text-emerald-700 font-medium hidden sm:block">
                সহজ ও বিশুদ্ধ বাংলা অর্থ (মুহিউদ্দীন খান)
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Reading Timer & Navigation */}
        <div className="flex items-center gap-2">
          {/* Daily Goal Timer Pill */}
          <div className="flex items-center bg-slate-100/90 rounded-2xl p-1 border border-slate-200/80 shadow-2xs">
            {/* Play/Pause Button when inside a Surah */}
            {currentSurahId !== null && (
              <button
                onClick={onToggleTimer}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  isTimerRunning
                    ? "text-emerald-700 hover:bg-emerald-100/80"
                    : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                }`}
                title={isTimerRunning ? "টাইমার থামান" : "টাইমার চালু করুন"}
              >
                {isTimerRunning ? (
                  <Pause className="w-3.5 h-3.5 fill-emerald-600" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-slate-400" />
                )}
              </button>
            )}

            {/* Clickable Timer Badge to open Modal */}
            <button
              onClick={onOpenGoalModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold hover:bg-white transition-all cursor-pointer text-slate-700"
              title="দৈনিক পড়ার লক্ষ্য ও পরিসংখ্যান"
            >
              {isGoalReached ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ) : isTimerRunning && currentSurahId !== null ? (
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              )}

              <span className="font-sans text-slate-900 font-bold">
                {formatTimeMMSS(timerStats.secondsToday)}
              </span>

              <span className="text-[11px] text-slate-400 hidden xs:inline">
                / {toBengaliNumber(timerStats.targetMinutes)} মি.
              </span>

              {timerStats.streakDays > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-600 bg-amber-50 px-1 rounded font-bold">
                  <Flame className="w-3 h-3 fill-amber-500" />
                  {toBengaliNumber(timerStats.streakDays)}
                </span>
              )}
            </button>
          </div>

          {/* Surah List Button if inside reader */}
          {currentSurahId !== null && (
            <button
              onClick={onBackToList}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-colors cursor-pointer shadow-2xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>সূচী</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
