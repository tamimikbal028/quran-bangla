import type { LastRead } from "../types/quran";
import type { DailyReadingStats } from "./timerService";
import { TimerService } from "./timerService";
import { QuranService } from "./quranService";

export interface SyncPayload {
  lastRead: LastRead | null;
  timerStats: DailyReadingStats;
  updatedAt: number;
}

export interface SyncCredentials {
  username: string;
  passwordHash: string;
  lastSyncedAt?: number;
}

const STORAGE_CREDS_KEY = "quran_bn_user_creds";
const STORAGE_LAST_SYNC_KEY = "quran_bn_last_sync_time";

// Secure SHA-256 password hash using standard browser Web Crypto
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`quran_bn_salt_${password.trim()}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const SyncService = {
  getCredentials(): SyncCredentials | null {
    try {
      const raw = localStorage.getItem(STORAGE_CREDS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.username && parsed.passwordHash) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  setCredentials(creds: SyncCredentials): void {
    try {
      localStorage.setItem(STORAGE_CREDS_KEY, JSON.stringify(creds));
    } catch (e) {
      console.error("Failed to save credentials", e);
    }
  },

  clearCredentials(): void {
    localStorage.removeItem(STORAGE_CREDS_KEY);
    localStorage.removeItem(STORAGE_LAST_SYNC_KEY);
  },

  getLastSyncTime(): number | null {
    const raw = localStorage.getItem(STORAGE_LAST_SYNC_KEY);
    return raw ? parseInt(raw, 10) : null;
  },

  setLastSyncTime(ts: number): void {
    localStorage.setItem(STORAGE_LAST_SYNC_KEY, ts.toString());
  },

  // Prepare current local snapshot
  getLocalSnapshot(): SyncPayload {
    const lastRead = QuranService.getLastRead();
    const timerStats = TimerService.getStats();
    return {
      lastRead,
      timerStats,
      updatedAt: Date.now(),
    };
  },

  // Merge remote data into local state intelligently
  mergeRemoteData(remote: SyncPayload): {
    mergedLastRead: LastRead | null;
    mergedStats: DailyReadingStats;
    hasChanges: boolean;
  } {
    const localLastRead = QuranService.getLastRead();
    const localStats = TimerService.getStats();
    let hasChanges = false;

    // 1. Merge Last Read: whichever device read most recently wins
    let mergedLastRead = localLastRead;
    if (remote.lastRead) {
      if (
        !localLastRead ||
        (remote.lastRead.updatedAt || 0) > (localLastRead.updatedAt || 0)
      ) {
        mergedLastRead = remote.lastRead;
        QuranService.setLastRead(remote.lastRead);
        hasChanges = true;
      }
    }

    // 2. Merge Timer Stats
    let mergedStats = { ...localStats };
    if (remote.timerStats) {
      if (remote.timerStats.date === localStats.date) {
        const higherSeconds = Math.max(
          localStats.secondsToday,
          remote.timerStats.secondsToday,
        );
        const higherStreak = Math.max(
          localStats.streakDays,
          remote.timerStats.streakDays,
        );
        const higherAllTime = Math.max(
          localStats.totalAllTimeSeconds,
          remote.timerStats.totalAllTimeSeconds,
        );

        if (
          higherSeconds !== localStats.secondsToday ||
          higherStreak !== localStats.streakDays ||
          higherAllTime !== localStats.totalAllTimeSeconds
        ) {
          mergedStats = {
            ...localStats,
            secondsToday: higherSeconds,
            streakDays: higherStreak,
            totalAllTimeSeconds: higherAllTime,
            targetMinutes:
              remote.timerStats.targetMinutes || localStats.targetMinutes,
          };
          TimerService.saveStats(mergedStats);
          hasChanges = true;
        }
      } else if (
        remote.updatedAt >
        (localStats.lastActiveDate
          ? new Date(localStats.lastActiveDate).getTime()
          : 0)
      ) {
        mergedStats = remote.timerStats;
        TimerService.saveStats(mergedStats);
        hasChanges = true;
      }
    }

    return { mergedLastRead, mergedStats, hasChanges };
  },

  // User Login (Existing Account)
  async login(
    username: string,
    password: string,
  ): Promise<{
    ok: boolean;
    error?: string;
    payload?: SyncPayload;
  }> {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || cleanUser.length < 2) {
      return { ok: false, error: "ইউজারনেম অন্তত ২ অক্ষরের হতে হবে।" };
    }
    if (!cleanPass || cleanPass.length < 3) {
      return { ok: false, error: "পাসওয়ার্ড অন্তত ৩ অক্ষরের হতে হবে।" };
    }

    try {
      const passwordHash = await hashPassword(cleanPass);
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: cleanUser,
          passwordHash,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || "লগইন করা যায়নি।" };
      }

      this.setCredentials({
        username: cleanUser,
        passwordHash,
        lastSyncedAt: Date.now(),
      });
      this.setLastSyncTime(Date.now());

      if (json.data) {
        this.mergeRemoteData(json.data);
      }

      return { ok: true, payload: json.data };
    } catch {
      return {
        ok: false,
        error: "সার্ভারে কানেক্ট করা যায়নি। ইন্টারনেট কানেকশন চেক করুন।",
      };
    }
  },

  // User Registration (New Account)
  async register(
    username: string,
    password: string,
  ): Promise<{
    ok: boolean;
    error?: string;
    payload?: SyncPayload;
  }> {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || cleanUser.length < 2) {
      return { ok: false, error: "ইউজারনেম অন্তত ২ অক্ষরের হতে হবে।" };
    }
    if (!cleanPass || cleanPass.length < 3) {
      return { ok: false, error: "পাসওয়ার্ড অন্তত ৩ অক্ষরের হতে হবে।" };
    }

    try {
      const passwordHash = await hashPassword(cleanPass);
      const localData = this.getLocalSnapshot();

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          username: cleanUser,
          passwordHash,
          data: localData,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        return {
          ok: false,
          error: json.error || "অ্যাকাউন্ট তৈরি করা সম্ভব হয়নি।",
        };
      }

      this.setCredentials({
        username: cleanUser,
        passwordHash,
        lastSyncedAt: Date.now(),
      });
      this.setLastSyncTime(Date.now());

      return { ok: true, payload: localData };
    } catch {
      return {
        ok: false,
        error: "সার্ভারে কানেক্ট করা যায়নি। ইন্টারনেট কানেকশন চেক করুন।",
      };
    }
  },

  // Pull latest updates from Cloudflare
  async pullData(): Promise<{
    ok: boolean;
    error?: string;
    mergedLastRead?: LastRead | null;
    mergedStats?: DailyReadingStats;
    hasChanges?: boolean;
  }> {
    const creds = this.getCredentials();
    if (!creds) return { ok: false, error: "লগইন নেই" };

    try {
      const res = await fetch(
        `/api/sync?username=${encodeURIComponent(creds.username)}&passwordHash=${encodeURIComponent(creds.passwordHash)}`,
      );

      const json = await res.json();
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || "ডাটা আনা যায়নি" };
      }

      if (json.data) {
        const { mergedLastRead, mergedStats, hasChanges } =
          this.mergeRemoteData(json.data);
        this.setLastSyncTime(Date.now());
        return { ok: true, mergedLastRead, mergedStats, hasChanges };
      }

      return { ok: true, hasChanges: false };
    } catch {
      return { ok: false, error: "সিঙ্ক করা যায়নি" };
    }
  },

  // Push local updates to Cloudflare (runs automatically in background)
  async pushData(): Promise<{ ok: boolean; error?: string }> {
    const creds = this.getCredentials();
    if (!creds) return { ok: false, error: "লগইন নেই" };

    try {
      const localData = this.getLocalSnapshot();
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "push",
          username: creds.username,
          passwordHash: creds.passwordHash,
          data: localData,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || "ডাটা সেভ করা যায়নি" };
      }

      this.setLastSyncTime(Date.now());
      return { ok: true };
    } catch {
      return { ok: false, error: "ক্লাউডে সেভ করা যায়নি" };
    }
  },
};
