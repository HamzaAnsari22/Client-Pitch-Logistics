import { useSyncExternalStore } from 'react';
import type { RequestRecord } from './types';

// Requests created in this browser session — the ops hand-off queue.
// sessionStorage keeps them across a page refresh but clears them when the tab closes.

const KEY = 'ops-requests-v1';
let records: RequestRecord[] = load();
const listeners = new Set<() => void>();

function load(): RequestRecord[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RequestRecord[]) : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    // Storage can be unavailable (private mode); the in-memory list still works.
  }
  listeners.forEach((l) => l());
}

export function addRecord(record: RequestRecord) {
  records = [record, ...records];
  save();
}

export function clearRecords() {
  records = [];
  save();
}

export function getRecord(id: string): RequestRecord | undefined {
  return records.find((r) => r.id === id);
}

export function useRecords(): RequestRecord[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => records,
  );
}
