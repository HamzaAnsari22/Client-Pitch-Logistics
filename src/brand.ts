// Placeholder brand for the public demo. Presenters can show any name at runtime
// with a URL parameter, e.g. ?brand=Acme — nothing is committed to the repo.
const DEFAULT_NAME = 'Rawana';

function readOverride(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = new URLSearchParams(window.location.search).get('brand');
    const clean = value?.replace(/[^\p{L}\p{N} .&'-]/gu, '').trim().slice(0, 32);
    return clean || null;
  } catch {
    return null;
  }
}

const name = readOverride() ?? DEFAULT_NAME;

export const BRAND = {
  name,
  enterprise: `${name} Enterprise`,
  requestPrefix: 'MV',
  tagline: 'Move anything. Just ask.',
};
