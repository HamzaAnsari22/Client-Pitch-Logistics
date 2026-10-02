import { useEffect, useRef, useState } from 'react';
import { formatDate, isoDate, parsePhone } from '../lib/nlp';
import type { Chip, Fields, Widget } from '../lib/types';
import { Calendar, Check, Phone } from './Icons';

export interface SendFn {
  (input: { text: string; patch?: Partial<Fields> }): void;
}

export function Chips({ chips, onChip, disabled }: { chips: Chip[]; onChip: (c: Chip) => void; disabled: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          disabled={disabled}
          onClick={() => onChip(c)}
          className="rounded-full border border-navy/15 bg-white px-3.5 py-2 text-sm font-medium text-navy shadow-[0_1px_0_rgb(20_35_59/0.04)] transition hover:border-orange hover:text-orange active:scale-[0.98] disabled:opacity-50"
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function DateWidget({ onSend, disabled }: { onSend: SendFn; disabled: boolean }) {
  const today = isoDate(new Date());
  const [value, setValue] = useState('');
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (value) onSend({ text: formatDate(value), patch: { move_date: value } });
      }}
    >
      <label className="flex items-center gap-2 rounded-full border border-navy/15 bg-white py-1.5 pl-3 pr-2 text-sm text-navy focus-within:border-navy-500">
        <Calendar size={16} className="text-teal" />
        <span className="sr-only">Pick a date</span>
        <input type="date" min={today} value={value} onChange={(e) => setValue(e.target.value)} className="bg-transparent text-sm outline-none" />
      </label>
      <button
        type="submit"
        disabled={!value || disabled}
        className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-700 disabled:opacity-40"
      >
        Confirm date
      </button>
    </form>
  );
}

function PhoneWidget({ onSend, disabled }: { onSend: SendFn; disabled: boolean }) {
  const [value, setValue] = useState('');
  const valid = parsePhone(value) !== null;
  return (
    <form
      className="flex w-full max-w-sm items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSend({ text: value.trim() });
      }}
    >
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-navy/15 bg-white py-2 pl-3 pr-3 text-sm focus-within:border-navy-500">
        <Phone size={16} className="shrink-0 text-teal" />
        <span className="sr-only">Mobile number</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0300 1234567"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted/60"
        />
      </label>
      <button
        type="submit"
        disabled={!valid || disabled}
        className="shrink-0 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-700 disabled:opacity-40"
      >
        Send code
      </button>
    </form>
  );
}

function OtpWidget({ code, onSend, disabled }: { code: string; onSend: SendFn; disabled: boolean }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) refs.current[0]?.focus();
  }, []);
  const submit = (d: string[]) => {
    const value = d.join('');
    if (value.length === 4) onSend({ text: value });
  };
  const set = (i: number, v: string) => {
    const clean = v.replace(/\D/g, '');
    if (clean.length > 1) {
      const next = clean.slice(0, 4).split('');
      while (next.length < 4) next.push('');
      setDigits(next);
      if (next.every(Boolean)) submit(next);
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 3) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) submit(next);
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            disabled={disabled}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${i + 1}`}
            maxLength={4}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            }}
            className="size-12 rounded-xl border border-navy/15 bg-white text-center text-lg font-bold text-navy outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
          />
        ))}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setDigits(code.split(''));
          submit(code.split(''));
        }}
        className="rounded-full border border-dashed border-teal/50 px-3 py-1.5 text-xs font-semibold text-teal transition hover:bg-teal-50"
      >
        Autofill demo code
      </button>
    </div>
  );
}

function MultiWidget({
  options,
  noneLabel,
  field,
  onSend,
  disabled,
}: {
  options: string[];
  noneLabel: string;
  field: 'special_items' | 'zones';
  onSend: SendFn;
  disabled: boolean;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (o: string) => setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]));
  const noneValue = field === 'zones' ? ['City-wide'] : [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = picked.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => toggle(o)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                on ? 'border-teal bg-teal text-white' : 'border-navy/15 bg-white text-navy hover:border-teal hover:text-teal'
              }`}
            >
              {on && <Check size={14} />}
              {o}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!picked.length || disabled}
          onClick={() => onSend({ text: picked.join(', '), patch: { [field]: picked } })}
          className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-700 disabled:opacity-40"
        >
          Done{picked.length ? ` (${picked.length})` : ''}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSend({ text: noneLabel, patch: { [field]: noneValue } })}
          className="rounded-full border border-navy/15 bg-white px-4 py-2 text-sm font-medium text-navy transition hover:border-orange hover:text-orange"
        >
          {noneLabel}
        </button>
      </div>
    </div>
  );
}

export function WidgetView({ widget, onSend, disabled }: { widget: Widget; onSend: SendFn; disabled: boolean }) {
  switch (widget.kind) {
    case 'date':
      return <DateWidget onSend={onSend} disabled={disabled} />;
    case 'phone':
      return <PhoneWidget onSend={onSend} disabled={disabled} />;
    case 'otp':
      return <OtpWidget code={widget.code} onSend={onSend} disabled={disabled} />;
    case 'multi':
      return <MultiWidget options={widget.options} noneLabel={widget.noneLabel} field={widget.field} onSend={onSend} disabled={disabled} />;
  }
}
