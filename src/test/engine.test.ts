import { describe, expect, it } from 'vitest';
import { demoTurn } from '../lib/engine';
import { parseDate } from '../lib/nlp';
import { classify, scoreIntents } from '../lib/router';
import { extractBusiness, extractHousehold } from '../lib/extract';
import { buildContents, sanitizeFields } from '../lib/live';
import { initialState, type BotMessage, type ConvState, type TurnInput, type TurnResult } from '../lib/types';

const TODAY = new Date(2026, 9, 2); // Friday 2 Oct 2026

function run(steps: (string | TurnInput)[], start: ConvState = initialState()) {
  let state = start;
  const results: TurnResult[] = [];
  for (const step of steps) {
    const input = typeof step === 'string' ? { text: step } : step;
    const r = demoTurn(state, input, TODAY);
    results.push(r);
    state = r.state;
  }
  return { state, results, last: results[results.length - 1] };
}

const lastBot = (r: TurnResult) => r.out.filter((m): m is BotMessage => m.role === 'bot').pop()!;

describe('intent router', () => {
  it.each([
    ['I want to move my apartment from DHA to Clifton', 'household'],
    ['ghar shift karna hai DHA se Clifton', 'household'],
    ['We run 20 Suzuki pickups daily for deliveries across the city', 'business'],
    ['hamari company ko roz 10 gaariyan chahiye Lahore mein', 'business'],
    ['Tell me about Rawana', 'info'],
    ['Do you operate in Multan?', 'info'],
    ['Which vehicles do you have?', 'info'],
    ['kya aap AC bhi lagate hain?', 'info'],
    ['Can you move my 2 bed flat from Gulshan to Johar tomorrow?', 'household'],
    ['We need to shift our office from Gulberg to DHA', 'household'],
  ])('%s → %s', (text, expected) => {
    expect(classify(scoreIntents(text))).toBe(expected);
  });
});

describe('extraction', () => {
  it('resolves DHA to Karachi when paired with Clifton', () => {
    const p = extractHousehold('I want to move my apartment from DHA to Clifton', {}, null, TODAY);
    expect(p).toMatchObject({ from_area: 'DHA', to_area: 'Clifton', from_city: 'Karachi', to_city: 'Karachi', property_type: 'apartment' });
  });

  it('reads Roman Urdu route and details', () => {
    const p = extractHousehold('ghar shift karna hai DHA se Clifton, teen kamre, doosri manzil lift nahi, agle hafte', {}, null, TODAY);
    expect(p).toMatchObject({ from_area: 'DHA', to_area: 'Clifton', home_size: '3-bed', floor: 2, lift: false, move_date: '2026-10-05' });
  });

  it('handles inter-city routes and sectors', () => {
    const p = extractHousehold('shifting from G-11/2 Islamabad to Gulberg Lahore', {}, null, TODAY);
    expect(p).toMatchObject({ from_area: 'G-11/2', from_city: 'Islamabad', to_area: 'Gulberg', to_city: 'Lahore' });
  });

  it('extracts business fleet details', () => {
    const p = extractBusiness('We run 20 Suzuki pickups daily for deliveries across the city');
    expect(p).toMatchObject({ fleet_size: 20, vehicle_type: 'Suzuki pickup (up to 1 ton)', zones: ['City-wide'], use_case: 'Deliveries' });
  });

  it('parses dates', () => {
    expect(parseDate('tomorrow', TODAY)).toBe('2026-10-03');
    expect(parseDate('kal', TODAY)).toBe('2026-10-03');
    expect(parseDate('parson', TODAY)).toBe('2026-10-04');
    expect(parseDate('next saturday', TODAY)).toBe('2026-10-03');
    expect(parseDate('15 Oct', TODAY)).toBe('2026-10-15');
    expect(parseDate('20/10', TODAY)).toBe('2026-10-20');
    expect(parseDate('3 din baad', TODAY)).toBe('2026-10-05');
    expect(parseDate('24/7 operations', TODAY)).toBeNull();
  });
});

describe('household journey', () => {
  it('asks only missing fields and ends with a verified request', () => {
    const { results, state, last } = run([
      'I want to move my apartment from DHA to Clifton',
      { text: '3 bedrooms', patch: { home_size: '3-bed' } },
      '2nd floor, no lift',
      'next saturday',
      { text: 'Yes, pack everything', patch: { packing: 'full' } },
      '2 ACs',
      { text: 'Fridge, Glass & mirrors', patch: { special_items: ['Fridge', 'Glass & mirrors'] } },
      '0300 1234567',
    ]);
    const first = lastBot(results[0]);
    expect(first.detected).toContain('Intra-city · Karachi');
    expect(first.text).toMatch(/bedrooms/);
    expect(results[1].state.asked).toBe('floor');
    expect(results[2].state.asked).toBe('move_date');
    expect(state.stage).toBe('otp');
    const otp = run([state.otp!], state);
    expect(otp.state.stage).toBe('done');
    expect(otp.last.record?.payload).toMatchObject({
      type: 'household_move',
      move: { scope: 'intra-city', date: '2026-10-03', pickup: { area: 'DHA', floor: 2, lift: false } },
      services: { packing: 'full', ac_removal_refit_units: 2 },
    });
    expect(otp.last.record?.id).toMatch(/^MV-\d{4}$/);
    expect(last.out.some((m) => m.role === 'note' && m.tone === 'sms')).toBe(true);
  });

  it('replies in Roman Urdu and skips what was already said', () => {
    const { results } = run(['ghar shift karna hai DHA se Clifton, 3 kamron ka flat, ground floor, kal']);
    const msg = lastBot(results[0]);
    expect(msg.text).toMatch(/Zaroor/);
    expect(results[0].state.asked).toBe('packing');
  });

  it('answers an info question mid-flow and returns to the booking', () => {
    const { results } = run(['I want to move my apartment from DHA to Clifton', 'Do you also do AC fitting?']);
    const out = results[1].out;
    expect(out[0].role === 'bot' && out[0].card?.kind).toBe('info');
    expect(lastBot(results[1]).text).toMatch(/Back to your booking/);
  });
});

describe('business journey', () => {
  it('qualifies a fleet lead with a priority and reason', () => {
    const { results, last } = run([
      'We run 20 Suzuki pickups daily for deliveries across the city',
      'Swift Foods',
      'Karachi',
      { text: '50–100', patch: { daily_trips: 75 } },
      { text: '24/7', patch: { operating_hours: '24-7' } },
      { text: 'Tracking & visibility', patch: { pain_points: ['tracking'] } },
      'Ayesha Khan, 0321 7654321',
    ]);
    expect(results[0].state.asked).toBe('company_name');
    expect(results[1].state.fields.company_name).toBe('Swift Foods');
    expect(results[2].state.asked).toBe('daily_trips');
    const record = last.record!;
    expect(record.kind).toBe('enterprise');
    expect(record.priority).toBe('high');
    expect(record.priorityReason).toMatch(/live tracking/);
    expect(record.payload).toMatchObject({ contact: { name: 'Ayesha Khan', phone: '+923217654321' } });
  });
});

describe('info journey', () => {
  it('answers with cards and booking buttons', () => {
    const { last } = run(['Tell me about Rawana']);
    const msg = lastBot(last);
    expect(msg.card).toMatchObject({ kind: 'info', topics: ['services', 'fleet', 'cities', 'booking'] });
    expect(msg.chips?.length).toBeGreaterThanOrEqual(3);
  });

  it('confirms a served city', () => {
    const { last } = run(['Do you operate in Multan?']);
    expect(lastBot(last).text).toMatch(/Yes, we operate in Multan/);
  });
});

describe('live mode guards', () => {
  it('drops malformed or out-of-range model values', () => {
    const f = sanitizeFields(
      { home_size: 'mansion', floor: -2, lift: 'no', move_date: '2020-01-01', ac_units: 3, from_city: 'karachi', pain_points: ['tracking', 'vibes'], phone: '03001234567' },
      TODAY,
    );
    expect(f).toEqual({ ac_units: 3, from_city: 'Karachi', pain_points: ['tracking'] });
  });

  it('builds alternating contents that start with the user', () => {
    const c = buildContents(
      [
        { role: 'model', text: 'hello' },
        { role: 'user', text: 'a' },
        { role: 'user', text: 'b' },
      ],
      'c',
    );
    expect(c.map((x) => x.role)).toEqual(['user']);
    expect(c[0].parts[0].text).toBe('a\nb\nc');
  });
});
