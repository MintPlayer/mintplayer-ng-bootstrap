import { describe, expect, it } from 'vitest';

import { DEFAULT_FILE_MANAGER_MESSAGES, mergeMessages } from './messages';

/**
 * Every string the file manager can say, and the merge that lets a consumer
 * replace any of them.
 *
 * The plural-aware entries are the ones worth pinning. They are the component's
 * only defence against "1 items deleted" — the kind of thing that survives
 * review because the singular case is the one nobody clicks while testing —
 * and they are also announced to screen readers, where the wrong count is read
 * aloud rather than glanced past.
 */

const M = DEFAULT_FILE_MANAGER_MESSAGES;

describe('the default messages', () => {
  it('has a string or a builder for every key', () => {
    const wrong = Object.entries(M).filter(
      ([, value]) => typeof value !== 'string' && typeof value !== 'function',
    );
    expect(wrong).toEqual([]);
  });

  it('leaves nothing blank', () => {
    const blank = Object.entries(M)
      .filter(([, value]) => typeof value === 'string')
      .filter(([, value]) => (value as string).trim() === '')
      .map(([key]) => key);
    expect(blank).toEqual([]);
  });

  // Every accessible name the component uses comes from here, so a missing one
  // is an unnamed control rather than a cosmetic gap.
  it('names every region and control it exposes', () => {
    for (const key of [
      'ariaToolbar',
      'ariaFileOperations',
      'ariaViewMode',
      'ariaBreadcrumb',
      'ariaFileList',
      'ariaFileManager',
    ] as const) {
      expect(typeof M[key], key).toBe('string');
      expect((M[key] as string).length, key).toBeGreaterThan(0);
    }
  });
});

describe('the counted messages', () => {
  it.each([
    ['deleteConfirm', 1, 'item'],
    ['deleteConfirm', 2, 'items'],
    ['announceDeleted', 1, '1 item deleted.'],
    ['announceDeleted', 5, '5 items deleted.'],
    ['announcePasted', 1, '1 item pasted.'],
    ['announcePasted', 3, '3 items pasted.'],
    ['announceSearchResults', 1, '1 result.'],
    ['announceSearchResults', 0, '0 results.'],
  ] as const)('%s(%i) reads naturally', (key, count, expected) => {
    const message = (M[key] as (n: number) => string)(count);
    expect(message).toContain(expected);
  });

  // Zero is a plural in English, and it is the case a naive `n > 1` check gets
  // wrong — "0 item deleted".
  it('treats zero as plural', () => {
    expect(M.announceDeleted(0)).toBe('0 items deleted.');
    expect(M.deleteConfirm(0)).toContain('items');
  });

  it('states the count it was given', () => {
    expect(M.announceDeleted(42)).toContain('42');
    expect(M.announceSearchResults(42)).toContain('42');
  });
});

describe('the named messages', () => {
  it('quotes the conflicting name', () => {
    expect(M.conflictMessage('report.pdf')).toContain('report.pdf');
  });

  it('names the folder that was created', () => {
    expect(M.announceNewFolder('Invoices')).toContain('Invoices');
  });

  it('states both halves of a rename', () => {
    const message = M.announceRenamed('old.txt', 'new.txt');
    expect(message).toContain('old.txt');
    expect(message).toContain('new.txt');
    expect(message.indexOf('old.txt')).toBeLessThan(message.indexOf('new.txt'));
  });

  it('names the file in an upload outcome', () => {
    expect(M.announceUploadDone('a.txt')).toContain('a.txt');
    expect(M.announceUploadFailed('a.txt')).toContain('a.txt');
  });

  it('distinguishes success from failure', () => {
    expect(M.announceUploadDone('a.txt')).not.toBe(M.announceUploadFailed('a.txt'));
  });
});

describe('mergeMessages', () => {
  it('returns the defaults when there is nothing to override', () => {
    expect(mergeMessages(undefined)).toBe(DEFAULT_FILE_MANAGER_MESSAGES);
  });

  it('applies an override', () => {
    expect(mergeMessages({ rename: 'Renommer' }).rename).toBe('Renommer');
  });

  // A consumer translating one label must not lose the other forty.
  it('keeps every message it was not asked to change', () => {
    const merged = mergeMessages({ rename: 'Renommer' });
    expect(merged.delete).toBe(M.delete);
    expect(Object.keys(merged).sort()).toEqual(Object.keys(M).sort());
  });

  it('accepts a replacement builder, not only a literal', () => {
    const merged = mergeMessages({ announceDeleted: (n) => `${n} verwijderd.` });
    expect(merged.announceDeleted(2)).toBe('2 verwijderd.');
  });

  it('leaves the defaults untouched', () => {
    mergeMessages({ rename: 'Renommer' });
    expect(DEFAULT_FILE_MANAGER_MESSAGES.rename).toBe('Rename');
  });

  it('returns a fresh object for each merge', () => {
    expect(mergeMessages({ rename: 'A' })).not.toBe(mergeMessages({ rename: 'A' }));
  });

  it('ignores an empty override object', () => {
    expect(mergeMessages({})).toEqual(DEFAULT_FILE_MANAGER_MESSAGES);
  });
});
