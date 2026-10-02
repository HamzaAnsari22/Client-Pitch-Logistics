import { useEffect, useRef } from 'react';
import { BRAND } from '../brand';
import { getRecord } from '../lib/store';
import type { BotMessage, ChatMessage, Chip } from '../lib/types';
import { InfoCards, RequestCard } from './Cards';
import { Logo, Message, Sparkle, Warning } from './Icons';
import { Chips, WidgetView, type SendFn } from './Widgets';

interface Props {
  messages: ChatMessage[];
  busy: boolean;
  live: boolean;
  onSend: SendFn;
  onChip: (c: Chip) => void;
  onOpenRecord: (id: string) => void;
}

function EngineBadge({ msg }: { msg: BotMessage }) {
  if (msg.engine.kind !== 'live') return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal" title={msg.engine.model}>
      <Sparkle size={11} /> Gemini
    </span>
  );
}

function Bot({
  msg,
  active,
  busy,
  onSend,
  onChip,
  onOpenRecord,
}: {
  msg: BotMessage;
  active: boolean;
  busy: boolean;
  onSend: SendFn;
  onChip: (c: Chip) => void;
  onOpenRecord: (id: string) => void;
}) {
  const record = msg.card?.kind === 'request' ? getRecord(msg.card.recordId) : undefined;
  return (
    <div className="animate-rise flex gap-3">
      <div className="hidden shrink-0 pt-0.5 sm:block">
        <Logo size={30} />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-navy-500">{BRAND.name} assistant</span>
          <EngineBadge msg={msg} />
        </div>
        {msg.detected && msg.detected.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-teal">Understood</span>
            {msg.detected.map((d) => (
              <span key={d} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal ring-1 ring-teal/15">
                {d}
              </span>
            ))}
          </div>
        )}
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-navy">{msg.text}</p>
        {msg.card?.kind === 'info' && <InfoCards topics={msg.card.topics} highlight={msg.card.highlight} />}
        {record && <RequestCard record={record} onOpen={() => onOpenRecord(record.id)} />}
        {active && msg.widget && <WidgetView widget={msg.widget} onSend={onSend} disabled={busy} />}
        {active && msg.chips && msg.chips.length > 0 && <Chips chips={msg.chips} onChip={onChip} disabled={busy} />}
      </div>
    </div>
  );
}

export function ChatThread({ messages, busy, live, onSend, onChip, onOpenRecord }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, busy]);

  // Only the latest bot message keeps its interactive chips and widgets.
  let lastBot = -1;
  messages.forEach((m, i) => {
    if (m.role === 'bot') lastBot = i;
  });
  const lastIsBot = lastBot >= 0 && messages.slice(lastBot + 1).every((m) => m.role !== 'user');

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-6 pt-6">
      {messages.map((m, i) => {
        if (m.role === 'user')
          return (
            <div key={m.id} className="animate-rise flex justify-end">
              <p className="max-w-[85%] whitespace-pre-line rounded-[20px] rounded-br-md bg-navy px-4 py-2.5 text-[15px] leading-relaxed text-white">{m.text}</p>
            </div>
          );
        if (m.role === 'note') {
          if (m.tone === 'sms')
            return (
              <div key={m.id} className="animate-rise mx-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-white/90 p-3 shadow-lift ring-1 ring-line">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal text-white">
                  <Message size={18} />
                </span>
                <div className="min-w-0 text-sm">
                  <p className="flex justify-between text-xs font-semibold text-navy-500">
                    <span>Messages</span>
                    <span>now</span>
                  </p>
                  <p className="text-navy">{m.text}</p>
                </div>
              </div>
            );
          return (
            <div
              key={m.id}
              role="status"
              className={`animate-rise mx-auto flex max-w-xl items-start gap-2 rounded-xl px-3 py-2 text-xs ${
                m.tone === 'warn' ? 'bg-orange-50 text-orange-600 ring-1 ring-orange/20' : 'bg-sand text-navy-700'
              }`}
            >
              <Warning size={15} className="mt-px shrink-0" />
              <span>{m.text}</span>
            </div>
          );
        }
        return (
          <Bot
            key={m.id}
            msg={m}
            active={i === lastBot && lastIsBot && !busy}
            busy={busy}
            onSend={onSend}
            onChip={onChip}
            onOpenRecord={onOpenRecord}
          />
        );
      })}
      {busy && (
        <div className="flex items-center gap-3" aria-live="polite">
          <div className="hidden sm:block">
            <Logo size={30} />
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-soft ring-1 ring-line">
            <span className="flex gap-1">
              {[0, 1, 2].map((d) => (
                <span key={d} className="typing-dot size-1.5 rounded-full bg-navy-500" style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </span>
            <span className="text-xs text-muted">{live ? 'Gemini is thinking…' : 'Understanding your request…'}</span>
          </div>
        </div>
      )}
      <div ref={endRef} className="h-px" />
    </div>
  );
}
