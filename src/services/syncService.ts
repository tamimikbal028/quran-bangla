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
  syncKey: string;
  pin: string;
  lastSyncedAt?: number;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

const SYNC_CREDS_KEY = "quran_bn_sync_creds";
const LAST_SYNC_TIME_KEY = "quran_bn_last_sync_time";

// SHA-256 hash using native Web Crypto
export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`quran_bn_salt_${pin.trim()}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const SyncService = {
  getCredentials(): SyncCredentials | null {
    try {
      const raw = localStorage.getItem(SYNC_CREDS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.syncKey && parsed.pin) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  setCredentials(creds: SyncCredentials): void {
    try {
      localStorage.setItem(SYNC_CREDS_KEY, JSON.stringify(creds));
    } catch (e) {
      console.error("Failed to save sync creds", e);
    }
  },

  clearCredentials(): void {
    localStorage.removeItem(SYNC_CREDS_KEY);
    localStorage.removeItem(LAST_SYNC_TIME_KEY);
  },

  getLastSyncTime(): number | null {
    const raw = localStorage.getItem(LAST_SYNC_TIME_KEY);
    return raw ? parseInt(raw, 10) : null;
  },

  setLastSyncTime(ts: number): void {
    localStorage.setItem(LAST_SYNC_TIME_KEY, ts.toString());
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

  // Merge remote data with local data intelligently
  mergeRemoteData(remote: SyncPayload): {
    mergedLastRead: LastRead | null;
    mergedStats: DailyReadingStats;
    hasChanges: boolean;
  } {
    const localLastRead = QuranService.getLastRead();
    const localStats = TimerService.getStats();
    let hasChanges = false;

    // 1. Merge Last Read (choose the one with more recent updatedAt)
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
      // If same date, take maximums so progress is never lost
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
        // Remote is newer date
        mergedStats = remote.timerStats;
        TimerService.saveStats(mergedStats);
        hasChanges = true;
      }
    }

    return { mergedLastRead, mergedStats, hasChanges };
  },

  // Connect or Verify Account
  async connectAccount(
    syncKey: string,
    pin: string,
    pushLocalDataOnNew: boolean = true,
  ): Promise<{
    ok: boolean;
    isNew?: boolean;
    error?: string;
    payload?: SyncPayload;
  }> {
    const cleanKey = syncKey.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanKey || cleanKey.length < 2) {
      return { ok: false, error: "Sync Key অন্তত ২ অক্ষরের হতে হবে।" };
    }
    if (!cleanPin || cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      return {
        ok: false,
        error: "পিন অবশ্যই ৪ ডিজিটের সংখ্যা (যেমন: 1234) হতে হবে।",
      };
    }

    try {
      const pinHash = await hashPin(cleanPin);
      const localData = this.getLocalSnapshot();

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          syncKey: cleanKey,
          pinHash,
          data: pushLocalDataOnNew ? localData : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || "সার্ভারে সংযোগ করা যায়নি।" };
      }

      // Save credentials locally
      this.setCredentials({
        syncKey: cleanKey,
        pin: cleanPin,
        lastSyncedAt: Date.now(),
      });
      this.setLastSyncTime(Date.now());

      if (json.data) {
        this.mergeRemoteData(json.data);
      }

      return { ok: true, isNew: json.isNew, payload: json.data };
    } catch (e) {
      return {
        ok: false,
        error: "ইন্টারনেট কানেকশন চেক করুন বা আবার চেষ্টা করুন।",
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
    if (!creds) return { ok: false, error: "নট কানেক্টেড" };

    try {
      const pinHash = await hashPin(creds.pin);
      const res = await fetch(
        `/api/sync?action=pull&key=${encodeURIComponent(creds.syncKey)}&pinHash=${encodeURIComponent(pinHash)}`,
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
    } catch (e) {
      return { ok: false, error: "সিঙ্ক ফেইল হয়েছে" };
    }
  },

  // Push local updates to Cloudflare
  async pushData(): Promise<{ ok: boolean; error?: string }> {
    const creds = this.getCredentials();
    if (!creds) return { ok: false, error: "নট কানেক্টেড" };

    try {
      const pinHash = await hashPin(creds.pin);
      const localData = this.getLocalSnapshot();

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "push",
          syncKey: creds.syncKey,
          pinHash,
          data: localData,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || "ডাটা সেভ করা যায়নি" };
      }

      this.setLastSyncTime(Date.now());
      return { ok: true };
    } catch (e) {
      return { ok: false, error: "ক্লাউডে পুশ করা যায়নি" };
    }
  },
};
