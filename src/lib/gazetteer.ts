import type { City } from './knowledge';

// Neighbourhoods per city. An area listed under several cities (DHA, Gulberg, Bahria Town…)
// is resolved from context: the other end of the move, or a city named in the message.

interface AreaDef {
  name: string;
  aliases: string[];
  cities: City[];
}

const AREAS: AreaDef[] = [
  // Multi-city
  { name: 'DHA', aliases: ['dha', 'd h a', 'defence', 'defense'], cities: ['Karachi', 'Lahore', 'Islamabad', 'Multan', 'Peshawar', 'Bahawalpur', 'Quetta'] },
  { name: 'Bahria Town', aliases: ['bahria town', 'bahria'], cities: ['Karachi', 'Lahore', 'Islamabad'] },
  { name: 'Gulberg', aliases: ['gulberg'], cities: ['Lahore', 'Karachi', 'Faisalabad'] },
  { name: 'Cantt', aliases: ['cantt', 'cantonment'], cities: ['Lahore', 'Karachi', 'Peshawar', 'Quetta', 'Multan', 'Bahawalpur'] },
  { name: 'Model Town', aliases: ['model town'], cities: ['Lahore', 'Multan', 'Bahawalpur'] },
  { name: 'Saddar', aliases: ['saddar', 'sadar'], cities: ['Karachi', 'Peshawar'] },
  { name: 'Askari', aliases: ['askari'], cities: ['Lahore', 'Karachi'] },
  { name: 'Wapda Town', aliases: ['wapda town'], cities: ['Lahore', 'Multan'] },
  { name: 'Samanabad', aliases: ['samanabad'], cities: ['Lahore', 'Faisalabad'] },
  { name: 'Satellite Town', aliases: ['satellite town'], cities: ['Quetta', 'Bahawalpur'] },
  // Karachi
  { name: 'Clifton', aliases: ['clifton'], cities: ['Karachi'] },
  { name: 'Bath Island', aliases: ['bath island'], cities: ['Karachi'] },
  { name: 'Gulshan-e-Iqbal', aliases: ['gulshan e iqbal', 'gulshan iqbal', 'gulshan'], cities: ['Karachi'] },
  { name: 'Gulistan-e-Johar', aliases: ['gulistan e johar', 'gulistan e jauhar', 'johar', 'jauhar'], cities: ['Karachi'] },
  { name: 'North Nazimabad', aliases: ['north nazimabad'], cities: ['Karachi'] },
  { name: 'Nazimabad', aliases: ['nazimabad'], cities: ['Karachi'] },
  { name: 'PECHS', aliases: ['pechs', 'p e c h s'], cities: ['Karachi'] },
  { name: 'Bahadurabad', aliases: ['bahadurabad'], cities: ['Karachi'] },
  { name: 'Tariq Road', aliases: ['tariq road'], cities: ['Karachi'] },
  { name: 'FB Area', aliases: ['fb area', 'f b area', 'federal b area'], cities: ['Karachi'] },
  { name: 'Korangi', aliases: ['korangi'], cities: ['Karachi'] },
  { name: 'Malir', aliases: ['malir'], cities: ['Karachi'] },
  { name: 'Landhi', aliases: ['landhi'], cities: ['Karachi'] },
  { name: 'Scheme 33', aliases: ['scheme 33'], cities: ['Karachi'] },
  { name: 'Surjani Town', aliases: ['surjani'], cities: ['Karachi'] },
  { name: 'Lyari', aliases: ['lyari'], cities: ['Karachi'] },
  { name: 'Keamari', aliases: ['keamari', 'kemari'], cities: ['Karachi'] },
  { name: 'SITE Area', aliases: ['site area'], cities: ['Karachi'] },
  { name: 'Shah Faisal Colony', aliases: ['shah faisal'], cities: ['Karachi'] },
  { name: 'Zamzama', aliases: ['zamzama'], cities: ['Karachi'] },
  { name: 'Karsaz', aliases: ['karsaz'], cities: ['Karachi'] },
  // Lahore
  { name: 'Johar Town', aliases: ['johar town', 'jauhar town'], cities: ['Lahore'] },
  { name: 'Allama Iqbal Town', aliases: ['allama iqbal town', 'iqbal town'], cities: ['Lahore'] },
  { name: 'Faisal Town', aliases: ['faisal town'], cities: ['Lahore'] },
  { name: 'Garden Town', aliases: ['garden town'], cities: ['Lahore'] },
  { name: 'Township', aliases: ['township'], cities: ['Lahore'] },
  { name: 'Valencia', aliases: ['valencia'], cities: ['Lahore'] },
  { name: 'Shadman', aliases: ['shadman'], cities: ['Lahore'] },
  { name: 'Lake City', aliases: ['lake city'], cities: ['Lahore'] },
  { name: 'Mall Road', aliases: ['mall road'], cities: ['Lahore'] },
  { name: 'Anarkali', aliases: ['anarkali'], cities: ['Lahore'] },
  { name: 'Raiwind Road', aliases: ['raiwind'], cities: ['Lahore'] },
  { name: 'Thokar Niaz Baig', aliases: ['thokar niaz baig', 'thokar'], cities: ['Lahore'] },
  { name: 'Sabzazar', aliases: ['sabzazar'], cities: ['Lahore'] },
  { name: 'EME', aliases: ['eme society', 'eme'], cities: ['Lahore'] },
  // Islamabad (sectors such as F-7 or G-11/2 are matched separately)
  { name: 'Blue Area', aliases: ['blue area'], cities: ['Islamabad'] },
  { name: 'Bani Gala', aliases: ['bani gala', 'banigala'], cities: ['Islamabad'] },
  { name: 'Gulberg Greens', aliases: ['gulberg greens'], cities: ['Islamabad'] },
  { name: 'PWD', aliases: ['pwd'], cities: ['Islamabad'] },
  { name: 'Chak Shahzad', aliases: ['chak shahzad'], cities: ['Islamabad'] },
  { name: 'Margalla Town', aliases: ['margalla town'], cities: ['Islamabad'] },
  { name: 'Bhara Kahu', aliases: ['bhara kahu', 'bharakahu'], cities: ['Islamabad'] },
  { name: 'Diplomatic Enclave', aliases: ['diplomatic enclave'], cities: ['Islamabad'] },
  { name: 'Tarlai', aliases: ['tarlai'], cities: ['Islamabad'] },
  // Peshawar
  { name: 'Hayatabad', aliases: ['hayatabad'], cities: ['Peshawar'] },
  { name: 'University Town', aliases: ['university town', 'uni town'], cities: ['Peshawar'] },
  { name: 'Gulbahar', aliases: ['gulbahar'], cities: ['Peshawar'] },
  { name: 'Warsak Road', aliases: ['warsak'], cities: ['Peshawar'] },
  { name: 'Ring Road', aliases: ['ring road'], cities: ['Peshawar'] },
  { name: 'Regi Model Town', aliases: ['regi model town', 'regi'], cities: ['Peshawar'] },
  { name: 'Board Bazaar', aliases: ['board bazaar', 'board bazar'], cities: ['Peshawar'] },
  // Quetta
  { name: 'Jinnah Town', aliases: ['jinnah town'], cities: ['Quetta'] },
  { name: 'Samungli Road', aliases: ['samungli'], cities: ['Quetta'] },
  { name: 'Zarghoon Road', aliases: ['zarghoon'], cities: ['Quetta'] },
  { name: 'Brewery Road', aliases: ['brewery road'], cities: ['Quetta'] },
  { name: 'Shahbaz Town', aliases: ['shahbaz town'], cities: ['Quetta'] },
  { name: 'Sariab Road', aliases: ['sariab'], cities: ['Quetta'] },
  { name: 'Chaman Housing', aliases: ['chaman housing'], cities: ['Quetta'] },
  // Multan
  { name: 'Gulgasht', aliases: ['gulgasht'], cities: ['Multan'] },
  { name: 'Bosan Road', aliases: ['bosan'], cities: ['Multan'] },
  { name: 'Shah Rukn-e-Alam', aliases: ['shah rukn e alam', 'shah rukne alam', 'rukn e alam'], cities: ['Multan'] },
  { name: 'Mumtazabad', aliases: ['mumtazabad'], cities: ['Multan'] },
  { name: 'New Multan', aliases: ['new multan'], cities: ['Multan'] },
  { name: 'Buch Villas', aliases: ['buch villas', 'buch villa'], cities: ['Multan'] },
  { name: 'Shalimar Colony', aliases: ['shalimar colony'], cities: ['Multan'] },
  // Faisalabad
  { name: 'D Ground', aliases: ['d ground'], cities: ['Faisalabad'] },
  { name: 'Peoples Colony', aliases: ['peoples colony', 'people colony'], cities: ['Faisalabad'] },
  { name: 'Madina Town', aliases: ['madina town'], cities: ['Faisalabad'] },
  { name: 'Susan Road', aliases: ['susan road'], cities: ['Faisalabad'] },
  { name: 'Canal Road', aliases: ['canal road'], cities: ['Faisalabad'] },
  { name: 'Jinnah Colony', aliases: ['jinnah colony'], cities: ['Faisalabad'] },
  { name: 'Satiana Road', aliases: ['satiana'], cities: ['Faisalabad'] },
  { name: 'Kohinoor City', aliases: ['kohinoor'], cities: ['Faisalabad'] },
  { name: 'Eden Valley', aliases: ['eden valley'], cities: ['Faisalabad'] },
  { name: 'Citi Housing', aliases: ['citi housing', 'city housing'], cities: ['Faisalabad'] },
  // Bahawalpur
  { name: 'Baghdad-ul-Jadeed', aliases: ['baghdad ul jadeed', 'baghdad'], cities: ['Bahawalpur'] },
  { name: 'Islamic Colony', aliases: ['islamic colony'], cities: ['Bahawalpur'] },
  { name: 'Farid Gate', aliases: ['farid gate'], cities: ['Bahawalpur'] },
  { name: 'Shahi Bazaar', aliases: ['shahi bazaar', 'shahi bazar'], cities: ['Bahawalpur'] },
  { name: 'Yazman Road', aliases: ['yazman'], cities: ['Bahawalpur'] },
  { name: 'Cheema Town', aliases: ['cheema town'], cities: ['Bahawalpur'] },
];

const CITY_ALIASES: Record<City, string[]> = {
  Karachi: ['karachi', 'khi'],
  Lahore: ['lahore', 'lhr'],
  Islamabad: ['islamabad', 'isb', 'isloo'],
  Peshawar: ['peshawar'],
  Quetta: ['quetta'],
  Multan: ['multan'],
  Faisalabad: ['faisalabad', 'fsd', 'lyallpur'],
  Bahawalpur: ['bahawalpur', 'bwp'],
};

/** Cities outside the service list. Recognised so we can answer honestly. */
const OTHER_CITIES = [
  'Hyderabad', 'Rawalpindi', 'Sialkot', 'Gujranwala', 'Sukkur', 'Abbottabad', 'Sargodha', 'Mardan',
  'Gwadar', 'Larkana', 'Murree', 'Sahiwal', 'Jhelum', 'Gujrat', 'Rahim Yar Khan', 'Muzaffarabad', 'Mirpur',
];

/** Popular areas per city, used for quick-reply chips. */
export const POPULAR_AREAS: Record<City, string[]> = {
  Karachi: ['DHA', 'Clifton', 'Gulshan-e-Iqbal', 'Gulistan-e-Johar', 'PECHS', 'North Nazimabad', 'Bahria Town', 'Korangi'],
  Lahore: ['DHA', 'Gulberg', 'Johar Town', 'Model Town', 'Bahria Town', 'Cantt', 'Garden Town', 'Allama Iqbal Town'],
  Islamabad: ['F-7', 'F-10', 'G-11', 'E-11', 'I-8', 'DHA', 'Bahria Town', 'Blue Area'],
  Peshawar: ['Hayatabad', 'University Town', 'Saddar', 'Gulbahar', 'Cantt', 'Warsak Road'],
  Quetta: ['Jinnah Town', 'Satellite Town', 'Cantt', 'Samungli Road', 'Zarghoon Road', 'Shahbaz Town'],
  Multan: ['Gulgasht', 'Bosan Road', 'Cantt', 'DHA', 'Model Town', 'Shah Rukn-e-Alam'],
  Faisalabad: ['D Ground', 'Peoples Colony', 'Madina Town', 'Gulberg', 'Susan Road', 'Canal Road'],
  Bahawalpur: ['Model Town', 'Satellite Town', 'DHA', 'Cantt', 'Baghdad-ul-Jadeed', 'Islamic Colony'],
};

export interface Mention {
  start: number;
  end: number;
  kind: 'area' | 'city';
  /** Display name: area name or city name. */
  name: string;
  /** Candidate service cities (area) or the city itself. Empty for a city we don't serve. */
  cities: string[];
  supported: boolean;
}

/** Lowercase, unify hyphens/punctuation to spaces but keep string length stable for offsets. */
export function canon(text: string): string {
  return text.toLowerCase().replace(/[‐-―]/g, '-').replace(/[^a-z0-9/+@.\s-]/g, ' ').replace(/-/g, ' ');
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Pattern {
  re: RegExp;
  make: (m: RegExpExecArray) => Omit<Mention, 'start' | 'end'>;
  len: number;
}

const PATTERNS: Pattern[] = (() => {
  const list: Pattern[] = [];
  for (const area of AREAS) {
    for (const alias of area.aliases) {
      list.push({
        re: new RegExp(`\\b${escapeRe(alias)}\\b`, 'g'),
        make: () => ({ kind: 'area', name: area.name, cities: [...area.cities], supported: true }),
        len: alias.length,
      });
    }
  }
  for (const [city, aliases] of Object.entries(CITY_ALIASES)) {
    for (const alias of aliases) {
      list.push({
        re: new RegExp(`\\b${escapeRe(alias)}\\b`, 'g'),
        make: () => ({ kind: 'city', name: city, cities: [city], supported: true }),
        len: alias.length,
      });
    }
  }
  for (const city of OTHER_CITIES) {
    const alias = city.toLowerCase();
    list.push({
      re: new RegExp(`\\b${escapeRe(alias)}\\b`, 'g'),
      make: () => ({ kind: 'city', name: city, cities: [], supported: false }),
      len: alias.length,
    });
  }
  // Longest aliases first so "johar town" wins over "johar", "north nazimabad" over "nazimabad".
  return list.sort((a, b) => b.len - a.len);
})();

// Islamabad sectors: F-7, G-11/2, E11, I-8. Matched on the raw lowercase text so the hyphen counts.
const SECTOR_RE = /(?<![a-z0-9])([b-i])-?(\d{1,2})(?:\/(\d))?(?![a-z0-9-])/g;

export function findPlaces(text: string): Mention[] {
  const c = canon(text);
  const taken = new Array<boolean>(c.length).fill(false);
  const found: Mention[] = [];
  const claim = (start: number, end: number) => {
    for (let i = start; i < end; i++) if (taken[i]) return false;
    for (let i = start; i < end; i++) taken[i] = true;
    return true;
  };

  const lower = text.toLowerCase();
  for (const m of lower.matchAll(SECTOR_RE)) {
    const num = Number(m[2]);
    if (num < 5 || num > 18) continue;
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (!claim(start, end)) continue;
    const name = `${m[1].toUpperCase()}-${m[2]}${m[3] ? `/${m[3]}` : ''}`;
    found.push({ start, end, kind: 'area', name, cities: ['Islamabad'], supported: true });
  }

  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.re.exec(c))) {
      const start = m.index;
      const end = start + m[0].length;
      if (claim(start, end)) found.push({ start, end, ...p.make(m) });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

export function isServedCity(name: string | undefined): boolean {
  return !!name && (Object.keys(CITY_ALIASES) as string[]).includes(name);
}
