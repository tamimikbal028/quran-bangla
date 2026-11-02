export interface DailyReadingStats {
  date: string; // YYYY-MM-DD
  targetMinutes: number; // 20 minutes default
  secondsToday: number;
  streakDays: number;
  lastActiveDate: string;
  totalAllTimeSeconds: number;
  updatedAt?: number;
}

const STORAGE_KEY = "quran_bn_timer_stats";

export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const TimerService = {
  getTodayString,
  getYesterdayString,

  getStats(): DailyReadingStats {
    const today = getTodayString();
    const yesterday = getYesterdayString();

    let stats: DailyReadingStats = {
      date: today,
      targetMinutes: 20,
      secondsToday: 0,
      streakDays: 0,
      lastActiveDate: today,
      totalAllTimeSeconds: 0,
      updatedAt: Date.now(),
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        stats = { ...stats, ...parsed };

        // If it's a new day, rollover
        if (stats.date !== today) {
          const metGoalYesterday =
            stats.date === yesterday &&
            stats.secondsToday >= stats.targetMinutes * 60;

          if (metGoalYesterday) {
            stats.streakDays += 1;
          } else if (stats.date !== yesterday) {
            // Missed more than 1 day
            stats.streakDays = 0;
          }

          stats.date = today;
          stats.secondsToday = 0;
          stats.lastActiveDate = today;
          stats.updatedAt = Date.now();

          this.saveStats(stats);
        }
      }
    } catch (e) {
      console.error("Failed to parse timer stats", e);
    }

    return stats;
  },

  saveStats(stats: DailyReadingStats): void {
    try {
      if (!stats.updatedAt) {
        stats.updatedAt = Date.now();
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
      console.error("Failed to save timer stats", e);
    }
  },

  addSeconds(seconds: number): DailyReadingStats {
    const stats = this.getStats();
    stats.secondsToday += seconds;
    stats.totalAllTimeSeconds += seconds;
    stats.updatedAt = Date.now();
    this.saveStats(stats);
    return stats;
  },

  setTargetMinutes(minutes: number): DailyReadingStats {
    const stats = this.getStats();
    stats.targetMinutes = Math.max(1, minutes);
    stats.updatedAt = Date.now();
    this.saveStats(stats);
    return stats;
  },

  resetToday(): DailyReadingStats {
    const stats = this.getStats();
    stats.secondsToday = 0;
    stats.updatedAt = Date.now();
    this.saveStats(stats);
    return stats;
  },

  resetAll(): DailyReadingStats {
    const today = getTodayString();
    const stats: DailyReadingStats = {
      date: today,
      targetMinutes: 20,
      secondsToday: 0,
      streakDays: 0,
      lastActiveDate: today,
      totalAllTimeSeconds: 0,
      updatedAt: Date.now(),
    };
    this.saveStats(stats);
    return stats;
  },
};
