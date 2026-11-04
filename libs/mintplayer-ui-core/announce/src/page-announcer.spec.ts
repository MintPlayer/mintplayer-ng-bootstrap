import { announceToPage } from './page-announcer';

const region = (politeness: string) => document.querySelector(`[data-mp-page-announcer="${politeness}"]`);

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('announceToPage', () => {
  it('speaks through one region per politeness, set on a later task and cleared after a while', () => {
    announceToPage(document, '  Saved  ');
    const polite = region('polite')!;
    expect(polite.getAttribute('aria-live')).toBe('polite');
    expect(polite.className).toBe('visually-hidden');
    expect(polite.textContent).toBe('');
    vi.advanceTimersByTime(100);
    expect(polite.textContent).toBe('Saved');

    // A repeat blanks the region first and restarts both timers.
    announceToPage(document, 'Saved');
    expect(polite.textContent).toBe('');
    vi.advanceTimersByTime(100);
    expect(polite.textContent).toBe('Saved');
    vi.advanceTimersByTime(5000);
    expect(polite.textContent).toBe('');

    announceToPage(document, 'Failed', 'assertive');
    expect(region('assertive')).not.toBeNull();
    expect(document.querySelectorAll('[data-mp-page-announcer]')).toHaveLength(2);
  });

  it('ignores blank messages and documents without a body', () => {
    announceToPage(document, '   ');
    expect(region('polite')).toBeNull();
    const bodyless = document.implementation.createDocument(null, 'root', null);
    announceToPage(bodyless, 'Hello');
    expect(bodyless.querySelector('[data-mp-page-announcer]')).toBeNull();
  });
});
