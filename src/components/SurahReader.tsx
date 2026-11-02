import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SurahDetail, SurahMeta, ReadingMode, FontSize } from '../types/quran';
import { QuranService } from '../services/quranService';
import { toBengaliNumber, getRevelationTypeBengali } from '../utils/bengali';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Search,
  LayoutGrid,
  AlignLeft,
  ArrowUp,
} from 'lucide-react';

interface SurahReaderProps {
  surahId: number;
  surahMeta: SurahMeta;
  targetAyah?: number;
  onSelectSurah: (id: number) => void;
  onBackToList: () => void;
}

export const SurahReader: React.FC<SurahReaderProps> = ({
  surahId,
  surahMeta,
  targetAyah,
  onSelectSurah,
  onBackToList,
}) => {
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [readingMode, setReadingMode] = useState<ReadingMode>('cards');
  const [fontSize, setFontSize] = useState<FontSize>('lg');
  const [inSurahQuery, setInSurahQuery] = useState('');
  const [copiedAyah, setCopiedAyah] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const ayahRefs = useRef<{ [key: number]: HTMLElement | null }>({});

  // Show Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  // Load Surah detail
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    QuranService.getSurahDetail(surahId)
      .then((detail) => {
        if (isMounted && detail) {
          setSurahDetail(detail);
          setLoading(false);

          // Update Last Read
          QuranService.setLastRead({
            surahNumber: surahId,
            surahName: surahMeta.banglaName,
            ayahNumber: targetAyah || 1,
            updatedAt: Date.now(),
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load surah:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [surahId, surahMeta.banglaName, targetAyah]);

  // Scroll to target ayah if provided
  useEffect(() => {
    if (!loading && targetAyah && ayahRefs.current[targetAyah]) {
      setTimeout(() => {
        ayahRefs.current[targetAyah]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300);
    }
  }, [loading, targetAyah]);

  // Handle Copy Ayah
  const handleCopyAyah = (ayahNumber: number, text: string) => {
    const copyString = `${surahMeta.banglaName}, আয়াত ${toBengaliNumber(ayahNumber)}:\n${text}`;
    navigator.clipboard.writeText(copyString).then(() => {
      setCopiedAyah(ayahNumber);
      showToast('আয়াত সফলভাবে কপি করা হয়েছে');
      setTimeout(() => setCopiedAyah(null), 2000);
    });
  };

  // Font size classes
  const fontClass = useMemo(() => {
    switch (fontSize) {
      case 'sm':
        return 'text-base sm:text-lg leading-relaxed';
      case 'base':
        return 'text-lg sm:text-xl leading-relaxed';
      case 'lg':
        return 'text-xl sm:text-2xl leading-loose';
      case 'xl':
        return 'text-2xl sm:text-3xl leading-loose';
      case '2xl':
        return 'text-3xl sm:text-4xl leading-loose';
      default:
        return 'text-xl sm:text-2xl leading-loose';
    }
  }, [fontSize]);

  // Filtered Ayahs if in-surah search active
  const filteredAyahs = useMemo(() => {
    if (!surahDetail) return [];
    if (!inSurahQuery.trim()) return surahDetail.ayahs;
    const q = inSurahQuery.toLowerCase().trim();
    return surahDetail.ayahs.filter(
      (a) =>
        a.text.toLowerCase().includes(q) ||
        a.numberInSurah.toString() === q ||
        toBengaliNumber(a.numberInSurah) === q
    );
  }, [surahDetail, inSurahQuery]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm"
        >
          তালিকায় ফিরে যান
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md transition-all">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Surah Top Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 sm:p-8 shadow-lg shadow-emerald-900/10 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        {/* Navigation between surahs */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-emerald-100">
          <button
            onClick={() => onSelectSurah(surahId - 1)}
            disabled={surahId <= 1}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors ${
              surahId <= 1 ? 'opacity-40 pointer-events-none' : 'cursor-pointer'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>পূর্ববর্তী সূরা</span>
          </button>

          <span className="text-white/80 font-semibold">
            সূরা নম্বর {toBengaliNumber(surahId)} / {toBengaliNumber(114)}
          </span>

          <button
            onClick={() => onSelectSurah(surahId + 1)}
            disabled={surahId >= 114}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors ${
              surahId >= 114 ? 'opacity-40 pointer-events-none' : 'cursor-pointer'
            }`}
          >
            <span>পরবর্তী সূরা</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Info */}
        <div className="text-center space-y-2 pt-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            সূরা {surahMeta.banglaName}
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base font-medium">
            অর্থ: {surahMeta.translation}
          </p>
          <div className="inline-flex items-center gap-2 pt-2 text-xs text-emerald-200">
            <span className="px-2.5 py-1 rounded-md bg-white/15 border border-white/20">
              অবতীর্ণ: {getRevelationTypeBengali(surahMeta.type)}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white/15 border border-white/20">
              মোট আয়াত: {toBengaliNumber(surahMeta.total_verses)}
            </span>
          </div>
        </div>
      </div>

      {/* Reader Controls Bar */}
      <div className="sticky top-20 z-30 p-3 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Reading Mode Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto justify-center">
          <button
            onClick={() => setReadingMode('cards')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              readingMode === 'cards'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>আয়াতভিত্তিক পাঠ</span>
          </button>
          <button
            onClick={() => setReadingMode('continuous')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              readingMode === 'continuous'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>ধারাবাহিক পাঠ (বই)</span>
          </button>
        </div>

        {/* Middle: In-Surah Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={inSurahQuery}
            onChange={(e) => setInSurahQuery(e.target.value)}
            placeholder="এই সূরায় খুঁজুন..."
            className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          {inSurahQuery && (
            <button
              onClick={() => setInSurahQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: Font Size Controls */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-400 mr-1 text-[11px] hidden sm:inline">ফন্ট সাইজ:</span>
          {(['sm', 'base', 'lg', 'xl'] as FontSize[]).map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                fontSize === size
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {size === 'sm' && 'ছোট'}
              {size === 'base' && 'স্বাভাবিক'}
              {size === 'lg' && 'বড়'}
              {size === 'xl' && 'অনেক বড়'}
            </button>
          ))}
        </div>
      </div>

      {/* Bismillah Header (Except Surah At-Tawbah #9) */}
      {surahId !== 9 && (
        <div className="py-6 px-4 text-center bg-emerald-50/70 border border-emerald-200/70 rounded-2xl">
          <p className="text-emerald-900 font-semibold text-lg sm:text-xl tracking-wide font-sans">
            পরম করুণাময় অসীম দয়ালু আল্লাহর নামে
          </p>
        </div>
      )}

      {/* Search results notice */}
      {inSurahQuery && (
        <div className="px-4 py-2 rounded-xl bg-amber-50 text-amber-800 text-xs flex items-center justify-between border border-amber-200">
          <span>
            খুঁজে পাওয়া গেছে: <strong>{toBengaliNumber(filteredAyahs.length)}</strong> টি আয়াত
          </span>
          <button
            onClick={() => setInSurahQuery('')}
            className="underline text-amber-900 font-medium cursor-pointer"
          >
            ফিল্টার সরান
          </button>
        </div>
      )}

      {/* MAIN CONTENT BASED ON READING MODE */}
      {readingMode === 'cards' ? (
        /* Ayah-by-Ayah Cards Mode */
        <div className="space-y-4">
          {filteredAyahs.map((ayah) => {
            const isCopied = copiedAyah === ayah.numberInSurah;

            return (
              <div
                key={ayah.numberInSurah}
                ref={(el) => {
                  ayahRefs.current[ayah.numberInSurah] = el;
                }}
                className={`p-5 sm:p-6 rounded-2xl bg-white border transition-all duration-200 shadow-xs space-y-4 ${
                  targetAyah === ayah.numberInSurah
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/15'
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                {/* Ayah Top Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                      {toBengaliNumber(ayah.numberInSurah)}
                    </span>
                    <span className="text-xs text-slate-400">
                      আয়াত {toBengaliNumber(ayah.numberInSurah)}
                    </span>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopyAyah(ayah.numberInSurah, ayah.text)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-50 text-emerald-700 font-medium'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    title="আয়াত কপি করুন"
                    aria-label="আয়াত কপি করুন"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[11px] text-emerald-700">কপি হয়েছে</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[11px] hidden sm:inline">কপি</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Pure Bengali Ayah Text */}
                <p
                  className={`text-slate-800 font-sans ${fontClass} select-text tracking-normal`}
                >
                  {ayah.text}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        /* Continuous Flow Mode (Book Mode) */
        <div className="p-6 sm:p-10 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className={`text-slate-800 font-sans ${fontClass} leading-loose text-justify`}>
            {filteredAyahs.map((ayah) => {
              return (
                <span
                  key={ayah.numberInSurah}
                  ref={(el) => {
                    ayahRefs.current[ayah.numberInSurah] = el;
                  }}
                  className="inline"
                >
                  <span>{ayah.text} </span>
                  <span
                    className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-1.5 rounded-full text-[12px] font-bold mx-1 align-baseline bg-emerald-100 text-emerald-900"
                    title={`আয়াত ${toBengaliNumber(ayah.numberInSurah)}`}
                  >
                    {toBengaliNumber(ayah.numberInSurah)}
                  </span>{' '}
                </span>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
            ধারাবাহিক পাঠ মোড • পুরো সূরার অর্থ একটানা পড়ার জন্য।
          </div>
        </div>
      )}

      {/* Bottom Navigation Buttons */}
      <div className="pt-6 pb-12 flex items-center justify-between gap-4">
        {surahId > 1 ? (
          <button
            onClick={() => {
              onSelectSurah(surahId - 1);
              scrollToTop();
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-emerald-800 text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>পূর্ববর্তী সূরা</span>
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={scrollToTop}
          className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          title="উপরে যান"
        >
          <ArrowUp className="w-4 h-4" />
          <span className="hidden sm:inline">পৃষ্ঠার শুরুতে</span>
        </button>

        {surahId < 114 ? (
          <button
            onClick={() => {
              onSelectSurah(surahId + 1);
              scrollToTop();
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm shadow-emerald-700/20 cursor-pointer"
          >
            <span>পরবর্তী সূরা</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};
