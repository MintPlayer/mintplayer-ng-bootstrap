import { afterEach, describe, expect, it, vi } from 'vitest';
import { MpCarousel } from './mp-carousel';

void MpCarousel; // force the side-effect registration

/**
 * The carousel's interaction tiers that the base spec leaves alone: the DSD
 * handoff, the Web Animations settle (jsdom has no WAAPI, so `animate` is
 * stubbed with a controllable handle — an API stub, never a geometry value),
 * the fade timer, the touch arbiter wiring, reduced motion and the hover/focus
 * autoplay suspension.
 */

async function flush(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

function build(attrs: Record<string, string> = {}, slides = 3): MpCarousel {
  const el = document.createElement('mp-carousel') as MpCarousel;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  Array.from({ length: slides }, (_, i) => {
    const slide = document.createElement('div');
    slide.textContent = `slide ${i}`;
    return slide;
  }).forEach((s) => el.appendChild(s));
  return el;
}

async function make(attrs: Record<string, string> = {}, slides = 3): Promise<MpCarousel> {
  const el = build(attrs, slides);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

const shadow = (el: MpCarousel) => el.shadowRoot!;
const track = (el: MpCarousel) => shadow(el).querySelector<HTMLElement>('.carousel-track')!;
const inner = (el: MpCarousel) => shadow(el).querySelector<HTMLElement>('.carousel-inner')!;
const cells = (el: MpCarousel) => [...shadow(el).querySelectorAll<HTMLElement>('.carousel-item[data-i]')];
const slots = (el: MpCarousel) => [...el.children].map((c) => c.getAttribute('slot'));
const inertCells = (el: MpCarousel) => cells(el).map((c) => c.hasAttribute('inert'));

interface FakeAnimation {
  cancel: ReturnType<typeof vi.fn>;
  onfinish: (() => void) | null;
}

/** Replace the track's `animate` with a handle the test finishes by hand. */
function stubAnimate(el: MpCarousel) {
  const animations: FakeAnimation[] = [];
  const animate = vi.fn(() => {
    const a: FakeAnimation = { cancel: vi.fn(), onfinish: null };
    animations.push(a);
    return a as unknown as Animation;
  });
  (track(el) as unknown as { animate: typeof animate }).animate = animate;
  return { animate, animations };
}

function touch(type: string, points: Array<{ clientX: number; clientY: number }>): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'touches', { value: points });
  return ev;
}

interface FakeMql {
  matches: boolean;
  media: string;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
  fire(): void;
}

function stubReducedMotion(matches: boolean): FakeMql {
  const listeners = new Set<() => void>();
  const mql: FakeMql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_t, cb) => listeners.add(cb),
    removeEventListener: (_t, cb) => listeners.delete(cb),
    fire: () => [...listeners].forEach((cb) => cb()),
  };
  vi.stubGlobal('matchMedia', () => mql as unknown as MediaQueryList);
  return mql;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('mp-carousel DSD handoff', () => {
  function withDsd(checkedIndex: number, slides = 3): MpCarousel {
    const el = build({}, slides);
    const root = el.attachShadow({ mode: 'open' });
    root.innerHTML = [0, 1, 2]
      .map((i) => `<input type="radio" class="car-radio" ${i === checkedIndex ? 'checked' : ''}>`)
      .join('') + '<div class="dsd-marker"></div>';
    return el;
  }

  it('lands on the slide the no-JS user navigated to, and discards the static chrome', async () => {
    const el = withDsd(2);
    document.body.appendChild(el);
    await flush(el);
    expect(el.index).toBe(2);
    expect(shadow(el).querySelector('.dsd-marker')).toBeNull();
    expect(cells(el)).toHaveLength(3);
    expect(track(el).style.transform).toBe('translate3d(-300%, 0, 0)');
  });

  it('a DSD parked on the first slide upgrades on slide 0', async () => {
    const el = withDsd(0);
    document.body.appendChild(el);
    await flush(el);
    expect(el.index).toBe(0);
    expect(shadow(el).querySelector('.dsd-marker')).toBeNull();
  });

  it('ignores a checked radio that no longer has a slide behind it', async () => {
    const el = withDsd(2, 2);
    document.body.appendChild(el);
    await flush(el);
    expect(el.index).toBe(0);
    expect(track(el).style.transform).toBe('translate3d(-100%, 0, 0)');
  });

  it('adopts the component styles into the reused shadow root', async () => {
    const el = withDsd(1);
    document.body.appendChild(el);
    await flush(el);
    const adopted = (shadow(el).adoptedStyleSheets ?? []).length;
    const styleTags = shadow(el).querySelectorAll('style').length;
    // Either adopted sheets or the style-tag fallback, beyond the per-index style.
    expect(adopted + styleTags).toBeGreaterThan(1);
  });
});

describe('mp-carousel Web Animations settle (slide mode)', () => {
  it('animates the track between the two positions and commits only on finish', async () => {
    const el = await make();
    const { animate, animations } = stubAnimate(el);
    const events: string[] = [];
    el.addEventListener('animation-start', () => events.push('start'));
    el.addEventListener('animation-end', () => events.push('end'));
    el.addEventListener('slide-change', () => events.push('change'));

    el.next();
    expect(animate).toHaveBeenCalledWith(
      [{ transform: 'translate3d(-100%, 0, 0)' }, { transform: 'translate3d(-200%, 0, 0)' }],
      { duration: 500, easing: 'ease', fill: 'forwards' },
    );
    expect(el.index).toBe(0);
    expect(inner(el).getAttribute('aria-busy')).toBe('true');
    // Both outgoing and incoming slides stay live mid-motion.
    expect(inertCells(el)).toEqual([false, false, false]);

    animations[0].onfinish!();
    await flush(el);
    expect(el.index).toBe(1);
    expect(animations[0].cancel).toHaveBeenCalledTimes(1);
    expect(inner(el).hasAttribute('aria-busy')).toBe(false);
    expect(events).toEqual(['start', 'change', 'end']);
    expect(track(el).style.transform).toBe('translate3d(-200%, 0, 0)');
    expect(inertCells(el)).toEqual([true, false, true]);
  });

  it('a second navigation finishes the in-flight one first, then starts from the new index', async () => {
    const el = await make();
    const { animate, animations } = stubAnimate(el);
    el.next();
    el.next();
    expect(el.index).toBe(1);
    expect(animations[0].cancel).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenLastCalledWith(
      [{ transform: 'translate3d(-200%, 0, 0)' }, { transform: 'translate3d(-300%, 0, 0)' }],
      expect.anything(),
    );
    // A late onfinish from the settled animation must not commit twice.
    const changes = vi.fn();
    el.addEventListener('slide-change', changes);
    animations[0].onfinish!();
    expect(changes).not.toHaveBeenCalled();
    expect(el.index).toBe(1);
  });

  it('wrapping forward teleports slide 0 into the trailing wrap cell for the duration', async () => {
    const el = await make();
    el.index = 2;
    await flush(el);
    const { animate, animations } = stubAnimate(el);
    el.next();
    expect(animate).toHaveBeenCalledWith(
      [{ transform: 'translate3d(-300%, 0, 0)' }, { transform: 'translate3d(-400%, 0, 0)' }],
      expect.anything(),
    );
    expect(slots(el)).toEqual(['wrapA', 's1', 's2']);
    animations[0].onfinish!();
    expect(slots(el)).toEqual(['s0', 's1', 's2']);
    expect(el.index).toBe(0);
  });

  it('wrapping backward teleports the last slide into the leading wrap cell', async () => {
    const el = await make();
    const { animations } = stubAnimate(el);
    el.previous();
    expect(slots(el)).toEqual(['s0', 's1', 'wrapB']);
    animations[0].onfinish!();
    expect(slots(el)).toEqual(['s0', 's1', 's2']);
    expect(el.index).toBe(2);
  });

  it('a single slide never teleports', async () => {
    const el = await make({}, 1);
    const { animate } = stubAnimate(el);
    el.next();
    expect(animate).not.toHaveBeenCalled();
    expect(slots(el)).toEqual(['s0']);
  });

  it('a membership change mid-animation settles it before re-projecting', async () => {
    const el = await make();
    const { animations } = stubAnimate(el);
    el.previous();
    expect(slots(el)[2]).toBe('wrapB');
    el.appendChild(document.createElement('div'));
    await flush(el);
    expect(animations[0].cancel).toHaveBeenCalled();
    expect(slots(el)).toEqual(['s0', 's1', 's2', 's3']);
    expect(el.index).toBe(2);
  });
});

describe('mp-carousel fade transitions', () => {
  it('crossfades on a timer: the target cell is active at once, the index commits after the duration', async () => {
    vi.useFakeTimers();
    const el = await make({ animation: 'fade' });
    el.next();
    expect(cells(el).map((c) => c.classList.contains('active'))).toEqual([false, true, false]);
    expect(el.index).toBe(0);
    expect(inertCells(el)).toEqual([false, false, false]);
    vi.advanceTimersByTime(500);
    expect(el.index).toBe(1);
    await flush(el);
    expect(inertCells(el)).toEqual([true, false, true]);
  });

  it('a second navigation finishes the pending crossfade immediately', async () => {
    vi.useFakeTimers();
    const el = await make({ animation: 'fade' });
    el.next();
    el.next();
    expect(el.index).toBe(1);
    expect(cells(el)[2].classList.contains('active')).toBe(true);
    vi.advanceTimersByTime(500);
    expect(el.index).toBe(2);
    // The finished timer does not fire again.
    vi.advanceTimersByTime(1000);
    expect(el.index).toBe(2);
  });

  it('animation="none" commits instantly with no transition', async () => {
    const el = await make({ animation: 'none' });
    const { animate } = stubAnimate(el);
    el.next();
    expect(el.index).toBe(1);
    expect(animate).not.toHaveBeenCalled();
  });
});

describe('mp-carousel touch arbiter', () => {
  it('a horizontal swipe past the threshold locks the axis and advances', async () => {
    vi.useFakeTimers();
    const el = await make();
    track(el).dispatchEvent(touch('touchstart', [{ clientX: 200, clientY: 50 }]));
    vi.advanceTimersByTime(25);
    const move = touch('touchmove', [{ clientX: 120, clientY: 52 }]);
    const outer = vi.fn();
    el.addEventListener('touchmove', outer);
    track(el).dispatchEvent(move);
    expect(move.defaultPrevented).toBe(true);
    expect(outer).not.toHaveBeenCalled(); // stopped for nested carousels
    expect(inertCells(el)).toEqual([false, false, false]);

    const end = touch('touchend', []);
    track(el).dispatchEvent(end);
    expect(end.defaultPrevented).toBe(true);
    expect(el.index).toBe(1);
    await flush(el);
    expect(inertCells(el)).toEqual([true, false, true]);
  });

  it('a short swipe snaps back to the current slide', async () => {
    vi.useFakeTimers();
    const el = await make();
    track(el).dispatchEvent(touch('touchstart', [{ clientX: 200, clientY: 50 }]));
    vi.advanceTimersByTime(25);
    track(el).dispatchEvent(touch('touchmove', [{ clientX: 180, clientY: 50 }]));
    track(el).dispatchEvent(touch('touchend', []));
    expect(el.index).toBe(0);
  });

  it('a mostly-vertical gesture leaves native scrolling alone', async () => {
    vi.useFakeTimers();
    const el = await make();
    track(el).dispatchEvent(touch('touchstart', [{ clientX: 200, clientY: 50 }]));
    vi.advanceTimersByTime(25);
    const move = touch('touchmove', [{ clientX: 195, clientY: 150 }]);
    track(el).dispatchEvent(move);
    expect(move.defaultPrevented).toBe(false);
    const end = touch('touchend', []);
    track(el).dispatchEvent(end);
    expect(end.defaultPrevented).toBe(false);
  });

  it('multi-touch starts no gesture, and a move without touches is ignored', async () => {
    vi.useFakeTimers();
    const el = await make();
    track(el).dispatchEvent(touch('touchstart', [{ clientX: 0, clientY: 0 }, { clientX: 50, clientY: 0 }]));
    vi.advanceTimersByTime(25);
    const move = touch('touchmove', []);
    track(el).dispatchEvent(move);
    expect(move.defaultPrevented).toBe(false);
    const locked = touch('touchmove', [{ clientX: 300, clientY: 0 }]);
    track(el).dispatchEvent(locked);
    expect(locked.defaultPrevented).toBe(false);
    expect(el.index).toBe(0);
  });

  it('touchcancel abandons the drag, stays put and restores inert', async () => {
    vi.useFakeTimers();
    const el = await make();
    const changes = vi.fn();
    el.addEventListener('slide-change', changes);
    track(el).dispatchEvent(touch('touchstart', [{ clientX: 200, clientY: 50 }]));
    vi.advanceTimersByTime(25);
    track(el).dispatchEvent(touch('touchmove', [{ clientX: 100, clientY: 50 }]));
    expect(inertCells(el)).toEqual([false, false, false]);
    track(el).dispatchEvent(touch('touchcancel', []));
    track(el).dispatchEvent(touch('touchend', []));
    expect(el.index).toBe(0);
    expect(changes).not.toHaveBeenCalled();
    expect(inertCells(el)).toEqual([false, true, true]);
  });

  it('disconnecting mid-drag lifts the drag suspension and clears every inert it wrote', async () => {
    vi.useFakeTimers();
    const el = await make();
    track(el).dispatchEvent(touch('touchstart', [{ clientX: 200, clientY: 50 }]));
    vi.advanceTimersByTime(25);
    track(el).dispatchEvent(touch('touchmove', [{ clientX: 100, clientY: 50 }]));
    el.remove();
    expect(inertCells(el)).toEqual([false, false, false]);
  });

  it('reconnecting re-declares the hidden slides as inert (they must not stay focusable)', async () => {
    const el = await make();
    el.next();
    await flush(el);
    el.remove();
    document.body.appendChild(el);
    expect(inertCells(el)).toEqual([true, false, true]);
  });
});

describe('mp-carousel pointer and keyboard controls', () => {
  it('indicator and prev/next label clicks navigate through the machine', async () => {
    const el = await make({ indicators: '' });
    const indicators = [...shadow(el).querySelectorAll<HTMLElement>('.carousel-indicators label')];
    const click = indicators[2].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(click).toBe(false); // default prevented: the label must not flip its radio
    expect(el.index).toBe(2);

    shadow(el).querySelector<HTMLElement>('.ctl-next-2')!.click();
    expect(el.index).toBe(0); // wrapped forward, not rewound
    shadow(el).querySelector<HTMLElement>('.ctl-prev-0')!.click();
    expect(el.index).toBe(2);
  });

  it('a radio change (arrow keys on the radio group) moves to that slide', async () => {
    const el = await make();
    const radios = [...shadow(el).querySelectorAll<HTMLInputElement>('.car-radio')];
    radios[1].checked = true;
    radios[1].dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.index).toBe(1);
    // Changing to the already-current radio is a no-op.
    const changes = vi.fn();
    el.addEventListener('slide-change', changes);
    radios[1].dispatchEvent(new Event('change', { bubbles: true }));
    expect(changes).not.toHaveBeenCalled();
  });

  it('keyboard-events="false" ignores viewport keys, and unmapped keys pass through', async () => {
    const el = await make();
    const press = (key: string) => {
      const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      inner(el).dispatchEvent(ev);
      return ev;
    };
    expect(press('a').defaultPrevented).toBe(false);
    el.setAttribute('keyboard-events', 'false');
    expect(press('ArrowRight').defaultPrevented).toBe(false);
    expect(el.index).toBe(0);
  });

  it('re-stamps a slide whose slot attribute a framework dropped', async () => {
    const el = await make({ interval: '1000' });
    el.children[1].removeAttribute('slot');
    const btn = document.createElement('button');
    btn.setAttribute('slot', 'play-pause');
    el.appendChild(btn);
    await flush(el);
    expect(slots(el)).toEqual(['s0', 's1', 's2', 'play-pause']);
  });

  it('a consumer play-pause element replaces the default button even without an interval', async () => {
    const el = await make();
    const btn = document.createElement('button');
    btn.setAttribute('slot', 'play-pause');
    el.appendChild(btn);
    await flush(el);
    expect(shadow(el).querySelector('slot[name="play-pause"]')).not.toBeNull();
  });
});

describe('mp-carousel interval and paused properties', () => {
  it('interval reflects positive numbers and removes the attribute otherwise', async () => {
    const el = await make();
    el.interval = 750;
    expect(el.getAttribute('interval')).toBe('750');
    expect(el.interval).toBe(750);
    el.interval = 'abc';
    expect(el.hasAttribute('interval')).toBe(false);
    el.interval = 300;
    el.interval = 0;
    expect(el.hasAttribute('interval')).toBe(false);
    expect(el.interval).toBe(0);
  });

  it('paused property writes reflect silently', async () => {
    const el = await make();
    const spy = vi.fn();
    el.addEventListener('paused-change', spy);
    el.paused = true;
    expect(el.hasAttribute('paused')).toBe(true);
    el.paused = 'true';
    el.paused = false;
    expect(el.hasAttribute('paused')).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('mp-carousel autoplay suspension', () => {
  it('hovering suspends rotation and leaving resumes it, without touching paused', async () => {
    vi.useFakeTimers();
    const el = await make({ interval: '500' });
    el.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(1500);
    expect(el.index).toBe(0);
    expect(el.paused).toBe(false);
    el.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(500);
    expect(el.index).toBe(1);
  });

  it('focus inside suspends rotation until focus leaves the carousel entirely', async () => {
    vi.useFakeTimers();
    const el = await make({ interval: '500' });
    const outside = document.createElement('button');
    document.body.appendChild(outside);

    el.dispatchEvent(new FocusEvent('focusin'));
    vi.advanceTimersByTime(600);
    expect(el.index).toBe(0);

    // Focus moving between the carousel's own parts keeps it suspended.
    el.dispatchEvent(new FocusEvent('focusout', { relatedTarget: el.children[1] }));
    el.dispatchEvent(new FocusEvent('focusout', { relatedTarget: inner(el) }));
    el.dispatchEvent(new FocusEvent('focusout', { relatedTarget: el }));
    vi.advanceTimersByTime(600);
    expect(el.index).toBe(0);

    el.dispatchEvent(new FocusEvent('focusout', { relatedTarget: outside }));
    vi.advanceTimersByTime(500);
    expect(el.index).toBe(1);
  });

  it('a disconnected carousel stops rotating', async () => {
    vi.useFakeTimers();
    const el = await make({ interval: '500' });
    el.remove();
    vi.advanceTimersByTime(2000);
    expect(el.index).toBe(0);
  });
});

describe('mp-carousel reduced motion', () => {
  it('never auto-rotates and navigates without animating while reduced motion is preferred', async () => {
    vi.useFakeTimers();
    stubReducedMotion(true);
    const el = await make({ interval: '500' });
    const { animate } = stubAnimate(el);
    vi.advanceTimersByTime(2000);
    expect(el.index).toBe(0);
    el.next();
    expect(el.index).toBe(1);
    expect(animate).not.toHaveBeenCalled();
  });

  it('turning reduced motion off at runtime starts rotation and re-renders aria-live', async () => {
    vi.useFakeTimers();
    const mql = stubReducedMotion(true);
    const el = await make({ interval: '500' });
    expect(inner(el).getAttribute('aria-live')).toBe('polite');
    mql.matches = false;
    mql.fire();
    await flush(el);
    expect(inner(el).getAttribute('aria-live')).toBe('off');
    vi.advanceTimersByTime(500);
    expect(el.index).toBe(1);
  });

  it('stops listening for preference changes once disconnected', async () => {
    const mql = stubReducedMotion(true);
    const remove = vi.spyOn(mql, 'removeEventListener');
    const el = await make();
    el.remove();
    expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
