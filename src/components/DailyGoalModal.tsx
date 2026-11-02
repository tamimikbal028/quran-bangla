import React from "react";
import type { DailyReadingStats } from "../services/timerService";
import { TimerService } from "../services/timerService";
import {
  toBengaliNumber,
  formatTimeBengaliFriendly,
  formatTimeMMSS,
} from "../utils/bengali";
import { X, Flame, Clock, Award, Target, RotateCcw } from "lucide-react";

interface DailyGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: DailyReadingStats;
  onStatsUpdated: (stats: DailyReadingStats) => void;
}

export const DailyGoalModal: React.FC<DailyGoalModalProps> = ({
  isOpen,
  onClose,
  stats,
  onStatsUpdated,
}) => {
  if (!isOpen) return null;

  const targetSeconds = stats.targetMinutes * 60;
  const progressPercent = Math.min(
    100,
    Math.round((stats.secondsToday / targetSeconds) * 100),
  );
  const isGoalReached = stats.secondsToday >= targetSeconds;

  const handleSetTarget = (minutes: number) => {
    const updated = TimerService.setTargetMinutes(minutes);
    onStatsUpdated(updated);
  };

  const handleResetToday = () => {
    if (window.confirm("আপনি কি আজকের পঠিত সময় ০ করতে চান?")) {
      const current = TimerService.getStats();
      current.secondsToday = 0;
      TimerService.saveStats(current);
      onStatsUpdated(current);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                দৈনিক পড়ার সময় ও লক্ষ্য
              </h3>
              <p className="text-xs text-slate-500">
                প্রতিদিন নিয়মিত কুরআন ভাবার্থ পড়ার ট্র্যাকার
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Progress Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200/80 text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <Target className="w-3.5 h-3.5" />
              <span>লক্ষ্য: {toBengaliNumber(stats.targetMinutes)} মিনিট</span>
            </div>

            <div className="space-y-1">
              <span className="text-3xl font-extrabold text-slate-900 block font-sans">
                {formatTimeMMSS(stats.secondsToday)}
              </span>
              <p className="text-xs text-slate-500">
                {isGoalReached ? (
                  <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                    <Award className="w-4 h-4" /> মাশাআল্লাহ! আজকের লক্ষ্য
                    সম্পন্ন হয়েছে!
                  </span>
                ) : (
                  <span>
                    আজকের {toBengaliNumber(progressPercent)}% সম্পন্ন হয়েছে
                  </span>
                )}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-emerald-100/80 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Streak */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 fill-amber-500/20" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">স্ট্রিক</span>
                <span className="text-sm font-bold text-slate-800">
                  {toBengaliNumber(stats.streakDays)} দিন
                </span>
              </div>
            </div>

            {/* All-time total */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-slate-500 block truncate">
                  সর্বমোট পাঠ
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block">
                  {formatTimeBengaliFriendly(stats.totalAllTimeSeconds)}
                </span>
              </div>
            </div>
          </div>

          {/* Goal Setting Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              দৈনিক পড়ার লক্ষ্য পরিবর্তন করুন:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 20, 30, 45].map((m) => (
                <button
                  key={m}
                  onClick={() => handleSetTarget(m)}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    stats.targetMinutes === m
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {toBengaliNumber(m)} মিনিট
                </button>
              ))}
            </div>
          </div>

          {/* Footer Reset option */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>প্রতিদিন মধ্যরাতে অটো রিসেট হয়</span>
            <button
              onClick={handleResetToday}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>আজকের সময় রিসেট</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
