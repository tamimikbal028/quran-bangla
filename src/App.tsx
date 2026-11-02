import { useState, useEffect } from 'react';
import { QuranService } from './services/quranService';
import type { SurahMeta, LastRead } from './types/quran';
import { Navbar } from './components/Navbar';
import { SurahList } from './components/SurahList';
import { SurahReader } from './components/SurahReader';

function App() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  const [targetAyah, setTargetAyah] = useState<number | undefined>(undefined);
  const [lastRead, setLastRead] = useState<LastRead | null>(null);

  // Initialize
  useEffect(() => {
    const list = QuranService.getAllSurahs();
    setSurahs(list);
    setLastRead(QuranService.getLastRead());
  }, []);

  const handleSelectSurah = (id: number, ayah?: number) => {
    setSelectedSurahId(id);
    setTargetAyah(ayah);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setSelectedSurahId(null);
    setTargetAyah(undefined);
    setLastRead(QuranService.getLastRead());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSurahMeta = selectedSurahId
    ? QuranService.getSurahMeta(selectedSurahId)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Navbar */}
      <Navbar
        currentSurahId={selectedSurahId}
        onBackToList={handleBackToList}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {selectedSurahId && currentSurahMeta ? (
          <SurahReader
            surahId={selectedSurahId}
            surahMeta={currentSurahMeta}
            targetAyah={targetAyah}
            onSelectSurah={(id) => handleSelectSurah(id)}
            onBackToList={handleBackToList}
          />
        ) : (
          <SurahList
            surahs={surahs}
            onSelectSurah={handleSelectSurah}
            lastRead={lastRead}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 space-y-2">
        <p className="font-medium text-slate-700">
          কুরআন কেবল বাংলা — সহজ ও বিশুদ্ধ ভাবার্থ অধ্যয়নের নিজস্ব ওয়েবঅ্যাপ
        </p>
        <p className="text-slate-400">
          অনুবাদ: মাওলানা মুহিউদ্দীন খান • সম্পূর্ণ অফলাইন ও দ্রুতগতির পড়ার সুবিধা
        </p>
      </footer>
    </div>
  );
}

export default App;
