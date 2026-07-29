import { afterEach, describe, expect, it, vi } from 'vitest';
import { MpCarousel } from './mp-carousel';

void MpCarousel; // force the side-effect registration

/**
 * ARIA surface of `<mp-carousel>` that `mp-carousel.spec.ts` leaves at first
 * render only: `aria-current` moving between indicators, `aria-busy` around a
 * transition, the play/pause accessible NAME (not just `aria-pressed`) and the
 * reverse direction of the `aria-live` / `aria-keyshortcuts` switches. Plus the
 * host-side naming rules: a consumer-set role or roledescription is never
 * overwritten, and nothing is copied inward as an IDREF string.
 */
async function flush(el: MpCarousel): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

async function make(attrs: Record<string, string> = {}, slides = 3): Promise<MpCarousel> {
  const el = document.createElement('mp-carousel') as MpCarousel;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  Array.from({ length: slides }, (_, i) => {
    const slide = document.createElement('div');
    slide.textContent = `slide ${i}`;
    el.appendChild(slide);
  });
  document.body.appendChild(el);
  await flush(el);
  return el;
}

const shadow = (el: MpCarousel) => el.shadowRoot!;
const inner = (el: MpCarousel) => shadow(el).querySelector<HTMLElement>('.carousel-inner')!;
const indicators = (el: MpCarousel) =>
  Array.from(shadow(el).querySelectorAll<HTMLElement>('.carousel-indicators label'));
const radios = (el: MpCarousel) => Array.from(shadow(el).querySelectorAll<HTMLInputElement>('.car-radio'));
const cells = (el: MpCarousel) => Array.from(shadow(el).querySelectorAll<HTMLElement>('.carousel-item[data-i]'));
const playPause = (el: MpCarousel) => shadow(el).querySelector<HTMLButtonElement>('.carousel-play-pause-btn')!;

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('mp-carousel aria-current follows the committed slide', () => {
  it('moves aria-current on a programmatic index write, leaving exactly one marked', async () => {
    const el = await make();
    expect(indicators(el).map((l) => l.getAttribute('aria-current'))).toEqual(['true', null, null]);

    el.index = 2;
    await flush(el);
    expect(indicators(el).map((l) => l.getAttribute('aria-current'))).toEqual([null, null, 'true']);

    el.index = 0;
    await flush(el);
    expect(indicators(el).map((l) => l.getAttribute('aria-current'))).toEqual(['true', null, null]);
  });

  it('moves aria-current when the radio group itself changes (native arrow keys)', async () => {
    const el = await make();
    const radio = radios(el)[1];
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    await flush(el);

    expect(el.index).toBe(1);
    expect(indicators(el).map((l) => l.getAttribute('aria-current'))).toEqual([null, 'true', null]);
  });

  it('names each hidden index radio "Slide N" and re-numbers every label when the deck grows', async () => {
    const el = await make();
    expect(radios(el).map((r) => r.getAttribute('aria-label'))).toEqual(['Slide 1', 'Slide 2', 'Slide 3']);

    el.appendChild(document.createElement('div'));
    await flush(el);

    expect(radios(el).map((r) => r.getAttribute('aria-label'))).toEqual([
      'Slide 1',
      'Slide 2',
      'Slide 3',
      'Slide 4',
    ]);
    expect(cells(el).map((c) => c.getAttribute('aria-label'))).toEqual([
      '1 of 4',
      '2 of 4',
      '3 of 4',
      '4 of 4',
    ]);
    expect(indicators(el)).toHaveLength(4);
  });
});

describe('mp-carousel aria-busy', () => {
  it('marks the viewport busy for the duration of a fade transition, then clears it', async () => {
    vi.useFakeTimers();
    const el = await make({ animation: 'fade' });
    expect(inner(el).hasAttribute('aria-busy')).toBe(false);

    el.next();
    expect(inner(el).getAttribute('aria-busy')).toBe('true');

    vi.advanceTimersByTime(600);
    await flush(el);
    expect(inner(el).hasAttribute('aria-busy')).toBe(false);
    expect(el.index).toBe(1);
  });

  it('never leaves aria-busy behind when a transition is interrupted by the next one', async () => {
    vi.useFakeTimers();
    const el = await make({ animation: 'fade' });

    el.next();
    el.next(); // interrupts the in-flight transition, then starts its own
    expect(inner(el).getAttribute('aria-busy')).toBe('true');

    vi.advanceTimersByTime(600);
    await flush(el);
    expect(inner(el).hasAttribute('aria-busy')).toBe(false);
    expect(el.index).toBe(2);
  });
});

describe('mp-carousel play/pause naming and state', () => {
  it('flips the accessible name and aria-pressed on pause()/play()', async () => {
    const el = await make({ interval: '2000' });
    expect(playPause(el).getAttribute('aria-label')).toBe('Stop automatic slide show');
    expect(playPause(el).getAttribute('aria-pressed')).toBe('false');

    el.pause();
    await flush(el);
    expect(playPause(el).getAttribute('aria-label')).toBe('Start automatic slide show');
    expect(playPause(el).getAttribute('aria-pressed')).toBe('true');

    el.play();
    await flush(el);
    expect(playPause(el).getAttribute('aria-label')).toBe('Stop automatic slide show');
    expect(playPause(el).getAttribute('aria-pressed')).toBe('false');
  });

  it('follows a programmatic paused attribute / property write too', async () => {
    const el = await make({ interval: '2000' });

    el.setAttribute('paused', '');
    await flush(el);
    expect(playPause(el).getAttribute('aria-pressed')).toBe('true');
    expect(playPause(el).getAttribute('aria-label')).toBe('Start automatic slide show');

    el.paused = false;
    await flush(el);
    expect(playPause(el).getAttribute('aria-pressed')).toBe('false');
    expect(playPause(el).getAttribute('aria-label')).toBe('Stop automatic slide show');
  });
});

describe('mp-carousel viewport state, both directions', () => {
  it('returns aria-live to "off" when rotation resumes and to "polite" when autoplay is removed', async () => {
    const el = await make({ interval: '1000' });
    expect(inner(el).getAttribute('aria-live')).toBe('off');

    el.pause();
    await flush(el);
    expect(inner(el).getAttribute('aria-live')).toBe('polite');

    el.play();
    await flush(el);
    expect(inner(el).getAttribute('aria-live')).toBe('off');

    el.removeAttribute('interval');
    await flush(el);
    expect(inner(el).getAttribute('aria-live')).toBe('polite');
  });

  it('keeps aria-live "polite" while rotating when the user prefers reduced motion', async () => {
    const real = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: true,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    try {
      const el = await make({ interval: '1000' });
      expect(inner(el).getAttribute('aria-live')).toBe('polite');
    } finally {
      window.matchMedia = real;
    }
  });

  it('restores aria-keyshortcuts when keyboard-events is switched back on', async () => {
    const el = await make({ 'keyboard-events': 'false' });
    expect(inner(el).hasAttribute('aria-keyshortcuts')).toBe(false);

    el.setAttribute('keyboard-events', 'true');
    await flush(el);
    expect(inner(el).getAttribute('aria-keyshortcuts')).toBe('ArrowLeft ArrowRight Home End');

    el.setAttribute('orientation', 'vertical');
    await flush(el);
    expect(inner(el).getAttribute('aria-keyshortcuts')).toBe('ArrowUp ArrowDown Home End');

    el.setAttribute('orientation', 'horizontal');
    await flush(el);
    expect(inner(el).getAttribute('aria-keyshortcuts')).toBe('ArrowLeft ArrowRight Home End');
  });
});

describe('mp-carousel host naming', () => {
  it('never overwrites a consumer-set role or roledescription', async () => {
    const el = await make({ role: 'group', 'aria-roledescription': 'photo gallery' });
    expect(el.getAttribute('role')).toBe('group');
    expect(el.getAttribute('aria-roledescription')).toBe('photo gallery');
  });

  it('invents no host name, and never copies IDREF strings into the shadow root', async () => {
    document.body.innerHTML = '<span id="outer">Animals</span>';
    const el = await make({ 'aria-labelledby': 'outer', 'aria-describedby': 'outer' });

    expect(el.hasAttribute('aria-label')).toBe(false);
    expect(shadow(el).querySelector('[aria-labelledby], [aria-describedby]')).toBeNull();
  });
});
