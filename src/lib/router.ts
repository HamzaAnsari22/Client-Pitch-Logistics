import { BRAND } from '../brand';
import { FLEET, SERVICES } from './knowledge';
import { findPlaces } from './gazetteer';
import { extractDailyTrips, extractFleetSize, extractHome } from './extract';
import { norm } from './nlp';
import type { BookingJourney, InfoTopic } from './types';

// Intent router: scores the three journeys with keyword and pattern signals.

export interface IntentScores {
  household: number;
  business: number;
  info: number;
  topics: InfoTopic[];
  highlight: string[];
  greeting: boolean;
  question: boolean;
}

const QUESTION_START = /^(do|does|can|could|would|will|which|what|what's|whats|where|how|is|are|who|kya|kahan|kaun|kaunsi|kaunse|kitn\w*|kaise|kab)\b/;

export function scoreIntents(text: string): IntentScores {
  const s = norm(text).replace(/-/g, ' ');
  const places = findPlaces(text);
  let household = 0;
  let business = 0;
  let info = 0;

  // Household
  if (/\b(move|moving|relocat\w*|shifting|shift karna|shift karni|shift karwana|shift ho|shift)\b/.test(s) && !/\b(night|day|morning|evening|double|two) shifts?\b/.test(s)) household += 2;
  if (/\b(house|home|apartment|flat|ghar|makan|makaan|portion|bungalow|villa|furniture|saman|samaan|belongings|bedrooms?|kamr\w*|marla|kanal)\b/.test(s)) household += 1;
  if (places.length >= 2 || (places.length === 1 && /\b(from|to|se|tak)\b/.test(s))) household += 2;
  else if (places.length === 1) household += 0.5;
  if (extractHome(text).home_size) household += 1;

  // Business
  if (/\bwe\s+(run|operate|have|need|use|are|deliver|ship|send|require|want|move|dispatch)\b/.test(s)) business += 2;
  if (/\bour\s+(company|business|fleet|stores?|outlets?|warehouses?|customers|riders|drivers|factory|shops?|branches|deliveries|orders|vehicles)\b/.test(s)) business += 2;
  if (/\b(hamari|humari|hamara|humara|meri|mera)\s+(company|business|factory|dukaan|dukan|shop|fleet|gaariyan|gariyan)\b/.test(s)) business += 2;
  if (/\b(company|business|b2b|corporate|fleet|warehouses?|factory|distribution|distributor|dispatch|e ?commerce|retail|outlets?|fmcg|supply chain|vendors?|contract|bulk|dealers?)\b/.test(s)) business += 1;
  if (/\b(daily|per day|every day|a day|each day|roz|rozana|har roz|monthly|per month|weekly|regular|recurring)\b/.test(s)) business += 1;
  const fleet = extractFleetSize(text);
  if (fleet !== undefined && fleet >= 3) business += 2;
  if (extractDailyTrips(text) !== undefined) business += 2;
  if (/\b(deliveries|orders|trips|shipments|consignments|drops)\b/.test(s)) business += 1;

  // Info
  const brand = BRAND.name.toLowerCase();
  const question = /\?\s*$/.test(text.trim()) || QUESTION_START.test(s);
  if (/\b(tell me about|about (you|your|us)|who are you|what is|what's|whats|what are|what do you|what does|kya hai|kya karte|kya kya|batao|bataen|bataiye|explain|introduce|info|information)\b/.test(s)) info += 2;
  if (question) info += 1;
  if (/\b(services?|fleet|which vehicles?|vehicles do you|vehicles you|cities|which city|where do you|operate|available in|coverage|how (do|does|can) (i|we|it|you)|booking process|how it works|price|prices|pricing|cost|charges|rates?|kitna|kitne|enterprise)\b/.test(s)) info += 1;
  if (s.includes(brand)) info += 1;

  const topics = detectTopics(s, places.some((p) => p.kind === 'city'));
  const highlight = highlights(text, s);
  if (question && (highlight.length || topics.length)) info += 1;

  const greeting = /^(hi|hello|hey|salam|salaam|assalam|aoa|a o a|asalam|good (morning|afternoon|evening)|yo)\b/.test(s) && s.split(' ').length <= 4;
  return { household, business, info, topics, highlight, greeting, question };
}

export function classify(sc: IntentScores): BookingJourney | 'info' | null {
  if (sc.business >= 3 && sc.business >= sc.household) return 'business';
  if (sc.info >= 2 && sc.household < 3 && sc.business < 3) return 'info';
  if (sc.household >= 2) return 'household';
  if (sc.business >= 2) return 'business';
  if (sc.info >= 1 && !sc.greeting) return 'info';
  if (sc.household >= 1) return 'household';
  return null;
}

function detectTopics(s: string, mentionsCity: boolean): InfoTopic[] {
  const topics: InfoTopic[] = [];
  const brand = BRAND.name.toLowerCase();
  if (/\b(tell me about|about (you|your|us)|who are you|introduce|what do you do|kya karte|what is|what's)\b/.test(s) && (s.includes(brand) || /\b(you|your|company)\b/.test(s)) && !/\benterprise\b/.test(s)) {
    topics.push('overview');
  }
  if (/\b(enterprise|b2b|portal|business account|corporate account|invoic\w*|multi mover|quotes?)\b/.test(s)) topics.push('enterprise');
  if (/\b(price|prices|pricing|cost|charges|rates?|kitna|kitne|fare|how much)\b/.test(s)) topics.push('pricing');
  if (/\b(how (do|can|would) (i|we) book|book(ing)? (process|kaise)|how (does it|it|does this|does booking) work|process|kaise book|steps)\b/.test(s)) topics.push('booking');
  if (/\b(vehicles?|fleet|trucks?|gaar\w*|gaad\w*|pickups?|shahzore|mazda|containers?|flatbeds?|e bikes?|ebikes?|rickshaws?|capacity|tons?|load)\b/.test(s)) topics.push('fleet');
  if (/\b(cit(y|ies)|where|kahan|operate|available in|coverage|serve|shehar)\b/.test(s) || mentionsCity) topics.push('cities');
  if (/\b(services?|packing|labou?r|loading|unloading|ac|acs|air conditioners?|refit|install\w*|deliver(y|ies)|what do you do|kya karte)\b/.test(s)) topics.push('services');
  return [...new Set(topics)];
}

function highlights(text: string, s: string): string[] {
  const out: string[] = [];
  for (const p of findPlaces(text)) if (p.kind === 'city') out.push(p.name);
  for (const v of FLEET) {
    if (v.keywords.some((k) => new RegExp(`\\b${k.replace(/-/g, ' ')}s?\\b`).test(s))) out.push(v.name);
  }
  for (const sv of SERVICES) {
    if (sv.id === 'house-shifting' || sv.id === 'vehicles') continue;
    if (sv.keywords.some((k) => new RegExp(`\\b${k}s?\\b`).test(s))) out.push(sv.name);
  }
  return [...new Set(out)];
}
