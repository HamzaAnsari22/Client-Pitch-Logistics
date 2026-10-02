import { useState, type ReactNode } from 'react';
import { BRAND } from '../brand';
import { BOOKING_STEPS, CITIES, ENTERPRISE_FEATURES, FLEET, SERVICES } from '../lib/knowledge';
import type { InfoTopic, Priority, RequestRecord } from '../lib/types';
import { Arrow, Box, Building, Check, Clipboard, Copy, Home, Pin, Snow, Truck, Users } from './Icons';

const SERVICE_ICON: Record<string, typeof Home> = {
  'house-shifting': Home,
  packing: Box,
  labour: Users,
  ac: Snow,
  vehicles: Truck,
  deliveries: Clipboard,
  enterprise: Building,
};

export function PriorityBadge({ level }: { level: Priority }) {
  const style =
    level === 'high'
      ? 'bg-orange text-white'
      : level === 'medium'
        ? 'bg-orange-50 text-orange-600 ring-1 ring-orange/25'
        : 'bg-teal-50 text-teal ring-1 ring-teal/20';
  return <span className={`inline-flex shrink-0 items-center self-start rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${style}`}>{level}</span>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-navy-500">{title}</h4>
      {children}
    </section>
  );
}

export function InfoCards({ topics, highlight }: { topics: InfoTopic[]; highlight: string[] }) {
  const hl = new Set(highlight);
  return (
    <div className="space-y-5 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
      {topics.includes('services') && (
        <Section title="Services">
          <div className="grid gap-2 sm:grid-cols-2">
            {SERVICES.map((s) => {
              const Icon = SERVICE_ICON[s.id] ?? Box;
              const on = hl.has(s.name);
              return (
                <div key={s.id} className={`flex gap-3 rounded-xl p-3 ${on ? 'bg-orange-50 ring-1 ring-orange/30' : 'bg-cream/70'}`}>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${on ? 'bg-orange text-white' : 'bg-white text-teal'}`}>
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">{s.name}</p>
                    <p className="text-xs leading-relaxed text-muted">{s.blurb}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}
      {topics.includes('fleet') && (
        <Section title="Fleet">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FLEET.map((v) => {
              const on = hl.has(v.name);
              return (
                <div key={v.id} className={`rounded-xl p-3 ${on ? 'bg-orange-50 ring-1 ring-orange/30' : 'bg-cream/70'}`}>
                  <Truck size={18} className={on ? 'text-orange' : 'text-teal'} />
                  <p className="mt-1.5 text-sm font-semibold leading-tight text-navy">{v.name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-orange-600">{v.capacity}</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted">{v.bestFor}</p>
                </div>
              );
            })}
          </div>
        </Section>
      )}
      {topics.includes('cities') && (
        <Section title={`Cities (${CITIES.length})`}>
          <div className="flex flex-wrap gap-2">
            {CITIES.map((c) => {
              const on = hl.has(c);
              return (
                <span
                  key={c}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                    on ? 'bg-orange text-white' : 'bg-cream text-navy'
                  }`}
                >
                  <Pin size={14} className={on ? 'text-white' : 'text-teal'} />
                  {c}
                </span>
              );
            })}
          </div>
        </Section>
      )}
      {topics.includes('booking') && (
        <Section title="How booking works">
          <ol className="grid gap-2 sm:grid-cols-2">
            {BOOKING_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 rounded-xl bg-cream/70 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-navy">{s.title}</p>
                  <p className="text-xs leading-relaxed text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}
      {topics.includes('enterprise') && (
        <Section title={BRAND.enterprise}>
          <div className="grid gap-2 sm:grid-cols-2">
            {ENTERPRISE_FEATURES.map((f) => (
              <div key={f.title} className="flex gap-3 rounded-xl bg-teal-50/70 p-3">
                <Check size={18} className="mt-0.5 shrink-0 text-teal" />
                <div>
                  <p className="text-sm font-semibold text-navy">{f.title}</p>
                  <p className="text-xs leading-relaxed text-muted">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/** JSON with light syntax colouring. */
export function JsonView({ value, className = '' }: { value: unknown; className?: string }) {
  const json = JSON.stringify(value, null, 2);
  const parts = json.split(/("(?:\\.|[^"\\])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?)/g);
  return (
    <pre className={`scrollbar-thin overflow-x-auto rounded-xl bg-navy p-4 text-[12px] leading-relaxed text-[#cfd8e6] ${className}`}>
      <code>
        {parts.map((p, i) => {
          if (!p) return null;
          if (/^".*":$/.test(p.replace(/\s/g, ''))) return <span key={i} className="text-[#8ec5ff]">{p}</span>;
          if (p.startsWith('"')) return <span key={i} className="text-[#ffb98a]">{p}</span>;
          if (/^(true|false|null)$/.test(p)) return <span key={i} className="text-[#7fd6cf]">{p}</span>;
          if (/^-?\d/.test(p)) return <span key={i} className="text-[#7fd6cf]">{p}</span>;
          return <span key={i}>{p}</span>;
        })}
      </code>
    </pre>
  );
}

export function CopyButton({ text, label = 'Copy JSON' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // Clipboard can be blocked (http, iframes); nothing else to do.
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-navy-500"
    >
      {done ? <Check size={14} className="text-teal" /> : <Copy size={14} />}
      {done ? 'Copied' : label}
    </button>
  );
}

export function RequestCard({ record, onOpen }: { record: RequestRecord; onOpen: () => void }) {
  const [showJson, setShowJson] = useState(false);
  const lead = record.kind === 'enterprise';
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${lead ? 'bg-teal' : 'bg-navy'} text-white`}>
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-white/15">{lead ? <Building size={17} /> : <Home size={17} />}</span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">{record.title}</p>
            <p className="text-lg font-extrabold leading-tight">#{record.id}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
          <Check size={13} /> Sent to ops
        </span>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 px-4 py-4 text-sm sm:grid-cols-2">
        {record.highlights.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-dashed border-line pb-2 sm:block sm:border-0 sm:pb-0">
            <dt className="text-xs font-medium text-muted">{k}</dt>
            <dd className="text-right font-semibold text-navy sm:text-left">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mx-4 mb-4 flex items-start gap-3 rounded-xl bg-cream p-3">
        <PriorityBadge level={record.priority} />
        <p className="text-xs leading-relaxed text-navy-700">{record.priorityReason}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        <button
          type="button"
          onClick={() => setShowJson((v) => !v)}
          aria-expanded={showJson}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-navy-500"
        >
          <Arrow size={14} className={`transition ${showJson ? 'rotate-90' : ''}`} />
          Structured request (JSON)
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 rounded-full bg-orange px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600"
        >
          View in ops dashboard
          <Arrow size={14} />
        </button>
      </div>
      {showJson && (
        <div className="px-4 pb-4">
          <div className="mb-2 flex justify-end">
            <CopyButton text={JSON.stringify(record.payload, null, 2)} />
          </div>
          <JsonView value={record.payload} className="max-h-80" />
        </div>
      )}
    </div>
  );
}
