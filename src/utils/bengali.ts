const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function toBengaliNumber(
  num: number | string | undefined | null,
): string {
  if (num === undefined || num === null) return "";
  return num.toString().replace(/\d/g, (d) => BN_DIGITS[parseInt(d, 10)] ?? d);
}

export function toArabicNumber(
  num: number | string | undefined | null,
): string {
  if (num === undefined || num === null) return "";
  return num.toString().replace(/\d/g, (d) => AR_DIGITS[parseInt(d, 10)] ?? d);
}

export function getRevelationTypeBengali(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized.includes("mecc") || normalized.includes("মাক্কী")) {
    return "মাক্কী";
  }
  return "মাদানী";
}

export function formatTimeMMSS(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const mm = mins.toString().padStart(2, "0");
  const ss = secs.toString().padStart(2, "0");
  return `${toBengaliNumber(mm)}:${toBengaliNumber(ss)}`;
}

export function formatTimeBengaliFriendly(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${toBengaliNumber(hours)} ঘণ্টা ${toBengaliNumber(mins)} মিনিট`;
  }
  if (mins > 0) {
    return `${toBengaliNumber(mins)} মিনিট ${secs > 0 ? `${toBengaliNumber(secs)} সেকেন্ড` : ""}`.trim();
  }
  return `${toBengaliNumber(secs)} সেকেন্ড`;
}
