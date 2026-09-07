// Pure helpers for Mona's Bookmark Manager.
//
// Nothing in this file touches the DOM, localStorage, or any other
// browser-only API — that's what makes it safe to import from the static
// build AND to unit test with plain Node/vitest. All browser access stays
// in the client:load / <script> boundary inside Bookmarks.astro.

export interface Bookmark {
  url: string;
  slug: string;
}

export const STORAGE_KEY = 'mona-bookmarks';
export const SLUG_PREFIX = 'mona-';

const BASE62_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Normalise whatever the user typed into a full URL string. Accepts input
 * with or without a scheme (e.g. "example.com" or "https://example.com")
 * and returns the same normalised value for both. Returns null when the
 * input can't reasonably be treated as a URL.
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return null;

  // Prefix a scheme if none is present so "example.com" and
  // "https://example.com" normalise to the same value.
  const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    // URL() both validates and canonicalizes (lowercases host, etc.).
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
}

/**
 * Generate a short base62 slug with the "mona-" prefix, e.g. "mona-7fk2".
 * Optionally avoids collisions with an existing set of slugs.
 */
export function generateSlug(existingSlugs?: Iterable<string>): string {
  const taken = new Set(existingSlugs ?? []);
  let slug: string;
  do {
    let body = '';
    for (let i = 0; i < 4; i++) {
      body += BASE62_CHARS[Math.floor(Math.random() * BASE62_CHARS.length)];
    }
    slug = `${SLUG_PREFIX}${body}`;
  } while (taken.has(slug));
  return slug;
}

/** Format a bookmark for display using the exact " :: " separator. */
export function formatBookmark(bookmark: Bookmark): string {
  return `${bookmark.url} :: ${bookmark.slug}`;
}

function isValidBookmark(value: unknown): value is Bookmark {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.url === 'string' &&
    candidate.url.length > 0 &&
    typeof candidate.slug === 'string' &&
    candidate.slug.length > 0
  );
}

/**
 * Validate parsed JSON (or any untrusted value) as an array of bookmarks,
 * silently dropping anything malformed. Never throws.
 */
export function parseStoredBookmarks(value: unknown): Bookmark[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isValidBookmark);
}

/**
 * Parse a raw localStorage string into a validated bookmark list. Handles
 * empty, corrupted (invalid JSON), legacy, and non-array values gracefully
 * — this function never throws.
 */
export function loadBookmarks(raw: string | null | undefined): Bookmark[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return parseStoredBookmarks(parsed);
  } catch {
    return [];
  }
}
