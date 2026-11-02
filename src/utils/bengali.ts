const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBengaliNumber(
  num: number | string | undefined | null,
): string {
  if (num === undefined || num === null) return "";
  return num.toString().replace(/\d/g, (d) => BN_DIGITS[parseInt(d, 10)] ?? d);
}

export function getRevelationTypeBengali(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized.includes("mecc") || normalized.includes("মাক্কী")) {
    return "মাক্কী";
  }
  return "মাদানী";
}
