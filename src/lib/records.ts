import { BRAND } from '../brand';
import { CITIES } from './knowledge';
import {
  HOURS_LABEL,
  PACKING_LABEL,
  PAIN_LABEL,
  acLabel,
  citiesLabel,
  fleetLabel,
  floorLabel,
  homeLabel,
  placeLabel,
  pluralVehicle,
  routeLabel,
  scope,
  zonesLabel,
} from './describe';
import { daysUntil, formatDate, formatPhone } from './nlp';
import { isServedCity } from './gazetteer';
import type { ConvState, Fields, Priority, RequestRecord } from './types';

// Turns collected fields into the structured hand-off the ops team receives.

const usedIds = new Set<string>();

export function newRequestId(): string {
  for (;;) {
    const id = `${BRAND.requestPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
  }
}

export function sourceLabel(state: ConvState): string {
  return state.liveTurns > 0 ? `Live AI (Gemini${state.liveModel ? ` · ${state.liveModel}` : ''})` : 'Demo engine';
}

const BED_RANK = { 'few-items': 0, studio: 1, '1-bed': 1, '2-bed': 2, '3-bed': 3, '4-bed-plus': 4, office: 4 } as const;

export function suggestVehicle(f: Fields): { vehicle: string; crew: number; acTechnicians: number } {
  const rank = f.home_size ? BED_RANK[f.home_size] : 2;
  const bulky = (f.special_items ?? []).some((x) => ['Fridge', 'Washing machine', 'Sofa set', 'Piano'].includes(x));
  let vehicle: string;
  let crew: number;
  if (rank === 0) {
    vehicle = bulky ? 'Suzuki pickup (up to 1 ton)' : 'Loader rickshaw';
    crew = 2;
  } else if (rank === 1) {
    vehicle = 'Suzuki pickup (up to 1 ton)';
    crew = f.home_size === 'studio' ? 2 : 3;
  } else if (rank === 2) {
    vehicle = 'Shahzore (2.5 tons)';
    crew = 4;
  } else if (rank === 3) {
    vehicle = 'Mazda truck (10 tons)';
    crew = 5;
  } else {
    vehicle = 'Mazda truck (10 tons)';
    crew = 6;
  }
  if (scope(f) === 'inter-city' && rank >= 3) vehicle = '20 ft container';
  if ((f.floor ?? 0) >= 2 && f.lift === false) crew += 1;
  if ((f.special_items ?? []).includes('Piano')) crew += 1;
  const acTechnicians = f.ac_units ? Math.ceil(f.ac_units / 3) : 0;
  return { vehicle, crew, acTechnicians };
}

function householdPriority(f: Fields, today: Date): { level: Priority; reason: string } {
  const d = f.move_date ? daysUntil(f.move_date, today) : 30;
  let level: Priority;
  let reason: string;
  if (d <= 2) {
    level = 'high';
    reason = `Move is ${d <= 0 ? 'today' : d === 1 ? 'tomorrow' : 'in 2 days'}, so the crew and vehicle need to be locked in now.`;
  } else if (d <= 7) {
    level = 'medium';
    reason = `Move is ${d} days away; schedule the crew this week.`;
  } else {
    level = 'low';
    reason = `Move is ${d} days away; standard scheduling.`;
  }
  if (level === 'low' && (scope(f) === 'inter-city' || f.home_size === '4-bed-plus' || f.home_size === 'office')) {
    level = 'medium';
    reason += scope(f) === 'inter-city' ? ' Raised to medium: inter-city route planning.' : ' Raised to medium: large move.';
  }
  return { level, reason };
}

export function buildHouseholdRecord(state: ConvState, today: Date = new Date()): RequestRecord {
  const f = state.fields;
  const id = newRequestId();
  const suggestion = suggestVehicle(f);
  const priority = householdPriority(f, today);
  const sc = scope(f);
  const flags: string[] = [];
  if (f.from_city && !isServedCity(f.from_city)) flags.push(`Pickup city ${f.from_city} is outside the 8 core cities; confirm coverage.`);
  if (f.to_city && !isServedCity(f.to_city)) flags.push(`Drop-off city ${f.to_city} is outside the 8 core cities; confirm coverage.`);
  if (!f.from_city || !f.to_city) flags.push('City not confirmed for one end of the move.');

  const payload = {
    request_id: id,
    type: 'household_move',
    created_at: new Date().toISOString(),
    channel: 'web_chat',
    source: sourceLabel(state),
    language: state.lang === 'ur' ? 'roman_urdu' : 'english',
    customer: { phone: f.phone ?? null, phone_verified: true },
    move: {
      scope: sc ?? 'unknown',
      pickup: { area: f.from_area ?? null, city: f.from_city ?? null, floor: f.floor ?? null, lift: f.lift ?? null },
      dropoff: { area: f.to_area ?? null, city: f.to_city ?? null },
      date: f.move_date ?? null,
      property_type: f.property_type ?? null,
      home_size: f.home_size ?? null,
    },
    services: {
      packing: f.packing ?? null,
      labour_loading_unloading: true,
      ac_removal_refit_units: f.ac_units ?? 0,
    },
    special_items: f.special_items ?? [],
    ops: {
      priority: priority.level,
      priority_reason: priority.reason,
      suggested_vehicle: suggestion.vehicle,
      suggested_crew: suggestion.crew,
      ac_technicians: suggestion.acTechnicians,
      flags,
      next_action: 'Coordinator calls the customer to confirm crew, vehicle and quote.',
    },
  };

  const home = homeLabel(f) ?? 'Home';
  const highlights: [string, string][] = [
    ['Route', routeLabel(f) ?? '—'],
    ['Scope', sc === 'inter-city' ? `Inter-city · ${f.from_city} → ${f.to_city}` : sc === 'intra-city' ? `Intra-city · ${f.from_city}` : '—'],
    ['Home', home],
    ['Pickup floor', f.floor === undefined ? '—' : `${floorLabel(f.floor)}${f.floor > 0 ? (f.lift ? ' · lift' : ' · no lift') : ''}`],
    ['Move date', f.move_date ? formatDate(f.move_date) : '—'],
    ['Packing', f.packing ? PACKING_LABEL[f.packing] : '—'],
    ['AC', f.ac_units === undefined ? '—' : acLabel(f.ac_units)],
    ['Special items', f.special_items?.length ? f.special_items.join(', ') : 'None'],
    ['Phone', f.phone ? `${formatPhone(f.phone)} ✓ verified` : '—'],
    ['Suggested', `${suggestion.vehicle} · ${suggestion.crew} movers${suggestion.acTechnicians ? ` · ${suggestion.acTechnicians} AC tech` : ''}`],
  ];

  return {
    id,
    kind: 'household',
    title: sc === 'inter-city' ? 'Inter-city house move' : 'House shift',
    summary: `${home} · ${placeLabel(f.from_area, sc === 'inter-city' ? f.from_city : undefined)} → ${placeLabel(f.to_area, sc === 'inter-city' ? f.to_city : undefined)}${f.move_date ? ` · ${formatDate(f.move_date)}` : ''}`,
    priority: priority.level,
    priorityReason: priority.reason,
    createdAt: payload.created_at,
    source: payload.source,
    highlights,
    payload,
  };
}

export function scoreLead(f: Fields): { level: Priority; score: number; reason: string } {
  let score = 0;
  const why: string[] = [];
  const trips = f.daily_trips;
  const fleet = f.fleet_size;
  const volumeText = [
    fleet && f.vehicle_type ? `${fleet} ${pluralVehicle(f.vehicle_type, fleet)} on the road` : fleet ? `${fleet} vehicles` : '',
    trips ? `~${trips} trips a day` : '',
  ]
    .filter(Boolean)
    .join(', ');
  if ((trips ?? 0) >= 100 || (fleet ?? 0) >= 20) {
    score += 4;
    why.push(`large daily volume (${volumeText})`);
  } else if ((trips ?? 0) >= 30 || (fleet ?? 0) >= 8) {
    score += 2;
    why.push(`solid daily volume (${volumeText})`);
  } else if (trips || fleet) {
    score += 1;
    why.push(`small volume (${volumeText})`);
  }
  if (f.operating_hours === '24-7') {
    score += 2;
    why.push('round-the-clock operations');
  } else if (f.operating_hours === 'extended' || f.operating_hours === 'night') {
    score += 1;
    why.push(f.operating_hours === 'night' ? 'night operations' : 'extended hours');
  }
  const cityCount = f.cities?.length ?? 0;
  if (cityCount > 1) {
    score += 2;
    why.push(cityCount >= CITIES.length ? 'presence in all 8 cities' : `multi-city footprint (${f.cities!.join(', ')})`);
  } else if (f.zones?.includes('City-wide')) {
    score += 1;
    why.push(`city-wide coverage in ${f.cities?.[0] ?? 'their city'}`);
  }
  if (/mazda|container|flatbed|shahzore/i.test(f.vehicle_type ?? '')) {
    score += 1;
    why.push('demand for heavier vehicles');
  }
  const pains = f.pain_points ?? [];
  if (pains.includes('tracking') || pains.includes('reliability')) {
    score += 1;
  }
  const level: Priority = score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low';
  const fit = pains.length
    ? `Main pain point is ${pains.map((p) => PAIN_LABEL[p].toLowerCase()).join(' and ')}, which ${BRAND.enterprise} addresses with ${pains
        .map((p) => (p === 'cost' ? 'multi-mover quotes' : p === 'tracking' ? 'live tracking' : 'a vetted mover network'))
        .join(' and ')}.`
    : '';
  const head = why.length ? `${why[0][0].toUpperCase()}${why[0].slice(1)}${why.length > 1 ? `, ${why.slice(1).join(', ')}` : ''}.` : 'Limited volume information.';
  return { level, score, reason: `${level[0].toUpperCase()}${level.slice(1)} priority: ${head} ${fit}`.trim() };
}

export function buildLeadRecord(state: ConvState): RequestRecord {
  const f = state.fields;
  const id = newRequestId();
  const lead = scoreLead(f);
  const payload = {
    lead_id: id,
    type: 'enterprise_lead',
    created_at: new Date().toISOString(),
    channel: 'web_chat',
    source: sourceLabel(state),
    language: state.lang === 'ur' ? 'roman_urdu' : 'english',
    company: { name: f.company_name ?? null, cities: f.cities ?? [], zones: f.zones ?? [] },
    operations: {
      use_case: f.use_case ?? null,
      vehicle_type: f.vehicle_type ?? null,
      fleet_size: f.fleet_size ?? null,
      daily_trips_estimate: f.daily_trips ?? null,
      operating_hours: f.operating_hours ?? null,
    },
    pain_points: f.pain_points ?? [],
    contact: { name: f.contact_name ?? null, phone: f.contact_phone ?? null, email: f.contact_email ?? null },
    priority: { level: lead.level, score: lead.score, max_score: 10, reason: lead.reason },
    recommended_product: BRAND.enterprise,
    next_action: `Account manager follows up within 1 business day and onboards the account to ${BRAND.enterprise}.`,
  };
  const highlights: [string, string][] = [
    ['Company', f.company_name ?? '—'],
    ['Fleet', fleetLabel(f) ?? '—'],
    ['Use case', f.use_case ?? '—'],
    ['Cities', citiesLabel(f) ?? '—'],
    ['Zones', zonesLabel(f) ?? (f.cities && f.cities.length > 1 ? 'Multiple cities' : '—')],
    ['Daily trips', f.daily_trips ? `~${f.daily_trips}` : '—'],
    ['Hours', f.operating_hours ? HOURS_LABEL[f.operating_hours] : '—'],
    ['Pain point', f.pain_points?.length ? f.pain_points.map((p) => PAIN_LABEL[p]).join(', ') : '—'],
    ['Contact', [f.contact_name, f.contact_phone ? formatPhone(f.contact_phone) : f.contact_email].filter(Boolean).join(' · ') || '—'],
  ];
  return {
    id,
    kind: 'enterprise',
    title: 'Enterprise lead',
    summary: [f.company_name, fleetLabel(f), citiesLabel(f)].filter(Boolean).join(' · '),
    priority: lead.level,
    priorityReason: lead.reason,
    createdAt: payload.created_at,
    source: payload.source,
    highlights,
    payload,
  };
}
