import { useState } from "react";
import {
  BookOpen,
  Sparkles,
  Code2,
  CheckCircle2,
  Layers,
  Cpu,
  ExternalLink,
} from "lucide-react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Background soft ambient gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[380px] bg-gradient-to-tr from-emerald-100/70 via-teal-100/50 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-emerald-50/80 blur-3xl rounded-full" />
      </div>

      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-600/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-lg tracking-tight text-slate-900 block leading-tight">
                Quran Only Bangla
              </span>
              <span className="text-xs text-emerald-700 font-medium">
                সহজ ও বিশুদ্ধ বাংলা কুরআন
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5" />
              Tailwind CSS v4
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full flex flex-col gap-10">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            React + TypeScript + Tailwind CSS প্রস্তুত
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            আপনার কুরআন অ্যাপ তৈরির জন্য রেডি!
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            লেটেস্ট{" "}
            <span className="text-emerald-700 font-semibold">React 19</span>,{" "}
            <span className="text-emerald-700 font-semibold">Vite 8</span>,{" "}
            <span className="text-emerald-700 font-semibold">TypeScript</span>{" "}
            এবং{" "}
            <span className="text-emerald-700 font-semibold">
              Tailwind CSS v4
            </span>{" "}
            এর আধুনিক সেটআপ।
          </p>
          <div className="pt-2">
            <button
              onClick={() => setCount((c) => c + 1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-md shadow-emerald-600/20 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              ক্লিক কাউন্টার: {count}
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all duration-200 flex flex-col gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">
              Tailwind CSS v4
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              নতুনতম{" "}
              <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-xs">
                @tailwindcss/vite
              </code>{" "}
              প্লাগইন সহ জিরো কনফিগারেশন এবং উচ্চগতির CSS জেনারেশন।
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-teal-300 hover:shadow-md transition-all duration-200 flex flex-col gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">
              TypeScript & React 19
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              টাইপ-সেফ কোডিং সুবিধা এবং React 19 এর আধুনিক হুকস ও পারফরম্যান্সের
              সুবিধা।
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all duration-200 flex flex-col gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">
              বাংলা কালপুরুষ ফন্ট
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              ডিফল্ট হিসেবে{" "}
              <strong className="text-slate-800">Kalpurush (কালপুরুষ)</strong>{" "}
              ফন্ট সেট করা হয়েছে এবং ব্যাকআপ হিসেবে{" "}
              <strong className="text-slate-800">Hind Siliguri</strong> যুক্ত
              রয়েছে।
            </p>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1 text-left">
            <h4 className="text-sm font-semibold text-slate-900">
              কোড এডিট শুরু করুন
            </h4>
            <p className="text-xs text-slate-500">
              <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-xs">
                src/App.tsx
              </code>{" "}
              ফাইলে আপনার কোড লিখে সেভ করলেই লাইভ আপডেট দেখতে পাবেন।
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://tailwindcss.com/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors border border-slate-200"
            >
              Tailwind ডক্স <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        Quran Only Bangla — React + TypeScript + Tailwind CSS v4
      </footer>
    </div>
  );
}

export default App;
