import { CITIES, FLEET, type City } from './knowledge';
import { POPULAR_AREAS } from './gazetteer';
import { HOME_SIZE_LABEL, HOURS_LABEL } from './describe';
import { SPECIAL_OPTIONS, citiesFor, vehicleLabel } from './extract';
import { isoDate, t } from './nlp';
import type { BookingJourney, Chip, ConvState, Fields, HomeSize, Hours, Lang, SlotKey, Widget } from './types';

// Which fields each journey needs, in the order we ask for them, and how each question looks.

export const HOUSEHOLD_SLOTS: SlotKey[] = [
  'from_area',
  'to_area',
  'from_city',
  'to_city',
  'home_size',
  'floor',
  'lift',
  'move_date',
  'packing',
  'ac_units',
  'special_items',
];

export const BUSINESS_SLOTS: SlotKey[] = [
  'company_name',
  'cities',
  'zones',
  'vehicle_type',
  'daily_trips',
  'operating_hours',
  'pain_points',
];

function isMissing(slot: SlotKey, f: Fields): boolean {
  switch (slot) {
    case 'from_area':
      return !f.from_area;
    case 'to_area':
      return !f.to_area;
    case 'from_city':
      return !!f.from_area && !f.from_city;
    case 'to_city':
      return !!f.to_area && !f.to_city;
    case 'home_size':
      return !f.home_size;
    case 'floor':
      return f.floor === undefined;
    case 'lift':
      return f.floor !== undefined && f.floor > 0 && f.lift === undefined;
    case 'move_date':
      return !f.move_date;
    case 'packing':
      return !f.packing;
    case 'ac_units':
      return f.home_size !== 'few-items' && f.ac_units === undefined;
    case 'special_items':
      return f.special_items === undefined;
    case 'company_name':
      return !f.company_name;
    case 'cities':
      return !f.cities?.length;
    case 'zones':
      return f.cities?.length === 1 && !f.zones?.length;
    case 'vehicle_type':
      return !f.vehicle_type;
    case 'daily_trips':
      return f.daily_trips === undefined;
    case 'operating_hours':
      return !f.operating_hours;
    case 'pain_points':
      return !f.pain_points?.length;
  }
}

export function missingSlots(journey: BookingJourney, f: Fields): SlotKey[] {
  return (journey === 'household' ? HOUSEHOLD_SLOTS : BUSINESS_SLOTS).filter((s) => isMissing(s, f));
}

/** Fill a city that can only be one thing given the other end of the move. */
export function resolvePendingCities(f: Fields): Fields {
  const out = { ...f };
  if (out.from_area && !out.from_city) {
    const c = citiesFor(out.from_area);
    if (c.length === 1) out.from_city = c[0];
    else if (out.to_city && (c as string[]).includes(out.to_city)) out.from_city = out.to_city;
  }
  if (out.to_area && !out.to_city) {
    const c = citiesFor(out.to_area);
    if (c.length === 1) out.to_city = c[0];
    else if (out.from_city && (c as string[]).includes(out.from_city)) out.to_city = out.from_city;
  }
  return out;
}

export interface Prompt {
  text: string;
  chips?: Chip[];
  widget?: Widget;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

function nextWeekday(base: Date, wd: number): Date {
  let diff = (wd - base.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  return addDays(base, diff);
}

const knownCity = (c?: string): City | undefined => (CITIES as readonly string[]).includes(c ?? '') ? (c as City) : undefined;

export function promptFor(slot: SlotKey, state: ConvState, today: Date): Prompt {
  const f = state.fields;
  const lang: Lang = state.lang;
  switch (slot) {
    case 'from_area': {
      const city = knownCity(f.from_city);
      return {
        text: city
          ? t(lang, `Which area of ${city} are you moving from?`, `${city} mein kis area se shift karna hai?`)
          : t(lang, 'Where are you moving from? Just the area and city is fine.', 'Kahan se shift karna hai? Sirf area aur shehar bata dein.'),
        chips: city
          ? POPULAR_AREAS[city].slice(0, 6).map((a) => ({ label: a, send: `${a}, ${city}` }))
          : ['DHA, Karachi', 'Gulshan-e-Iqbal, Karachi', 'Gulberg, Lahore', 'F-7, Islamabad', 'Hayatabad, Peshawar'].map((label) => ({ label })),
      };
    }
    case 'to_area': {
      const city = knownCity(f.to_city) ?? knownCity(f.from_city);
      const options = city ? POPULAR_AREAS[city].filter((a) => a !== f.from_area).slice(0, 6) : [];
      return {
        text: t(lang, 'And where are you moving to?', 'Aur kahan shift karna hai?'),
        chips: options.map((a) => ({ label: a, send: `${a}, ${city}` })),
      };
    }
    case 'from_city':
    case 'to_city': {
      const area = slot === 'from_city' ? f.from_area : f.to_area;
      const options = citiesFor(area);
      return {
        text: t(lang, `Which city is ${area} in?`, `${area} kis shehar mein hai?`),
        chips: (options.length > 1 ? options : [...CITIES]).map((c) => ({ label: c })),
      };
    }
    case 'home_size': {
      const sizes: HomeSize[] = ['few-items', 'studio', '1-bed', '2-bed', '3-bed', '4-bed-plus', 'office'];
      return {
        text:
          f.property_type === 'apartment'
            ? t(lang, 'How many bedrooms is the apartment?', 'Flat kitne kamron ka hai?')
            : t(lang, 'How big is the place you’re moving out of?', 'Ghar kitna bara hai?'),
        chips: sizes.map((s) => ({ label: HOME_SIZE_LABEL[s], patch: { home_size: s } })),
      };
    }
    case 'floor':
      return {
        text: t(lang, 'Which floor is it on?', 'Kaunsi manzil par hai?'),
        chips: [
          { label: t(lang, 'Ground floor', 'Ground floor'), patch: { floor: 0, lift: false } },
          { label: '1st floor', patch: { floor: 1 } },
          { label: '2nd floor', patch: { floor: 2 } },
          { label: '3rd floor', patch: { floor: 3 } },
          { label: t(lang, '4th or higher', '4th ya upar'), patch: { floor: 4 } },
        ],
      };
    case 'lift':
      return {
        text: t(lang, 'Is there a lift the crew can use?', 'Building mein lift hai?'),
        chips: [
          { label: t(lang, 'Yes, there’s a lift', 'Haan, lift hai'), patch: { lift: true } },
          { label: t(lang, 'No lift, stairs only', 'Nahi, sirf seerhiyan'), patch: { lift: false } },
        ],
      };
    case 'move_date': {
      const tomorrow = addDays(today, 1);
      const weekend = today.getDay() === 6 ? addDays(today, 1) : nextWeekday(today, 6);
      const nextWeek = nextWeekday(today, 1);
      return {
        text: t(lang, 'When would you like to move?', 'Shifting kab karni hai?'),
        chips: [
          { label: t(lang, 'Tomorrow', 'Kal'), patch: { move_date: isoDate(tomorrow) } },
          { label: t(lang, 'This weekend', 'Is weekend'), patch: { move_date: isoDate(weekend) } },
          { label: t(lang, 'Next week', 'Agle hafte'), patch: { move_date: isoDate(nextWeek) } },
        ],
        widget: { kind: 'date' },
      };
    }
    case 'packing':
      return {
        text: t(lang, 'Should our team pack everything for you?', 'Kya packing bhi hamari team kare?'),
        chips: [
          { label: t(lang, 'Yes, pack everything', 'Haan, sab pack karein'), patch: { packing: 'full' } },
          { label: t(lang, 'Only fragile items', 'Sirf fragile cheezein'), patch: { packing: 'fragile-only' } },
          { label: t(lang, 'No, I’ll pack', 'Nahi, khud pack karunga'), patch: { packing: 'none' } },
        ],
      };
    case 'ac_units':
      return {
        text: t(lang, 'Any ACs to remove and refit at the new place?', 'Koi AC utaar kar naye ghar mein lagwana hai?'),
        chips: [
          { label: t(lang, 'No AC', 'Koi AC nahi'), patch: { ac_units: 0 } },
          { label: '1 AC', patch: { ac_units: 1 } },
          { label: '2 ACs', patch: { ac_units: 2 } },
          { label: '3 ACs', patch: { ac_units: 3 } },
          { label: '4+ ACs', patch: { ac_units: 4 } },
        ],
      };
    case 'special_items':
      return {
        text: t(lang, 'Anything that needs extra care? Pick all that apply.', 'Koi cheez jis ka khaas khayal rakhna ho? Jo bhi ho select karein.'),
        widget: { kind: 'multi', field: 'special_items', options: SPECIAL_OPTIONS, noneLabel: t(lang, 'Nothing special', 'Kuch khaas nahi') },
      };
    case 'company_name':
      return { text: t(lang, 'What’s the company called?', 'Company ka naam kya hai?') };
    case 'cities':
      return {
        text: t(lang, 'Which city do you operate in?', 'Aap kis shehar mein kaam karte hain?'),
        chips: [...CITIES.map((c) => ({ label: c })), { label: t(lang, 'Multiple cities', 'Kayi shehar'), patch: { cities: [...CITIES] } }],
      };
    case 'zones': {
      const city = knownCity(f.cities?.[0]);
      return {
        text: t(lang, `Which zones of ${f.cities?.[0]} do you cover?`, `${f.cities?.[0]} ke kaunse areas cover karte hain?`),
        widget: {
          kind: 'multi',
          field: 'zones',
          options: city ? POPULAR_AREAS[city] : [],
          noneLabel: t(lang, 'Entire city', 'Poora shehar'),
        },
      };
    }
    case 'vehicle_type':
      return {
        text: t(lang, 'Which vehicles do you mainly use?', 'Zyada tar kaunsi gaariyan use hoti hain?'),
        chips: FLEET.filter((v) => v.id !== 'container-40').map((v) => ({
          label: v.id === 'container-20' ? 'Containers' : v.name,
          patch: { vehicle_type: v.id === 'container-20' ? 'Containers (20/40 ft)' : vehicleLabel(v.id) },
        })),
      };
    case 'daily_trips':
      return {
        text:
          f.fleet_size && f.vehicle_type
            ? t(lang, `Roughly how many trips or drops a day across those ${f.fleet_size} vehicles?`, `${f.fleet_size} gaariyon se roz takreeban kitne trips ya drops hote hain?`)
            : t(lang, 'Roughly how many trips or drops per day?', 'Roz takreeban kitne trips ya drops hote hain?'),
        chips: [
          { label: 'Under 20', patch: { daily_trips: 15 } },
          { label: '20–50', patch: { daily_trips: 35 } },
          { label: '50–100', patch: { daily_trips: 75 } },
          { label: '100–250', patch: { daily_trips: 175 } },
          { label: '250+', patch: { daily_trips: 300 } },
        ],
      };
    case 'operating_hours': {
      const hours: Hours[] = ['day', 'extended', 'night', '24-7'];
      return {
        text: t(lang, 'What are your operating hours?', 'Aap ke operating hours kya hain?'),
        chips: hours.map((h) => ({ label: HOURS_LABEL[h], patch: { operating_hours: h } })),
      };
    }
    case 'pain_points':
      return {
        text: t(lang, 'What’s the biggest headache with logistics today?', 'Abhi logistics mein sab se bara masla kya hai?'),
        chips: [
          { label: t(lang, 'Cost', 'Kharcha'), patch: { pain_points: ['cost'] } },
          { label: t(lang, 'Reliability (late / no-shows)', 'Reliability (late / no-show)'), patch: { pain_points: ['reliability'] } },
          { label: t(lang, 'Tracking & visibility', 'Tracking'), patch: { pain_points: ['tracking'] } },
          { label: t(lang, 'All of these', 'Yeh sab'), patch: { pain_points: ['cost', 'reliability', 'tracking'] } },
        ],
      };
  }
}
