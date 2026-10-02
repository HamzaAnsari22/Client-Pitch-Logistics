import { useEffect, useState } from 'react';
import type { GeminiModel } from '../lib/gemini';
import { Bolt, Close, Sparkle } from './Icons';

export interface AiSettings {
  mode: 'demo' | 'live';
  key: string;
  model: string;
  models: GeminiModel[];
  status: 'idle' | 'checking' | 'ready' | 'error';
  error?: string;
}

interface Props {
  ai: AiSettings;
  onClose: () => void;
  onConnect: (key: string) => void;
  onMode: (mode: 'demo' | 'live') => void;
  onModel: (model: string) => void;
  onForget: () => void;
}

export function SettingsPanel({ ai, onClose, onConnect, onMode, onModel, onForget }: Props) {
  const [draft, setDraft] = useState(ai.key);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const connected = ai.status === 'ready' && ai.models.length > 0;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="AI settings">
      <button type="button" aria-label="Close settings" onClick={onClose} className="absolute inset-0 bg-navy/40 backdrop-blur-[2px]" />
      <aside className="animate-slide-in relative flex h-full w-full max-w-md flex-col bg-cream shadow-2xl">
        <header className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-navy">AI settings</h2>
            <p className="text-xs text-muted">Choose what powers the conversation.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full text-navy-500 transition hover:bg-sand hover:text-navy">
            <Close size={20} />
          </button>
        </header>

        <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => onMode('demo')}
              aria-pressed={ai.mode === 'demo'}
              className={`flex gap-3 rounded-2xl border p-4 text-left transition ${ai.mode === 'demo' ? 'border-navy bg-white shadow-soft' : 'border-line bg-white/60 hover:bg-white'}`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${ai.mode === 'demo' ? 'bg-navy text-white' : 'bg-sand text-navy'}`}>
                <Bolt size={18} />
              </span>
              <span>
                <span className="block font-bold text-navy">Demo mode</span>
                <span className="mt-0.5 block text-sm text-muted">
                  Built-in rule engine. No key, no network calls, the same result every time. Safest for a live pitch.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => connected && onMode('live')}
              aria-pressed={ai.mode === 'live'}
              aria-disabled={!connected}
              className={`flex gap-3 rounded-2xl border p-4 text-left transition ${
                ai.mode === 'live' ? 'border-teal bg-white shadow-soft' : 'border-line bg-white/60'
              } ${connected ? 'hover:bg-white' : 'cursor-default'}`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${ai.mode === 'live' ? 'bg-teal text-white' : 'bg-sand text-navy'}`}>
                <Sparkle size={18} />
              </span>
              <span>
                <span className="block font-bold text-navy">Live AI · Google Gemini</span>
                <span className="mt-0.5 block text-sm text-muted">
                  Gemini reads every message and returns structured JSON (journey, collected and missing fields, reply, quick replies). Falls back to demo mode on any error.
                </span>
                {!connected && <span className="mt-1.5 block text-xs font-semibold text-teal">Connect a key below to enable.</span>}
              </span>
            </button>
          </div>

          <section className="rounded-2xl border border-line bg-white p-4">
            <label htmlFor="gemini-key" className="text-sm font-bold text-navy">
              Gemini API key
            </label>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Get a free key at{' '}
              <a className="font-semibold text-teal underline-offset-2 hover:underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com/apikey
              </a>
              . It stays in this tab’s memory only: never saved, never logged, gone when you refresh. It is sent only to Google’s Gemini API.
            </p>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim()) onConnect(draft.trim());
              }}
            >
              <input
                id="gemini-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste key"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-line bg-cream/60 px-3 py-2 text-sm outline-none focus:border-navy-500"
              />
              <button
                type="submit"
                disabled={!draft.trim() || ai.status === 'checking'}
                className="shrink-0 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-700 disabled:opacity-40"
              >
                {ai.status === 'checking' ? 'Checking…' : connected ? 'Reconnect' : 'Connect'}
              </button>
            </form>
            {ai.status === 'error' && ai.error && <p className="mt-2 text-xs font-semibold text-orange">{ai.error}</p>}
            {connected && (
              <div className="mt-4 space-y-2">
                <label htmlFor="gemini-model" className="text-xs font-bold uppercase tracking-wide text-navy-500">
                  Model
                </label>
                <select
                  id="gemini-model"
                  value={ai.model}
                  onChange={(e) => onModel(e.target.value)}
                  className="w-full rounded-xl border border-line bg-cream/60 px-3 py-2 text-sm outline-none focus:border-navy-500"
                >
                  {ai.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} ({m.id})
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-relaxed text-muted">
                  Flash-Lite models are the fastest and have the most generous free-tier daily quota. Flash models reason a little better but allow fewer free requests per day.
                </p>
                <button type="button" onClick={onForget} className="text-xs font-semibold text-muted underline-offset-2 hover:text-navy hover:underline">
                  Forget key
                </button>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-sand/70 p-4 text-xs leading-relaxed text-navy-700">
            <p className="font-bold text-navy">Presenter notes</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Free-tier Gemini prompts may be used by Google to improve its models. Use demo data only.</li>
              <li>Phone numbers and contact details are handled in the browser and never sent to the model.</li>
              <li>
                Add <code className="rounded bg-white px-1">?brand=Name</code> to the URL to show any company name.
              </li>
              <li>Voice input works in Chrome, Edge and Safari.</li>
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}
