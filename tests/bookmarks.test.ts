import { describe, expect, it } from 'vitest';
import {
  formatBookmark,
  generateSlug,
  loadBookmarks,
  normalizeUrl,
  parseStoredBookmarks,
  SLUG_PREFIX,
} from '../src/lib/bookmarks';

describe('normalizeUrl', () => {
  it('normalises a URL with and without "https://" to the same value', () => {
    expect(normalizeUrl('example.com')).toBe(normalizeUrl('https://example.com'));
    expect(normalizeUrl('www.example.com/path')).toBe(
      normalizeUrl('https://www.example.com/path'),
    );
  });

  it('returns null for empty or blank input', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('   ')).toBeNull();
  });

  it('keeps an explicit non-https scheme', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com/');
  });
});

describe('generateSlug', () => {
  it('produces a "mona-" prefixed base62 slug', () => {
    const slug = generateSlug();
    expect(slug.startsWith(SLUG_PREFIX)).toBe(true);
    expect(slug).toMatch(/^mona-[A-Za-z0-9]+$/);
  });

  it('avoids collisions with existing slugs', () => {
    const existing = new Set(['mona-aaaa']);
    // Force every random draw to produce the same collision candidate,
    // then confirm the function keeps regenerating until it's unique.
    let calls = 0;
    const original = Math.random;
    Math.random = () => {
      calls += 1;
      return calls <= 4 ? 0 : 0.5; // first attempt collides with mona-aaaa
    };
    try {
      const slug = generateSlug(existing);
      expect(existing.has(slug)).toBe(false);
    } finally {
      Math.random = original;
    }
  });
});

describe('formatBookmark', () => {
  it('formats using the exact " :: " separator', () => {
    expect(
      formatBookmark({ url: 'https://www.example.com', slug: 'mona-7fk2' }),
    ).toBe('https://www.example.com :: mona-7fk2');
  });
});

describe('parseStoredBookmarks / loadBookmarks', () => {
  it('recovers from an empty stored value', () => {
    expect(loadBookmarks(null)).toEqual([]);
    expect(loadBookmarks(undefined)).toEqual([]);
    expect(loadBookmarks('')).toEqual([]);
  });

  it('recovers from a corrupted (invalid JSON) stored value', () => {
    expect(loadBookmarks('{not valid json')).toEqual([]);
  });

  it('recovers from a legacy/non-array stored value', () => {
    expect(loadBookmarks(JSON.stringify({ url: 'https://example.com' }))).toEqual([]);
    expect(loadBookmarks(JSON.stringify('just a string'))).toEqual([]);
    expect(loadBookmarks(JSON.stringify(42))).toEqual([]);
  });

  it('drops malformed entries but keeps valid ones', () => {
    const raw = JSON.stringify([
      { url: 'https://example.com', slug: 'mona-abcd' },
      { url: 'https://example.org' }, // missing slug
      { slug: 'mona-efgh' }, // missing url
      null,
      'not-an-object',
      { url: '', slug: 'mona-ijkl' }, // empty url
      { url: 'https://good.example', slug: 'mona-mnop' },
    ]);
    expect(parseStoredBookmarks(JSON.parse(raw))).toEqual([
      { url: 'https://example.com', slug: 'mona-abcd' },
      { url: 'https://good.example', slug: 'mona-mnop' },
    ]);
  });
});
