import { useEffect } from 'react';
import { BRAND } from '../brand';
import { clearRecords, useRecords } from '../lib/store';
import type { RequestRecord } from '../lib/types';
import { CopyButton, JsonView, PriorityBadge } from './Cards';
import { Arrow, Building, Close, Download, Home, Message } from './Icons';

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function TypeBadge({ kind }: { kind: RequestRecord['kind'] }) {
  return kind === 'household' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-navy ring-1 ring-line">
      <Home size={13} /> House move
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal ring-1 ring-teal/20">
      <Building size={13} /> Enterprise lead
    </span>
  );
}

function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function OpsDashboard({ openId, onOpen, onGoChat }: { openId: string | null; onOpen: (id: string | null) => void; onGoChat: () => void }) {
  const records = useRecords();
  const open = records.find((r) => r.id === openId) ?? null;
  const stats = [
    ['Requests', records.length],
    ['House moves', records.filter((r) => r.kind === 'household').length],
    ['Enterprise leads', records.filter((r) => r.kind === 'enterprise').length],
    ['High priority', records.filter((r) => r.priority === 'high').length],
  ] as const;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Ops hand-off</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">Ops dashboard</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Every request the assistant created in this browser session, exactly as the {BRAND.name} operations team would receive it.
          </p>
        </div>
        {records.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => download('ops-requests.json', records.map((r) => r.payload))}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-navy transition hover:border-navy-500"
            >
              <Download size={16} /> Export JSON
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all requests from this session?')) {
                  clearRecords();
                  onOpen(null);
                }
              }}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-muted transition hover:bg-sand hover:text-navy"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-white p-4 shadow-soft">
            <dt className="text-xs font-semibold text-muted">{label}</dt>
            <dd className={`mt-1 text-3xl font-extrabold tabular-nums ${label === 'High priority' && value > 0 ? 'text-orange' : 'text-navy'}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {records.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-sand text-navy-700">
            <Message size={22} />
          </span>
          <p className="mt-4 text-lg font-bold text-navy">No requests yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted">Finish a house shift or a business enquiry in the chat and it lands here instantly, with the structured JSON.</p>
          <button type="button" onClick={onGoChat} className="mt-5 rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600">
            Go to chat
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-6 hidden overflow-hidden rounded-2xl border border-line bg-white shadow-soft md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream/70 text-xs font-semibold uppercase tracking-wide text-navy-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onOpen(r.id)}
                    className={`cursor-pointer border-t border-line transition hover:bg-cream/60 ${openId === r.id ? 'bg-orange-50/60' : ''}`}
                  >
                    <td className="px-4 py-3.5 font-bold text-navy">#{r.id}</td>
                    <td className="px-4 py-3.5">
                      <TypeBadge kind={r.kind} />
                    </td>
                    <td className="max-w-md px-4 py-3.5 text-navy-700">
                      <p className="truncate">{r.summary}</p>
                      <p className="truncate text-xs text-muted">{r.source}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <PriorityBadge level={r.priority} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-muted">{timeLabel(r.createdAt)}</td>
                    <td className="px-4 py-3.5 text-navy-500">
                      <Arrow size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className="mt-6 space-y-3 md:hidden">
            {records.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => onOpen(r.id)} className="w-full rounded-2xl border border-line bg-white p-4 text-left shadow-soft">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-navy">#{r.id}</span>
                    <PriorityBadge level={r.priority} />
                  </div>
                  <p className="mt-2 text-sm text-navy-700">{r.summary}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <TypeBadge kind={r.kind} />
                    <span className="text-xs tabular-nums text-muted">{timeLabel(r.createdAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {open && <RecordDrawer record={open} onClose={() => onOpen(null)} />}
    </div>
  );
}

function RecordDrawer({ record, onClose }: { record: RequestRecord; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const json = JSON.stringify(record.payload, null, 2);
  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={`Request ${record.id}`}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-navy/40 backdrop-blur-[2px]" />
      <aside className="animate-slide-in relative flex h-full w-full max-w-xl flex-col bg-cream shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-line bg-white px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold text-navy">#{record.id}</h2>
              <PriorityBadge level={record.priority} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
              <TypeBadge kind={record.kind} />
              <span>{new Date(record.createdAt).toLocaleString('en-GB')}</span>
              <span>· {record.source}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-full text-navy-500 transition hover:bg-sand hover:text-navy">
            <Close size={20} />
          </button>
        </header>
        <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section className="rounded-2xl border border-line bg-white p-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-navy-500">Summary</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {record.highlights.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-semibold text-navy">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-2xl border border-line bg-white p-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-navy-500">Why this priority</h3>
            <p className="mt-2 text-sm leading-relaxed text-navy-700">{record.priorityReason}</p>
          </section>
          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-navy-500">Structured payload</h3>
              <div className="flex gap-2">
                <CopyButton text={json} />
                <button
                  type="button"
                  onClick={() => download(`${record.id}.json`, record.payload)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-navy-500"
                >
                  <Download size={14} /> Download
                </button>
              </div>
            </div>
            <JsonView value={record.payload} />
          </section>
        </div>
      </aside>
    </div>
  );
}
