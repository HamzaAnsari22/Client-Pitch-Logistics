// Minimal browser client for the Gemini API (generativelanguage.googleapis.com).
// The API key lives only in React state and is sent only to Google, in the request header.

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiModel {
  id: string;
  label: string;
  lite: boolean;
  preview: boolean;
}

export class GeminiError extends Error {
  /** A fatal error (bad key, no access) means retrying is pointless: switch to demo mode. */
  constructor(
    message: string,
    readonly status: number | null,
    readonly fatal: boolean,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

interface ApiErrorBody {
  error?: { message?: string; status?: string };
}

function toError(status: number, body: ApiErrorBody): GeminiError {
  const msg = body.error?.message ?? '';
  if (status === 400 && /api key/i.test(msg)) return new GeminiError('Gemini rejected the API key', status, true);
  if (status === 401 || status === 403) return new GeminiError('This key isn’t allowed to use the Gemini API', status, true);
  if (status === 404) return new GeminiError('That model isn’t available for this key', status, true);
  if (status === 429) return new GeminiError('Gemini free-tier rate limit or daily quota reached', status, false);
  if (status >= 500) return new GeminiError('Gemini is temporarily unavailable', status, false);
  return new GeminiError(msg ? `Gemini error: ${msg.slice(0, 140)}` : `Gemini error ${status}`, status, false);
}

function withTimeout(ms: number, signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  return signal && 'any' in AbortSignal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function request(path: string, key: string, init: RequestInit = {}, timeoutMs = 25_000): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key, ...(init.headers ?? {}) },
      signal: withTimeout(timeoutMs, init.signal ?? undefined),
    });
  } catch (e) {
    const name = (e as Error).name;
    if (name === 'TimeoutError' || name === 'AbortError') throw new GeminiError('Gemini took too long to answer', null, false);
    throw new GeminiError('Couldn’t reach Gemini (network or browser blocked the request)', null, false);
  }
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  if (!res.ok) throw toError(res.status, body);
  return body;
}

const EXCLUDE = /(image|tts|audio|live|embedding|robotics|computer|native|vision|learnlm|gemma|aqa|exp|8b)/;

function version(id: string): number {
  const m = id.match(/gemini-(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 1000; // "-latest" aliases sort first
}

/** List Flash / Flash-Lite models this key can call. Also validates the key. */
export async function listModels(key: string): Promise<GeminiModel[]> {
  const data = (await request('models?pageSize=1000', key, { method: 'GET' }, 15_000)) as {
    models?: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[];
  };
  const models = (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => ({ id: m.name.replace(/^models\//, ''), displayName: m.displayName }))
    .filter((m) => m.id.startsWith('gemini') && m.id.includes('flash') && !EXCLUDE.test(m.id))
    .map((m) => ({
      id: m.id,
      label: m.displayName || m.id,
      lite: m.id.includes('lite'),
      preview: m.id.includes('preview'),
    }));
  return models.sort((a, b) => version(b.id) - version(a.id) || Number(a.preview) - Number(b.preview) || Number(a.lite) - Number(b.lite));
}

/** Prefer a stable Flash-Lite model: fast, and the most generous free-tier quota. */
export function defaultModel(models: GeminiModel[]): string | undefined {
  const versioned = (m: GeminiModel) => version(m.id) < 1000;
  return (
    models.find((m) => m.lite && !m.preview && versioned(m))?.id ??
    models.find((m) => m.lite && !m.preview)?.id ??
    models.find((m) => !m.preview && versioned(m))?.id ??
    models[0]?.id
  );
}

function thinkingConfig(model: string): Record<string, unknown> | undefined {
  const v = version(model);
  if (v >= 3 && v < 1000) return { thinkingLevel: 'low' };
  if (v >= 2.5 && v < 3) return { thinkingBudget: 0 };
  return undefined;
}

export interface Content {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GenerateResponse {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

/** Call generateContent with a JSON schema and return the parsed object. */
export async function generateJson<T>(opts: {
  key: string;
  model: string;
  system: string;
  contents: Content[];
  schema: unknown;
}): Promise<T> {
  const send = async (thinking: Record<string, unknown> | undefined) =>
    (await request(`models/${encodeURIComponent(opts.model)}:generateContent`, opts.key, {
      method: 'POST',
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: opts.contents,
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: opts.schema,
          maxOutputTokens: 4096,
          ...(thinking ? { thinkingConfig: thinking } : {}),
        },
      }),
    })) as GenerateResponse;

  const thinking = thinkingConfig(opts.model);
  let data: GenerateResponse;
  try {
    data = await send(thinking);
  } catch (e) {
    // Some models reject thinking settings; retry once without them.
    if (thinking && e instanceof GeminiError && e.status === 400 && /think/i.test(e.message)) data = await send(undefined);
    else throw e;
  }

  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new GeminiError(data.promptFeedback?.blockReason ? `Gemini blocked the request (${data.promptFeedback.blockReason})` : 'Gemini returned no answer', null, false);
  }
  const text = (candidate.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
    .trim()
    .replace(/^```(?:json)?\s*|\s*```$/g, '');
  if (!text) throw new GeminiError(`Gemini returned an empty answer (${candidate.finishReason ?? 'unknown'})`, null, false);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiError('Gemini returned malformed JSON', null, false);
  }
}
