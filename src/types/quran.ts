export interface SurahMeta {
  id: number;
  name: string; // Arabic script (internal)
  transliteration: string; // English
  banglaName: string; // e.g. "আল-ফাতিহা"
  translation: string; // Meaning in Bengali, e.g. "সূচনা"
  type: 'meccan' | 'medinan';
  total_verses: number;
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  page?: number;
  ruku?: number;
}

export interface SurahDetail {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  ayahs: Ayah[];
}

export interface LastRead {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  updatedAt: number;
}

export type ReadingMode = 'cards' | 'continuous';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';
