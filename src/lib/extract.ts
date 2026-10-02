import { FLEET, CITIES, type City } from './knowledge';
import { findPlaces, type Mention } from './gazetteer';
import {
  NUM,
  norm,
  toNumber,
  toNumberIn,
  parseDate,
  parsePhone,
  parseEmail,
  titleCase,
  isAffirmative,
  isNegative,
} from './nlp';
import type { Asked, Fields, HomeSize, Hours, Pain, PropertyType } from './types';

// Rule-based slot extraction. Every function returns only the fields it is confident about.

type Patch = Partial<Fields>;

// ---------------------------------------------------------------- route (from / to)

interface Endpoint {
  m: Mention;
  role?: 'from' | 'to';
  explicitCity?: string;
}

function roleFromContext(c: string, m: Mention): 'from' | 'to' | undefined {
  const before = c.slice(Math.max(0, m.start - 16), m.start);
  const after = c.slice(m.end, m.end + 16);
  if (/\b(from|frm|out of)\s+(the\s+)?$/.test(before)) return 'from';
  if (/\b(to|into|towards?|till|until)\s+(the\s+)?$/.test(before)) return 'to';
  if (/^\s*(se|sey|say)\b/.test(after)) return 'from';
  if (/^\s*(tak|tk|jana|jaana|ja rahe|ja rahi|ja raha)\b/.test(after)) return 'to';
  return undefined;
}

function resolveCity(candidates: string[], hints: (string | undefined)[]): string | undefined {
  if (candidates.length === 1) return candidates[0];
  for (const h of hints) if (h && candidates.includes(h)) return h;
  return undefined;
}

/**
 * Pull pickup / drop-off areas and cities out of a sentence such as
 * "move my apartment from DHA to Clifton" or "ghar shift karna hai DHA se Clifton".
 */
export function extractRoute(text: string, fields: Fields, asked: Asked): Patch {
  const c = norm(text).replace(/-/g, ' ');
  const mentions = findPlaces(text);
  if (!mentions.length) return extractUnknownRoute(text, fields);

  // "Gulberg Lahore", "DHA, Karachi" → the city qualifies the area rather than being an endpoint.
  const endpoints: Endpoint[] = [];
  const hintCities: string[] = [];
  for (let i = 0; i < mentions.length; i++) {
    const m = mentions[i];
    const next = mentions[i + 1];
    if (m.kind === 'area' && next?.kind === 'city' && /^[\s,]*(in\s+)?$/.test(c.slice(m.end, next.start))) {
      endpoints.push({ m, explicitCity: next.name });
      i++;
      continue;
    }
    endpoints.push({ m });
  }

  const areaEnds = endpoints.filter((e) => e.m.kind === 'area');
  const routeAsked = asked === 'from_area' || asked === 'to_area' || asked === 'from_city' || asked === 'to_city';
  // A lone city with no from/to marker ("3 bed in Karachi") is context for whichever end lacks a city.
  if (!areaEnds.length && endpoints.length === 1 && !routeAsked && !roleFromContext(c, endpoints[0].m)) {
    const city = endpoints[0].m.name;
    const fits = (area?: string) => !area || !citiesFor(area).length || (citiesFor(area) as string[]).includes(city);
    const patch: Patch = {};
    if (!fields.from_city && fits(fields.from_area)) patch.from_city = city;
    if (!fields.to_city && fits(fields.to_area)) patch.to_city = city;
    return patch;
  }
  let ends = endpoints;
  if (areaEnds.length) {
    // City names without a from/to marker are context ("in Karachi, from DHA to Clifton").
    ends = endpoints.filter((e) => {
      if (e.m.kind === 'area') return true;
      if (roleFromContext(c, e.m)) return true;
      hintCities.push(e.m.name);
      return false;
    });
  }

  for (const e of ends) e.role = roleFromContext(c, e.m);
  const free = ends.filter((e) => !e.role);
  const taken = new Set(ends.map((e) => e.role).filter(Boolean));
  if (free.length >= 2 || (free.length === 1 && ends.length >= 2)) {
    for (const e of free) {
      e.role = taken.has('from') ? 'to' : 'from';
      taken.add(e.role);
    }
  } else if (free.length === 1) {
    const e = free[0];
    if (asked === 'to_area' || asked === 'to_city') e.role = 'to';
    else if (asked === 'from_area' || asked === 'from_city') e.role = 'from';
    else if (fields.from_area && !fields.to_area) e.role = 'to';
    else e.role = 'from';
  }

  const from = ends.find((e) => e.role === 'from');
  const to = ends.find((e) => e.role === 'to');
  const patch: Patch = {};

  const candidates = (e: Endpoint | undefined): string[] =>
    !e ? [] : e.explicitCity ? [e.explicitCity] : e.m.kind === 'city' ? [e.m.name] : e.m.cities;

  let fromC = candidates(from);
  let toC = candidates(to);
  // Two ambiguous areas (DHA → Gulberg): the move is probably within a city both share.
  if (fromC.length > 1 && toC.length > 1) {
    const shared = fromC.filter((x) => toC.includes(x));
    if (shared.length) {
      fromC = shared;
      toC = shared;
    }
  }
  const fromCity = from
    ? resolveCity(fromC, [...hintCities, toC.length === 1 ? toC[0] : undefined, fields.from_city, fields.to_city])
    : undefined;
  const toCity = to
    ? resolveCity(toC, [...hintCities, fromCity, fromC.length === 1 ? fromC[0] : undefined, fields.to_city, fields.from_city])
    : undefined;

  if (from) {
    if (from.m.kind === 'area') patch.from_area = from.m.name;
    if (fromCity) patch.from_city = fromCity;
  }
  if (to) {
    if (to.m.kind === 'area') patch.to_area = to.m.name;
    if (toCity) patch.to_city = toCity;
  }
  return patch;
}

const GENERIC_PLACE = /^(my|our|the|a|new|old|current|this|that)?\s*(home|house|place|flat|apartment|office|ghar|here|there|city|area|location|address)$/;

function extractUnknownRoute(text: string, fields: Fields): Patch {
  const s = norm(text);
  const m = s.match(
    /\bfrom\s+(?:my\s+|our\s+|the\s+)?([a-z][a-z0-9 ]{1,24}?)\s+to\s+(?:my\s+|our\s+|the\s+)?([a-z][a-z0-9 ]{1,24}?)(?=\s+(?:on|by|next|this|tomorrow|today|in|at|with|and|for|area|please)\b|[,.!?]|$)/,
  );
  if (!m) return {};
  const patch: Patch = {};
  if (!GENERIC_PLACE.test(m[1]) && !fields.from_area) patch.from_area = titleCase(m[1]);
  if (!GENERIC_PLACE.test(m[2]) && !fields.to_area) patch.to_area = titleCase(m[2]);
  return patch;
}

// ---------------------------------------------------------------- household details

const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  pehli: 1, pehle: 1, pahli: 1, doosri: 2, dusri: 2, doosre: 2, teesri: 3, tisri: 3, chothi: 4, chauthi: 4,
  panchvi: 5, panchwi: 5,
};

function sizeFromCount(n: number): HomeSize {
  if (n <= 1) return '1-bed';
  if (n === 2) return '2-bed';
  if (n === 3) return '3-bed';
  return '4-bed-plus';
}

export function extractHome(text: string): Patch {
  const s = norm(text).replace(/-/g, ' ');
  const patch: Patch = {};
  let property: PropertyType | undefined;
  if (/\b(apartment|flat|apt)\b/.test(s)) property = 'apartment';
  else if (/\b(upper portion|lower portion|portion)\b/.test(s)) property = 'portion';
  else if (/\boffice\b/.test(s)) property = 'office';
  else if (/\b(house|ghar|makan|makaan|bungalow|villa)\b/.test(s)) property = 'house';
  if (property) patch.property_type = property;

  let size: HomeSize | undefined;
  let m: RegExpMatchArray | null;
  if (
    /\b(few|kuch|couple of|some|chand)\s+(items?|things|cheez\w*|saman|samaan|boxes|pieces)\b/.test(s) ||
    /\b(just|only|sirf)\s+(a|one|ek|my)?\s*(fridge|sofa|bed|almari|wardrobe|table|washing machine|bike|motorbike)\b/.test(s) ||
    /\b(single|one|ek) (item|cheez)\b/.test(s)
  ) {
    size = 'few-items';
  } else if (/\bstudio\b/.test(s) || /\b(1|one|ek|single)\s*(room|kamra)\b(?!\s*(?:house|ghar|flat|apartment))/.test(s)) {
    size = 'studio';
  } else if ((m = s.match(new RegExp(`\\b${NUM}\\s*(bed|beds|bedroom|bedrooms|bhk|br|kamr\\w*|rooms?)\\b`)))) {
    const n = toNumberIn(m[1], text);
    if (n !== undefined && n > 0 && n < 20) size = sizeFromCount(n);
  } else if ((m = s.match(new RegExp(`\\b${NUM}\\s*marla\\b`)))) {
    const n = toNumber(m[1]) ?? 5;
    size = n <= 5 ? '2-bed' : n <= 10 ? '3-bed' : '4-bed-plus';
    patch.property_type ??= 'house';
  } else if (/\bkanal\b/.test(s) || /\b(bungalow|villa)\b/.test(s)) {
    size = '4-bed-plus';
    patch.property_type ??= 'house';
  } else if (property === 'office') {
    size = 'office';
  }
  if (size) patch.home_size = size;
  return patch;
}

export function extractFloorLift(text: string): Patch {
  const s = norm(text);
  const patch: Patch = {};
  let m: RegExpMatchArray | null;
  if (/(?<!\bd[ -])\b(ground floor|ground|gf)\b/.test(s) && !/\bd ground\b/.test(s)) patch.floor = 0;
  else if ((m = s.match(/\b(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:floor|flr|manzil)\b/))) patch.floor = Number(m[1]);
  else if ((m = s.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|pehli|pehle|pahli|doosri|dusri|doosre|teesri|tisri|chothi|chauthi|panchvi|panchwi)\s+(floor|manzil)\b/))) {
    patch.floor = ORDINALS[m[1]];
  }

  if (
    /\b(no|without|bina|baghair|bagair)\s+(a\s+)?(lift|elevator)\b/.test(s) ||
    /\b(lift|elevator)\s+(nahi|nahin|nai|nhi|not|isn'?t|is not|na|doesn'?t)\b/.test(s) ||
    /\b(stairs only|only stairs|seerhiyan|seerhi)\b/.test(s)
  ) {
    patch.lift = false;
  } else if (
    /\b(with|has|have|having)\s+(a\s+)?(lift|elevator)\b/.test(s) ||
    /\b(lift|elevator)\s+(hai|available|is available|is there|working|wali|wala|bhi)\b/.test(s)
  ) {
    patch.lift = true;
  }
  if (patch.floor === 0 && patch.lift === undefined) patch.lift = false;
  return patch;
}

export function extractPacking(text: string): Patch {
  const s = norm(text);
  if (
    /\b(no|without|skip)\s+packing\b/.test(s) ||
    /\bpacking\s+(nahi|nahin|nai|not needed|na|not required)\b/.test(s) ||
    /\b(i'?ll|we'?ll|i will|we will|khud|khud hi)\s+(do the\s+)?pack/.test(s) ||
    /\b(already|pehle se)\s+packed\b/.test(s) ||
    /\bself[ -]?pack/.test(s)
  ) {
    return { packing: 'none' };
  }
  if (/\b(only|sirf|just)\s+(the\s+)?(fragile|glass|crockery|delicate)/.test(s) || /\bfragile (items )?only\b/.test(s)) {
    return { packing: 'fragile-only' };
  }
  if (/\bpack(ing)?\b/.test(s)) return { packing: 'full' };
  return {};
}

export function extractAc(text: string): Patch {
  const s = norm(text).replace(/a\/c/g, 'ac');
  if (
    /\b(no|without|zero|koi)\s+(acs?|air ?conditioners?)\b(?!\s+(remov|refit|install))/.test(s) && !/\bkoi ac\b.*\b(hai|hain)\b/.test(s)
  ) {
    return { ac_units: 0 };
  }
  if (/\b(acs?|air ?conditioners?)\s+(nahi|nahin|nai|not|none)\b/.test(s)) return { ac_units: 0 };
  const m = s.match(new RegExp(`\\b${NUM}\\s*(?:split\\s+)?(acs?|air ?conditioners?|split units?)\\b`));
  if (m) {
    const n = toNumberIn(m[1], text);
    if (n !== undefined && n < 30) return { ac_units: n };
  }
  return {};
}

const SPECIAL_ITEMS: [RegExp, string][] = [
  [/\b(fridge|refrigerator|freezer)\b/, 'Fridge'],
  [/\bpiano\b/, 'Piano'],
  [/\b(glass|mirrors?|sheesha|shisha|aaina|crockery)\b/, 'Glass & mirrors'],
  [/\b(tv|led tv|lcd|television)\b/, 'Large TV'],
  [/\bsofa\b/, 'Sofa set'],
  [/\b(plants?|gamle|gamla|paudhe|pots)\b/, 'Plants'],
  [/\b(aquarium|fish tank)\b/, 'Aquarium'],
  [/\bwashing machine\b/, 'Washing machine'],
  [/\b(almari|almirah|wardrobe|cupboard)\b/, 'Wardrobe'],
  [/\bdining table\b/, 'Dining table'],
  [/\b(paintings?|artwork|antiques?|chandelier|jhoomar)\b/, 'Artwork & antiques'],
  [/\b(safe|tijori|locker)\b/, 'Safe / locker'],
  [/\b(motorbike|motorcycle)\b/, 'Motorbike'],
  [/\b(generator|ups)\b/, 'Generator / UPS'],
];

export const SPECIAL_OPTIONS = ['Fridge', 'Glass & mirrors', 'Large TV', 'Sofa set', 'Washing machine', 'Plants', 'Piano', 'Artwork & antiques'];

export function extractSpecial(text: string): Patch {
  const s = norm(text);
  const items = SPECIAL_ITEMS.filter(([re]) => re.test(s)).map(([, name]) => name);
  return items.length ? { special_items: items } : {};
}

/** All household fields that can appear anywhere in a free-text message. */
export function extractHousehold(text: string, fields: Fields, asked: Asked, today: Date): Patch {
  const patch: Patch = {
    ...extractRoute(text, fields, asked),
    ...extractHome(text),
    ...extractFloorLift(text),
    ...extractAc(text),
    ...extractSpecial(text),
  };
  const s = norm(text);
  if (/\bpack/.test(s)) Object.assign(patch, extractPacking(text));
  const date = parseDate(text, today);
  if (date) patch.move_date = date;
  const phone = parsePhone(text);
  if (phone) patch.phone = phone;
  return patch;
}

// ---------------------------------------------------------------- business

export const VEHICLE_LABELS = FLEET.map((v) => `${v.name} (${v.capacity.toLowerCase()})`);

export function vehicleLabel(id: string): string {
  const v = FLEET.find((x) => x.id === id);
  return v ? `${v.name} (${v.capacity.toLowerCase()})` : id;
}

export function extractVehicle(text: string): string | undefined {
  const s = ` ${norm(text).replace(/-/g, ' ')} `;
  for (const v of FLEET) {
    for (const k of v.keywords) {
      const key = k.replace(/-/g, ' ');
      if (new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`).test(s)) return vehicleLabel(v.id);
    }
  }
  if (/\bcontainers?\b/.test(s)) return 'Containers (20/40 ft)';
  if (/\bvans?\b/.test(s)) return 'Delivery vans';
  return undefined;
}

const VEHICLE_NOUNS =
  '(pickups?|pick ups?|trucks?|vehicles?|gaa?riy[ao]n|gaa?ri|gaadi|gaadiyan|bikes?|e bikes?|riders?|rickshaws?|loaders?|shahzores?|mazdas?|containers?|vans?|flatbeds?|trailers?|suzukis?)';

export function extractFleetSize(text: string): number | undefined {
  const s = norm(text).replace(/-/g, ' ');
  const re = new RegExp(`\\b${NUM}\\s+(?:x\\s+)?(?:[a-z0-9]+\\s+){0,2}?${VEHICLE_NOUNS}\\b`, 'g');
  for (const m of s.matchAll(re)) {
    if (/\b(ton|tons|ft|feet|foot|kg|marla)\b/.test(m[0])) continue;
    const n = toNumberIn(m[1], text);
    if (n !== undefined && n > 0 && n < 5000) return n;
  }
  return undefined;
}

export function extractDailyTrips(text: string): number | undefined {
  const s = norm(text).replace(/-/g, ' ');
  const re = new RegExp(
    `\\b${NUM}\\s*\\+?\\s*(?:[a-z]+\\s+)?(trips?|deliveries|delivery|orders|drops|chakk?ars?|parcels|shipments|consignments|stops)\\b(?:\\s*(?:a|per|each|every|/|har|in a)?\\s*(day|daily|roz|din|week|weekly|month|monthly|mahine|hafte))?`,
  );
  const m = s.match(re);
  if (!m) return undefined;
  let n = toNumberIn(m[1], text);
  if (n === undefined) return undefined;
  const period = m[3] ?? '';
  if (/week|hafte/.test(period)) n = Math.round(n / 6);
  if (/month|mahine/.test(period)) n = Math.round(n / 26);
  return n;
}

const USE_CASES: [RegExp, string][] = [
  [/\b(e ?commerce|online orders?|online store)\b/, 'E-commerce deliveries'],
  [/\blast mile\b/, 'Last-mile deliveries'],
  [/\b(distribution|distributor|fmcg|restock\w*|dealers?)\b/, 'Distribution'],
  [/\b(pharma\w*|medicines?)\b/, 'Pharma distribution'],
  [/\b(food|grocery|groceries|restaurants?)\b/, 'Food & grocery deliveries'],
  [/\b(construction|cement|steel|sariya)\b/, 'Construction material'],
  [/\b(factory|manufactur\w*|industrial|machinery)\b/, 'Industrial freight'],
  [/\b(export|import|port)\b/, 'Port & container freight'],
  [/\b(retail|stores?|outlets?|shops?)\b/, 'Retail replenishment'],
  [/\b(deliveries|delivery|courier|parcels?)\b/, 'Deliveries'],
];

export function extractUseCase(text: string): string | undefined {
  const s = norm(text).replace(/-/g, ' ');
  return USE_CASES.find(([re]) => re.test(s))?.[1];
}

export function extractHours(text: string, force = false): Hours | undefined {
  const s = norm(text);
  if (/\b(24\/7|24 7|24x7|24 hours|24 hrs|round the clock|around the clock|din raat|24 ghante|all day and night|nonstop)\b/.test(s)) return '24-7';
  const m = s.match(/\b(\d{1,2})(?::\d{2})?\s*(am|pm)?\s*(?:to|-|–|till|until|se)\s*(\d{1,2})(?::\d{2})?\s*(am|pm)?\b/);
  if (m && (m[2] || m[4] || force || /\b(hours|timings?|operate|work|open)\b/.test(s))) {
    let start = Number(m[1]);
    let end = Number(m[3]);
    if (start > 24 || end > 24) return undefined;
    if (m[2] === 'pm' && start < 12) start += 12;
    if (m[2] === 'am' && start === 12) start = 0;
    if (m[4] === 'pm' && end < 12) end += 12;
    if (m[4] === 'am' && end === 12) end = 0;
    if (!m[4] && end <= start && end < 12) end += 12;
    let span = end - start;
    if (span <= 0) span += 24;
    if (span >= 20) return '24-7';
    if (start >= 18 || (start <= 4 && span <= 10)) return 'night';
    return span <= 10 ? 'day' : 'extended';
  }
  if (/\b(night|nights|raat|overnight|night shift)\b/.test(s)) return 'night';
  if (/\b(extended|till late|late night|evening|16 hours|two shifts|double shift)\b/.test(s)) return 'extended';
  if (/\b(office hours|day ?time|daytime|9 to 5|day shift|din mein|din ko|business hours)\b/.test(s)) return 'day';
  return undefined;
}

export function extractPains(text: string): Pain[] {
  const s = norm(text);
  const pains: Pain[] = [];
  if (/\b(cost|costs|costly|expensive|price|prices|pricing|rates?|cheap\w*|budget|mehng\w*|kharch\w*|paisa|paise|save money|overcharg\w*)\b/.test(s)) pains.push('cost');
  if (/\b(reliab\w*|late|delay\w*|no ?shows?|don'?t show|cancel\w*|unreliable|availability|on time|time pe nahi|waqt pe nahi|breakdowns?|missed|bharosa)\b/.test(s)) pains.push('reliability');
  if (/\b(track\w*|visibility|where (is|are) (my|our)|gps|live location|proof of delivery|pod|status updates?)\b/.test(s)) pains.push('tracking');
  if (!pains.length && /\b(all of (these|them|the above)|all three|sab|sab kuch|everything)\b/.test(s)) return ['cost', 'reliability', 'tracking'];
  return pains;
}

const NAME_STOP = new Set([
  'from', 'looking', 'interested', 'running', 'calling', 'a', 'an', 'the', 'here', 'with', 'in', 'at', 'the', 'owner',
  'manager', 'ceo', 'head', 'not', 'just', 'also', 'and', 'trying', 'planning', 'moving', 'shifting', 'going', 'based',
]);

export function extractCompany(text: string): string | undefined {
  const named = text.match(
    /\b(?:company|business|firm|brand)(?:'s)?\s+(?:name\s+)?(?:is|called|named|:)\s+([A-Za-z0-9&.' -]{2,40}?)(?=[,.;!?]|\s+(?:and|we|our|in|with|based|hai)\b|$)/i,
  );
  if (named) return titleCase(named[1].trim());
  const urdu = text.match(/\bcompany ka naam\s+(.{2,40}?)\s+(?:hai|he)\b/i);
  if (urdu) return titleCase(urdu[1].trim());
  const ltd = text.match(/\b([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*){0,3})\s+\(?(?:pvt|private)\)?\.?\s*(?:ltd|limited)\b/i);
  if (ltd) return `${titleCase(ltd[1])} (Pvt) Ltd`;
  const we = text.match(/\b(?:we(?:'re| are)|i'?m from|i am from)\s+([A-Z][\w&.'-]*(?:\s+(?:[A-Z][\w&.'-]*|&))*)/);
  if (we && !(CITIES as readonly string[]).includes(we[1]) && !/^(A|An|The|We|I)$/.test(we[1])) return we[1];
  return undefined;
}

export function extractContactName(text: string): string | undefined {
  const m = text.match(/\b(?:my name is|name is|i am|i'm|im|this is|mera naam)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (!m) return undefined;
  const parts = m[1].split(/\s+/).filter((w) => !NAME_STOP.has(w.toLowerCase()) && !/^(hai|he|hoon|hun|and|from)$/i.test(w));
  if (!parts.length || NAME_STOP.has(m[1].split(/\s+/)[0].toLowerCase())) return undefined;
  return titleCase(parts.join(' ').toLowerCase());
}

export function extractBusinessPlaces(text: string): Patch {
  const s = norm(text);
  const mentions = findPlaces(text);
  const cities = new Set<string>();
  const zones: string[] = [];
  for (const m of mentions) {
    if (m.kind === 'city') cities.add(m.name);
  }
  for (const m of mentions) {
    if (m.kind !== 'area') continue;
    zones.push(m.name);
    if (m.cities.length === 1) cities.add(m.cities[0]);
  }
  const patch: Patch = {};
  if (/\b(across pakistan|nationwide|all over pakistan|pakistan bhar|all cities|every city|all major cities|multiple cities|many cities)\b/.test(s)) {
    patch.cities = [...CITIES];
  } else if (cities.size) {
    patch.cities = [...cities];
  }
  if (/\b(across|all over|throughout)\s+(the\s+)?(whole\s+|entire\s+)?city\b|\b(city ?wide|whole city|entire city|poore shehar|pure shehar|poora shehar|sare shehar|saray shehar)\b/.test(s)) {
    patch.zones = ['City-wide'];
  } else if (zones.length) {
    patch.zones = zones;
  }
  return patch;
}

export function extractBusiness(text: string): Patch {
  const patch: Patch = { ...extractBusinessPlaces(text) };
  const vehicle = extractVehicle(text);
  if (vehicle) patch.vehicle_type = vehicle;
  const fleet = extractFleetSize(text);
  if (fleet !== undefined) patch.fleet_size = fleet;
  const trips = extractDailyTrips(text);
  if (trips !== undefined) patch.daily_trips = trips;
  const use = extractUseCase(text);
  if (use) patch.use_case = use;
  const hours = extractHours(text);
  if (hours) patch.operating_hours = hours;
  const pains = extractPains(text);
  if (pains.length) patch.pain_points = pains;
  const company = extractCompany(text);
  if (company) patch.company_name = company;
  const name = extractContactName(text);
  if (name) patch.contact_name = name;
  const phone = parsePhone(text);
  if (phone) patch.contact_phone = phone;
  const email = parseEmail(text);
  if (email) patch.contact_email = email;
  return patch;
}

// ---------------------------------------------------------------- answers to a specific question

function cleanFreeText(text: string): string {
  return norm(text)
    .replace(/\b(from|to|in|at|my|our|the|area|se|tak|mein|me|hai|it'?s|its|we are|we're|i live|i am|i'm|located|near|sector|block|phase \d+|please|pls)\b/g, ' ')
    .replace(/[^a-z0-9 /-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function rangeNumber(text: string): number | undefined {
  const s = norm(text);
  let m = s.match(/(\d+)\s*(?:-|–|to)\s*(\d+)/);
  if (m) return Math.round((Number(m[1]) + Number(m[2])) / 2);
  m = s.match(/\b(under|less than|below|upto|up to)\s*(\d+)/);
  if (m) return Math.max(1, Math.round(Number(m[2]) * 0.6));
  m = s.match(/(\d+)\s*\+/);
  if (m) return Math.round(Number(m[1]) * 1.2);
  m = s.match(new RegExp(`\\b${NUM}\\b`));
  return m ? toNumber(m[1]) : undefined;
}

/**
 * Interpret a short reply in the context of the question just asked — "2" means 2nd floor
 * after the floor question but 2 ACs after the AC question.
 */
export function parseForSlot(slot: Asked, text: string, fields: Fields, today: Date): Patch {
  const s = norm(text);
  // A bare number only counts as an answer in a short reply ("2", "about 60") — never "do you…".
  const n = s.match(new RegExp(`^(?:about|around|approx|roughly|takreeban|lagbhag)?\\s*${NUM}\\b`));
  const short = s.split(' ').length <= 3;
  const num = n && (short || /^\d/.test(n[1])) ? toNumber(n[1]) : undefined;
  switch (slot) {
    case 'from_area':
    case 'to_area': {
      const route = extractRoute(text, fields, slot);
      if (route.from_area || route.to_area) return route;
      const free = cleanFreeText(text);
      if (!free || free.split(' ').length > 4 || GENERIC_PLACE.test(free)) return route;
      const area = /^[b-i][ -]?\d{1,2}(\/\d)?$/.test(free) ? free.toUpperCase().replace(/^([B-I])[ -]?/, '$1-') : titleCase(free);
      return slot === 'from_area' ? { ...route, from_area: area } : { ...route, to_area: area };
    }
    case 'from_city':
    case 'to_city': {
      const city = findPlaces(text).find((m) => m.kind === 'city');
      if (!city) return {};
      const patch: Patch = {};
      if (slot === 'from_city' || !fields.from_city) patch.from_city = city.name;
      if (slot === 'to_city' || !fields.to_city) patch.to_city = city.name;
      return patch;
    }
    case 'home_size': {
      const home = extractHome(text);
      if (home.home_size) return home;
      if (num !== undefined && num > 0 && num < 20) return { ...home, home_size: sizeFromCount(num) };
      if (/\b(few|kuch|items?|saman)\b/.test(s)) return { home_size: 'few-items' };
      return home;
    }
    case 'floor': {
      const fl = extractFloorLift(text);
      if (fl.floor !== undefined) return fl;
      if (num !== undefined && num < 60) return { ...fl, floor: num };
      return fl;
    }
    case 'lift': {
      const fl = extractFloorLift(text);
      if (fl.lift !== undefined) return { lift: fl.lift };
      if (isNegative(text)) return { lift: false };
      if (isAffirmative(text) || /\b(lift|elevator)\b/.test(s)) return { lift: true };
      return {};
    }
    case 'move_date': {
      const d = parseDate(text, today);
      return d ? { move_date: d } : {};
    }
    case 'packing': {
      const p = extractPacking(text);
      if (p.packing) return p;
      if (/\bfragile\b/.test(s)) return { packing: 'fragile-only' };
      if (isNegative(text)) return { packing: 'none' };
      if (isAffirmative(text) || /\b(full|everything|sab)\b/.test(s)) return { packing: 'full' };
      return {};
    }
    case 'ac_units': {
      const ac = extractAc(text);
      if (ac.ac_units !== undefined) return ac;
      if (isNegative(text)) return { ac_units: 0 };
      if (num !== undefined && num < 30) return { ac_units: num };
      return {};
    }
    case 'special_items': {
      const sp = extractSpecial(text);
      if (sp.special_items) return sp;
      if (isNegative(text) || /\b(nothing|none|no special|kuch (khaas|khas) nahi|that'?s all|bas|normal)\b/.test(s)) return { special_items: [] };
      const free = text.trim();
      return free.length >= 2 && free.length <= 60 ? { special_items: [titleCase(free)] } : {};
    }
    case 'company_name': {
      const company = extractCompany(text);
      if (company) return { company_name: company };
      const free = text
        .replace(/\b(it'?s|it is|we are|we're|company( name)? is|called|naam|hamari company|hai|he)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[\s,.:-]+|[\s,.:-]+$/g, '');
      return free.length >= 2 && free.length <= 50 ? { company_name: titleCase(free) } : {};
    }
    case 'cities': {
      const places = extractBusinessPlaces(text);
      if (places.cities) return places;
      if (/\b(multiple|many|all|several|different)\b/.test(s)) return { cities: [...CITIES] };
      return {};
    }
    case 'zones': {
      const places = extractBusinessPlaces(text);
      if (places.zones) return { zones: places.zones };
      if (/\b(all|entire|whole|everywhere|poora|pura|sab)\b/.test(s)) return { zones: ['City-wide'] };
      const parts = text.split(/,|\band\b|\baur\b/).map((x) => x.trim()).filter((x) => x.length > 1 && x.length < 30);
      return parts.length ? { zones: parts.map(titleCase) } : {};
    }
    case 'vehicle_type': {
      const v = extractVehicle(text);
      if (v) return { vehicle_type: v };
      return text.trim().length > 1 && text.trim().length < 40 ? { vehicle_type: titleCase(text.trim()) } : {};
    }
    case 'daily_trips': {
      const trips = extractDailyTrips(text) ?? rangeNumber(text);
      return trips !== undefined ? { daily_trips: trips } : {};
    }
    case 'operating_hours': {
      const h = extractHours(text, true);
      return h ? { operating_hours: h } : {};
    }
    case 'pain_points': {
      const pains = extractPains(text);
      return pains.length ? { pain_points: pains } : {};
    }
    default:
      return {};
  }
}

export function citiesFor(areaName: string | undefined): City[] {
  if (!areaName) return [];
  const m = findPlaces(areaName).find((x) => x.kind === 'area');
  return (m?.cities ?? []) as City[];
}
