import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { accordionCore, accordionTabCore, type AccordionContext, type AccordionTabInputs, type AccordionTabView } from './accordion';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const toggle = (row: HTMLDetailsElement, open: boolean) => {
  row.open = open;
  row.dispatchEvent(new Event('toggle'));
};

afterEach(() => document.body.replaceChildren());

/** An accordion whose tabs are hosted the way Angular and Lit do: a tab host around each `<details>`. */
function mount(multi = false, disabled: boolean[] = [false, false, false]) {
  const acc = hostCore(accordionCore, { multi, highlightActiveTab: true }, { markup: ({ root }, host) => (applyBag(host, root), undefined) });
  const context = accordionCore.provide!({ inputs: acc.inputs(), id: 'acc', state: undefined } as never) as AccordionContext;
  expect(context).toEqual({ name: multi ? null : 'acc-group', highlightActiveTab: true });
  const tabs = disabled.map((d, i) => {
    const host = acc.host.appendChild(el('div'));
    const markup = ({ view }: { view: AccordionTabView }, h: HTMLElement) =>
      applyBag(h, accordionTabCore.host!({} as never)) &&
      el('details', view.item, el('summary', view.summary, `Tab ${i}`), el('div', view.content, `Body ${i}`));
    const tab = hostCore(accordionTabCore, { open: false, disabled: d } as AccordionTabInputs, { host, id: `t${i}`, context, markup });
    tab.attach();
    return tab;
  });
  acc.attach();
  const row = (i: number) => tabs[i].host.querySelector('details')!;
  const summary = (i: number) => row(i).querySelector('summary')!;
  return { acc, tabs, row, summary };
}

describe('accordionCore and accordionTabCore', () => {
  it('reports a row toggled open and keeps only one open', () => {
    const { acc, tabs, row } = mount();
    toggle(row(0), true);
    expect(tabs[0].state().open).toBe(true);
    expect(tabs[0].events('openChange')).toEqual([true]);
    expect(acc.events('tabToggle')).toContainEqual({ index: 0, active: true });
    toggle(row(1), true);
    expect(row(0).open).toBe(false);
    expect(acc.events('tabToggle')).toContainEqual({ index: 1, active: true });
    // A toggle the tab already knows about, or from a nested row, changes nothing.
    row(1).dispatchEvent(new Event('toggle'));
    expect(tabs[1].events('openChange')).toEqual([true]);
    row(1).querySelector('.accordion-content')!.dispatchEvent(new Event('toggle'));
    expect(tabs[1].events('openChange')).toEqual([true]);
  });

  it('opens and closes through its input and method, and closes all', async () => {
    const { acc, tabs, row } = mount(true);
    tabs[0].setInputs({ open: true });
    expect(row(0).open).toBe(true);
    expect(tabs[0].state().open).toBe(true);
    tabs[0].setInputs({ disabled: true });
    tabs[1].call('setOpen', true);
    expect(row(1).open).toBe(true);
    acc.call('closeAll');
    expect([row(0).open, row(1).open]).toEqual([false, false]);
    await tick();
  });

  it('blocks a disabled tab’s click and Enter/Space, but not its arrows', () => {
    const { summary } = mount(false, [false, true, false]);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    summary(1).dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    const enabled = new MouseEvent('click', { bubbles: true, cancelable: true });
    summary(0).dispatchEvent(enabled);
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    summary(1).dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    summary(1).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(summary(2));
  });

  it('moves focus between headers with the arrows, wrapping, and ignores other keys', () => {
    const { summary } = mount();
    summary(2).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(summary(0));
    summary(0).dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(summary(2));
    const other = new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true });
    summary(2).dispatchEvent(other);
    expect(other.defaultPrevented).toBe(false);
  });

  it('works with the details as its own host, outside an accordion, and without markup', () => {
    const details = document.body.appendChild(el('details', { class: 'accordion-item' }, el('summary', null, 'Lone')));
    const tab = hostCore(accordionTabCore, { open: false, disabled: false }, { host: details, context: { name: null, highlightActiveTab: false } });
    tab.attach();
    const key = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    details.querySelector('summary')!.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(false);
    tab.setInputs({ open: true });
    expect(details.open).toBe(true);
    tab.dispose();

    const bare = hostCore(accordionTabCore, { open: false, disabled: false }, { context: { name: null, highlightActiveTab: false } });
    bare.attach();
    bare.setInputs({ open: true });
    bare.call('setOpen', false);
    expect(bare.state().open).toBe(true);
  });

  it('stops listening once disposed', () => {
    const { acc, tabs, row } = mount();
    tabs[0].dispose();
    acc.dispose();
    toggle(row(0), true);
    expect(acc.events('tabToggle')).toEqual([]);
  });
});
