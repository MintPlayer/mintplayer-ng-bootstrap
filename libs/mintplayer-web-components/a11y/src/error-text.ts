import { html, nothing, type TemplateResult } from 'lit';

const FEEDBACK_CLASS = 'invalid-feedback';

/** What a render branch needs in order to expose an `error-text` message. */
export interface ErrorFeedback {
  /**
   * Value for BOTH `aria-errormessage` and `aria-describedby` on the
   * role-bearing control, or `nothing` when there is no message to point at.
   */
  readonly id: string | typeof nothing;
  /** The message node, or `nothing`. Render it after the control. */
  readonly node: TemplateResult | typeof nothing;
}

const ABSENT: ErrorFeedback = { id: nothing, node: nothing };

/**
 * The `error-text` channel: a validation message a form WC renders inside its
 * **own** shadow root, so that a control whose role lives behind that boundary
 * can still be described by one. A consumer cannot do this from outside — an
 * IDREF does not cross the boundary — so the message has to come in as text
 * (`error-text`) and be wired up in here.
 *
 * Shared rather than copied because the contract has two ways to be quietly
 * wrong, across five controls and seven render branches:
 *
 * - `aria-errormessage` is defined **only** while `aria-invalid="true"`. On a
 *   valid control it is not merely redundant, it is invalid markup that some AT
 *   announces anyway — hence the `invalid` argument, and hence no message node
 *   at all when the control is valid.
 * - Support for `aria-errormessage` is uneven, so `aria-describedby` points at
 *   the same node as the fallback. Both references therefore appear and vanish
 *   together, which is what returning one `id` for both guarantees.
 */
export function errorFeedback(
  id: string,
  text: string | null,
  invalid: boolean,
): ErrorFeedback {
  const message = text?.trim();
  if (!message || !invalid) return ABSENT;
  return {
    id,
    node: html`<small class=${FEEDBACK_CLASS} id=${id}>${message}</small>`,
  };
}

/**
 * The rendered message nodes, to hand to `HostAriaController`'s
 * `describedByExtras`.
 *
 * The `aria-describedby` attribute written by `errorFeedback` survives only
 * where the browser has no ARIA element references. Where it does have them,
 * assigning `ariaDescribedByElements` — which the controller does after every
 * render — removes that attribute outright, so the in-shadow description has to
 * travel through the same channel as the consumer's. See `describedByExtras`.
 */
export function errorFeedbackElements(root: ParentNode | null | undefined): HTMLElement[] {
  const node = root?.querySelector<HTMLElement>(`.${FEEDBACK_CLASS}`);
  return node ? [node] : [];
}
