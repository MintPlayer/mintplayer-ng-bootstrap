import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { rangeCore, type RangeInputs, type RangeView } from './range.core';

afterEach(() => document.body.replaceChildren());

function mount(o: Partial<RangeInputs> = {}) {
  const markup = ({ view }: { view: RangeView }, host: HTMLElement) => (applyBag(host, view.root), el('input', view.input));
  const h = hostCore(rangeCore, { value: 5, min: 0, max: 10, step: 1, disabled: false, label: 'Volume', ...o }, { models: ['value'], markup });
  h.attach();
  const input = () => h.host.querySelector<HTMLInputElement>('input')!;
  const slide = (value: string, target: HTMLInputElement = input()) => {
    Object.defineProperty(target, 'value', { value, configurable: true });
    target.dispatchEvent(new Event('input', { bubbles: true }));
  };
  return { ...h, input, slide };
}

describe('rangeCore', () => {
  it('names the slider from the consumer first, then its label', () => {
    expect(hostCore(rangeCore, { value: 1, min: 0, max: 2, step: 1, disabled: true, label: null }, { models: ['value'], label: 'Mine' }).props().view.input).toMatchObject({ 'aria-label': 'Mine', disabled: '' });
    expect(hostCore(rangeCore, { value: 1, min: 0, max: 2, step: 1, disabled: false, label: null }).props().view.input['aria-label']).toBeNull();
  });

  it('reports a slid value, ignoring a repeat, a non-number and other inputs', () => {
    const h = mount();
    h.slide('7');
    h.slide('7');
    h.slide('abc');
    h.slide('3', h.host.appendChild(el('input')) as HTMLInputElement);
    expect(h.state().value).toBe(7);
    expect(h.changes('value')).toEqual([7]);
  });

  it('follows the consumer’s value and stops listening once disposed', () => {
    const h = mount({ value: 'x' as never });
    expect(h.state().value).toBe(0);
    h.setInputs({ value: 0 });
    h.setInputs({ value: 9 });
    expect(h.state().value).toBe(9);
    h.slide('4');
    h.setInputs({ value: 4 });
    const input = h.input();
    h.dispose();
    h.slide('2', input);
    expect(h.state().value).toBe(4);
  });
});
