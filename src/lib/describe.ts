import { formatDate, formatPhone } from './nlp';
import type { BookingJourney, Fields, HomeSize, Hours, Packing, Pain } from './types';

// Human-readable labels for fields: used by chips, "understood" pills, summaries and records.

export const HOME_SIZE_LABEL: Record<HomeSize, string> = {
  'few-items': 'A few items',
  studio: 'Studio / 1 room',
  '1-bed': '1 bedroom',
  '2-bed': '2 bedrooms',
  '3-bed': '3 bedrooms',
  '4-bed-plus': '4+ bedrooms',
  office: 'Office',
};

export const PACKING_LABEL: Record<Packing, string> = {
  full: 'Full packing',
  'fragile-only': 'Fragile items only',
  none: 'No packing',
};

export const HOURS_LABEL: Record<Hours, string> = {
  day: 'Daytime (9am–6pm)',
  extended: 'Extended (8am–10pm)',
  night: 'Night shifts',
  '24-7': '24/7',
};

export const PAIN_LABEL: Record<Pain, string> = {
  cost: 'Cost',
  reliability: 'Reliability',
  tracking: 'Tracking',
};

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function floorLabel(n: number): string {
  return n === 0 ? 'Ground floor' : `${ordinal(n)} floor`;
}

export function acLabel(n: number): string {
  if (n === 0) return 'No AC';
  return `${n} AC${n > 1 ? 's' : ''} (remove + refit)`;
}

export function homeLabel(f: Fields): string | undefined {
  if (!f.home_size) return undefined;
  if (f.home_size === 'few-items' || f.home_size === 'office' || f.home_size === 'studio') return HOME_SIZE_LABEL[f.home_size];
  const beds = f.home_size === '4-bed-plus' ? '4+ bed' : f.home_size;
  const kind = f.property_type && f.property_type !== 'office' ? f.property_type : 'home';
  return `${beds} ${kind}`;
}

export function placeLabel(area?: string, city?: string): string {
  if (area && city && area !== city) return `${area}, ${city}`;
  return area ?? city ?? '—';
}

export function scope(f: Fields): 'intra-city' | 'inter-city' | undefined {
  if (!f.from_city || !f.to_city) return undefined;
  return f.from_city === f.to_city ? 'intra-city' : 'inter-city';
}

export function routeLabel(f: Fields): string | undefined {
  if (!f.from_area && !f.to_area && !f.from_city) return undefined;
  const sc = scope(f);
  if (sc === 'intra-city') return `${f.from_area ?? f.from_city} → ${f.to_area ?? f.to_city}`;
  return `${placeLabel(f.from_area, f.from_city)} → ${placeLabel(f.to_area, f.to_city)}`;
}

export function scopeLabel(f: Fields): string | undefined {
  const sc = scope(f);
  if (sc === 'intra-city') return `Intra-city · ${f.from_city}`;
  if (sc === 'inter-city') return `Inter-city · ${f.from_city} → ${f.to_city}`;
  return undefined;
}

export function shortVehicle(label: string): string {
  return label.replace(/\s*\(.*\)$/, '');
}

export function pluralVehicle(label: string, n?: number): string {
  const name = shortVehicle(label);
  if (n === 1) return name;
  return /s$/i.test(name) ? name : `${name}s`;
}

export function tripsLabel(n: number): string {
  return `~${n} trips/day`;
}

export function zonesLabel(f: Fields): string | undefined {
  if (!f.zones?.length) return undefined;
  return f.zones.includes('City-wide') ? 'City-wide coverage' : f.zones.join(', ');
}

export function citiesLabel(f: Fields): string | undefined {
  if (!f.cities?.length) return undefined;
  return f.cities.length >= 8 ? 'All 8 cities' : f.cities.join(', ');
}

export function fleetLabel(f: Fields): string | undefined {
  if (f.fleet_size && f.vehicle_type) return `${f.fleet_size} × ${pluralVehicle(f.vehicle_type, f.fleet_size)}`;
  if (f.fleet_size) return `${f.fleet_size} vehicles`;
  if (f.vehicle_type) return pluralVehicle(f.vehicle_type);
  return undefined;
}

/** Labels for the values that changed this turn — shown as "understood" pills. */
export function changedLabels(journey: BookingJourney, before: Fields, after: Fields): string[] {
  const changed = (k: keyof Fields) => JSON.stringify(before[k]) !== JSON.stringify(after[k]) && after[k] !== undefined;
  const out: string[] = [];
  if (journey === 'household') {
    if (changed('from_area') || changed('to_area') || changed('from_city') || changed('to_city')) {
      const route = routeLabel(after);
      if (route) out.push(route);
      const sc = scopeLabel(after);
      if (sc) out.push(sc);
    }
    if (changed('home_size') || changed('property_type')) {
      const h = homeLabel(after);
      if (h) out.push(h);
    }
    if (changed('floor')) out.push(floorLabel(after.floor!));
    if (changed('lift') && after.floor !== 0) out.push(after.lift ? 'Lift available' : 'No lift');
    if (changed('move_date')) out.push(formatDate(after.move_date!));
    if (changed('packing')) out.push(PACKING_LABEL[after.packing!]);
    if (changed('ac_units')) out.push(acLabel(after.ac_units!));
    if (changed('special_items')) out.push(after.special_items!.length ? after.special_items!.join(', ') : 'No special items');
    if (changed('phone')) out.push(formatPhone(after.phone!));
  } else {
    if (changed('company_name')) out.push(after.company_name!);
    if (changed('fleet_size') || changed('vehicle_type')) {
      const fl = fleetLabel(after);
      if (fl) out.push(fl);
    }
    if (changed('use_case')) out.push(after.use_case!);
    if (changed('cities')) out.push(citiesLabel(after)!);
    if (changed('zones')) out.push(zonesLabel(after)!);
    if (changed('daily_trips')) out.push(tripsLabel(after.daily_trips!));
    if (changed('operating_hours')) out.push(HOURS_LABEL[after.operating_hours!]);
    if (changed('pain_points')) out.push(`Pain point: ${after.pain_points!.map((p) => PAIN_LABEL[p]).join(', ')}`);
    if (changed('contact_name')) out.push(after.contact_name!);
    if (changed('contact_phone')) out.push(formatPhone(after.contact_phone!));
    if (changed('contact_email')) out.push(after.contact_email!);
  }
  return out;
}
