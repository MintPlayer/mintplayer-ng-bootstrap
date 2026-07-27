import { afterEach, describe, expect, it, vi } from 'vitest';
import { MpCarousel } from './mp-carousel';
import type { CarouselPausedChangeEventDetail, CarouselSlideChangeEventDetail } from '../types';

void MpCarousel; // force the side-effect registration

async function flush(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

interface MakeOptions {
  attrs?: Record<string, string>;
  slides?: number;
  heights?: number[];
}

async function make({ attrs = {}, slides = 3, heights }: MakeOptions = {}): Promise<MpCarousel> {
  const el = document.createElement('mp-carousel') as MpCarousel;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  for (let i = 0; i < slides; i++) {
    const slide = document.createElement('div');
    slide.textContent = `slide ${i}`;
    if (heights) {
      Object.defineProperty(slide, 'offsetHeight', { value: heights[i] ?? 0, configurable: true });
    }
    el.appendChild(slide);
  }
  document.body.appendChild(el);
  await flush(el);
  return el;
}

const shadow = (el: MpCarousel) => el.shadowRoot!;
const cells = (el: MpCarousel) => [...shadow(el).querySelectorAll<HTMLElement>('.carousel-item[data-i]')];
const radios = (el: MpCarousel) => [...shadow(el).querySelectorAll<HTMLInputElement>('.car-radio')];
const inner = (el: MpCarousel) => shadow(el).querySelector<HTMLElement>('.carousel-inner')!;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-carousel projection', () => {
  it('stamps slot="sN" onto every slide and projects each into its own cell', async () => {
    const el = await make();
    expect([...el.children].map((c) => c.getAttribute('slot'))).toEqual(['s0', 's1', 's2']);
    expect(cells(el)).toHaveLength(3);
    cells(el).forEach((cell, i) => {
      const slot = cell.querySelector('slot') as HTMLSlotElement;
      expect(slot.name).toBe(`s${i}`);
      expect(slot.assignedElements()).toEqual([el.children[i]]);
    });
  });

  it('reacts to slides being added and removed', async () => {
    const el = await make();
    const extra = document.createElement('div');
    el.appendChild(extra);
    await flush(el);
    expect(cells(el)).toHaveLength(4);
    expect(extra.getAttribute('slot')).toBe('s3');

    el.removeChild(el.children[0]);
    await flush(el);
    expect(cells(el)).toHaveLength(3);
    expect([...el.children].map((c) => c.getAttribute('slot'))).toEqual(['s0', 's1', 's2']);
  });

  it('does not treat play-pause slotted content as a slide', async () => {
    const el = await make({ attrs: { interval: '1000' } });
    const btn = document.createElement('button');
    btn.setAttribute('slot', 'play-pause');
    el.appendChild(btn);
    await flush(el);
    expect(cells(el)).toHaveLength(3);
    expect(btn.getAttribute('slot')).toBe('play-pause');
  });

  it('gives the first slide image fetchpriority=high, the rest low', async () => {
    const el = document.createElement('mp-carousel') as MpCarousel;
    for (let i = 0; i < 3; i++) {
      const img = document.createElement('img');
      el.appendChild(img);
    }
    document.body.appendChild(el);
    await flush(el);
    expect([...el.children].map((c) => c.getAttribute('fetchpriority'))).toEqual(['high', 'low', 'low']);
  });
});

describe('mp-carousel ARIA contract', () => {
  it('the host is the labelled carousel region', async () => {
    const el = await make({ attrs: { 'aria-label': 'Animal photos' } });
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-roledescription')).toBe('carousel');
    expect(el.getAttribute('aria-label')).toBe('Animal photos');
  });

  it('every slide cell is a labelled group; only the active one is exposed', async () => {
    const el = await make();
    cells(el).forEach((cell, i) => {
      expect(cell.getAttribute('role')).toBe('group');
      expect(cell.getAttribute('aria-roledescription')).toBe('slide');
      expect(cell.getAttribute('aria-label')).toBe(`${i + 1} of 3`);
      expect(cell.getAttribute('aria-hidden')).toBe(i === 0 ? null : 'true');
    });
    el.next();
    await flush(el);
    expect(cells(el)[0].getAttribute('aria-hidden')).toBe('true');
    expect(cells(el)[1].getAttribute('aria-hidden')).toBeNull();
  });

  it('wrap cells are aria-hidden and unlabelled', async () => {
    const el = await make();
    const clones = [...shadow(el).querySelectorAll('.carousel-clone')];
    expect(clones).toHaveLength(2);
    clones.forEach((c) => {
      expect(c.getAttribute('aria-hidden')).toBe('true');
      expect(c.getAttribute('aria-label')).toBeNull();
    });
  });

  it('the viewport carries tabindex, orientation and keyshortcuts', async () => {
    const el = await make();
    expect(inner(el).getAttribute('tabindex')).toBe('0');
    expect(inner(el).getAttribute('aria-orientation')).toBe('horizontal');
    expect(inner(el).getAttribute('aria-keyshortcuts')).toBe('ArrowLeft ArrowRight Home End');

    el.setAttribute('orientation', 'vertical');
    await flush(el);
    expect(inner(el).getAttribute('aria-orientation')).toBe('vertical');
    expect(inner(el).getAttribute('aria-keyshortcuts')).toBe('ArrowUp ArrowDown Home End');

    el.setAttribute('keyboard-events', 'false');
    await flush(el);
    expect(inner(el).hasAttribute('aria-keyshortcuts')).toBe(false);
  });

  it('aria-live: polite without autoplay, off while rotating, polite when paused', async () => {
    const el = await make();
    expect(inner(el).getAttribute('aria-live')).toBe('polite');

    el.setAttribute('interval', '1000');
    await flush(el);
    expect(inner(el).getAttribute('aria-live')).toBe('off');

    el.setAttribute('paused', '');
    await flush(el);
    expect(inner(el).getAttribute('aria-live')).toBe('polite');
  });

  it('indicators are radio labels with aria-current on the active slide', async () => {
    const el = await make({ attrs: { indicators: '' } });
    const labels = [...shadow(el).querySelectorAll('.carousel-indicators label')];
    expect(labels).toHaveLength(3);
    expect(labels[0].getAttribute('aria-current')).toBe('true');
    expect(labels[1].getAttribute('aria-current')).toBeNull();
    expect(labels[0].getAttribute('aria-label')).toBe('Slide 1');
  });
});

describe('mp-carousel navigation', () => {
  it('next/previous/goto commit, sync the radios, and emit slide-change', async () => {
    const el = await make();
    const events: number[] = [];
    el.addEventListener('slide-change', (e) =>
      events.push((e as CustomEvent<CarouselSlideChangeEventDetail>).detail.index));

    el.next();
    await flush(el);
    expect(el.index).toBe(1);
    expect(radios(el).map((r) => r.checked)).toEqual([false, true, false]);

    el.previous();
    el.goto(2);
    await flush(el);
    expect(el.index).toBe(2);
    expect(events).toEqual([1, 0, 2]);
  });

  it('wraps by default and honours wrap="false" on every input path', async () => {
    const el = await make();
    el.previous();
    expect(el.index).toBe(2);

    el.setAttribute('wrap', 'false');
    el.next();
    expect(el.index).toBe(2); // edge: silent no-op

    const keydown = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(keydown, 'target', { value: inner(el) });
    inner(el).dispatchEvent(keydown);
    expect(el.index).toBe(2);
  });

  it('the index setter jumps without animation events', async () => {
    const el = await make();
    let animations = 0;
    el.addEventListener('animation-start', () => animations++);
    el.index = 2;
    await flush(el);
    expect(el.index).toBe(2);
    expect(animations).toBe(0);
  });

  it('viewport arrow keys navigate; cross-axis arrows do not', async () => {
    const el = await make();
    const press = (key: string) => {
      const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      inner(el).dispatchEvent(ev);
      return ev;
    };
    expect(press('ArrowRight').defaultPrevented).toBe(true);
    expect(el.index).toBe(1);
    expect(press('ArrowDown').defaultPrevented).toBe(false);
    expect(el.index).toBe(1);
    press('End');
    expect(el.index).toBe(2);
    press('Home');
    expect(el.index).toBe(0);
  });

  it('keys from focusable slide content do not navigate (APG target guard)', async () => {
    const el = await make();
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    // Dispatch from a child of the viewport, not the viewport itself.
    shadow(el).querySelector('.carousel-track')!.dispatchEvent(ev);
    expect(el.index).toBe(0);
  });
});

describe('mp-carousel autoplay + play/pause', () => {
  it('renders no play/pause without an interval, and the APG control with one', async () => {
    const noInterval = await make();
    expect(shadow(noInterval).querySelector('.carousel-play-pause')).toBeNull();

    const withInterval = await make({ attrs: { interval: '2000' } });
    const btn = shadow(withInterval).querySelector('.carousel-play-pause-btn')!;
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.querySelector('.carousel-play-pause-icon')).not.toBeNull();
  });

  it('auto-advances on the interval and stops while paused', async () => {
    vi.useFakeTimers();
    try {
      const el = await make({ attrs: { interval: '500' } });
      vi.advanceTimersByTime(1100);
      expect(el.index).toBe(2);

      el.pause();
      vi.advanceTimersByTime(2000);
      expect(el.index).toBe(2);

      el.play();
      vi.advanceTimersByTime(500);
      expect(el.index).toBe(0); // wrapped
    } finally {
      vi.useRealTimers();
    }
  });

  it('the default button toggles paused and emits paused-change once', async () => {
    const el = await make({ attrs: { interval: '2000' } });
    const events: boolean[] = [];
    el.addEventListener('paused-change', (e) =>
      events.push((e as CustomEvent<CarouselPausedChangeEventDetail>).detail.paused));

    (shadow(el).querySelector('.carousel-play-pause-btn') as HTMLButtonElement).click();
    await flush(el);
    expect(el.paused).toBe(true);
    expect(shadow(el).querySelector('.carousel-play-pause-btn')!.getAttribute('aria-pressed')).toBe('true');
    expect(events).toEqual([true]);
  });

  it('a consumer writing the paused attribute does not echo paused-change', async () => {
    const el = await make({ attrs: { interval: '2000' } });
    const spy = vi.fn();
    el.addEventListener('paused-change', spy);
    el.setAttribute('paused', '');
    await flush(el);
    expect(el.paused).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('mp-carousel height contract', () => {
  it('horizontal: the viewport tracks the CURRENT slide height', async () => {
    const el = await make({ heights: [120, 300, 80] });
    expect(el.style.getPropertyValue('--mp-carousel-viewport-height')).toBe('120px');
    el.next();
    await flush(el);
    expect(el.style.getPropertyValue('--mp-carousel-viewport-height')).toBe('300px');
  });

  it('vertical: viewport and cells pin to the MAX slide height, always', async () => {
    const el = await make({ attrs: { orientation: 'vertical' }, heights: [120, 300, 80] });
    expect(el.style.getPropertyValue('--mp-carousel-viewport-height')).toBe('300px');
    expect(el.style.getPropertyValue('--mp-carousel-slide-height')).toBe('300px');
    el.next();
    await flush(el);
    expect(el.style.getPropertyValue('--mp-carousel-viewport-height')).toBe('300px');
  });

  it('invalid (≤10px) measurements never set the properties', async () => {
    const el = await make({ heights: [0, 0, 0] });
    expect(el.style.getPropertyValue('--mp-carousel-viewport-height')).toBe('');
  });

  it('the max can SHRINK when the tallest slide is removed (anti-ratchet)', async () => {
    const el = await make({ attrs: { orientation: 'vertical' }, heights: [120, 300, 80] });
    el.removeChild(el.children[1]);
    await flush(el);
    expect(el.style.getPropertyValue('--mp-carousel-slide-height')).toBe('120px');
  });
});

describe('mp-carousel modes', () => {
  it('fade drives an .active cell instead of a track transform', async () => {
    const el = await make({ attrs: { animation: 'fade' } });
    expect(cells(el)[0].classList.contains('active')).toBe(true);
    el.next();
    await flush(el);
    // fade transitions settle on a 500ms timer; force-settle via a second nav
    el.goto(1, { animate: false });
    await flush(el);
    expect(cells(el)[1].classList.contains('active')).toBe(true);
    const track = shadow(el).querySelector<HTMLElement>('.carousel-track')!;
    expect(track.style.transform).toBe('');
  });

  it('slide mode parks the track at translate3d(-(index+1) * 100%)', async () => {
    const el = await make();
    const track = shadow(el).querySelector<HTMLElement>('.carousel-track')!;
    expect(track.style.transform).toBe('translate3d(-100%, 0, 0)');
    el.index = 2;
    await flush(el);
    expect(track.style.transform).toBe('translate3d(-300%, 0, 0)');
  });

  it('hot-swapping animation and orientation on a live instance keeps working', async () => {
    const el = await make({ heights: [100, 200, 150] });
    el.setAttribute('animation', 'fade');
    await flush(el);
    el.next();
    el.setAttribute('animation', 'slide');
    el.setAttribute('orientation', 'vertical');
    await flush(el);
    el.next();
    expect(el.index).toBe(2);
    expect(el.style.getPropertyValue('--mp-carousel-slide-height')).toBe('200px');
  });
});

describe('mp-carousel reconnect', () => {
  it('keeps navigating after a disconnect/reconnect cycle', async () => {
    const el = await make();
    const parent = el.parentElement!;
    el.remove();
    parent.appendChild(el);
    await flush(el);
    el.next();
    expect(el.index).toBe(1);
    expect([...el.children].map((c) => c.getAttribute('slot'))).toEqual(['s0', 's1', 's2']);
  });
});
