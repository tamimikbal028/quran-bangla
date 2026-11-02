import React, { useState, useEffect } from "react";
import {
  X,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  Smartphone,
  LogOut,
  ShieldCheck,
  User,
} from "lucide-react";
import { SyncService, type SyncCredentials } from "../services/syncService";
import type { DailyReadingStats } from "../services/timerService";
import type { LastRead } from "../types/quran";

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSynced: (data: {
    lastRead?: LastRead | null;
    timerStats?: DailyReadingStats;
  }) => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onDataSynced,
}) => {
  const [creds, setCreds] = useState<SyncCredentials | null>(null);
  const [syncKey, setSyncKey] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastSyncText, setLastSyncText] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      const current = SyncService.getCredentials();
      setCreds(current);
      if (current) {
        setSyncKey(current.syncKey);
      }
      setErrorMsg(null);
      setSuccessMsg(null);
      updateLastSyncText();
    }
  }, [isOpen]);

  const updateLastSyncText = () => {
    const ts = SyncService.getLastSyncTime();
    if (!ts) {
      setLastSyncText("এখনো কোনো সিঙ্ক হয়নি");
      return;
    }
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) {
      setLastSyncText("এইমাত্র");
    } else if (diff < 3600) {
      setLastSyncText(`${Math.floor(diff / 60)} মিনিট আগে`);
    } else {
      const d = new Date(ts);
      setLastSyncText(
        d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" }),
      );
    }
  };

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!syncKey.trim()) {
      setErrorMsg("দয়া করে আপনার একটি নাম বা Sync Key দিন।");
      return;
    }
    if (pin.trim().length !== 4 || !/^\d{4}$/.test(pin.trim())) {
      setErrorMsg("পিন অবশ্যই ৪ ডিজিটের সংখ্যা (যেমন: ১২৩৪) হতে হবে।");
      return;
    }

    setLoading(true);
    const result = await SyncService.connectAccount(syncKey, pin);
    setLoading(false);

    if (result.ok) {
      setCreds(SyncService.getCredentials());
      setSuccessMsg(
        result.isNew
          ? "মাশাআল্লাহ! নতুন সিঙ্ক একাউন্ট তৈরি ও কানেক্ট হয়েছে।"
          : "সফলভাবে ডিভাইসের সাথে সিঙ্ক কানেক্ট হয়েছে!",
      );
      updateLastSyncText();

      if (result.payload) {
        onDataSynced({
          lastRead: result.payload.lastRead,
          timerStats: result.payload.timerStats,
        });
      }
    } else {
      setErrorMsg(result.error || "কানেক্ট করা সম্ভব হয়নি।");
    }
  };

  const handleManualSync = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. Pull latest from cloud
    const pullRes = await SyncService.pullData();
    if (pullRes.ok) {
      if (pullRes.hasChanges) {
        onDataSynced({
          lastRead: pullRes.mergedLastRead,
          timerStats: pullRes.mergedStats,
        });
      }
      // 2. Push local current state
      await SyncService.pushData();
      updateLastSyncText();
      setSuccessMsg("সর্বশেষ ডাটা সফলভাবে ক্লাউডে সিঙ্ক হয়েছে!");
    } else {
      setErrorMsg(pullRes.error || "সিঙ্ক করতে সমস্যা হয়েছে।");
    }
    setLoading(false);
  };

  const handleDisconnect = () => {
    if (
      window.confirm(
        "আপনি কি এই ডিভাইস থেকে সিঙ্ক সংযোগ বিচ্ছিন্ন করতে চান? আপনার ব্রাউজারের বর্তমান ডাটা ডিলিট হবে না।",
      )
    ) {
      SyncService.clearCredentials();
      setCreds(null);
      setPin("");
      setSuccessMsg("সিঙ্ক সফলভাবে বিচ্ছিন্ন করা হয়েছে।");
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90dvh] cursor-default"
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                মোবাইল ও পিসি অটো-সিঙ্ক
              </h3>
              <p className="text-[11px] text-emerald-800">
                Cloudflare ক্লাউডে পড়ার স্থান ও স্ট্রিক ব্যাকআপ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Status Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{successMsg}</div>
            </div>
          )}

          {creds ? (
            /* Connected State */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border border-emerald-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    ডিভাইস সংযুক্ত আছে
                  </span>
                  <span className="text-[11px] text-slate-500">
                    সিঙ্ক: {lastSyncText}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-100">
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Sync নাম
                    </span>
                    <span className="text-sm font-bold text-slate-800 truncate block">
                      {creds.syncKey}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-100">
                    <span className="text-[10px] text-slate-400 font-medium block">
                      গোপন পিন
                    </span>
                    <span className="text-sm font-bold text-slate-800 tracking-widest block">
                      ••••
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-emerald-700/90 leading-relaxed pt-1">
                  💡 আপনার অন্য ডিভাইসেও (যেমন মোবাইল) ঠিক এই একই{" "}
                  <b>Sync নাম ({creds.syncKey})</b> এবং <b>পিন</b> দিলে
                  স্বয়ংক্রিয়ভাবে দুটি ডিভাইসের ডাটা সিঙ্ক হয়ে যাবে।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleManualSync}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                  />
                  <span>{loading ? "সিঙ্ক হচ্ছে..." : "এখনই সিঙ্ক করুন"}</span>
                </button>

                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="সংযোগ বিচ্ছিন্ন করুন"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ডিসকানেক্ট</span>
                </button>
              </div>
            </div>
          ) : (
            /* Not Connected State (Form) */
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                  <span>মোবাইল ও পিসিতে সিঙ্ক করার সহজ নিয়ম:</span>
                </div>
                <p>
                  ১. আপনার পছন্দমতো যেকোনো নাম (যেমন:{" "}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-emerald-800">
                    tamim
                  </code>
                  ) এবং ৪ ডিজিটের একটি গোপন পিন দিন।
                </p>
                <p>
                  ২. মোবাইলে গিয়েও ঠিক একই নাম ও পিন দিলে সাথে সাথে দুটি ডিভাইস
                  সিঙ্ক হয়ে যাবে!
                </p>
              </div>

              {/* Input: Sync Key */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  আপনার Sync নাম / ইউজারনেম
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={syncKey}
                    onChange={(e) => setSyncKey(e.target.value)}
                    placeholder="যেমন: tamim"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Input: PIN */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    ৪ ডিজিটের গোপন পিন (PIN)
                  </label>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> শুধু
                    আপনার জানা থাকবে
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      if (v.length <= 4) setPin(v);
                    }}
                    placeholder="যেমন: 1234"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all tracking-widest"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/10 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>কানেক্ট হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    <span>সিঙ্ক চালু করুন</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
