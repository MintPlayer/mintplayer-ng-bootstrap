import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * A star rating (#458 M7), as native radios.
 *
 *   <div class="rating" role="radiogroup" aria-label=<label> [aria-disabled]>
 *     <label class="rating-star">
 *       <input type=radio class="rating-input visually-hidden" name=<name> value=1
 *              aria-label="Rate 1 out of 5 stars" [checked] [disabled]>
 *       <span aria-hidden="true">★</span>
 *     </label>
 *     …
 *   </div>
 *
 * The radios own the state, so they stay correct with no write path: arrow keys
 * move and check, one tab stop enters the group (the checked star, else the
 * first), and the value submits with a form under `name`. The fill and the hover
 * preview are CSS (`:has()` on the checked or hovered star and its later
 * siblings), the focus ring is on the star whose radio has keyboard focus.
 *
 * No-JS tier 1: the server renders the radios checked at `value`, and picking a
 * star, its fill and its submission all work without JavaScript. Hydrated, the
 * core reports picks (`valueChange`, the two-way `value`) and the star under the
 * pointer (`previewChange`, null when the pointer leaves).
 */
export interface RatingInputs {
  /** The picked star, 1 to `maximum`; 0 for none. */
  value: number;
  maximum: number;
  disabled: boolean;
  /** The radios' form name; null derives one from the component's id. */
  name: string | null;
  /** Names the radiogroup. A consumer `aria-label` wins. Override to translate. */
  label: string;
  /**
   * Each star's accessible name. A formatter rather than a prefix and suffix,
   * because word order differs across languages.
   */
  starLabel: (star: number, maximum: number) => string;
}

export interface RatingStar {
  readonly key: number;
  readonly star: CoreBag;
  readonly input: CoreBag;
  readonly checked: boolean;
}

export interface RatingView {
  readonly root: CoreBag;
  readonly stars: readonly RatingStar[];
}

export const RATING_VALUE_ATTR = 'data-rating-value';

export function connectRating(inputs: RatingInputs, value: number, id: string, consumerLabel: string | null = null): RatingView {
  const maximum = Math.max(0, Math.floor(inputs.maximum));
  const name = inputs.name ?? `${id}-rating`;
  return {
    root: {
      class: 'rating',
      role: 'radiogroup',
      'aria-label': consumerLabel ?? inputs.label,
      'aria-disabled': inputs.disabled ? 'true' : null,
    },
    stars: Array.from({ length: maximum }, (_, index) => {
      const star = index + 1;
      return {
        key: star,
        checked: star === value,
        star: { class: 'rating-star' },
        input: {
          type: 'radio',
          class: 'rating-input visually-hidden',
          name,
          value: String(star),
          checked: star === value ? '' : null,
          disabled: inputs.disabled ? '' : null,
          'aria-label': inputs.starLabel(star, maximum),
          [RATING_VALUE_ATTR]: String(star),
        },
      };
    }),
  };
}

const starOf = (target: EventTarget | null, host: HTMLElement): number | null => {
  const el = (target as Element | null)?.closest?.('.rating-star');
  const value = el?.querySelector(`[${RATING_VALUE_ATTR}]`)?.getAttribute(RATING_VALUE_ATTR);
  return el && host.contains(el) && value ? Number(value) : null;
};

export const ratingCore = defineCore<
  RatingInputs,
  { value: number },
  { view: RatingView },
  { valueChange: number; previewChange: number | null }
>({
  state: (inputs) => ({ value: Number(inputs.value) || 0 }),
  view: ({ inputs, state, id, label }) => ({ view: connectRating(inputs, state.value, id, label) }),
  attach: (api) => {
    const host = api.host;
    let previewed: number | null = null;
    const onChange = (event: Event) => {
      const input = event.target as HTMLInputElement | null;
      if (!input?.hasAttribute?.(RATING_VALUE_ATTR) || !host.contains(input) || !input.checked) return;
      const value = Number(input.value);
      if (value === api.state().value) return;
      api.setState({ value });
    };
    const preview = (value: number | null) => {
      if (api.inputs().disabled || value === previewed) return;
      previewed = value;
      api.emit('previewChange', value);
    };
    const onOver = (event: Event) => {
      const star = starOf(event.target, host);
      if (star !== null) preview(star);
    };
    const onLeave = () => preview(null);
    host.addEventListener('change', onChange);
    host.addEventListener('pointerover', onOver);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('change', onChange);
      host.removeEventListener('pointerover', onOver);
      host.removeEventListener('pointerleave', onLeave);
    };
  },
  inputsChanged: (api, prev) => {
    const value = Number(api.inputs().value) || 0;
    if (value === (Number(prev.value) || 0) || value === api.state().value) return;
    api.setState({ value });
  },
});
