import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import {
  OTP_REVEAL_MS,
  connectOtpInput,
  normaliseGroups,
  normaliseValue,
  totalLength,
  type OtpInputCase,
  type OtpInputSize,
  type OtpInputType,
  type OtpInputView,
} from './otp-input';

/**
 * The one-time-code input's core (PRD #437 D10): what the generated Angular,
 * React, Vue and Lit components host. `otp-input.component.ts` is its manifest
 * and `templates/otp-input.view.vue` its markup.
 */

export interface OtpInputInputs {
  /** Characters per box: `[1,1,1,1,1,1]` is a 6-digit code. */
  groups: number[];
  /** `numeric` takes digits; `alphanumeric` letters and digits; `password` masks them. */
  type: OtpInputType;
  /** Letter case of an alphanumeric code: `upper`, `lower` or `preserve`. */
  letterCase: OtpInputCase;
  /** Bootstrap size: `sm`, `md` or `lg`. */
  size: OtpInputSize;
  disabled: boolean;
  required: boolean;
  /** Marks the boxes invalid and shows `errorText` under them. */
  invalid: boolean;
  /** The validation message, referenced from the input while `invalid`. */
  errorText?: string | null;
  /** Submitted with the form. */
  name?: string | null;
  /** Accessible name (default "One-time code"); an `aria-label` on the component wins. */
  inputLabel?: string | null;
  /** The code. Written through as the user types. */
  value: string;
}

export interface OtpInputState {
  value: string;
  focused: boolean;
  caret: number;
  revealed: number | null;
}

export interface OtpInputEvents {
  /** Every keystroke, paste and clear: the current, possibly partial, code. */
  valueChange: string;
  /** The user filled the last box. Fires again after a re-completion; never for a written value. */
  complete: string;
}

export interface OtpInputMethods {
  /** Empty the code, and report it. */
  clear(): void;
  /** Move focus into the input. */
  focusInput(options?: FocusOptions): void;
}

type Api = CoreApi<OtpInputInputs, OtpInputState, OtpInputEvents>;

const groupsOf = (inputs: OtpInputInputs) => normaliseGroups(inputs.groups);
const normalise = (inputs: OtpInputInputs, value: string | null | undefined) => normaliseValue(value, inputs.type, inputs.letterCase, groupsOf(inputs));
const field = (api: Api) => api.host.querySelector('input') as HTMLInputElement;
const sameGroups = (a: readonly number[] | undefined, b: readonly number[] | undefined) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]));

/** Reveal timers per mounted input: the core object is shared by every instance. */
const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

function stopReveal(api: Api) {
  clearTimeout(timers.get(api.host));
  timers.delete(api.host);
}

/** Take a new code from the user: write it, report it, and report completion once. */
function commit(api: Api, value: string, reveal: number | null) {
  const before = api.state().value;
  const total = totalLength(groupsOf(api.inputs()));
  const input = field(api);
  // Strip what the filter refused (a letter in a numeric code); the caret goes to the end.
  if (input.value !== value) input.value = value;
  stopReveal(api);
  if (reveal !== null) {
    timers.set(api.host, setTimeout(() => api.setState({ revealed: null }), OTP_REVEAL_MS));
  }
  api.setState({ value, revealed: reveal, caret: input.selectionEnd ?? value.length });
  if (value === before) return;
  api.emit('valueChange', value);
  if (value.length === total && before.length !== total) {
    stopReveal(api);
    api.setState({ revealed: null });
    api.emit('complete', value);
  }
}

/** A written value, or one renormalised by a layout or type change: shown, not completed. */
function write(api: Api, value: string, report: boolean) {
  stopReveal(api);
  const input = field(api);
  if (input.value !== value) input.value = value;
  const changed = value !== api.state().value;
  api.setState({ value, revealed: null });
  if (report && changed) api.emit('valueChange', value);
}

export const otpInputCore = defineCore<OtpInputInputs, OtpInputState, { view: OtpInputView }, OtpInputEvents, undefined, undefined, OtpInputMethods>({
  state: (inputs) => ({ value: normalise(inputs, inputs.value), focused: false, caret: 0, revealed: null }),
  view: ({ inputs, state, id, hydrated, label }) => ({
    view: connectOtpInput({
      id,
      groups: groupsOf(inputs),
      type: inputs.type,
      size: inputs.size,
      disabled: inputs.disabled,
      required: inputs.required,
      invalid: inputs.invalid,
      name: inputs.name ?? null,
      label: label ?? inputs.inputLabel ?? null,
      errorText: inputs.errorText ?? null,
      value: state.value,
      hydrated,
      focused: state.focused,
      caret: state.caret,
      revealed: state.revealed,
    }),
  }),
  attach: (api) => {
    const input = field(api);
    const caret = () => api.setState({ caret: input.selectionEnd ?? input.value.length });
    const onInput = () => {
      const value = normalise(api.inputs(), input.value);
      // One character typed into a password code shows in clear for a moment; a
      // paste, an autofill or a deletion never does.
      const grew = value.length - api.state().value.length === 1;
      commit(api, value, api.inputs().type === 'password' && grew ? value.length - 1 : null);
    };
    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault();
      // From the first box, wherever the caret was (a tap on a later box, then paste).
      commit(api, normalise(api.inputs(), event.clipboardData?.getData('text') ?? ''), null);
    };
    const onFocus = () => api.setState({ focused: true, caret: input.selectionEnd ?? input.value.length });
    const onBlur = () => {
      stopReveal(api);
      api.setState({ focused: false, revealed: null });
    };
    input.addEventListener('input', onInput);
    input.addEventListener('paste', onPaste);
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);
    input.addEventListener('keyup', caret);
    input.addEventListener('click', caret);
    // Text typed into the server-rendered field before hydration is the user's.
    const typed = normalise(api.inputs(), input.value);
    if (typed !== api.state().value) commit(api, typed, null);
    if (document.activeElement === input) onFocus();
    return () => {
      stopReveal(api);
      input.removeEventListener('input', onInput);
      input.removeEventListener('paste', onPaste);
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
      input.removeEventListener('keyup', caret);
      input.removeEventListener('click', caret);
    };
  },
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    if (inputs.value !== prev.value && normalise(inputs, inputs.value) !== api.state().value) {
      write(api, normalise(inputs, inputs.value), false);
      return;
    }
    // A shorter layout or a stricter type drops characters: the consumer must hear of it.
    if (!sameGroups(inputs.groups, prev.groups) || inputs.type !== prev.type || inputs.letterCase !== prev.letterCase) {
      write(api, normalise(inputs, api.state().value), true);
    }
  },
  methods: {
    clear: (api) => {
      if (api.state().value === '') return;
      write(api, '', true);
    },
    focusInput: (api, options) => field(api).focus(options),
  },
});
