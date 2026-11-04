import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { connectRating, ratingCore, type RatingInputs, type RatingView } from './rating.core';

afterEach(() => document.body.replaceChildren());

const inputs = (o: Partial<RatingInputs> = {}): RatingInputs => ({
  value: 2,
  maximum: 5,
  disabled: false,
  name: null,
  label: 'Rating',
  starLabel: (s, m) => `${s} of ${m}`,
  ...o,
});

function mount(o: Partial<RatingInputs> = {}) {
  const markup = ({ view }: { view: RatingView }, host: HTMLElement) =>
    (applyBag(host, view.root), view.stars.map((s) => el('label', s.star, el('input', s.input), '★')));
  const h = hostCore(ratingCore, inputs(o), { models: ['value'], markup });
  h.attach();
  const input = (star: number) => h.host.querySelector<HTMLInputElement>(`[data-rating-value="${star}"]`)!;
  const pick = (star: number) => {
    input(star).checked = true;
    input(star).dispatchEvent(new Event('change', { bubbles: true }));
  };
  return { ...h, input, pick };
}

describe('rating view', () => {
  it('names the group and the stars, derives a form name and floors the maximum', () => {
    const view = connectRating(inputs({ maximum: 3.7, disabled: true }), 2, 'r', 'Mine');
    expect(view.root).toMatchObject({ role: 'radiogroup', 'aria-label': 'Mine', 'aria-disabled': 'true' });
    expect(view.stars).toHaveLength(3);
    expect(view.stars[1]).toMatchObject({ checked: true, input: { name: 'r-rating', checked: '', 'aria-label': '2 of 3' } });
    expect(connectRating(inputs({ maximum: -1, name: 'stars' }), 0, 'r').stars).toEqual([]);
  });
});

describe('ratingCore', () => {
  it('picks a star from its radio, ignoring a repeat, an unchecked radio and other inputs', () => {
    const h = mount();
    h.pick(4);
    expect(h.state().value).toBe(4);
    h.pick(4);
    h.input(1).dispatchEvent(new Event('change', { bubbles: true }));
    const other = h.host.appendChild(el('input', { type: 'checkbox' }));
    other.dispatchEvent(new Event('change', { bubbles: true }));
    expect(h.changes('value')).toEqual([4]);
  });

  it('previews the star under the pointer, once each, and clears it on leave', () => {
    const h = mount();
    h.input(3).dispatchEvent(new Event('pointerover', { bubbles: true }));
    h.input(3).dispatchEvent(new Event('pointerover', { bubbles: true }));
    h.host.dispatchEvent(new Event('pointerover', { bubbles: true }));
    h.host.dispatchEvent(new Event('pointerleave'));
    expect(h.events('previewChange')).toEqual([3, null]);
  });

  it('does not preview while disabled', () => {
    const h = mount({ disabled: true });
    h.input(3).dispatchEvent(new Event('pointerover', { bubbles: true }));
    expect(h.events('previewChange')).toEqual([]);
  });

  it('follows the consumer’s value and stops listening once disposed', () => {
    const h = mount({ value: 'x' as never });
    expect(h.state().value).toBe(0);
    h.setInputs({ value: 0 });
    h.setInputs({ value: 5 });
    expect(h.state().value).toBe(5);
    h.pick(1);
    h.setInputs({ value: 1 });
    expect(h.state().value).toBe(1);
    const input = h.input(2);
    h.dispose();
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(h.state().value).toBe(1);
  });
});
