import { BRAND } from '../brand';
import { CITIES, FLEET, PRICING_NOTE, SERVICES } from './knowledge';
import { t } from './nlp';
import type { BotMessage, Chip, EngineTag, InfoTopic, Lang } from './types';

// Info journey: answers come from the local knowledge file and render as cards.

export function bookingChips(lang: Lang): Chip[] {
  return [
    { label: t(lang, 'Plan a house shift', 'Ghar shift karna hai'), send: t(lang, 'I want to shift my house', 'Mujhe ghar shift karna hai') },
    { label: t(lang, 'Move a few items', 'Kuch saman bhejna hai'), send: t(lang, 'I need to move a few items', 'Mujhe kuch saman shift karna hai') },
    { label: t(lang, 'Business deliveries', 'Business deliveries'), send: t(lang, 'We need vehicles for our business deliveries every day', 'Hamari company ko roz deliveries ke liye gaariyan chahiye') },
  ];
}

export const OVERVIEW_TOPICS: InfoTopic[] = ['services', 'fleet', 'cities', 'booking'];

function leadText(topics: InfoTopic[], highlight: string[], lang: Lang): string {
  const first = topics[0] ?? 'overview';
  const city = highlight.find((h) => (CITIES as readonly string[]).includes(h));
  const unknownCity = highlight.find(
    (h) => !(CITIES as readonly string[]).includes(h) && !FLEET.some((v) => v.name === h) && !SERVICES.some((s) => s.name === h),
  );
  const vehicle = FLEET.find((v) => highlight.includes(v.name));
  const service = SERVICES.find((s) => highlight.includes(s.name));

  switch (first) {
    case 'overview':
      return t(
        lang,
        `${BRAND.name} moves homes, offices and goods across Pakistan: packing, labour, AC refits, the right vehicle for every load, and ${BRAND.enterprise} for businesses. Here’s the quick tour.`,
        `${BRAND.name} Pakistan bhar mein ghar, office aur saman shift karta hai: packing, labour, AC refit, har load ke liye sahi gaari, aur businesses ke liye ${BRAND.enterprise}. Yeh raha quick tour.`,
      );
    case 'cities':
      if (city)
        return t(lang, `Yes, we operate in ${city}. Here are all ${CITIES.length} cities we serve.`, `Ji haan, hum ${city} mein kaam karte hain. Yeh rahe hamare tamam ${CITIES.length} shehar.`);
      if (unknownCity)
        return t(
          lang,
          `${unknownCity} isn’t on our city list yet. We currently operate in these ${CITIES.length} cities.`,
          `${unknownCity} abhi hamari list mein nahi hai. Filhal hum in ${CITIES.length} shehron mein kaam karte hain.`,
        );
      return t(lang, `We operate in ${CITIES.length} cities across Pakistan.`, `Hum Pakistan ke ${CITIES.length} shehron mein kaam karte hain.`);
    case 'fleet':
      if (vehicle)
        return t(
          lang,
          `The ${vehicle.name} carries ${vehicle.capacity.toLowerCase()}, best for ${vehicle.bestFor.toLowerCase()}. Here’s the full fleet.`,
          `${vehicle.name} ${vehicle.capacity.toLowerCase()} tak utha leti hai, ${vehicle.bestFor.toLowerCase()} ke liye best. Yeh rahi poori fleet.`,
        );
      return t(lang, 'From e-bikes to 60-ton flatbeds, here’s the fleet.', 'E-bike se le kar 60 ton flatbed tak, yeh rahi hamari fleet.');
    case 'services':
      if (service)
        return t(lang, `Yes, we do ${service.name.toLowerCase()}. ${service.blurb}`, `Ji haan, ${service.name} bhi hum karte hain. ${service.blurb}`);
      return t(lang, 'Here’s everything we handle.', 'Yeh sab services hum dete hain.');
    case 'booking':
      return t(lang, 'Booking takes a couple of minutes, right here in chat.', 'Booking isi chat mein do minute ka kaam hai.');
    case 'enterprise':
      return t(
        lang,
        `${BRAND.enterprise} is our portal for companies that move goods regularly.`,
        `${BRAND.enterprise} un companies ke liye portal hai jo regular saman bhejti hain.`,
      );
    case 'pricing':
      return t(
        lang,
        PRICING_NOTE,
        'Rate distance, saman ki miqdar aur services par depend karta hai. Apni details share karein, ops team booking se pehle pakki quote confirm karti hai.',
      );
  }
}

export function infoMessage(
  rawTopics: InfoTopic[],
  highlight: string[],
  lang: Lang,
  engine: EngineTag,
  opts: { midFlow?: boolean; text?: string } = {},
): BotMessage {
  let topics = rawTopics.length ? rawTopics : (['overview'] as InfoTopic[]);
  const cardTopics: InfoTopic[] = topics.includes('overview')
    ? OVERVIEW_TOPICS
    : topics.filter((x) => x !== 'pricing').length
      ? topics.filter((x) => x !== 'pricing')
      : ['booking'];
  topics = topics.includes('overview') ? ['overview'] : topics;
  const closing = opts.midFlow
    ? ''
    : t(lang, '\n\nWhenever you’re ready, I can start a booking.', '\n\nJab chahein, main booking shuru kar deta hoon.');
  return {
    role: 'bot',
    text: (opts.text ?? leadText(topics, highlight, lang)) + closing,
    card: { kind: 'info', topics: cardTopics, highlight },
    chips: opts.midFlow ? undefined : bookingChips(lang),
    engine,
  };
}
