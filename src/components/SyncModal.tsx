import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Lock,
  LogIn,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Sparkles,
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
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastSyncText, setLastSyncText] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      const current = SyncService.getCredentials();
      setCreds(current);
      if (current) {
        setUsername(current.username);
      }
      setErrorMsg(null);
      setSuccessMsg(null);
      updateSyncTimeLabel();
    }
  }, [isOpen]);

  const updateSyncTimeLabel = () => {
    const ts = SyncService.getLastSyncTime();
    if (!ts) {
      setLastSyncText("এইমাত্র");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || cleanUser.length < 2) {
      setErrorMsg("দয়া করে অন্তত ২ অক্ষরের একটি ইউজারনেম দিন।");
      return;
    }
    if (!cleanPass || cleanPass.length < 3) {
      setErrorMsg("পাসওয়ার্ড অন্তত ৩ অক্ষরের হতে হবে।");
      return;
    }

    setLoading(true);

    if (tab === "login") {
      // LOGIN
      const res = await SyncService.login(cleanUser, cleanPass);
      setLoading(false);

      if (res.ok) {
        const updated = SyncService.getCredentials();
        setCreds(updated);
        setSuccessMsg(
          "সফলভাবে লগইন হয়েছে! আপনার পড়ার অগ্রগতি সিঙ্ক করা হয়েছে।",
        );
        updateSyncTimeLabel();
        if (res.payload) {
          onDataSynced({
            lastRead: res.payload.lastRead,
            timerStats: res.payload.timerStats,
          });
        }
      } else {
        setErrorMsg(res.error || "লগইন করা সম্ভব হয়নি।");
      }
    } else {
      // REGISTER
      const res = await SyncService.register(cleanUser, cleanPass);
      setLoading(false);

      if (res.ok) {
        const updated = SyncService.getCredentials();
        setCreds(updated);
        setSuccessMsg(
          "মাশাআল্লাহ! অ্যাকাউন্ট তৈরি ও লগইন সফল হয়েছে। এখন সব ডিভাইসে অটো-সিঙ্ক হবে।",
        );
        updateSyncTimeLabel();
      } else {
        setErrorMsg(res.error || "অ্যাকাউন্ট তৈরি করা যায়নি।");
      }
    }
  };

  const handleManualSync = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const pullRes = await SyncService.pullData();
    if (pullRes.ok) {
      if (pullRes.hasChanges) {
        onDataSynced({
          lastRead: pullRes.mergedLastRead,
          timerStats: pullRes.mergedStats,
        });
      }
      await SyncService.pushData();
      updateSyncTimeLabel();
      setSuccessMsg("সর্বশেষ ডাটা সফলভাবে ক্লাউডে সিঙ্ক হয়েছে!");
    } else {
      setErrorMsg(pullRes.error || "সিঙ্ক করতে সমস্যা হয়েছে।");
    }
    setLoading(false);
  };

  const handleLogout = () => {
    if (
      window.confirm(
        "আপনি কি এই ডিভাইস থেকে লগআউট করতে চান? আপনার ব্রাউজারের বর্তমান পড়ার ডাটা মুছে যাবে না।",
      )
    ) {
      SyncService.clearCredentials();
      setCreds(null);
      setPassword("");
      setSuccessMsg("লগআউট সফল হয়েছে।");
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
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {creds ? "আপনার অ্যাকাউন্ট ও সিঙ্ক" : "কুরআন অ্যাকাউন্ট"}
              </h3>
              <p className="text-[11px] text-emerald-800">
                মোবাইল, পিসি ও আইপ্যাডে অটো-সিঙ্ক
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
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Alerts */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{successMsg}</div>
            </div>
          )}

          {creds ? (
            /* Logged In View */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-white border border-emerald-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center uppercase shadow-2xs">
                      {creds.username.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        {creds.username}
                      </span>
                      <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        অটো-সিঙ্ক সক্রিয়
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    সিঙ্ক: {lastSyncText}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/90 border border-emerald-100 text-xs text-slate-600 leading-relaxed space-y-1">
                  <p className="flex items-center gap-1.5 font-semibold text-emerald-900">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    কোনো বাটন চাপতে হবে না!
                  </p>
                  <p>
                    আপনি আয়াত পড়লে বা পড়ার স্থান চিহ্নিত করলেই তা স্বয়ংক্রিয়ভাবে
                    ক্লাউডে সেভ হবে। অন্য ডিভাইসে শুধু{" "}
                    <b className="text-slate-800">{creds.username}</b> দিয়ে লগইন
                    করলেই সব পড়া দেখতে পাবেন।
                  </p>
                </div>
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
                  <span>
                    {loading ? "সিঙ্ক হচ্ছে..." : "এখনই রিফ্রেশ করুন"}
                  </span>
                </button>

                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="লগআউট করুন"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>লগআউট</span>
                </button>
              </div>
            </div>
          ) : (
            /* Logged Out View: Tabs & Form */
            <div className="space-y-4">
              {/* Login / Register Switch Tabs */}
              <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setTab("login");
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    tab === "login"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>লগইন</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("register");
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    tab === "register"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>নতুন অ্যাকাউন্ট</span>
                </button>
              </div>

              {/* Explanatory Banner */}
              <p className="text-xs text-slate-600 leading-relaxed">
                {tab === "login" ? (
                  <>
                    আগে অ্যাকাউন্ট খুলে থাকলে আপনার <b>ইউজারনেম</b> ও{" "}
                    <b>পাসওয়ার্ড</b> দিয়ে লগইন করুন। সব ডিভাইসের পড়ার অগ্রগতি
                    অটোমেটিক চলে আসবে।
                  </>
                ) : (
                  <>
                    আপনার পছন্দমতো যেকোনো <b>ইউজারনেম</b> এবং <b>পাসওয়ার্ড</b>{" "}
                    দিয়ে একটি সহজ অ্যাকাউন্ট খুলুন।
                  </>
                )}
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Username Input */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    ইউজারনেম / আপনার নাম
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="যেমন: tamim"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    পাসওয়ার্ড
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="আপনার গোপন পাসওয়ার্ড দিন"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/10 cursor-pointer disabled:opacity-50 mt-1"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>অপেক্ষা করুন...</span>
                    </>
                  ) : tab === "login" ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>লগইন করুন</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>অ্যাকাউন্ট তৈরি করুন</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
