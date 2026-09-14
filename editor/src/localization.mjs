export const rtlLimitation = "The editor canvas and panel layout currently remain left-to-right. Unicode labels are preserved, and rendered output follows compiler locale support.";
export function safeLocale(locale) {
  try { return Intl.getCanonicalLocales(locale || [])[0] || globalThis.navigator?.language || "en"; }
  catch { return "en"; }
}
export function formatLocalDate(value, locale) {
  return new Intl.DateTimeFormat(safeLocale(locale), { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
export function formatLocalNumber(value, locale) {
  return new Intl.NumberFormat(safeLocale(locale)).format(value);
}
