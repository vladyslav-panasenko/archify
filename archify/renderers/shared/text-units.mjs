// Conservative monospace advance estimates: Unicode 17 East Asian Wide and
// Fullwidth ranges, excluding halfwidth forms and unassigned U+A97D-U+A97F.
const FULLWIDTH_RE = /[\u1100-\u115F\u231A-\u231B\u2329-\u232A\u23E9-\u23EC\u23F0\u23F3\u25FD-\u25FE\u2614-\u2615\u2630-\u2637\u2648-\u2653\u267F\u268A-\u268F\u2693\u26A1\u26AA-\u26AB\u26BD-\u26BE\u26C4-\u26C5\u26CE\u26D4\u26EA\u26F2-\u26F3\u26F5\u26FA\u26FD\u2705\u270A-\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B-\u2B1C\u2B50\u2B55\u2E80-\uA4CF\uA960-\uA97C\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6F\uFF01-\uFF60\uFFE0-\uFFE6\u{16FE0}-\u{18DFF}\u{1AFF0}-\u{1AFFF}\u{1B000}-\u{1B2FF}\u{1F000}-\u{1FAFF}\u{20000}-\u{3FFFD}]/u;

// Selectors have no separate advance. VS16 reserves emoji width; VS15 keeps
// the base's estimate because font presentation does not guarantee narrowing.
const VARIATION_SELECTOR_FIRST = 0xfe00;
const VARIATION_SELECTOR_LAST = 0xfe0f;
const VARIATION_SELECTOR_EMOJI = 0xfe0f;
const TEXT_UNITS_CACHE = new Map();
const MAX_TEXT_UNITS_CACHE_ENTRIES = 4096;
const MAX_CACHED_TEXT_LENGTH = 1024;

export function textUnits(text) {
  const cacheKey = String(text ?? '');
  const cachedUnits = TEXT_UNITS_CACHE.get(cacheKey);
  if (cachedUnits !== undefined) return cachedUnits;
  const chars = Array.from(cacheKey);
  let units = 0;
  for (let i = 0; i < chars.length; i += 1) {
    const codePoint = chars[i].codePointAt(0);
    if (codePoint >= VARIATION_SELECTOR_FIRST && codePoint <= VARIATION_SELECTOR_LAST) continue;
    const next = i + 1 < chars.length ? chars[i + 1].codePointAt(0) : -1;
    if (next === VARIATION_SELECTOR_EMOJI) units += 2;
    else units += FULLWIDTH_RE.test(chars[i]) ? 2 : 1;
  }
  // Keep repeated in-process compiles bounded, including unusually long labels.
  if (cacheKey.length <= MAX_CACHED_TEXT_LENGTH) {
    if (TEXT_UNITS_CACHE.size >= MAX_TEXT_UNITS_CACHE_ENTRIES) {
      TEXT_UNITS_CACHE.delete(TEXT_UNITS_CACHE.keys().next().value);
    }
    TEXT_UNITS_CACHE.set(cacheKey, units);
  }
  return units;
}
