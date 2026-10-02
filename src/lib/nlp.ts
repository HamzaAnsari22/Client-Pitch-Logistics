import type { Lang } from './types';

// Small, dependency-free language helpers shared by the demo engine and the live engine.

const NUMBER_WORDS: Record<string, number> = {
  // English
  zero: 0, one: 1, a: 1, an: 1, single: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  hundred: 100,
  // Roman Urdu
  ek: 1, aik: 1, do: 2, teen: 3, char: 4, chaar: 4, panch: 5, paanch: 5, chay: 6, chhe: 6, chhay: 6,
  saat: 7, aath: 8, ath: 8, nau: 9, das: 10, bees: 20, tees: 30, chalees: 40, pachas: 50, sau: 100,
};

/** Regex fragment matching a digit run or a number word. */
export const NUM = `(\\d{1,4}|${Object.keys(NUMBER_WORDS).filter((w) => w.length > 1).join('|')})`;

export function toNumber(token: string | undefined): number | undefined {
  if (!token) return undefined;
  const t = token.toLowerCase().trim();
  if (/^\d+$/.test(t)) return Number(t);
  return NUMBER_WORDS[t];
}

// Roman Urdu number words that are also common English words ("do you…", "an item").
const AMBIGUOUS_NUMBERS = new Set(['do', 'an', 'teen', 'char', 'das', 'sau', 'saat']);

/** Like toNumber, but ignores ambiguous words unless the sentence reads as Roman Urdu or is very short. */
export function toNumberIn(token: string | undefined, sentence: string): number | undefined {
  const tok = token?.toLowerCase().trim();
  if (tok && AMBIGUOUS_NUMBERS.has(tok) && words(sentence).length > 3 && detectLang(sentence) !== 'ur') return undefined;
  return toNumber(tok);
}

/** Lowercase and normalise punctuation/whitespace, keeping hyphens and slashes. */
export function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function words(text: string): string[] {
  return norm(text).split(/[^a-z0-9'+/-]+/).filter(Boolean);
}

const URDU_MARKERS = new Set([
  'hai', 'hain', 'hay', 'karna', 'karni', 'karne', 'karwana', 'karwani', 'chahiye', 'chahye', 'chahie', 'mein',
  'se', 'sey', 'ka', 'ki', 'ke', 'ko', 'aur', 'nahi', 'nahin', 'nai', 'kya', 'kab', 'kahan', 'kaise', 'ghar',
  'kal', 'parson', 'hamari', 'humari', 'hamara', 'humara', 'hamein', 'humein', 'mera', 'meri', 'mujhe', 'roz',
  'rozana', 'gaari', 'gari', 'gaariyan', 'gariyan', 'bhai', 'jee', 'theek', 'acha', 'kitna', 'kitne', 'batao',
  'bataen', 'bataye', 'saman', 'samaan', 'tak', 'wala', 'wali', 'kamre', 'kamray', 'manzil', 'agle', 'aglay',
  'haan', 'han', 'ji', 'hoga', 'hogi', 'raha', 'rahi', 'rahe', 'dena', 'dein', 'bhi', 'sirf', 'abhi', 'apna',
]);

/** Detect Roman Urdu vs English. Returns null when the text is too short to tell. */
export function detectLang(text: string): Lang | null {
  const w = words(text);
  if (w.length < 3) return null;
  const hits = w.filter((x) => URDU_MARKERS.has(x)).length;
  if (hits >= 2 || hits / w.length >= 0.25) return 'ur';
  return 'en';
}

export const t = (lang: Lang, en: string, ur: string) => (lang === 'ur' ? ur : en);

// ---------------------------------------------------------------- dates

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const WEEKDAYS: [RegExp, number][] = [
  [/\b(sunday|sun|itwar|itwaar|itvaar|itwaar)\b/, 0],
  [/\b(monday|mon|peer|pir|somwar|somvar)\b/, 1],
  [/\b(tuesday|tue|tues|mangal)\b/, 2],
  [/\b(wednesday|wed|budh|budhwar)\b/, 3],
  [/\b(thursday|thu|thur|thurs|jumerat|jumeraat|jummerat)\b/, 4],
  [/\b(friday|fri|juma|jumma|jummah)\b/, 5],
  [/\b(saturday|sat|hafta ko|sanichar)\b/, 6],
];

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

function nextWeekday(base: Date, weekday: number): Date {
  let diff = (weekday - base.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  return addDays(base, diff);
}

function dateFromParts(today: Date, day: number, monthIdx: number, year?: number): Date | null {
  if (monthIdx < 0 || monthIdx > 11 || day < 1 || day > 31) return null;
  let y = year ?? today.getFullYear();
  if (y < 100) y += 2000;
  let d = new Date(y, monthIdx, day);
  if (d.getMonth() !== monthIdx) return null;
  // No year given and the date already passed: assume next year.
  if (year === undefined && d < addDays(today, 0)) d = new Date(y + 1, monthIdx, day);
  return d;
}

/** Parse move dates in English and Roman Urdu. Returns YYYY-MM-DD or null. */
export function parseDate(text: string, today: Date = new Date()): string | null {
  const s = norm(text);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let m = s.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    const d = dateFromParts(base, Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (d) return isoDate(d);
  }

  m = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?${MONTH_RE}\\.?(?:,?\\s*(20\\d{2}))?\\b`));
  if (m) {
    const d = dateFromParts(base, Number(m[1]), MONTHS.indexOf(m[2].slice(0, 3)), m[3] ? Number(m[3]) : undefined);
    if (d) return isoDate(d);
  }
  m = s.match(new RegExp(`\\b${MONTH_RE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(20\\d{2}))?\\b`));
  if (m) {
    const d = dateFromParts(base, Number(m[2]), MONTHS.indexOf(m[1].slice(0, 3)), m[3] ? Number(m[3]) : undefined);
    if (d) return isoDate(d);
  }

  // 15/10, 15-10-2026, 15.10 (day first, as written in Pakistan). Not sector names (F-7/2) or 24/7.
  m = s.match(/(?<![\w/-])(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?(?![\w/])/);
  if (m && !(m[1] === '24' && m[2] === '7')) {
    const d = dateFromParts(base, Number(m[1]), Number(m[2]) - 1, m[3] ? Number(m[3]) : undefined);
    if (d) return isoDate(d);
  }

  if (/\b(day after tomorrow|parson|parso|parsoon)\b/.test(s)) return isoDate(addDays(base, 2));
  if (/\b(today|aaj|tonight|asap|abhi)\b/.test(s)) return isoDate(base);
  if (/\b(tomorrow|tmrw|tmr|tomorow|tommorow|kal)\b/.test(s)) return isoDate(addDays(base, 1));

  m = s.match(new RegExp(`\\b(?:in\\s+)?${NUM}\\s+(days?|din)\\s*(?:baad|bad|mein|later|from now)?\\b`));
  if (m && /\b(in|baad|bad|mein|later|from now)\b/.test(s)) {
    const n = toNumber(m[1]);
    if (n !== undefined && n < 120) return isoDate(addDays(base, n));
  }
  m = s.match(new RegExp(`\\b(?:in\\s+)?${NUM}\\s+(weeks?|hafte|haftay)\\s*(?:baad|bad|later|from now)?\\b`));
  if (m && /\b(in|baad|bad|later|from now)\b/.test(s)) {
    const n = toNumber(m[1]);
    if (n !== undefined && n < 20) return isoDate(addDays(base, n * 7));
  }

  if (/\b(this weekend|weekend|is weekend)\b/.test(s)) {
    return isoDate(base.getDay() === 6 ? addDays(base, 1) : nextWeekday(base, 6));
  }
  if (/\b(next week|agle hafte|aglay haftay|agle hafta|coming week)\b/.test(s)) return isoDate(nextWeekday(base, 1));
  if (/\b(next month|agle mahine|aglay mahinay|agle mahina)\b/.test(s)) {
    return isoDate(new Date(base.getFullYear(), base.getMonth() + 1, 1));
  }
  if (/\b(end of (the )?month|month end|month-end|mahine ke aakhir|mahinay ke akhir)\b/.test(s)) {
    let d = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    if (d.getTime() === base.getTime()) d = new Date(base.getFullYear(), base.getMonth() + 2, 0);
    return isoDate(d);
  }

  for (const [re, wd] of WEEKDAYS) {
    if (re.test(s)) return isoDate(nextWeekday(base, wd));
  }
  return null;
}

export function formatDate(iso: string): string {
  return fromIso(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysUntil(iso: string, today: Date = new Date()): number {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((fromIso(iso).getTime() - base.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------- contact details

/** Pakistani mobile numbers: 0300 1234567, +92 300 1234567, 923001234567. Returns +923001234567. */
export function parsePhone(text: string): string | null {
  const compact = text.replace(/[\s().-]/g, '');
  const m = compact.match(/(?:\+92|0092|92|0)?(3\d{9})(?!\d)/);
  return m ? `+92${m[1]}` : null;
}

export function formatPhone(e164: string): string {
  const d = e164.replace('+92', '');
  return `+92 ${d.slice(0, 3)} ${d.slice(3)}`;
}

export function maskPhone(e164: string): string {
  const d = e164.replace('+92', '');
  return `+92 ${d.slice(0, 3)} ••••${d.slice(7)}`;
}

export function parseEmail(text: string): string | null {
  const m = text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
  return m ? m[0].toLowerCase() : null;
}

export function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length <= 3 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

export function isAffirmative(text: string): boolean {
  return /^(yes|yeah|yep|yup|sure|ok|okay|haan|han|ji|jee|ji haan|bilkul|zaroor|of course|please|y)\b/.test(norm(text));
}

export function isNegative(text: string): boolean {
  return /^(no|nope|nah|nahi|nahin|nai|na|none|nothing|not really|ji nahi|bilkul nahi|n)\b/.test(norm(text));
}
