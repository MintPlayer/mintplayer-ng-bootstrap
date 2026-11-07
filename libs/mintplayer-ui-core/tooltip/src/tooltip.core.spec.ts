import { applyBag, el, hostCore, patchBag } from '../../_conformance/host-core';
import { connectTooltipPanel, TOOLTIP_HIDE_DELAY_MS, tooltipCore, tooltipPanelCore, type TooltipProps } from './tooltip.core';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
const box = (top: number, height: number) => ({ left: 100, top, width: 80, height, right: 180, bottom: top + height, x: 100, y: top, toJSON: () => ({}) }) as DOMRect;

/** The trigger's top, by test: at the top of the viewport the tooltip flips below it. */
let triggerTop = 300;

beforeEach(() => {
  triggerTop = 300;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return this.classList.contains('tooltip') ? box(0, 30) : box(triggerTop, 20);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function mount() {
  let panel: HTMLElement | null = null;
  const sync = ({ anchor, overlay }: TooltipProps, host: HTMLElement) => {
    host.removeAttribute('aria-describedby');
    applyBag(host, anchor);
    if (!overlay) {
      panel?.remove();
      panel = null;
      return undefined;
    }
    const view = connectTooltipPanel(overlay);
    panel ??= document.body.appendChild(el('div', view.root, el('div', view.inner, 'Tip')));
    patchBag(panel, view.root);
    return undefined;
  };
  const host = document.body.appendChild(el('button', { 'aria-describedby': 'hint' }, 'Save'));
  const h = hostCore(tooltipCore, { position: 'top' }, { host, markup: sync });
  // Attached before any render: the core reads the consumer's own description first.
  h.attach(false);
  const update = async () => {
    h.render();
    await tick();
    h.render();
  };
  return { ...h, update, panel: () => panel };
}

describe('tooltip views', () => {
  it('renders the panel on its side, top for an unknown one', () => {
    expect(connectTooltipPanel({ overlayId: 't', side: 'bogus' as never, phase: 'shown' }).root).toEqual({
      'data-mp-phase': 'shown',
      hidden: false,
      class: 'tooltip bs-tooltip-top fade show',
      role: 'tooltip',
      id: 't',
    });
    expect(hostCore(tooltipPanelCore, { overlayId: '', side: 'end', phase: 'closed' }).props().view.root['id']).toBeNull();
  });
});

describe('tooltipCore', () => {
  it('shows on hover, describes the trigger alongside its own description, and hides after a delay', async () => {
    const h = mount();
    h.host.dispatchEvent(new MouseEvent('mouseenter'));
    await h.update();
    expect(h.state().phase).toBe('shown');
    expect(h.host.getAttribute('aria-describedby')).toBe('hint mp-test-tooltip');
    h.host.dispatchEvent(new MouseEvent('mouseleave'));
    // The pointer reaches the tooltip in time: it stays, until the pointer leaves it.
    h.panel()!.dispatchEvent(new MouseEvent('mouseenter'));
    await wait(TOOLTIP_HIDE_DELAY_MS + 20);
    expect(h.state().phase).toBe('shown');
    h.panel()!.dispatchEvent(new MouseEvent('mouseleave'));
    await wait(TOOLTIP_HIDE_DELAY_MS + 20);
    await h.update();
    expect(h.state().phase).toBe('closed');
    expect(h.host.getAttribute('aria-describedby')).toBe('hint');
  });

  it('shows on focus, flips below at the top of the viewport, and hides on blur or Escape', async () => {
    triggerTop = 5;
    const h = mount();
    h.host.focus();
    await h.update();
    expect(h.state().side).toBe('bottom');
    triggerTop = 300;
    window.dispatchEvent(new Event('resize'));
    await frame();
    expect(h.state().side).toBe('top');
    h.host.blur();
    await h.update();
    expect(h.state().phase).toBe('closed');

    h.host.dispatchEvent(new MouseEvent('mouseenter'));
    await h.update();
    window.dispatchEvent(new Event('blur'));
    await h.update();
    expect(h.state().phase).toBe('closed');

    h.host.dispatchEvent(new MouseEvent('mouseenter'));
    await h.update();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await h.update();
    expect(h.state().phase).toBe('closed');
    expect(document.activeElement).toBe(document.body);
  });

  it('cancels a pending hide when disposed', async () => {
    const h = mount();
    h.host.dispatchEvent(new MouseEvent('mouseenter'));
    await h.update();
    h.host.dispatchEvent(new MouseEvent('mouseleave'));
    h.dispose();
    await wait(TOOLTIP_HIDE_DELAY_MS + 20);
    expect(h.state().phase).not.toBe('closed');
  });
});
