import { SURAHS_LIST } from "../data/surahList";
import type {
  SurahMeta,
  SurahDetail,
  LastRead,
  QuranLanguage,
} from "../types/quran";

const cachedQuranData: Record<
  QuranLanguage,
  { [key: number]: SurahDetail } | null
> = {
  bn: null,
  ar: null,
};

const fetchPromises: Record<
  QuranLanguage,
  Promise<{ [key: number]: SurahDetail }> | null
> = {
  bn: null,
  ar: null,
};

function getLastReadStorageKey(lang: QuranLanguage): string {
  return lang === "ar" ? "quran_ar_last_read" : "quran_bn_last_read";
}

const LANGUAGE_STORAGE_KEY = "quran_selected_lang";

async function loadAllQuranData(
  lang: QuranLanguage = "bn",
): Promise<{ [key: number]: SurahDetail }> {
  if (cachedQuranData[lang]) {
    return cachedQuranData[lang]!;
  }

  if (fetchPromises[lang]) {
    return fetchPromises[lang]!;
  }

  const dataUrl = lang === "ar" ? "/data/quran_ar.json" : "/data/quran_bn.json";

  fetchPromises[lang] = (async () => {
    try {
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to load Quran (${lang}) data: ${response.statusText}`,
        );
      }
      const json = await response.json();
      const map: { [key: number]: SurahDetail } = {};

      const surahs = json.data?.surahs || [];
      for (const s of surahs) {
        map[s.number] = s;
      }

      cachedQuranData[lang] = map;
      return map;
    } catch (error) {
      console.error(`Error loading Quran (${lang}) data:`, error);
      fetchPromises[lang] = null;
      throw error;
    }
  })();

  return fetchPromises[lang]!;
}

export const QuranService = {
  getAllSurahs(): SurahMeta[] {
    return SURAHS_LIST;
  },

  getSurahMeta(id: number): SurahMeta | undefined {
    return SURAHS_LIST.find((s) => s.id === id);
  },

  async getSurahDetail(
    surahNumber: number,
    lang: QuranLanguage = "bn",
  ): Promise<SurahDetail | null> {
    const data = await loadAllQuranData(lang);
    return data[surahNumber] || null;
  },

  // Language Preference (bn | ar)
  getLanguage(): QuranLanguage {
    try {
      const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return raw === "ar" ? "ar" : "bn";
    } catch {
      return "bn";
    }
  },

  setLanguage(lang: QuranLanguage): void {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (e) {
      console.error("Failed to save language preference", e);
    }
  },

  // Local Storage: Last Read (Separate per language)
  getLastRead(lang: QuranLanguage = "bn"): LastRead | null {
    try {
      const raw = localStorage.getItem(getLastReadStorageKey(lang));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setLastRead(lastRead: LastRead, lang: QuranLanguage = "bn"): void {
    try {
      localStorage.setItem(
        getLastReadStorageKey(lang),
        JSON.stringify(lastRead),
      );
    } catch (e) {
      console.error("Failed to save last read", e);
    }
  },
};
