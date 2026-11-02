export interface DailyReadingStats {
  date: string; // YYYY-MM-DD
  targetMinutes: number; // 20 minutes default
  secondsToday: number;
  streakDays: number;
  lastActiveDate: string;
  totalAllTimeSeconds: number;
}

const STORAGE_KEY = "quran_bn_timer_stats";

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const TimerService = {
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
      console.error("Failed to save timer stats", e);
    }
  },

  addSeconds(seconds: number): DailyReadingStats {
    const stats = this.getStats();
    stats.secondsToday += seconds;
    stats.totalAllTimeSeconds += seconds;
    this.saveStats(stats);
    return stats;
  },

  setTargetMinutes(minutes: number): DailyReadingStats {
    const stats = this.getStats();
    stats.targetMinutes = Math.max(1, minutes);
    this.saveStats(stats);
    return stats;
  },
};
