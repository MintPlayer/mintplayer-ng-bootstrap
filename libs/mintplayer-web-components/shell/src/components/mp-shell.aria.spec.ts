import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deepActiveElement } from '@mintplayer/web-components/a11y';
import { MpShell } from './mp-shell';

void MpShell; // force the side-effect registration

/**
 * ARIA surface of `<mp-shell>` — the element had no spec at all.
 *
 * Only the HYDRATED (JS) tier is asserted: the no-JS tier is a pure CSS state
 * machine and jsdom has no cascade. That same gap reaches the JS tier here,
 * because `aria-expanded` mirrors the *resolved* open state which the component
 * reads back out of the `--mp-shell-open` / `--mp-shell-wide` levers that CSS
 * computed. So `getComputedStyle` is stubbed for `.sidebar-root` with a faithful
 * model of the stylesheet's matrix (shell.styles.scss §"open/closed state
 * matrix"): an explicit `state` wins and is viewport-independent; in `auto` the
 * checkbox INVERTS the responsive default, i.e. wide ⇒ open = !checked, narrow
 * ⇒ open = checked. Asserting against that model is the point — the trap this
 * covers is `aria-expanded` mirroring the raw `checked`, which announces the
 * exact opposite of the truth in wide mode.
 */
interface CssLevers {
  wide: boolean;
}

const levers: CssLevers = { wide: true };
let realGetComputedStyle: typeof window.getComputedStyle;

function resolvedOpen(host: MpShell): boolean {
  const state = host.getAttribute('state');
  if (state === 'show') return true;
  if (state === 'hide') return false;
  const checked = host.shadowRoot?.querySelector<HTMLInputElement>('.shell-toggle')?.checked ?? false;
  return levers.wide ? !checked : checked;
}

async function mount(attrs = ''): Promise<MpShell> {
  document.body.innerHTML = `<mp-shell ${attrs}><nav slot="sidebar"><a href="/a">A</a></nav><main>Body</main></mp-shell>`;
  const el = document.querySelector('mp-shell') as MpShell;
  await el.updateComplete;
  return el;
}

/** Absorb the rAF-coalesced resize handler. */
async function frame(): Promise<void> {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

const shadow = (el: MpShell) => el.shadowRoot!;
const toggle = (el: MpShell) => shadow(el).querySelector<HTMLInputElement>('.shell-toggle')!;
const sidebar = (el: MpShell) => shadow(el).querySelector<HTMLElement>('.sidebar')!;

beforeEach(() => {
  levers.wide = true;
  realGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = ((element: Element, pseudo?: string | null) => {
    if (element instanceof HTMLElement && element.classList.contains('sidebar-root')) {
      const host = (element.getRootNode() as ShadowRoot).host as MpShell;
      return {
        getPropertyValue: (property: string) => {
          if (property === '--mp-shell-open') return resolvedOpen(host) ? '1' : '0';
          if (property === '--mp-shell-wide') return levers.wide ? '1' : '0';
          return '';
        },
      } as unknown as CSSStyleDeclaration;
    }
    return realGetComputedStyle.call(window, element, pseudo ?? undefined);
  }) as typeof window.getComputedStyle;
});

afterEach(() => {
  window.getComputedStyle = realGetComputedStyle;
  document.body.innerHTML = '';
});

describe('mp-shell landmarks and names', () => {
  it('exposes the three frame landmarks, with the sidebar named', async () => {
    const el = await mount();
    expect(shadow(el).querySelector('.topbar')!.getAttribute('role')).toBe('banner');
    expect(shadow(el).querySelector('.content')!.getAttribute('role')).toBe('main');
    expect(sidebar(el).tagName).toBe('ASIDE');
    expect(sidebar(el).getAttribute('aria-label')).toBe('Sidebar');
  });

  it('names the toggle and points its aria-controls at the sidebar in the SAME root', async () => {
    const el = await mount();
    const input = toggle(el);
    expect(input.getAttribute('aria-label')).toBe('Toggle sidebar');

    // An IDREF resolves only inside the tree of the element HOLDING it: the
    // input lives in the shadow root, so that is where the id must exist.
    const id = input.getAttribute('aria-controls')!;
    const root = input.getRootNode() as ShadowRoot;
    expect(root.getElementById(id)).toBe(sidebar(el));
  });

  it('never copies host IDREF strings inward, and keeps the sidebar name when the host is labelled', async () => {
    const el = await mount('aria-label="Docs shell" aria-labelledby="outer" aria-describedby="outer"');
    document.body.insertAdjacentHTML('afterbegin', '<span id="outer">App</span>');
    await el.updateComplete;
    expect(shadow(el).querySelector('[aria-labelledby], [aria-describedby]')).toBeNull();
    expect(sidebar(el).getAttribute('aria-label')).toBe('Sidebar');
  });
});

describe('mp-shell aria-expanded on the toggle', () => {
  it('upgrades the checkbox to a button and publishes aria-expanded once hydrated', async () => {
    const el = await mount();
    expect(el.hasAttribute('data-js')).toBe(true);
    expect(toggle(el).getAttribute('role')).toBe('button');
    expect(toggle(el).hasAttribute('aria-expanded')).toBe(true);
  });

  it('reports the RESOLVED open state, not the raw checked, in wide auto mode', async () => {
    const el = await mount('breakpoint="md"');
    // Wide default: an UNCHECKED box means the sidebar is open.
    expect(toggle(el).checked).toBe(false);
    expect(toggle(el).getAttribute('aria-expanded')).toBe('true');
  });

  it('follows a programmatic state attribute write, in both directions', async () => {
    const el = await mount('breakpoint="md"');

    el.setAttribute('state', 'hide');
    await el.updateComplete;
    expect(toggle(el).getAttribute('aria-expanded')).toBe('false');

    el.setAttribute('state', 'show');
    await el.updateComplete;
    expect(toggle(el).getAttribute('aria-expanded')).toBe('true');

    el.setAttribute('state', 'hide');
    await el.updateComplete;
    expect(toggle(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('follows toggle(force) in narrow mode, in both directions', async () => {
    levers.wide = false;
    const el = await mount('breakpoint="md"');
    expect(toggle(el).getAttribute('aria-expanded')).toBe('false');

    el.toggle(true);
    expect(toggle(el).getAttribute('aria-expanded')).toBe('true');

    el.toggle(false);
    expect(toggle(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('follows a user change on the checkbox itself', async () => {
    levers.wide = false;
    const el = await mount('breakpoint="md"');
    const input = toggle(el);

    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(input.getAttribute('aria-expanded')).toBe('true');

    input.checked = false;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('follows a breakpoint crossing, which flips the resolved state with no toggle event', async () => {
    const el = await mount('breakpoint="md"');
    let events = 0;
    el.addEventListener('statechange', () => events++);
    expect(toggle(el).getAttribute('aria-expanded')).toBe('true'); // wide default: open

    levers.wide = false; // viewport shrank past the breakpoint
    window.dispatchEvent(new Event('resize'));
    await frame();
    expect(toggle(el).getAttribute('aria-expanded')).toBe('false');

    levers.wide = true;
    window.dispatchEvent(new Event('resize'));
    await frame();
    expect(toggle(el).getAttribute('aria-expanded')).toBe('true');
    expect(events).toBe(0);
  });

  it('is controlled under an explicit state: the change event asks, the state answers', async () => {
    const el = await mount('state="show"');
    const opens: boolean[] = [];
    el.addEventListener('statechange', (e) => opens.push((e as CustomEvent<{ open: boolean }>).detail.open));
    expect(toggle(el).getAttribute('aria-expanded')).toBe('true');

    toggle(el).dispatchEvent(new Event('change', { bubbles: true }));
    expect(opens).toEqual([false]);

    // The consumer owns `state`; aria-expanded follows once it is applied.
    el.setAttribute('state', 'hide');
    await el.updateComplete;
    expect(toggle(el).getAttribute('aria-expanded')).toBe('false');
  });
});

describe('mp-shell skip link', () => {
  it('renders only in the JS tier and moves focus into the content region', async () => {
    const el = await mount();
    const link = shadow(el).querySelector<HTMLAnchorElement>('.skip-link')!;
    expect(link).not.toBeNull();

    const content = shadow(el).querySelector<HTMLElement>('.content')!;
    // 0, not -1: .content is the scroll container, and a scrollable region
    // must be keyboard-reachable (axe scrollable-region-focusable).
    expect(content.getAttribute('tabindex')).toBe('0');

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(deepActiveElement()).toBe(content);
  });
});

describe('mp-shell dismiss-on-navigate', () => {
  async function mountNarrowOpen(attrs = 'dismiss-on-navigate', sidebarHtml = '<a href="/a" id="lnk">A</a>'): Promise<{ el: MpShell; events: boolean[] }> {
    levers.wide = false;
    document.body.innerHTML = `<mp-shell ${attrs}><nav slot="sidebar">${sidebarHtml}</nav><main><a href="/c" id="content-link">C</a></main></mp-shell>`;
    const el = document.querySelector('mp-shell') as MpShell;
    await el.updateComplete;
    el.toggle(true);
    const events: boolean[] = [];
    el.addEventListener('statechange', (e) => events.push((e as CustomEvent<{ open: boolean }>).detail.open));
    return { el, events };
  }
  const click = (el: MpShell, sel: string) => (el.querySelector(sel) as HTMLElement).click();

  it('closes the narrow overlay drawer when a sidebar link is clicked', async () => {
    const { el, events } = await mountNarrowOpen();
    click(el, '#lnk');
    expect(events).toEqual([false]);
    expect(el.open).toBe(false);
    expect(toggle(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('does nothing without the dismiss-on-navigate opt-in', async () => {
    const { el, events } = await mountNarrowOpen('');
    click(el, '#lnk');
    expect(events).toEqual([]);
    expect(el.open).toBe(true);
  });

  it('does nothing in wide mode, where the sidebar pushes content', async () => {
    const { el, events } = await mountNarrowOpen();
    levers.wide = true;
    click(el, '#lnk');
    expect(events).toEqual([]);
  });

  it('ignores clicks outside the sidebar slot', async () => {
    const { el, events } = await mountNarrowOpen();
    click(el, '#content-link');
    expect(events).toEqual([]);
  });

  it('ignores a link carrying data-no-dismiss, or inside a wrapper that does', async () => {
    const { el, events } = await mountNarrowOpen(
      'dismiss-on-navigate',
      '<a href="/x" id="own" data-no-dismiss>X</a><div data-no-dismiss><a href="/y" id="wrapped">Y</a></div>',
    );
    click(el, '#own');
    click(el, '#wrapped');
    expect(events).toEqual([]);
  });

  it('ignores href-less anchors and non-link sidebar content', async () => {
    const { el, events } = await mountNarrowOpen('dismiss-on-navigate', '<a id="nohref">N</a><span id="txt">T</span>');
    click(el, '#nohref');
    click(el, '#txt');
    expect(events).toEqual([]);
  });

  it('does not emit when the drawer is already closed', async () => {
    const { el, events } = await mountNarrowOpen();
    el.toggle(false);
    events.length = 0;
    click(el, '#lnk');
    expect(events).toEqual([]);
  });

  it('stops dismissing once disconnected', async () => {
    const { el, events } = await mountNarrowOpen();
    el.remove();
    click(el, '#lnk');
    expect(events).toEqual([]);
  });
});

describe('mp-shell size, toggle and lifecycle', () => {
  it('maps size to --mp-shell-size and clears it on removal', async () => {
    const el = await mount('size="18rem"');
    expect(el.style.getPropertyValue('--mp-shell-size')).toBe('18rem');
    el.removeAttribute('size');
    expect(el.style.getPropertyValue('--mp-shell-size')).toBe('');
  });

  it('toggle() without a force flips the resolved state and emits it', async () => {
    const el = await mount();
    const events: boolean[] = [];
    el.addEventListener('statechange', (e) => events.push((e as CustomEvent<{ open: boolean }>).detail.open));
    el.toggle();
    el.toggle();
    expect(events).toEqual([false, true]);
  });

  it('reports closed and wide before it has rendered', () => {
    const el = document.createElement('mp-shell') as MpShell;
    expect(el.open).toBe(false);
    el.toggle(true); // no checkbox yet: only the event goes out
    expect(el.hasAttribute('data-js')).toBe(false);
  });

  it('coalesces resize bursts into one aria sync per frame', async () => {
    const el = await mount();
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    expect(raf).toHaveBeenCalledTimes(1);
    raf.mockRestore();
    await frame();
    expect(toggle(el).getAttribute('aria-expanded')).toBe('true');
  });

  it('cancels a pending resize frame and stops listening when disconnected', async () => {
    const el = await mount();
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    window.dispatchEvent(new Event('resize'));
    el.remove();
    expect(cancel).toHaveBeenCalledTimes(1);
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    window.dispatchEvent(new Event('resize'));
    expect(raf).not.toHaveBeenCalled();
    cancel.mockRestore();
    raf.mockRestore();
  });
});

describe('mp-shell DSD handoff', () => {
  function upgradeWithStaleShadow(tag: string, ctor: CustomElementConstructor): MpShell {
    const el = document.createElement(tag);
    const root = el.attachShadow({ mode: 'open' });
    const stale = document.createElement('p');
    stale.className = 'ssr-chrome';
    root.appendChild(stale);
    document.body.appendChild(el);
    customElements.define(tag, ctor);
    return el as MpShell;
  }

  it('clears the inert SSR chrome so the first render is not duplicated', async () => {
    const el = upgradeWithStaleShadow('mp-shell-dsd-plain', class extends MpShell {});
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.ssr-chrome')).toBeNull();
    expect(el.shadowRoot!.querySelectorAll('.shell-toggle')).toHaveLength(1);
  });

  it('defers to hydrate support when it observes defer-hydration', async () => {
    const el = upgradeWithStaleShadow(
      'mp-shell-dsd-hydrating',
      class extends MpShell {
        static override get observedAttributes(): string[] {
          return [...super.observedAttributes, 'defer-hydration'];
        }
      },
    );
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.ssr-chrome')).not.toBeNull();
  });
});
