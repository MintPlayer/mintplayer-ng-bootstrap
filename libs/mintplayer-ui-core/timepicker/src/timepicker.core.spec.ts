import { applyBag, el, hostCore } from '../../_conformance/host-core';
import type { TimeListView, TimepickerView } from './timepicker';
import { timeListCore, timepickerCore, type TimeListInputs, type TimepickerInputs } from './timepicker.core';
import { focusTimeSlot } from './timepicker.behaviour';

const at = (h: number, m: number) => new Date(2026, 0, 2, h, m);
const minutes = (d: Date | null) => (d ? d.getHours() * 60 + d.getMinutes() : null);
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

afterEach(() => document.body.replaceChildren());

const list = (view: TimeListView) =>
  el('div', view.root, el('ul', view.list, ...view.slots.map((s) => el('li', s.item, el('button', s.option, s.text)))));

describe('timeListCore', () => {
  const inputs = (o: Partial<TimeListInputs> = {}): TimeListInputs => ({
    selectedTime: at(9, 0),
    step: 30,
    minMinutes: 8 * 60,
    maxMinutes: 18 * 60,
    hour12: 'auto' as never,
    locale: 'en-GB',
    labels: null,
    ...o,
  });
  const mount = (o: Partial<TimeListInputs> = {}) => {
    const h = hostCore(timeListCore, inputs(o), { models: ['selectedTime'], markup: ({ view }, host) => (applyBag(host, view.root), [...list(view).childNodes] as HTMLElement[]) });
    h.attach();
    const slot = (m: number) => h.host.querySelector<HTMLElement>(`[data-minutes="${m}"]`)!;
    return { ...h, slot };
  };

  it('selects a clicked slot, keeping the date, and refuses one outside the limits', () => {
    const h = mount();
    h.slot(10 * 60).click();
    expect(minutes(h.state().selectedTime)).toBe(600);
    expect(h.state().selectedTime?.getDate()).toBe(2);
    expect(h.changes('selectedTime')).toHaveLength(1);
    h.slot(6 * 60).click();
    expect(h.state().focusedMinutes).toBe(360);
    expect(h.changes('selectedTime')).toHaveLength(1);
    h.host.click();
    expect(h.changes('selectedTime')).toHaveLength(1);
  });

  it('moves the roving slot with the keys and focuses it once rendered', async () => {
    const h = mount();
    const down = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    h.slot(540).dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(h.state().focusedMinutes).toBe(570);
    expect(document.activeElement).toBe(h.slot(570));
    const other = new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true });
    h.slot(570).dispatchEvent(other);
    expect(other.defaultPrevented).toBe(false);
    h.host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  });

  it('focuses the list through its method and follows the consumer time', () => {
    const h = mount();
    h.call('focusList');
    expect(document.activeElement).toBe(h.slot(540));
    h.setInputs({ selectedTime: at(9, 0) });
    expect(h.state().selectedTime).toEqual(at(9, 0));
    h.setInputs({ selectedTime: at(11, 30) });
    expect(minutes(h.state().selectedTime)).toBe(690);
    h.dispose();
  });

  it('gives up focusing a slot that never renders', async () => {
    const root = document.createElement('div');
    focusTimeSlot(root, 60, 1);
    await frame();
    await frame();
    expect(document.activeElement).toBe(document.body);
  });
});

describe('timepickerCore', () => {
  const inputs = (o: Partial<TimepickerInputs> = {}): TimepickerInputs => ({
    selectedTime: at(9, 0),
    step: 30,
    min: at(8, 0),
    max: at(18, 0),
    hour12: 'auto' as never,
    locale: 'en-GB',
    disabled: false,
    placeholder: null,
    required: false,
    invalid: false,
    errorText: null,
    inputLabel: 'Time',
    name: 'time',
    labels: null,
    ...o,
  });

  const markup = ({ view }: { view: TimepickerView }, host: HTMLElement) => {
    applyBag(host, view.root);
    return [
      el('div', view.group, el('input', view.input), view.hidden && el('input', view.hidden), view.trigger && el('button', view.trigger)),
      el('div', view.popup, list(view.timeList)),
    ];
  };

  /** jsdom has no popover API: a popup that fires the toggle events the browser would. */
  const popover = (popup: HTMLElement) => {
    let open = false;
    const toggle = (next: boolean) => {
      if (open === next) return;
      open = next;
      popup.dispatchEvent(Object.assign(new Event('toggle'), { newState: next ? 'open' : 'closed' }));
    };
    Object.assign(popup, { showPopover: () => toggle(true), hidePopover: () => toggle(false) });
  };

  const mount = (o: Partial<TimepickerInputs> = {}, typed?: string) => {
    // Rendered as hydrated up front: the spec prepares the DOM before attaching.
    const h = hostCore(timepickerCore, inputs(o), { models: ['selectedTime'], markup, hydrated: typed === undefined });
    h.render();
    const field = () => h.host.querySelector<HTMLInputElement>('input.timepicker-input')!;
    if (typed !== undefined) field().value = typed;
    popover(h.host.querySelector('.timepicker-popup')!);
    h.attach(false);
    return { ...h, field, popup: () => h.host.querySelector<HTMLElement>('.timepicker-popup')! };
  };

  it('server-renders a native time field, then turns it into a readonly display', () => {
    const server = hostCore(timepickerCore, inputs({ selectedTime: null }), { models: ['selectedTime'], hydrated: false });
    expect(server.props().view.input['type']).toBe('time');
    const h = hostCore(timepickerCore, inputs(), { models: ['selectedTime'], markup });
    h.render();
    const attachHost = h.host;
    expect(attachHost.querySelector('input.timepicker-input')).not.toBeNull();
  });

  it('adopts a time typed before hydration', () => {
    const h = mount({}, '10:30');
    expect(minutes(h.state().selectedTime)).toBe(630);
    expect(h.changes('selectedTime')).toHaveLength(1);
    const same = mount({}, '09:00');
    expect(same.changes('selectedTime')).toHaveLength(0);
  });

  it('opens on ArrowDown on the trigger, focusing the roving slot, and picks a slot', async () => {
    const h = mount();
    const trigger = h.host.querySelector<HTMLElement>('.timepicker-trigger');
    const field = h.field();
    const ignored = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    field.dispatchEvent(ignored);
    expect(ignored.defaultPrevented).toBe(false);
    (trigger ?? field).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    if (trigger) {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    } else {
      h.call('open');
    }
    expect(h.state().open).toBe(true);
    expect(h.events('openChange')).toEqual([true]);
    expect(document.activeElement?.getAttribute('data-minutes')).toBe('540');

    h.host.querySelector<HTMLElement>('[data-minutes="600"]')!.click();
    expect(minutes(h.state().selectedTime)).toBe(600);
    expect(h.state().open).toBe(false);
    expect(h.events('openChange')).toEqual([true, false]);
    expect(h.field().value).not.toBe('');
  });

  it('opens and closes through its methods, never while disabled, and closes when disabled', () => {
    const h = mount();
    h.call('open');
    h.popup().dispatchEvent(Object.assign(new Event('toggle'), { newState: 'open' }));
    h.host.dispatchEvent(Object.assign(new Event('toggle', { bubbles: true }), { newState: 'closed' }));
    expect(h.state().open).toBe(true);
    h.setInputs({ disabled: true });
    expect(h.state().open).toBe(false);
    h.call('open');
    expect(h.state().open).toBe(false);
    h.setInputs({ disabled: false });
    h.call('open');
    h.call('close');
    expect(h.events('openChange')).toEqual([true, false, true, false]);
  });

  it('follows the consumer time and clears the field for none', () => {
    const h = mount();
    h.setInputs({ selectedTime: at(9, 0) });
    h.setInputs({ selectedTime: null });
    expect(h.state().selectedTime).toBeNull();
    expect(h.field().value).toBe('');
    h.setInputs({ selectedTime: at(14, 0) });
    expect(minutes(h.state().selectedTime)).toBe(840);
    h.dispose();
  });

  it('attaches without a field or popup', () => {
    const h = hostCore(timepickerCore, inputs(), { models: ['selectedTime'], markup: () => null });
    h.attach();
    h.call('open');
    h.call('close');
    expect(h.state().open).toBe(false);
  });
});
