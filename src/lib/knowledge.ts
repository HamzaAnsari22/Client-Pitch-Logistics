import { BRAND } from '../brand';

// Local knowledge base. Everything the assistant says about the company comes from here,
// in both demo mode (rendered as cards) and live mode (sent to the model as context).

export const CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Peshawar',
  'Quetta',
  'Multan',
  'Faisalabad',
  'Bahawalpur',
] as const;

export type City = (typeof CITIES)[number];

export interface Service {
  id: string;
  name: string;
  blurb: string;
  keywords: string[];
}

export const SERVICES: Service[] = [
  {
    id: 'house-shifting',
    name: 'House shifting',
    blurb: 'Complete home moves within a city or between cities, planned around your date.',
    keywords: ['house', 'home', 'shift', 'shifting', 'move', 'moving', 'relocation', 'ghar'],
  },
  {
    id: 'packing',
    name: 'Packing',
    blurb: 'Trained packers wrap furniture, crockery and fragile items before loading.',
    keywords: ['packing', 'pack', 'wrap', 'fragile', 'boxes'],
  },
  {
    id: 'labour',
    name: 'Labour, loading & unloading',
    blurb: 'Movers for loading, unloading and carrying items up and down stairs.',
    keywords: ['labour', 'labor', 'loading', 'unloading', 'movers', 'mazdoor', 'helpers', 'crew'],
  },
  {
    id: 'ac',
    name: 'AC removal & refit',
    blurb: 'Technicians uninstall split ACs before the move and reinstall them at the new place.',
    keywords: ['ac', 'air conditioner', 'refit', 'removal', 'install', 'fitting', 'technician'],
  },
  {
    id: 'vehicles',
    name: 'Vehicle booking',
    blurb: 'Book the right vehicle on its own, from a loader rickshaw to a 60-ton flatbed.',
    keywords: ['vehicle', 'truck', 'booking', 'rent', 'hire', 'gaari', 'gari'],
  },
  {
    id: 'deliveries',
    name: 'Deliveries',
    blurb: 'Parcel and goods deliveries across the city by e-bike, rickshaw or pickup.',
    keywords: ['delivery', 'deliveries', 'parcel', 'courier', 'drop'],
  },
  {
    id: 'enterprise',
    name: BRAND.enterprise,
    blurb: 'A B2B portal for businesses: post shipments, compare quotes, track and get invoiced.',
    keywords: ['enterprise', 'b2b', 'portal', 'business', 'corporate', 'company'],
  },
];

export interface Vehicle {
  id: string;
  name: string;
  capacity: string;
  bestFor: string;
  keywords: string[];
}

export const FLEET: Vehicle[] = [
  {
    id: 'e-bike',
    name: 'E-bike',
    capacity: 'Small parcels',
    bestFor: 'Documents, food and small parcel deliveries',
    keywords: ['e-bike', 'ebike', 'e bike', 'bike', 'bikes', 'rider', 'riders'],
  },
  {
    id: 'loader-rickshaw',
    name: 'Loader rickshaw',
    capacity: 'A few items',
    bestFor: 'Single items and short hops: a fridge, a sofa, a few boxes',
    keywords: ['loader rickshaw', 'rickshaw', 'chingchi', 'loader'],
  },
  {
    id: 'suzuki-pickup',
    name: 'Suzuki pickup',
    capacity: 'Up to 1 ton',
    bestFor: 'Studio and 1-bed moves, daily city deliveries',
    keywords: ['suzuki', 'pickup', 'pick-up', 'pick up', 'ravi'],
  },
  {
    id: 'shahzore',
    name: 'Shahzore',
    capacity: '2.5 tons',
    bestFor: '2–3 bedroom homes and mid-size commercial loads',
    keywords: ['shahzore', 'shehzore', 'shahzor'],
  },
  {
    id: 'mazda',
    name: 'Mazda truck',
    capacity: '10 tons',
    bestFor: 'Large houses, offices and bulk commercial loads',
    keywords: ['mazda', '10 ton', '10-ton', 'truck'],
  },
  {
    id: 'container-20',
    name: '20 ft container',
    capacity: 'Full-house volume',
    bestFor: 'Inter-city house moves and secure freight',
    keywords: ['20ft', '20 ft', '20 foot', '20-foot', 'twenty foot'],
  },
  {
    id: 'container-40',
    name: '40 ft container',
    capacity: 'Double the 20 ft',
    bestFor: 'Bulk inter-city freight and large relocations',
    keywords: ['40ft', '40 ft', '40 foot', '40-foot', 'forty foot'],
  },
  {
    id: 'flatbed',
    name: 'Flatbed trailer',
    capacity: 'Up to 60 tons',
    bestFor: 'Machinery, steel, construction and oversized cargo',
    keywords: ['flatbed', 'flat bed', 'trailer', 'low bed', 'lowbed', '60 ton'],
  },
];

export const BOOKING_STEPS = [
  { title: 'Tell us what you need', body: 'Type or speak, in English or Roman Urdu. One sentence is enough to start.' },
  { title: 'We ask only what’s missing', body: 'Quick replies and a date picker fill the gaps in a few taps.' },
  { title: 'Verify your number', body: 'A one-time code confirms the booking is really yours.' },
  { title: 'Ops takes over', body: 'A coordinator confirms the crew, vehicle and quote, then the move is scheduled.' },
];

export const ENTERPRISE_FEATURES = [
  { title: 'Post shipments', body: 'Create one-off or recurring shipments from a single portal.' },
  { title: 'Multi-mover quotes', body: 'Get competing quotes from vetted movers and pick the best fit.' },
  { title: 'Live tracking', body: 'See every vehicle and delivery status in one place.' },
  { title: 'Invoicing', body: 'Consolidated invoices instead of chasing receipts per trip.' },
];

export const PRICING_NOTE =
  'Prices depend on the distance, the size of the move and the services you add. Share your details and the ops team confirms a firm quote before anything is booked.';

/** Compact facts block used as grounding context for the live model. */
export function knowledgeForPrompt(): string {
  return JSON.stringify({
    company: `${BRAND.name}: Pakistani logistics company (moving, vehicles, deliveries, B2B)`,
    services: SERVICES.map((s) => `${s.name}: ${s.blurb}`),
    fleet: FLEET.map((v) => `${v.name} (${v.capacity}): ${v.bestFor}`),
    cities: CITIES,
    booking_steps: BOOKING_STEPS.map((s) => `${s.title}: ${s.body}`),
    enterprise: ENTERPRISE_FEATURES.map((f) => `${f.title}: ${f.body}`),
    pricing: PRICING_NOTE,
  });
}
