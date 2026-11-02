import { SURAHS_LIST } from "../data/surahList";
import type { SurahMeta, SurahDetail, LastRead } from "../types/quran";

let cachedQuranData: { [key: number]: SurahDetail } | null = null;
let fetchPromise: Promise<{ [key: number]: SurahDetail }> | null = null;

async function loadAllQuranData(): Promise<{ [key: number]: SurahDetail }> {
  if (cachedQuranData) {
    return cachedQuranData;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const response = await fetch("/data/quran_bn.json");
      if (!response.ok) {
        throw new Error(`Failed to load Quran data: ${response.statusText}`);
      }
      const json = await response.json();
      const map: { [key: number]: SurahDetail } = {};

      const surahs = json.data?.surahs || [];
      for (const s of surahs) {
        map[s.number] = s;
      }

      cachedQuranData = map;
      return map;
    } catch (error) {
      console.error("Error loading Quran data:", error);
      fetchPromise = null;
      throw error;
    }
  })();

  return fetchPromise;
}

export const QuranService = {
  getAllSurahs(): SurahMeta[] {
    return SURAHS_LIST;
  },

  getSurahMeta(id: number): SurahMeta | undefined {
    return SURAHS_LIST.find((s) => s.id === id);
  },

  async getSurahDetail(surahNumber: number): Promise<SurahDetail | null> {
    const data = await loadAllQuranData();
    return data[surahNumber] || null;
  },

  // Local Storage: Last Read
  getLastRead(): LastRead | null {
    try {
      const raw = localStorage.getItem("quran_bn_last_read");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setLastRead(lastRead: LastRead): void {
    try {
      localStorage.setItem("quran_bn_last_read", JSON.stringify(lastRead));
    } catch (e) {
      console.error("Failed to save last read", e);
    }
  },
};
