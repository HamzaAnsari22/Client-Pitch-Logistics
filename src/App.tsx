import { useCallback, useEffect, useRef, useState } from 'react';
import { BRAND } from './brand';
import { ChatThread } from './components/ChatThread';
import { Composer } from './components/Composer';
import { Logo, Plus, Settings } from './components/Icons';
import { Landing } from './components/Landing';
import { OpsDashboard } from './components/OpsDashboard';
import { SettingsPanel, type AiSettings } from './components/SettingsPanel';
import { demoTurn, isReset } from './lib/engine';
import { GeminiError, defaultModel, listModels } from './lib/gemini';
import { liveTurn, type HistoryItem } from './lib/live';
import { addRecord, useRecords } from './lib/store';
import { initialState, type ChatMessage, type Chip, type ConvState, type OutMessage, type TurnInput, type TurnResult } from './lib/types';

let seq = 0;
const withId = <T extends object>(m: T) => ({ ...m, id: `m${++seq}` });
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const [tab, setTab] = useState<'chat' | 'ops'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [openRecord, setOpenRecord] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ai, setAi] = useState<AiSettings>({ mode: 'demo', key: '', model: '', models: [], status: 'idle' });
  const records = useRecords();

  // Refs hold the latest conversation so async turns never read stale state.
  const conv = useRef<ConvState>(initialState());
  const history = useRef<HistoryItem[]>([]);
  const aiRef = useRef(ai);
  aiRef.current = ai;

  useEffect(() => {
    document.title = `${BRAND.name} · AI Concierge`;
  }, []);

  const send = useCallback(
    async (input: TurnInput) => {
      const text = input.text.trim();
      if (!text || busy) return;
      setTab('chat');
      setMessages((m) => [...m, withId({ role: 'user' as const, text })]);
      setBusy(true);

      const settings = aiRef.current;
      const notes: OutMessage[] = [];
      let result: TurnResult;
      if (settings.mode === 'live' && settings.key && settings.model) {
        try {
          result = await liveTurn(conv.current, input, { key: settings.key, model: settings.model, history: history.current, today: new Date() });
        } catch (e) {
          const err = e instanceof GeminiError ? e : new GeminiError('Live AI failed unexpectedly', null, false);
          result = demoTurn(conv.current, input);
          notes.push({
            role: 'note',
            tone: 'warn',
            text: err.fatal ? `${err.message}. Switched to demo mode.` : `${err.message}. This reply came from the demo engine.`,
          });
          if (err.fatal) setAi((a) => ({ ...a, mode: 'demo', status: 'error', error: err.message }));
        }
      } else {
        await pause(380 + Math.random() * 320);
        result = demoTurn(conv.current, input);
      }

      if (result.record) addRecord(result.record);
      conv.current = result.state;
      if (result.state.stage === 'done' || isReset(text)) {
        history.current = [];
      } else {
        const botText = result.out
          .filter((m) => m.role === 'bot')
          .map((m) => m.text)
          .join('\n');
        history.current = [...history.current, { role: 'user' as const, text }, { role: 'model' as const, text: botText }].slice(-24);
      }
      setMessages((m) => [...m, ...[...notes, ...result.out].map(withId)]);
      setBusy(false);
    },
    [busy],
  );

  const onChip = useCallback(
    (c: Chip) => {
      if (c.action === 'open-ops') {
        setTab('ops');
        const last = records[0];
        setOpenRecord(last?.id ?? null);
        return;
      }
      if (c.action === 'reset') {
        newChat();
        return;
      }
      void send({ text: c.send ?? c.label, patch: c.patch });
    },
    [send, records],
  );

  function newChat() {
    conv.current = initialState();
    history.current = [];
    setMessages([]);
    setTab('chat');
  }

  async function connect(key: string) {
    setAi((a) => ({ ...a, status: 'checking', error: undefined }));
    try {
      const models = await listModels(key);
      if (!models.length) throw new GeminiError('No Gemini Flash models are available for this key', null, true);
      const model = defaultModel(models)!;
      setAi({ mode: 'live', key, model, models, status: 'ready' });
    } catch (e) {
      const msg = e instanceof GeminiError ? e.message : 'Could not verify the key';
      setAi((a) => ({ ...a, mode: 'demo', key: '', status: 'error', error: msg }));
    }
  }

  const live = ai.mode === 'live';
  const started = messages.length > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-4">
          <button type="button" onClick={newChat} className="flex min-w-0 items-center gap-2.5" aria-label="New chat">
            <Logo size={30} />
            <span className="truncate text-[17px] font-extrabold tracking-tight text-navy">{BRAND.name}</span>
            <span className="hidden rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white sm:inline">AI Concierge</span>
          </button>

          <nav className="ml-auto flex rounded-full bg-sand p-1 text-sm font-semibold" aria-label="Views">
            {(['chat', 'ops'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-current={tab === t ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition sm:px-4 ${tab === t ? 'bg-white text-navy shadow-soft' : 'text-navy-500 hover:text-navy'}`}
              >
                {t === 'chat' ? 'Chat' : (
                  <>
                    <span className="sm:hidden">Ops</span>
                    <span className="hidden sm:inline">Ops dashboard</span>
                  </>
                )}
                {t === 'ops' && records.length > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-orange px-1 text-[11px] font-bold leading-5 text-white">{records.length}</span>
                )}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${
              live ? 'border-teal/30 bg-teal-50 text-teal' : 'border-line bg-white text-navy hover:border-navy-500'
            }`}
            aria-label={`AI settings (currently ${live ? 'live Gemini' : 'demo mode'})`}
          >
            <span className={`size-2 rounded-full ${live ? 'bg-teal' : 'bg-orange'}`} />
            <span className="hidden sm:inline">{live ? 'Live · Gemini' : 'Demo mode'}</span>
            <Settings size={16} />
          </button>
        </div>
      </header>

      {tab === 'chat' ? (
        started ? (
          <>
            <main className="flex-1">
              <div className="mx-auto flex max-w-3xl justify-end px-4 pt-3">
                <button
                  type="button"
                  onClick={newChat}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-navy-500 transition hover:bg-sand hover:text-navy"
                >
                  <Plus size={14} /> New chat
                </button>
              </div>
              <ChatThread
                messages={messages}
                busy={busy}
                live={live}
                onSend={(i) => void send(i)}
                onChip={onChip}
                onOpenRecord={(id) => {
                  setOpenRecord(id);
                  setTab('ops');
                }}
              />
            </main>
            <div className="sticky bottom-0 z-20 bg-gradient-to-t from-cream via-cream to-cream/0 pb-[max(env(safe-area-inset-bottom),12px)] pt-6">
              <div className="mx-auto max-w-3xl px-4">
                <Composer variant="dock" onSend={(t) => void send({ text: t })} busy={busy} />
                <p className="mt-2 text-center text-[11px] text-muted">
                  {live ? `Live AI · ${ai.model}. Falls back to demo mode on any error.` : 'Demo mode · rule-based engine running in your browser.'}
                </p>
              </div>
            </div>
          </>
        ) : (
          <main className="flex flex-1 flex-col">
            <Landing onSend={(t) => void send({ text: t })} busy={busy} />
          </main>
        )
      ) : (
        <main className="flex-1">
          <OpsDashboard openId={openRecord} onOpen={setOpenRecord} onGoChat={() => setTab('chat')} />
        </main>
      )}

      {settingsOpen && (
        <SettingsPanel
          ai={ai}
          onClose={() => setSettingsOpen(false)}
          onConnect={(k) => void connect(k)}
          onMode={(mode) => setAi((a) => ({ ...a, mode }))}
          onModel={(model) => setAi((a) => ({ ...a, model }))}
          onForget={() => setAi({ mode: 'demo', key: '', model: '', models: [], status: 'idle' })}
        />
      )}
    </div>
  );
}
