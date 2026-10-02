export type Lang = 'en' | 'ur';
export type BookingJourney = 'household' | 'business';
export type Stage = 'collect' | 'phone' | 'otp' | 'contact' | 'done';

export type HomeSize = 'few-items' | 'studio' | '1-bed' | '2-bed' | '3-bed' | '4-bed-plus' | 'office';
export type PropertyType = 'apartment' | 'house' | 'portion' | 'office';
export type Packing = 'full' | 'fragile-only' | 'none';
export type Hours = 'day' | 'extended' | 'night' | '24-7';
export type Pain = 'cost' | 'reliability' | 'tracking';

export interface Fields {
  // Household move
  from_area?: string;
  from_city?: string;
  to_area?: string;
  to_city?: string;
  property_type?: PropertyType;
  home_size?: HomeSize;
  floor?: number;
  lift?: boolean;
  move_date?: string; // YYYY-MM-DD
  packing?: Packing;
  ac_units?: number;
  special_items?: string[];
  phone?: string;
  // Business / fleet lead
  company_name?: string;
  cities?: string[];
  zones?: string[];
  use_case?: string;
  vehicle_type?: string;
  fleet_size?: number;
  daily_trips?: number;
  operating_hours?: Hours;
  pain_points?: Pain[];
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
}

export type SlotKey =
  | 'from_area'
  | 'to_area'
  | 'from_city'
  | 'to_city'
  | 'home_size'
  | 'floor'
  | 'lift'
  | 'move_date'
  | 'packing'
  | 'ac_units'
  | 'special_items'
  | 'company_name'
  | 'cities'
  | 'zones'
  | 'vehicle_type'
  | 'daily_trips'
  | 'operating_hours'
  | 'pain_points';

export type Asked = SlotKey | 'phone' | 'otp' | 'contact' | null;

export interface ConvState {
  journey: BookingJourney | null;
  fields: Fields;
  stage: Stage;
  asked: Asked;
  lang: Lang;
  otp?: string;
  liveTurns: number;
  /** Model name of the last live turn, used to label the request source. */
  liveModel?: string;
}

export type InfoTopic = 'overview' | 'services' | 'fleet' | 'cities' | 'booking' | 'enterprise' | 'pricing';

export interface Chip {
  label: string;
  /** Text sent as the user's message (defaults to label). */
  send?: string;
  /** Structured values applied directly, so a click never depends on parsing. */
  patch?: Partial<Fields>;
  action?: 'open-ops' | 'reset';
}

export type Widget =
  | { kind: 'date' }
  | { kind: 'phone' }
  | { kind: 'otp'; masked: string; code: string }
  | { kind: 'multi'; field: 'special_items' | 'zones'; options: string[]; noneLabel: string };

export type Card =
  | { kind: 'info'; topics: InfoTopic[]; highlight: string[] }
  | { kind: 'request'; recordId: string };

export type EngineTag = { kind: 'demo' } | { kind: 'live'; model: string };

export interface BotMessage {
  role: 'bot';
  text: string;
  chips?: Chip[];
  widget?: Widget;
  detected?: string[];
  card?: Card;
  engine: EngineTag;
}

export interface UserMessage {
  role: 'user';
  text: string;
}

export interface NoteMessage {
  role: 'note';
  text: string;
  tone: 'info' | 'warn' | 'sms';
}

export type OutMessage = BotMessage | NoteMessage;
export type ChatMessage = (BotMessage | UserMessage | NoteMessage) & { id: string };

export type Priority = 'high' | 'medium' | 'low';

export interface RequestRecord {
  id: string;
  kind: 'household' | 'enterprise';
  title: string;
  summary: string;
  priority: Priority;
  priorityReason: string;
  createdAt: string;
  source: string;
  highlights: [string, string][];
  payload: Record<string, unknown>;
}

export interface TurnInput {
  text: string;
  patch?: Partial<Fields>;
}

export interface TurnResult {
  state: ConvState;
  out: OutMessage[];
  record?: RequestRecord;
}

export function initialState(): ConvState {
  return { journey: null, fields: {}, stage: 'collect', asked: null, lang: 'en', liveTurns: 0 };
}
