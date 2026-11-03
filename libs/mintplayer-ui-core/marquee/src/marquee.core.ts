import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * A scrolling ticker (#458 M5).
 *
 *   <span class="marquee-host">
 *     <span class="marquee …" role="marquee" aria-label=<label>>
 *       <span class="marquee-track [marquee-paused]">…content…</span>
 *     </span>
 *     <button type=button class="marquee-pause" data-marquee-pause>Pause | Resume</button>
 *   </span>
 *
 * `role="marquee"` names the widget honestly and carries the `aria-label`
 * (a bare span's label is ignored by name computation). WCAG 2.2.2: moving
 * content needs a pause, so the button's text says what it will do; it
 * reports no `aria-pressed`, since a toggle that changes its label must not
 * also report a pressed state. Hovering or focusing the ticker pauses it too,
 * and reduced motion stops it.
 *
 * No-JS tier 2: the ticker scrolls (and pauses on hover); the button is
 * `hidden` until hydrated, since it cannot pause anything before then.
 */
export interface MarqueeInputs {
  /** Names the ticker. A consumer `aria-label` wins. */
  label: string | null;
  /** The button's text while scrolling. Override for localisation. */
  pauseText: string;
  /** The button's text while paused. Override for localisation. */
  resumeText: string;
}

export interface MarqueeView {
  readonly root: CoreBag;
  readonly region: CoreBag;
  readonly track: CoreBag;
  readonly button: CoreBag;
  readonly buttonText: string;
}

export const MARQUEE_PAUSE_ATTR = 'data-marquee-pause';

export function connectMarquee(inputs: MarqueeInputs, paused: boolean, hydrated: boolean, consumerLabel: string | null = null): MarqueeView {
  return {
    root: { class: 'marquee-host' },
    region: { class: 'marquee', role: 'marquee', 'aria-label': consumerLabel ?? inputs.label ?? null },
    track: { class: paused ? 'marquee-track h1 marquee-paused' : 'marquee-track h1' },
    button: { class: 'marquee-pause', type: 'button', [MARQUEE_PAUSE_ATTR]: '', hidden: hydrated ? null : '' },
    buttonText: paused ? inputs.resumeText : inputs.pauseText,
  };
}

export const marqueeCore = defineCore<MarqueeInputs, { paused: boolean }, { view: MarqueeView }>({
  state: () => ({ paused: false }),
  view: ({ inputs, state, hydrated, label }) => ({ view: connectMarquee(inputs, state.paused, hydrated, label) }),
  attach: (api) => {
    const onClick = (event: Event) => {
      const button = (event.target as Element | null)?.closest?.(`[${MARQUEE_PAUSE_ATTR}]`);
      if (!button || !api.host.contains(button)) return;
      api.setState({ paused: !api.state().paused });
    };
    api.host.addEventListener('click', onClick);
    return () => api.host.removeEventListener('click', onClick);
  },
});
