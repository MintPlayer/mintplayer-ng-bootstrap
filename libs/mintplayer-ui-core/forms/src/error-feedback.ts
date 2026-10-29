// The node exists only while the control is invalid, so it is always shown: Bootstrap's
// `.is-invalid ~ .invalid-feedback` reveal needs a sibling, which a wrapped checkbox
// label or a control inside a group never has.
export const FEEDBACK_CLASS = 'invalid-feedback d-block';

export interface ErrorFeedback {
  /** Spread onto the ROLE-BEARING control. All three are null when there is no message. */
  readonly control: {
    'aria-invalid': 'true' | null;
    'aria-errormessage': string | null;
    'aria-describedby': string | null;
  };
  /** The message node, rendered after the control, or `null`. */
  readonly message: { readonly attrs: { id: string; class: string }; readonly text: string } | null;
}

const ABSENT: ErrorFeedback = {
  control: { 'aria-invalid': null, 'aria-errormessage': null, 'aria-describedby': null },
  message: null,
};

/**
 * The validation-message contract, shared by every form core so it cannot be
 * quietly wrong in one of them:
 *
 * - `aria-errormessage` is defined ONLY while `aria-invalid="true"`; on a valid
 *   control it is invalid markup some AT announces anyway, so a valid control
 *   gets no message node and no references at all.
 * - Support for `aria-errormessage` is uneven, so `aria-describedby` points at
 *   the same node as the fallback; both appear and vanish together.
 *
 * A message persists (it is re-readable), so it never goes to a live region; a
 * refused submit moves focus to the control instead (CLAUDE.md "One message,
 * one channel"). A front that merges its own describedby ids appends them.
 */
export function errorFeedback(id: string, text: string | null | undefined, invalid = true): ErrorFeedback {
  const message = text?.trim();
  if (!message || !invalid) return ABSENT;
  return {
    control: { 'aria-invalid': 'true', 'aria-errormessage': id, 'aria-describedby': id },
    message: { attrs: { id, class: FEEDBACK_CLASS }, text: message },
  };
}
