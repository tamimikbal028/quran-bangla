import React from 'react';
import { BookOpen, Search, ArrowLeft } from 'lucide-react';

interface NavbarProps {
  currentSurahId: number | null;
  onBackToList: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSurahId,
  onBackToList,
}) => {
  return (
    <header className="border-b border-emerald-900/10 bg-white/95 backdrop-blur-md sticky top-0 z-40 transition-shadow">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          {currentSurahId !== null && (
            <button
              onClick={onBackToList}
              className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
              title="সকল সূরায় ফিরে যান"
              aria-label="সকল সূরায় ফিরে যান"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={onBackToList}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-sm shadow-emerald-700/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight block leading-tight group-hover:text-emerald-800 transition-colors">
                কুরআন কেবল বাংলা
              </span>
              <span className="text-[11px] text-emerald-700 font-medium hidden sm:block">
                সহজ ও বিশুদ্ধ বাংলা অর্থ (মুহিউদ্দীন খান)
              </span>
            </div>
          </div>
        </div>

        {/* Right Action: Return to Surah List if inside reader */}
        {currentSurahId !== null && (
          <button
            onClick={onBackToList}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-colors cursor-pointer shadow-2xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>সূরার তালিকা</span>
          </button>
        )}
      </div>
    </header>
  );
};
