import { BRAND } from '../brand';
import { changedLabels, pluralVehicle, scope } from './describe';
import {
  extractBusiness,
  extractContactName,
  extractHousehold,
  parseForSlot,
} from './extract';
import { bookingChips, infoMessage } from './info';
import { detectLang, maskPhone, norm, parseEmail, parsePhone, t, titleCase } from './nlp';
import { buildHouseholdRecord, buildLeadRecord } from './records';
import { classify, scoreIntents } from './router';
import { missingSlots, promptFor, resolvePendingCities } from './slots';
import {
  initialState,
  type BookingJourney,
  type BotMessage,
  type Chip,
  type ConvState,
  type EngineTag,
  type Fields,
  type Lang,
  type TurnInput,
  type TurnResult,
} from './types';

// Demo mode: a deterministic rule-based engine. The live engine reuses the stage handlers
// below (phone, OTP, contact, completion) so both modes end in the same structured hand-off.

export const DEMO: EngineTag = { kind: 'demo' };

export function journeyLabel(j: BookingJourney): string {
  return j === 'household' ? 'House shifting' : 'Business / fleet';
}

export function isReset(text: string): boolean {
  return /^(start over|reset|restart|new chat|new request|new booking|cancel|shuru se|dobara shuru)\b/.test(norm(text));
}

function bot(text: string, tag: EngineTag, extra: Partial<BotMessage> = {}): BotMessage {
  return { role: 'bot', text, engine: tag, ...extra };
}

function join(lead: string, question: string): string {
  if (!lead) return question;
  return lead.length > 90 ? `${lead}\n\n${question}` : `${lead} ${question}`;
}

function startChips(lang: Lang): Chip[] {
  return [...bookingChips(lang), { label: t(lang, `About ${BRAND.name}`, `${BRAND.name} ke bare mein`), send: `Tell me about ${BRAND.name}` }];
}

function fleetSummary(f: Fields): string {
  const parts: string[] = [];
  if (f.fleet_size && f.vehicle_type) parts.push(`${f.fleet_size} ${pluralVehicle(f.vehicle_type, f.fleet_size)}`);
  else if (f.fleet_size) parts.push(`${f.fleet_size} vehicles`);
  else if (f.vehicle_type) parts.push(pluralVehicle(f.vehicle_type));
  if (f.use_case) parts.push(`for ${f.use_case.toLowerCase()}`);
  if (f.zones?.includes('City-wide')) parts.push(f.cities?.length === 1 ? `across ${f.cities[0]}` : 'across the city');
  else if (f.cities?.length) parts.push(`in ${f.cities.length >= 8 ? 'all 8 cities' : f.cities.join(', ')}`);
  return parts.join(' ');
}

export function journeyIntro(journey: BookingJourney, f: Fields, lang: Lang): string {
  if (journey === 'household') {
    const sc = scope(f);
    if (sc === 'intra-city' && f.from_area && f.to_area)
      return t(
        lang,
        `Got it: a house shift within ${f.from_city}, from ${f.from_area} to ${f.to_area}. Just a few quick details.`,
        `Zaroor! ${f.from_city} ke andar shifting, ${f.from_area} se ${f.to_area}. Bas chand details chahiye.`,
      );
    if (sc === 'inter-city')
      return t(
        lang,
        `Got it: an inter-city move from ${f.from_city} to ${f.to_city}. Just a few quick details.`,
        `Zaroor! ${f.from_city} se ${f.to_city} inter-city shifting. Bas chand details chahiye.`,
      );
    return t(lang, 'Happy to help with your move. Just a few quick details.', 'Zaroor, shifting mein madad karte hain. Bas chand details chahiye.');
  }
  const summary = fleetSummary(f);
  return t(
    lang,
    `That sounds like a regular logistics operation${summary ? ` (${summary})` : ''}, exactly what ${BRAND.enterprise} is built for. A few quick questions so the right account manager can follow up.`,
    `Samajh gaya${summary ? ` (${summary})` : ''}. Yeh bilkul ${BRAND.enterprise} ka kaam hai. Chand sawal, taake sahi account manager aap se rabta kare.`,
  );
}

export function ackText(detected: string[], corrected: boolean, lang: Lang, variety: number, brief = false): string {
  if (!detected.length) return '';
  const en = ['Got it', 'Noted', 'Perfect', 'Great'];
  const ur = ['Theek hai', 'Noted', 'Zabardast', 'Acha'];
  const lead = corrected ? t(lang, 'Updated', 'Update kar diya') : t(lang, en[variety % 4], ur[variety % 4]);
  return brief ? `${lead}.` : `${lead}: ${detected.join(', ')}.`;
}

/** Ask for the next missing field, or move to phone verification / contact capture. */
export function advance(state: ConvState, lead: string, detected: string[], tag: EngineTag, today: Date): TurnResult {
  const journey = state.journey!;
  const lang = state.lang;
  const missing = missingSlots(journey, state.fields);
  if (missing.length) {
    const slot = missing[0];
    const p = promptFor(slot, state, today);
    return {
      state: { ...state, asked: slot, stage: 'collect' },
      out: [bot(join(lead, p.text), tag, { chips: p.chips, widget: p.widget, detected })],
    };
  }
  if (journey === 'household') {
    if (state.fields.phone) return sendOtp(state, lead, detected, tag);
    return {
      state: { ...state, stage: 'phone', asked: 'phone' },
      out: [
        bot(
          join(lead, t(lang, 'Last step: what’s your mobile number? We’ll text a code to confirm the booking.', 'Aakhri step: apna mobile number dein, booking confirm karne ke liye code bhejenge.')),
          tag,
          { widget: { kind: 'phone' }, detected },
        ),
      ],
    };
  }
  const f = state.fields;
  if (f.contact_name && (f.contact_phone || f.contact_email)) return completeLead({ ...state, stage: 'contact' }, tag, lead);
  return {
    state: { ...state, stage: 'contact', asked: 'contact' },
    out: [bot(join(lead, contactQuestion(f, lang)), tag, { detected })],
  };
}

function contactQuestion(f: Fields, lang: Lang): string {
  if (f.contact_name)
    return t(lang, `Thanks, ${f.contact_name}. What’s the best mobile number or work email to reach you?`, `Shukriya, ${f.contact_name}. Rabta ke liye mobile number ya work email?`);
  if (f.contact_phone || f.contact_email) return t(lang, 'And who should the account manager ask for?', 'Account manager kis se baat kare? Aap ka naam?');
  return t(
    lang,
    'Last step: who should our account manager reach out to? Share a name and a mobile number or work email.',
    'Aakhri step: account manager kis se rabta kare? Naam aur mobile number ya work email share karein.',
  );
}

function sendOtp(state: ConvState, lead: string, detected: string[], tag: EngineTag, note?: string): TurnResult {
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const phone = state.fields.phone!;
  const lang = state.lang;
  return {
    state: { ...state, stage: 'otp', asked: 'otp', otp: code },
    out: [
      { role: 'note', tone: 'sms', text: `${BRAND.name}: ${code} is your verification code. (Demo SMS, no real message is sent.)` },
      bot(
        join(lead, note ?? t(lang, `I’ve sent a 4-digit code to ${maskPhone(phone)}. Enter it below to confirm.`, `${maskPhone(phone)} par 4-digit code bheja hai. Neeche enter karein.`)),
        tag,
        { widget: { kind: 'otp', masked: maskPhone(phone), code }, detected },
      ),
    ],
  };
}

export function phoneStep(state: ConvState, text: string, tag: EngineTag): TurnResult {
  const phone = parsePhone(text);
  const lang = state.lang;
  if (!phone) {
    return {
      state,
      out: [
        bot(
          t(lang, 'That doesn’t look like a Pakistani mobile number. Try the format 03XX XXXXXXX.', 'Yeh mobile number sahi nahi lag raha. Is format mein likhein: 03XX XXXXXXX.'),
          tag,
          { widget: { kind: 'phone' } },
        ),
      ],
    };
  }
  return sendOtp({ ...state, fields: { ...state.fields, phone } }, '', [], tag);
}

export function otpStep(state: ConvState, text: string, tag: EngineTag, today: Date): TurnResult {
  const s = norm(text);
  const lang = state.lang;
  if (/\b(resend|send again|again|dobara)\b/.test(s)) {
    return sendOtp(state, '', [], tag, t(lang, 'New code sent. Enter it below.', 'Naya code bhej diya. Neeche enter karein.'));
  }
  if (/\b(change|wrong|different|galat|edit)\b/.test(s)) {
    return {
      state: { ...state, stage: 'phone', asked: 'phone', otp: undefined },
      out: [bot(t(lang, 'No problem. What’s the right mobile number?', 'Koi baat nahi. Sahi mobile number kya hai?'), tag, { widget: { kind: 'phone' } })],
    };
  }
  const code = text.replace(/\D/g, '');
  if (code !== state.otp) {
    return {
      state,
      out: [
        bot(t(lang, 'That code doesn’t match. Check the SMS above and try again.', 'Code match nahi hua. Upar SMS check kar ke dobara try karein.'), tag, {
          widget: { kind: 'otp', masked: maskPhone(state.fields.phone ?? ''), code: state.otp ?? '' },
          chips: [{ label: t(lang, 'Resend code', 'Code dobara bhejein'), send: 'Resend code' }, { label: t(lang, 'Change number', 'Number change karein'), send: 'Change number' }],
        }),
      ],
    };
  }
  const done: ConvState = { ...state, stage: 'done', asked: null };
  const record = buildHouseholdRecord(done, today);
  return {
    state: done,
    record,
    out: [
      bot(
        t(
          lang,
          `Verified ✓ Your request #${record.id} is with our ops team. A move coordinator will call you shortly to confirm the crew, vehicle and quote.`,
          `Number verify ho gaya ✓ Aap ki request #${record.id} ops team ko mil gayi hai. Move coordinator jald call kar ke crew, gaari aur quote confirm karega.`,
        ),
        tag,
        { card: { kind: 'request', recordId: record.id }, chips: afterChips(lang) },
      ),
    ],
  };
}

function afterChips(lang: Lang): Chip[] {
  return [
    { label: t(lang, 'Open ops dashboard', 'Ops dashboard dekhein'), action: 'open-ops' },
    { label: t(lang, 'Plan another move', 'Aik aur shifting'), send: t(lang, 'I want to shift my house', 'Mujhe ghar shift karna hai') },
    { label: t(lang, 'Business enquiry', 'Business enquiry'), send: t(lang, 'We need vehicles for our business deliveries every day', 'Hamari company ko roz deliveries ke liye gaariyan chahiye') },
  ];
}

function completeLead(state: ConvState, tag: EngineTag, lead = ''): TurnResult {
  const done: ConvState = { ...state, stage: 'done', asked: null };
  const record = buildLeadRecord(done);
  const f = done.fields;
  const lang = done.lang;
  const name = f.contact_name ?? t(lang, 'there', 'aap');
  const company = f.company_name ?? t(lang, 'your company', 'aap ki company');
  return {
    state: done,
    record,
    out: [
      bot(
        join(
          lead,
          t(
            lang,
            `Thanks, ${name}! I’ve logged ${company} as a ${record.priority}-priority Enterprise lead (#${record.id}). An account manager will follow up within one business day to onboard you to ${BRAND.enterprise}: shipment posting, quotes from multiple movers, live tracking and consolidated invoicing in one portal.`,
            `Shukriya, ${name}! ${company} ko ${record.priority}-priority Enterprise lead (#${record.id}) ke taur par log kar diya hai. Account manager aik business day mein rabta kar ke aap ko ${BRAND.enterprise} par onboard karega: shipment posting, kayi movers ki quotes, live tracking aur invoicing, sab aik portal mein.`,
          ),
        ),
        tag,
        { card: { kind: 'request', recordId: record.id }, chips: afterChips(lang) },
      ),
    ],
  };
}

export function contactStep(state: ConvState, text: string, tag: EngineTag): TurnResult {
  const f = { ...state.fields };
  const phone = parsePhone(text);
  const email = parseEmail(text);
  let name = extractContactName(text);
  if (!name && !f.contact_name) {
    const rest = text
      .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, ' ')
      .replace(/(\+?92|0)?3\d{2}[\s-]?\d{7}/g, ' ')
      .replace(/\b(and|aur|my|number|phone|mobile|email|is|hai|call|me|on|at|contact)\b/gi, ' ')
      .replace(/[^A-Za-z\s]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
    if (rest && rest.split(' ').length <= 4) name = titleCase(rest.toLowerCase());
  }
  if (name) f.contact_name = name;
  if (phone) f.contact_phone = phone;
  if (email) f.contact_email = email;
  const next: ConvState = { ...state, fields: f };
  if (f.contact_name && (f.contact_phone || f.contact_email)) return completeLead(next, tag);
  if (!name && !phone && !email) {
    return {
      state: next,
      out: [bot(t(state.lang, 'Please share a name and a mobile number or work email so the account manager can reach you.', 'Naam aur mobile number ya email share karein taake account manager rabta kar sake.'), tag)],
    };
  }
  return { state: next, out: [bot(contactQuestion(f, state.lang), tag)] };
}

function carryOver(f: Fields, to: BookingJourney): Fields {
  if (to === 'business') return f.from_city ? { cities: [f.from_city] } : {};
  return f.cities?.length === 1 ? { from_city: f.cities[0] } : {};
}

function fallback(state: ConvState, greeting: boolean, tag: EngineTag): TurnResult {
  const lang = state.lang;
  const text = greeting
    ? t(lang, `Hi! I can plan a house shift, set up regular business deliveries, or tell you about ${BRAND.name}. What do you need?`, `Assalam o alaikum! Main ghar ki shifting, business deliveries, ya ${BRAND.name} ke bare mein madad kar sakta hoon. Kya chahiye?`)
    : t(lang, `I didn’t quite catch that. I can help with house shifting, business deliveries, or questions about ${BRAND.name}.`, `Maaf kijiye, samajh nahi aaya. Main shifting, business deliveries ya ${BRAND.name} ke sawalon mein madad kar sakta hoon.`);
  return { state, out: [bot(text, tag, { chips: startChips(lang) })] };
}

function extractFor(journey: BookingJourney, text: string, f: Fields, state: ConvState, today: Date): Partial<Fields> {
  return journey === 'household' ? extractHousehold(text, f, state.asked, today) : extractBusiness(text);
}

function startJourney(state: ConvState, input: TurnInput, today: Date, tag: EngineTag, base: Fields = {}): TurnResult {
  const text = input.text.trim();
  const sc = scoreIntents(text);
  const intent = classify(sc);
  if (intent === 'info') return { state, out: [infoMessage(sc.topics, sc.highlight, state.lang, tag)] };
  if (!intent) return fallback(state, sc.greeting, tag);
  const fields = resolvePendingCities({ ...base, ...extractFor(intent, text, base, state, today), ...input.patch });
  const next: ConvState = { ...state, journey: intent, fields, stage: 'collect', asked: null };
  const detected = [journeyLabel(intent), ...changedLabels(intent, {}, fields)];
  return advance(next, journeyIntro(intent, fields, state.lang), detected, tag, today);
}

function continueJourney(state: ConvState, input: TurnInput, today: Date, tag: EngineTag): TurnResult {
  const journey = state.journey!;
  const before = state.fields;
  const text = input.text.trim();
  const patch = input.patch
    ? input.patch
    : { ...extractFor(journey, text, before, state, today), ...parseForSlot(state.asked, text, before, today) };
  const after = resolvePendingCities({ ...before, ...patch });

  if (JSON.stringify(before) === JSON.stringify(after)) {
    const sc = scoreIntents(text);
    const intent = classify(sc);
    const slot = missingSlots(journey, before)[0];
    if (!slot) return advance(state, '', [], tag, today);
    if (intent === 'info' || (sc.question && sc.info >= 2)) {
      const p = promptFor(slot, state, today);
      return {
        state: { ...state, asked: slot },
        out: [
          infoMessage(sc.topics, sc.highlight, state.lang, tag, { midFlow: true }),
          bot(t(state.lang, `Back to your booking: ${p.text}`, `Wapas booking par: ${p.text}`), tag, { chips: p.chips, widget: p.widget }),
        ],
      };
    }
    if (intent && intent !== journey && sc[intent] >= 3) {
      return startJourney({ ...state, journey: null }, input, today, tag, carryOver(before, intent));
    }
    const p = promptFor(slot, state, today);
    return {
      state: { ...state, asked: slot },
      out: [bot(t(state.lang, `Sorry, I didn’t catch that. ${p.text}`, `Maaf kijiye, samajh nahi aaya. ${p.text}`), tag, { chips: p.chips, widget: p.widget })],
    };
  }

  const detected = changedLabels(journey, before, after);
  const corrected = (Object.keys(patch) as (keyof Fields)[]).some(
    (k) => before[k] !== undefined && JSON.stringify(before[k]) !== JSON.stringify(after[k]),
  );
  const lead = ackText(detected, corrected, state.lang, Object.keys(after).length, !!input.patch);
  return advance({ ...state, fields: after }, lead, detected, tag, today);
}

/** One turn of the deterministic demo engine. */
export function demoTurn(prev: ConvState, input: TurnInput, today: Date = new Date()): TurnResult {
  const text = input.text.trim();
  let state: ConvState = { ...prev, fields: { ...prev.fields } };
  const lang = detectLang(text);
  if (lang) state.lang = lang;

  if (isReset(text)) {
    return {
      state: { ...initialState(), lang: state.lang },
      out: [bot(t(state.lang, 'Fresh start. What can I help you with?', 'Naye sire se shuru karte hain. Kya madad chahiye?'), DEMO, { chips: startChips(state.lang) })],
    };
  }
  if (state.stage === 'done') state = { ...initialState(), lang: state.lang, liveTurns: 0 };

  switch (state.stage) {
    case 'phone':
      return phoneStep(state, text, DEMO);
    case 'otp':
      return otpStep(state, text, DEMO, today);
    case 'contact':
      return contactStep(state, text, DEMO);
    default:
      return state.journey ? continueJourney(state, input, today, DEMO) : startJourney(state, input, today, DEMO);
  }
}

