import React, { useState, useEffect, useRef, useMemo } from "react";
import type {
  SurahDetail,
  SurahMeta,
  ReadingMode,
  FontSize,
  LastRead,
  Ayah,
  QuranLanguage,
} from "../types/quran";
import { QuranService } from "../services/quranService";
import {
  toBengaliNumber,
  toArabicNumber,
  getRevelationTypeBengali,
} from "../utils/bengali";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Search,
  LayoutGrid,
  AlignLeft,
  BookOpen,
  ArrowUp,
  X,
  CheckCircle2,
  BookmarkCheck,
} from "lucide-react";

interface SurahReaderProps {
  surahId: number;
  surahMeta: SurahMeta;
  language: QuranLanguage;
  targetAyah?: number;
  onSelectSurah: (id: number) => void;
  onBackToList: () => void;
  onLastReadUpdated?: (lastRead: LastRead) => void;
}

interface RukuGroup {
  rukuIndexInSurah: number;
  globalRukuNumber: number;
  startAyah: number;
  endAyah: number;
  ayahs: Ayah[];
}

export const SurahReader: React.FC<SurahReaderProps> = ({
  surahId,
  surahMeta,
  language,
  targetAyah,
  onSelectSurah,
  onBackToList,
  onLastReadUpdated,
}) => {
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [readingMode, setReadingMode] = useState<ReadingMode>("ruku");
  const [fontSize, setFontSize] = useState<FontSize>("lg");
  const [inSurahQuery, setInSurahQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [copiedAyah, setCopiedAyah] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [currentLastRead, setCurrentLastRead] = useState<LastRead | null>(() =>
    QuranService.getLastRead(language),
  );

  const isArabic = language === "ar";
  const ayahRefs = useRef<{ [key: number]: HTMLElement | null }>({});

  // Sync currentLastRead when language changes
  useEffect(() => {
    setCurrentLastRead(QuranService.getLastRead(language));
  }, [language]);

  // Show Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Track scroll position for floating back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load Surah detail (DO NOT AUTO-OVERWRITE LAST READ)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    QuranService.getSurahDetail(surahId, language)
      .then((detail) => {
        if (isMounted && detail) {
          setSurahDetail(detail);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load surah:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [surahId, language]);

  // Scroll to target ayah if provided (e.g. from Home's "পড়া চালিয়ে যান")
  useEffect(() => {
    if (!loading && targetAyah && ayahRefs.current[targetAyah]) {
      const timer = setTimeout(() => {
        ayahRefs.current[targetAyah]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [loading, targetAyah]);

  // Manual Last Read Bookmark (user clicks the ayah or button)
  const handleSetLastRead = (ayahNumber: number) => {
    const updated: LastRead = {
      surahNumber: surahId,
      surahName: surahMeta.banglaName,
      ayahNumber,
      updatedAt: Date.now(),
    };
    QuranService.setLastRead(updated, language);
    setCurrentLastRead(updated);
    onLastReadUpdated?.(updated);
    showToast(
      `পড়ার স্থান চিহ্নিত (${isArabic ? "আরবি" : "বাংলা"}): ${surahMeta.banglaName}, আয়াত ${toBengaliNumber(ayahNumber)}`,
    );
  };

  // Handle Copy Single Ayah
  const handleCopyAyah = (ayahNumber: number, text: string) => {
    const copyString = `${surahMeta.banglaName}, আয়াত ${toBengaliNumber(ayahNumber)}:\n${text}`;
    navigator.clipboard.writeText(copyString).then(() => {
      setCopiedAyah(ayahNumber);
      showToast("আয়াত সফলভাবে কপি করা হয়েছে");
      setTimeout(() => setCopiedAyah(null), 2000);
    });
  };

  // Handle Copy Entire Ruku
  const handleCopyRuku = (group: RukuGroup) => {
    const versesText = group.ayahs
      .map((a) => `(${toBengaliNumber(a.numberInSurah)}) ${a.text}`)
      .join(" ");
    const copyString = `সূরা ${surahMeta.banglaName}, রুকু ${toBengaliNumber(group.rukuIndexInSurah)} (আয়াত ${toBengaliNumber(group.startAyah)}-${toBengaliNumber(group.endAyah)}):\n${versesText}`;
    navigator.clipboard.writeText(copyString).then(() => {
      showToast(
        `রুকু ${toBengaliNumber(group.rukuIndexInSurah)} কপি করা হয়েছে`,
      );
    });
  };

  // Group Ayahs into Rukus
  const rukuGroups = useMemo<RukuGroup[]>(() => {
    if (!surahDetail) return [];

    const groups: RukuGroup[] = [];
    let currentGroup: RukuGroup | null = null;
    let rukuCounter = 1;

    for (const ayah of surahDetail.ayahs) {
      const rukuNum = ayah.ruku ?? 1;

      if (!currentGroup || currentGroup.globalRukuNumber !== rukuNum) {
        if (currentGroup) {
          groups.push(currentGroup);
          rukuCounter += 1;
        }
        currentGroup = {
          rukuIndexInSurah: rukuCounter,
          globalRukuNumber: rukuNum,
          startAyah: ayah.numberInSurah,
          endAyah: ayah.numberInSurah,
          ayahs: [ayah],
        };
      } else {
        currentGroup.ayahs.push(ayah);
        currentGroup.endAyah = ayah.numberInSurah;
      }
    }

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  }, [surahDetail]);

  // Filtered Rukus if in-surah search active
  const filteredRukuGroups = useMemo(() => {
    if (!inSurahQuery.trim()) return rukuGroups;
    const q = inSurahQuery.toLowerCase().trim();

    return rukuGroups
      .map((group) => {
        const matchingAyahs = group.ayahs.filter(
          (a) =>
            a.text.toLowerCase().includes(q) ||
            a.numberInSurah.toString() === q ||
            toBengaliNumber(a.numberInSurah) === q,
        );
        return {
          ...group,
          ayahs: matchingAyahs,
        };
      })
      .filter((group) => group.ayahs.length > 0);
  }, [rukuGroups, inSurahQuery]);

  // Font size classes optimized for mobile & desktop (Bangla vs Indo-Pak Arabic)
  const fontClass = useMemo(() => {
    if (isArabic) {
      switch (fontSize) {
        case "sm":
          return "text-2xl sm:text-3xl leading-[2.3] sm:leading-[2.5]";
        case "base":
          return "text-3xl sm:text-4xl leading-[2.4] sm:leading-[2.6]";
        case "lg":
          return "text-3xl sm:text-[42px] leading-[2.5] sm:leading-[2.7]";
        case "xl":
          return "text-4xl sm:text-5xl leading-[2.6] sm:leading-[2.8]";
        case "2xl":
          return "text-4xl sm:text-6xl leading-[2.7]";
        default:
          return "text-3xl sm:text-[42px] leading-[2.5] sm:leading-[2.7]";
      }
    }

    switch (fontSize) {
      case "sm":
        return "text-base sm:text-lg leading-relaxed";
      case "base":
        return "text-lg sm:text-xl leading-relaxed sm:leading-loose";
      case "lg":
        return "text-xl sm:text-2xl leading-relaxed sm:leading-loose";
      case "xl":
        return "text-2xl sm:text-3xl leading-relaxed sm:leading-loose";
      case "2xl":
        return "text-2xl sm:text-4xl leading-loose";
      default:
        return "text-xl sm:text-2xl leading-relaxed sm:leading-loose";
    }
  }, [fontSize, isArabic]);

  // Filtered Ayahs if in-surah search active (for cards & continuous)
  const filteredAyahs = useMemo(() => {
    if (!surahDetail) return [];
    if (!inSurahQuery.trim()) return surahDetail.ayahs;
    const q = inSurahQuery.toLowerCase().trim();
    return surahDetail.ayahs.filter(
      (a) =>
        a.text.toLowerCase().includes(q) ||
        a.numberInSurah.toString() === q ||
        toBengaliNumber(a.numberInSurah) === q,
    );
  }, [surahDetail, inSurahQuery]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-base font-semibold text-slate-700">
          সূরা {surahMeta.banglaName} লোড হচ্ছে...
        </h3>
      </div>
    );
  }

  if (!surahDetail) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h3 className="text-lg font-bold text-red-600">
          সূরা লোড করতে সমস্যা হয়েছে
        </h3>
        <button
          onClick={onBackToList}
          className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm cursor-pointer"
        >
          তালিকায় ফিরে যান
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md transition-all whitespace-nowrap">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Scroll to Top FAB (Mobile Friendly) */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg flex items-center justify-center transition-all cursor-pointer active:scale-95"
          title="পৃষ্ঠার শুরুতে যান"
          aria-label="পৃষ্ঠার শুরুতে যান"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Surah Top Header Banner */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white p-4 sm:p-8 shadow-lg shadow-emerald-900/10 space-y-3 sm:space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        {/* Navigation between surahs */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-emerald-100 gap-1">
          <button
            onClick={() => onSelectSurah(surahId - 1)}
            disabled={surahId <= 1}
            className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors ${
              surahId <= 1
                ? "opacity-30 pointer-events-none"
                : "cursor-pointer active:scale-95"
            }`}
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span className="truncate">পূর্ববর্তী</span>
          </button>

          <span className="text-white/90 font-semibold text-xs sm:text-sm whitespace-nowrap text-center">
            সূরা {toBengaliNumber(surahId)} / {toBengaliNumber(114)}
          </span>

          <button
            onClick={() => onSelectSurah(surahId + 1)}
            disabled={surahId >= 114}
            className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors ${
              surahId >= 114
                ? "opacity-30 pointer-events-none"
                : "cursor-pointer active:scale-95"
            }`}
          >
            <span className="truncate">পরবর্তী</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {/* Title & Info */}
        <div className="text-center space-y-1.5 sm:space-y-2 pt-1 sm:pt-2">
          {isArabic && (
            <p
              dir="rtl"
              className="font-arabic text-3xl sm:text-5xl text-emerald-100 leading-normal"
            >
              سُوْرَةُ {surahMeta.name}
            </p>
          )}
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            সূরা {surahMeta.banglaName}
          </h1>
          <p className="text-emerald-100 text-xs sm:text-base font-medium">
            অর্থ: {surahMeta.translation}
          </p>
          <div className="inline-flex items-center gap-1.5 sm:gap-2 pt-1 text-[11px] sm:text-xs text-emerald-200 flex-wrap justify-center">
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-white/15 border border-white/20">
              {isArabic ? "ইন্দো-পাক আরবি" : "বাংলা অনুবাদ"}
            </span>
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-white/15 border border-white/20">
              {getRevelationTypeBengali(surahMeta.type)}
            </span>
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-white/15 border border-white/20">
              {toBengaliNumber(surahMeta.total_verses)} আয়াত
            </span>
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-white/15 border border-white/20">
              {toBengaliNumber(rukuGroups.length)} রুকু
            </span>
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Reader Controls Bar */}
      <div className="sticky top-16 z-30 p-1.5 sm:p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          {/* 3 Reading Modes: আয়াত / রুকু / বই */}
          <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 bg-slate-100 rounded-xl shrink-0">
            <button
              onClick={() => setReadingMode("cards")}
              className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                readingMode === "cards"
                  ? "bg-white text-emerald-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="আয়াতভিত্তিক কার্ড মোড"
            >
              <LayoutGrid className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>আয়াত</span>
            </button>

            <button
              onClick={() => setReadingMode("ruku")}
              className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                readingMode === "ruku"
                  ? "bg-white text-emerald-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="রুকুভিত্তিক পাঠ মোড"
            >
              <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>রুকু</span>
            </button>

            <button
              onClick={() => setReadingMode("continuous")}
              className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                readingMode === "continuous"
                  ? "bg-white text-emerald-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="ধারাবাহিক বই মোড"
            >
              <AlignLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>বই</span>
            </button>
          </div>

          {/* Right Action: Font Sizes & Search Toggle */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Font Size Pills */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-xl">
              {(["sm", "base", "lg", "xl"] as FontSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer ${
                    fontSize === size
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {size === "sm" && "ছোট"}
                  {size === "base" && (
                    <>
                      <span className="hidden sm:inline">স্বাভাবিক</span>
                      <span className="sm:hidden">মাঝারি</span>
                    </>
                  )}
                  {size === "lg" && "বড়"}
                  {size === "xl" && "বিশাল"}
                </button>
              ))}
            </div>

            {/* In-Surah Search Toggle Button */}
            <button
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors cursor-pointer ${
                isSearchOpen || inSurahQuery
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              title="এই সূরায় খুঁজুন"
              aria-label="এই সূরায় খুঁজুন"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Search Input */}
        {(isSearchOpen || inSurahQuery) && (
          <div className="relative pt-1 animate-in fade-in duration-150">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={inSurahQuery}
              onChange={(e) => setInSurahQuery(e.target.value)}
              placeholder="এই সূরার আয়াতে কোনো শব্দ খুঁজুন..."
              autoFocus
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {inSurahQuery ? (
              <button
                onClick={() => setInSurahQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                ✕
              </button>
            ) : (
              <button
                onClick={() => setIsSearchOpen(false)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bismillah Header (Except Surah At-Tawbah #9, and in Arabic mode Surah #1 already has Bismillah as Ayah 1) */}
      {surahId !== 9 && !(isArabic && surahId === 1) && (
        <div className="py-4 sm:py-6 px-4 text-center bg-emerald-50/70 border border-emerald-200/70 rounded-2xl">
          {isArabic ? (
            <p
              dir="rtl"
              className="text-emerald-900 font-normal text-2xl sm:text-4xl tracking-normal font-arabic leading-relaxed"
            >
              بِسۡمِ اللّٰهِ الرَّحۡمٰنِ الرَّحِيۡمِ
            </p>
          ) : (
            <p className="text-emerald-900 font-semibold text-base sm:text-xl tracking-wide font-sans">
              পরম করুণাময় অসীম দয়ালু আল্লাহর নামে
            </p>
          )}
        </div>
      )}

      {/* Helpful Hint */}
      <div className="px-3.5 py-2 rounded-xl bg-slate-100/90 text-slate-600 text-xs flex items-center justify-between border border-slate-200/80">
        <span className="inline-flex items-center gap-1.5">
          <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            যে আয়াতে পড়া থামাবেন, সেটিতে ক্লিক করলেই পড়ার অবস্থান সেভ হয়ে
            থাকবে।
          </span>
        </span>
      </div>

      {/* Search results notice */}
      {inSurahQuery && (
        <div className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 text-xs flex items-center justify-between border border-amber-200">
          <span>
            খুঁজে পাওয়া গেছে:{" "}
            <strong>{toBengaliNumber(filteredAyahs.length)}</strong> টি আয়াত
          </span>
          <button
            onClick={() => setInSurahQuery("")}
            className="underline text-amber-900 font-medium cursor-pointer"
          >
            ফিল্টার সরান
          </button>
        </div>
      )}

      {/* MAIN CONTENT BASED ON SELECTED READING MODE */}
      {readingMode === "ruku" ? (
        /* 1. RUKU-WISE PARAGRAPH MODE */
        <div className="space-y-4 sm:space-y-6">
          {filteredRukuGroups.map((group) => {
            const hasMarkedAyah = group.ayahs.some(
              (a) =>
                currentLastRead?.surahNumber === surahId &&
                currentLastRead?.ayahNumber === a.numberInSurah,
            );

            return (
              <div
                key={group.globalRukuNumber}
                className={`p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border transition-all duration-300 shadow-2xs space-y-4 ${
                  hasMarkedAyah
                    ? "border-emerald-500/80 ring-1 ring-emerald-500/20"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                {/* Ruku Header Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs">
                      রুকু {toBengaliNumber(group.rukuIndexInSurah)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      আয়াত {toBengaliNumber(group.startAyah)} হতে{" "}
                      {toBengaliNumber(group.endAyah)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[11px] text-slate-400">
                      {toBengaliNumber(group.ayahs.length)}টি আয়াত
                    </span>
                    <button
                      onClick={() => handleCopyRuku(group)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="সম্পূর্ণ রুকু কপি করুন"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Ruku Cohesive Paragraph */}
                <div
                  dir={isArabic ? "rtl" : "ltr"}
                  className={`text-slate-800 ${
                    isArabic
                      ? "font-arabic text-right"
                      : "font-sans text-justify leading-relaxed sm:leading-loose"
                  } ${fontClass} break-words`}
                >
                  {group.ayahs.map((ayah) => {
                    const isThisMarked =
                      currentLastRead?.surahNumber === surahId &&
                      currentLastRead?.ayahNumber === ayah.numberInSurah;
                    const isTarget = targetAyah === ayah.numberInSurah;

                    return (
                      <span
                        key={ayah.numberInSurah}
                        ref={(el) => {
                          ayahRefs.current[ayah.numberInSurah] = el;
                        }}
                        onClick={() => handleSetLastRead(ayah.numberInSurah)}
                        className={`inline cursor-pointer transition-colors rounded px-1 py-0.5 ${
                          isThisMarked
                            ? "bg-emerald-100 text-slate-950 font-medium ring-1 ring-emerald-400"
                            : isTarget
                              ? "bg-emerald-50 text-slate-900 ring-1 ring-emerald-300"
                              : "hover:bg-emerald-50/70"
                        }`}
                        title={`আয়াত ${toBengaliNumber(ayah.numberInSurah)} - ক্লিক করে পড়ার অবস্থান চিহ্নিত করুন`}
                      >
                        <span>{ayah.text} </span>
                        <span
                          className={`inline-grid place-items-center min-w-[24px] h-[24px] sm:min-w-[26px] sm:h-[26px] px-1.5 rounded-full text-[11px] sm:text-[13px] font-bold leading-none font-['Hind_Siliguri',sans-serif] mx-1 align-middle transition-all shrink-0 bg-emerald-100 text-emerald-900 ${
                            isThisMarked ? "ring-1 ring-emerald-600" : ""
                          }`}
                        >
                          {isArabic
                            ? toArabicNumber(ayah.numberInSurah)
                            : toBengaliNumber(ayah.numberInSurah)}
                        </span>{" "}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : readingMode === "cards" ? (
        /* 2. AYAH-BY-AYAH CARDS MODE */
        <div className="space-y-3 sm:space-y-4">
          {filteredAyahs.map((ayah) => {
            const isCopied = copiedAyah === ayah.numberInSurah;
            const isThisMarked =
              currentLastRead?.surahNumber === surahId &&
              currentLastRead?.ayahNumber === ayah.numberInSurah;
            const isTargetHighlight = targetAyah === ayah.numberInSurah;

            return (
              <div
                key={ayah.numberInSurah}
                ref={(el) => {
                  ayahRefs.current[ayah.numberInSurah] = el;
                }}
                className={`p-4 sm:p-6 rounded-2xl bg-white border transition-all duration-300 shadow-2xs space-y-3 sm:space-y-4 ${
                  isThisMarked
                    ? "border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50/25"
                    : isTargetHighlight
                      ? "border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/10"
                      : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                {/* Ayah Top Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                        isThisMarked
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {toBengaliNumber(ayah.numberInSurah)}
                    </span>
                    <span className="text-[11px] sm:text-xs text-slate-400">
                      আয়াত {toBengaliNumber(ayah.numberInSurah)}
                    </span>
                    {ayah.ruku && (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        রুকু
                      </span>
                    )}
                  </div>

                  {/* Actions: Copy & Mark as Last Read */}
                  <div className="flex items-center gap-1.5">
                    {/* Mark as Last Read Button */}
                    <button
                      onClick={() => handleSetLastRead(ayah.numberInSurah)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                        isThisMarked
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-500"
                      }`}
                      title={
                        isThisMarked
                          ? "পড়ার সর্বশেষ অবস্থান হিসেবে চিহ্নিত"
                          : "পড়া এখানে শেষ চিহ্নিত করুন"
                      }
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[11px] sm:text-xs">
                        {isThisMarked ? "এখানে পড়া শেষ" : "চিহ্নিত করুন"}
                      </span>
                    </button>

                    {/* Copy Button */}
                    <button
                      onClick={() =>
                        handleCopyAyah(ayah.numberInSurah, ayah.text)
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer active:scale-95 ${
                        isCopied
                          ? "bg-emerald-50 text-emerald-700 font-medium"
                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      }`}
                      title="আয়াত কপি করুন"
                      aria-label="আয়াত কপি করুন"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[11px] text-emerald-700">
                            কপি হয়েছে
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden xs:inline">
                            কপি
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Ayah Text - clicking also marks as last read */}
                <p
                  dir={isArabic ? "rtl" : "ltr"}
                  onClick={() => handleSetLastRead(ayah.numberInSurah)}
                  className={`text-slate-800 ${
                    isArabic
                      ? "font-arabic text-right"
                      : "font-sans"
                  } ${fontClass} select-text tracking-normal break-words cursor-pointer hover:text-slate-950 transition-colors`}
                  title="ক্লিক করে এই আয়াত পর্যন্ত পড়ার অবস্থান সেভ করুন"
                >
                  {ayah.text}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        /* 3. CONTINUOUS FLOW MODE (BOOK MODE) */
        <div className="p-4 sm:p-10 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 sm:space-y-6">
          <div
            dir={isArabic ? "rtl" : "ltr"}
            className={`text-slate-800 ${
              isArabic
                ? "font-arabic text-right"
                : "font-sans leading-relaxed sm:leading-loose text-justify"
            } ${fontClass} break-words`}
          >
            {filteredAyahs.map((ayah) => {
              const isThisMarked =
                currentLastRead?.surahNumber === surahId &&
                currentLastRead?.ayahNumber === ayah.numberInSurah;

              return (
                <span
                  key={ayah.numberInSurah}
                  ref={(el) => {
                    ayahRefs.current[ayah.numberInSurah] = el;
                  }}
                  onClick={() => handleSetLastRead(ayah.numberInSurah)}
                  className={`inline cursor-pointer transition-colors rounded px-0.5 ${
                    isThisMarked
                      ? "bg-emerald-100/70 text-slate-900 font-medium"
                      : "hover:bg-emerald-50/60"
                  }`}
                  title={`আয়াত ${toBengaliNumber(ayah.numberInSurah)} - ক্লিক করে পড়ার অবস্থান চিহ্নিত করুন`}
                >
                  <span>{ayah.text} </span>
                  <span
                    className={`inline-grid place-items-center min-w-[24px] h-[24px] sm:min-w-[26px] sm:h-[26px] px-1.5 rounded-full text-[11px] sm:text-[13px] font-bold leading-none font-['Hind_Siliguri',sans-serif] mx-1 align-middle transition-all shrink-0 bg-emerald-100 text-emerald-900 ${isThisMarked ? "ring-2 ring-emerald-600" : ""}`}
                  >
                    {isArabic
                      ? toArabicNumber(ayah.numberInSurah)
                      : toBengaliNumber(ayah.numberInSurah)}
                  </span>{" "}
                </span>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 text-center text-[11px] sm:text-xs text-slate-400">
            ধারাবাহিক পাঠ মোড • যেকোনো আয়াতে ক্লিক করে পড়ার শেষ অবস্থান চিহ্নিত
            করা যাবে।
          </div>
        </div>
      )}

      {/* Bottom Navigation Buttons */}
      <div className="pt-4 pb-12 flex items-center justify-between gap-2 sm:gap-4">
        {surahId > 1 ? (
          <button
            onClick={() => {
              onSelectSurah(surahId - 1);
              scrollToTop();
            }}
            className="inline-flex items-center gap-1 sm:gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-emerald-800 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span>পূর্ববর্তী সূরা</span>
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={scrollToTop}
          className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          title="উপরে যান"
        >
          <ArrowUp className="w-4 h-4" />
          <span className="hidden sm:inline">শুরুতে যান</span>
        </button>

        {surahId < 114 ? (
          <button
            onClick={() => {
              onSelectSurah(surahId + 1);
              scrollToTop();
            }}
            className="inline-flex items-center gap-1 sm:gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <span>পরবর্তী সূরা</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};
