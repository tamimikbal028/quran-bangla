import React, { useState, useMemo } from "react";
import type { SurahMeta, LastRead } from "../types/quran";
import { toBengaliNumber, getRevelationTypeBengali } from "../utils/bengali";
import { Search, BookOpen, Sparkles, ArrowRight } from "lucide-react";

interface SurahListProps {
  surahs: SurahMeta[];
  onSelectSurah: (id: number, targetAyah?: number) => void;
  lastRead: LastRead | null;
}

export const SurahList: React.FC<SurahListProps> = ({
  surahs,
  onSelectSurah,
  lastRead,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "meccan" | "medinan">(
    "all",
  );

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
      const matchesTranslit = surah.transliteration
        .toLowerCase()
        .includes(query);
      const matchesMeaning = surah.translation.toLowerCase().includes(query);

      return matchesId || matchesBangla || matchesTranslit || matchesMeaning;
    });
  }, [surahs, activeTab, searchTerm]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 sm:p-9 shadow-lg shadow-emerald-900/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-emerald-100 border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            বিশুদ্ধ ও সহজ বাংলা অনুবাদ
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-snug">
            পবিত্র কুরআনের বিশুদ্ধ বাংলা ভাবার্থ
          </h1>
          <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed">
            কোনো জটিলতা ছাড়া কেবল বাংলা ভাষায় কুরআনের বাণী অনুধাবন ও অধ্যয়নের
            জন্য তৈরি বিশেষ প্ল্যাটফর্ম।
          </p>
        </div>
      </div>

      {/* Continue Reading Card (if available) */}
      {lastRead && (
        <div className="p-5 rounded-2xl bg-white border border-emerald-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-emerald-400">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
                সর্বশেষ পঠিত
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {lastRead.surahName} • আয়াত{" "}
                {toBengaliNumber(lastRead.ayahNumber)}
              </h3>
              <p className="text-xs text-slate-500">
                যেখান থেকে পড়া থামিয়েছিলেন সেখান থেকে পড়া শুরু করুন
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              onSelectSurah(lastRead.surahNumber, lastRead.ayahNumber)
            }
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all shadow-sm shadow-emerald-700/20 active:scale-95 cursor-pointer shrink-0"
          >
            <span>পড়া চালিয়ে যান</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

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
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-lg"
            >
              মুছে ফেলুন
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              সকল সূরা ({toBengaliNumber(114)})
            </button>
            <button
              onClick={() => setActiveTab("meccan")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "meccan"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              মাক্কী ({toBengaliNumber(86)})
            </button>
            <button
              onClick={() => setActiveTab("medinan")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "medinan"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              মাদানী ({toBengaliNumber(28)})
            </button>
          </div>

          <span className="text-xs text-slate-500">
            মোট {toBengaliNumber(filteredSurahs.length)}টি সূরা প্রদর্শিত
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
                  <h4 className="font-bold text-base text-slate-900 group-hover:text-emerald-800 truncate transition-colors leading-snug">
                    {surah.banglaName}
                  </h4>
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
