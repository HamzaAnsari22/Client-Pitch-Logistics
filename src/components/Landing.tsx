import { BRAND } from '../brand';
import { CITIES } from '../lib/knowledge';
import { Composer } from './Composer';
import { Building, Home, Info, Message } from './Icons';

const SUGGESTIONS = [
  { icon: Home, title: 'Shift my apartment', text: 'I want to move my apartment from DHA to Clifton', tag: 'House shifting' },
  { icon: Message, title: 'Roman Urdu', text: 'ghar shift karna hai DHA se Clifton', tag: 'House shifting' },
  { icon: Building, title: 'Run a delivery fleet', text: 'We run 20 Suzuki pickups daily for deliveries across the city', tag: 'Business' },
  { icon: Info, title: `About ${BRAND.name}`, text: `Tell me about ${BRAND.name}`, tag: 'Info' },
];

export function Landing({ onSend, busy }: { onSend: (text: string) => void; busy: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 pb-10 pt-8 sm:pt-14">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1 text-xs font-semibold text-teal">
          <span className="size-1.5 rounded-full bg-teal" />
          Moving · Vehicles · Deliveries · Enterprise
        </span>
        <h1 className="mt-5 text-[34px] font-extrabold leading-[1.1] tracking-tight text-navy sm:text-5xl">
          Where are we moving <span className="text-orange">today?</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg">
          No forms. Tell {BRAND.name} what you need in one line, in English or Roman Urdu, and the assistant asks only for what’s missing.
        </p>
      </div>

      <div className="mt-8">
        <Composer variant="hero" onSend={onSend} busy={busy} placeholder="e.g. ghar shift karna hai DHA se Clifton, 3 kamre, agle Saturday" />
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map(({ icon: Icon, title, text, tag }) => (
          <button
            key={text}
            type="button"
            disabled={busy}
            onClick={() => onSend(text)}
            className="group flex items-start gap-3 rounded-2xl border border-line bg-white/80 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-navy-500/40 hover:bg-white hover:shadow-soft"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cream text-navy-700 transition group-hover:bg-orange-50 group-hover:text-orange">
              <Icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold text-navy">
                {title}
                <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-500">{tag}</span>
              </span>
              <span className="mt-0.5 block text-sm text-muted">“{text}”</span>
            </span>
          </button>
        ))}
      </div>

      <dl className="mt-8 grid grid-cols-3 gap-2 text-center">
        {[
          [String(CITIES.length), 'cities'],
          ['E-bike → 60 t', 'fleet range'],
          ['EN + Roman Urdu', 'voice or text'],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl px-2 py-3">
            <dt className="text-base font-bold text-navy sm:text-lg">{value}</dt>
            <dd className="text-xs text-muted">{label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
