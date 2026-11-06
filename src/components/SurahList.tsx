import React, { useState, useMemo } from "react";
import type { SurahMeta, LastRead, QuranLanguage } from "../types/quran";
import type { DailyReadingStats } from "../services/timerService";
import {
  toBengaliNumber,
  getRevelationTypeBengali,
  formatTimeMMSS,
} from "../utils/bengali";
import {
  Search,
  BookOpen,
  ArrowRight,
  Clock,
  Flame,
  CheckCircle2,
  Sliders,
} from "lucide-react";

interface SurahListProps {
  surahs: SurahMeta[];
  language: QuranLanguage;
  onChangeLanguage: (lang: QuranLanguage) => void;
  onSelectSurah: (id: number, targetAyah?: number) => void;
  lastRead: LastRead | null;
  timerStats: DailyReadingStats;
  onOpenGoalModal: () => void;
}

export const SurahList: React.FC<SurahListProps> = ({
  surahs,
  language,
  onChangeLanguage,
  onSelectSurah,
  lastRead,
  timerStats,
  onOpenGoalModal,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "meccan" | "medinan">(
    "all",
  );

  const targetSeconds = timerStats.targetMinutes * 60;
  const progressPercent = Math.min(
    100,
    Math.round((timerStats.secondsToday / targetSeconds) * 100),
  );
  const isGoalReached = timerStats.secondsToday >= targetSeconds;

  const filteredSurahs = useMemo(() => {
    return surahs.filter((surah) => {
      // Tab filter
      if (activeTab === "meccan" && surah.type !== "meccan") return false;
      if (activeTab === "medinan" && surah.type !== "medinan") return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase().trim();

      const matchesId =
        surah.id.toString() === query || toBengaliNumber(surah.id) === query;
      const matchesBangla = surah.banglaName.toLowerCase().includes(query);
      const matchesArabic = surah.name.includes(query);
      const matchesTranslit = surah.transliteration
        .toLowerCase()
        .includes(query);
      const matchesMeaning = surah.translation.toLowerCase().includes(query);

      return (
        matchesId ||
        matchesBangla ||
        matchesArabic ||
        matchesTranslit ||
        matchesMeaning
      );
    });
  }, [surahs, activeTab, searchTerm]);

  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white p-5 sm:p-9 shadow-lg shadow-emerald-900/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3.5">
          {/* Top Badges & Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 rounded-full bg-black/20 border border-white/15 backdrop-blur-xs">
              <button
                onClick={() => onChangeLanguage("bn")}
                className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  language === "bn"
                    ? "bg-white text-emerald-900 shadow-xs"
                    : "text-emerald-100 hover:text-white"
                }`}
              >
                বাংলা কুরআন
              </button>
              <button
                onClick={() => onChangeLanguage("ar")}
                className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  language === "ar"
                    ? "bg-white text-emerald-900 shadow-xs"
                    : "text-emerald-100 hover:text-white"
                }`}
              >
                আরবি কুরআন (ইন্দো-পাক)
              </button>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-emerald-100 border border-white/20">
              <Clock className="w-3.5 h-3.5" />
              প্রতিদিনের লক্ষ্য: {toBengaliNumber(timerStats.targetMinutes)}{" "}
              মিনিট
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-snug">
            {language === "ar"
              ? "পবিত্র কুরআনুল কারীম — মূল আরবি তিলাওয়াত"
              : "পবিত্র কুরআনের বিশুদ্ধ বাংলা ভাবার্থ"}
          </h1>
          <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed">
            {language === "ar"
              ? "স্পষ্ট ইন্দো-পাক নূরানী ফন্টে প্রতিদিন অন্তত ২০ মিনিট পবিত্র কুরআন তিলাওয়াত, রুকুভিত্তিক পাঠ ও সময় ট্র্যাকিং প্ল্যাটফর্ম।"
              : "সহজ বাংলা ভাষায় প্রতিদিন অন্তত ২০ মিনিট কুরআনের ভাবার্থ পাঠ ও অনুধাবনের প্ল্যাটফর্ম।"}
          </p>
        </div>
      </div>

      {/* Daily Goal & Continue Reading Dual Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Reading Tracker Card */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-200/90 shadow-xs flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                {language === "ar"
                  ? "আজকের তিলাওয়াত লক্ষ্য (আরবি)"
                  : "আজকের পড়ার লক্ষ্য (বাংলা)"}
              </span>
              <button
                onClick={onOpenGoalModal}
                className="text-xs text-slate-400 hover:text-emerald-700 inline-flex items-center gap-1 transition-colors cursor-pointer"
                title="লক্ষ্য পরিবর্তন"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>পরিবর্তন</span>
              </button>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-sans">
                  {formatTimeMMSS(timerStats.secondsToday)}
                </span>
                <span className="text-xs text-slate-400 ml-1.5">
                  / {toBengaliNumber(timerStats.targetMinutes)} মিনিট
                </span>
              </div>

              {timerStats.streakDays > 0 && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/80">
                  <Flame className="w-3.5 h-3.5 fill-amber-500" />
                  <span>
                    {toBengaliNumber(timerStats.streakDays)} দিন স্ট্রিক
                  </span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 mt-2">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-500">
              {isGoalReached ? (
                <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> আজকের লক্ষ্য সম্পন্ন
                  হয়েছে!
                </span>
              ) : (
                <span>{toBengaliNumber(progressPercent)}% সম্পন্ন হয়েছে</span>
              )}
            </span>

            <button
              onClick={onOpenGoalModal}
              className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
            >
              বিস্তারিত দেখুন →
            </button>
          </div>
        </div>

        {/* Continue Reading Card */}
        {lastRead ? (
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  {language === "ar"
                    ? "সর্বশেষ যেখান থেকে তিলাওয়াত হয়েছিল (আরবি)"
                    : "সর্বশেষ যেখান থেকে পড়া হয়েছিল (বাংলা)"}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate mt-0.5">
                  {lastRead.surahName} • আয়াত{" "}
                  {toBengaliNumber(lastRead.ayahNumber)}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ক্লিক করলেই সেখানে গিয়ে টাইমারসহ{" "}
                  {language === "ar" ? "তিলাওয়াত" : "পড়া"} চালু হবে
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() =>
                  onSelectSurah(lastRead.surahNumber, lastRead.ayahNumber)
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <span>
                  {language === "ar"
                    ? "তিলাওয়াত চালিয়ে যান"
                    : "পড়া চালিয়ে যান"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  {language === "ar"
                    ? "তিলাওয়াত শুরু করুন (আরবি)"
                    : "পড়া শুরু করুন (বাংলা)"}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  সূরা ১. আল-ফাতিহা
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  প্রথম সূরা দিয়ে আপনার আজকের{" "}
                  {language === "ar" ? "তিলাওয়াত" : "পাঠ"} শুরু করুন
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => onSelectSurah(1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <span>শুরু করুন</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search & Tabs Controls */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="সূরার নাম, অর্থ বা নম্বর দিয়ে খুঁজুন (যেমন: ফাতিহা, ১, বাকারাহ, ইয়াসীন)..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all text-sm sm:text-base shadow-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-lg cursor-pointer"
            >
              মুছে ফেলুন
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              সকল সূরা ({toBengaliNumber(114)})
            </button>
            <button
              onClick={() => setActiveTab("meccan")}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "meccan"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              মাক্কী ({toBengaliNumber(86)})
            </button>
            <button
              onClick={() => setActiveTab("medinan")}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "medinan"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              মাদানী ({toBengaliNumber(28)})
            </button>
          </div>

          <span className="text-[11px] sm:text-xs text-slate-500">
            মোট {toBengaliNumber(filteredSurahs.length)}টি সূরা
          </span>
        </div>
      </div>

      {/* Surahs Grid */}
      {filteredSurahs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">
            কোনো সূরা পাওয়া যায়নি
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            বানান সঠিক কিনা পরীক্ষা করুন অথবা অন্য কোনো শব্দ বা নম্বর দিয়ে
            খুঁজুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSurahs.map((surah) => (
            <div
              key={surah.id}
              onClick={() => onSelectSurah(surah.id)}
              className="group p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-500/60 hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 shadow-xs active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Number Badge */}
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-800 text-slate-700 font-bold text-sm flex items-center justify-center shrink-0 transition-colors">
                  {toBengaliNumber(surah.id)}
                </div>

                {/* Names & Meaning */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base text-slate-900 group-hover:text-emerald-800 truncate transition-colors leading-snug">
                      {surah.banglaName}
                    </h4>
                    {language === "ar" && (
                      <span
                        dir="rtl"
                        className="font-arabic text-lg text-emerald-800 font-normal leading-none shrink-0"
                      >
                        {surah.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {surah.translation}
                  </p>
                </div>
              </div>

              {/* Badges */}
              <div className="text-right shrink-0">
                <span
                  className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${
                    surah.type === "meccan"
                      ? "bg-amber-50 text-amber-800 border border-amber-200/60"
                      : "bg-teal-50 text-teal-800 border border-teal-200/60"
                  }`}
                >
                  {getRevelationTypeBengali(surah.type)}
                </span>
                <span className="block text-[11px] text-slate-400 mt-1">
                  {toBengaliNumber(surah.total_verses)} আয়াত
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
