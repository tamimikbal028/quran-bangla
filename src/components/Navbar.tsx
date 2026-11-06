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
import type { QuranLanguage } from "../types/quran";
import { formatTimeMMSS, toBengaliNumber } from "../utils/bengali";

interface NavbarProps {
  currentSurahId: number | null;
  onBackToList: () => void;
  language: QuranLanguage;
  onChangeLanguage: (lang: QuranLanguage) => void;
  timerStats: DailyReadingStats;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  onOpenGoalModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSurahId,
  onBackToList,
  language,
  onChangeLanguage,
  timerStats,
  isTimerRunning,
  onToggleTimer,
  onOpenGoalModal,
}) => {
  return (
    <header className="border-b border-emerald-900/10 bg-white/95 backdrop-blur-md sticky top-0 z-40 transition-shadow">
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {currentSurahId !== null && (
            <button
              onClick={onBackToList}
              className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer shrink-0"
              title="সকল সূরায় ফিরে যান"
              aria-label="সকল সূরায় ফিরে যান"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={onBackToList}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group min-w-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-xs shadow-emerald-700/20 group-hover:scale-105 transition-transform shrink-0">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight block leading-tight group-hover:text-emerald-800 transition-colors whitespace-nowrap">
                আল-কুরআন
              </span>
              <span className="text-[11px] text-emerald-700 font-medium hidden md:block truncate">
                {language === "ar"
                  ? "পবিত্র কুরআনুল কারীম (ইন্দো-পাক নূরানী লিপি)"
                  : "সহজ ও বিশুদ্ধ বাংলা অর্থ (মুহিউদ্দীন খান)"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Language Switcher, Reading Timer & Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Bangla / Arabic Mode Switcher */}
          <div
            className="flex items-center bg-slate-100/90 rounded-2xl p-1 border border-slate-200/80 shadow-2xs"
            role="tablist"
            aria-label="কুরআনের ভাষা নির্বাচন"
          >
            <button
              onClick={() => onChangeLanguage("bn")}
              role="tab"
              aria-selected={language === "bn"}
              className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                language === "bn"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="বাংলা অনুবাদ পড়ুন"
            >
              বাংলা
            </button>
            <button
              onClick={() => onChangeLanguage("ar")}
              role="tab"
              aria-selected={language === "ar"}
              className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                language === "ar"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="আরবি কুরআন (ইন্দো-পাক) পড়ুন"
            >
              আরবি
            </button>
          </div>

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
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-semibold hover:bg-white transition-all cursor-pointer text-slate-700"
              title={
                language === "ar"
                  ? "আরবি কুরআন — দৈনিক তিলাওয়াত লক্ষ্য ও পরিসংখ্যান"
                  : "বাংলা কুরআন — দৈনিক পড়ার লক্ষ্য ও পরিসংখ্যান"
              }
            >
              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />

              <span className="font-sans text-slate-900 font-bold">
                {formatTimeMMSS(timerStats.secondsToday)}
              </span>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
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
