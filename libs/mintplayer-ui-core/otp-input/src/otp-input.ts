import { errorFeedback } from '@mintplayer/ui-core/forms';

/**
 * The one-time-code input (PRD #437 wave B): one real `<input>` holds the
 * value; decorative boxes show slices of it once the page is hydrated.
 *
 * With JavaScript off (and before hydration) the input is an ordinary
 * `.form-control`: it takes typing and paste, submits under `name`, and keeps
 * `maxlength`, `inputmode` and the one-time-code autofill hint. Once hydrated it
 * is stretched transparent over the boxes and keeps focus, paste, IME and SMS
 * autofill; the boxes are `aria-hidden`, so assistive technology sees one text
 * field.
 *
 * Layout is `groups: number[]`: one entry per box, holding its character
 * count. `[1,1,1,1,1,1]` is the classic 6-digit code; `[5,5,5,5,5]` a product key.
 */

export type OtpInputType = 'numeric' | 'alphanumeric' | 'password';
export type OtpInputCase = 'upper' | 'lower' | 'preserve';
export type OtpInputSize = 'sm' | 'md' | 'lg';

export const OTP_INPUT_SCOPE = 'otp-input';
export const OTP_DEFAULT_GROUPS: readonly number[] = [1, 1, 1, 1, 1, 1];
export const OTP_MAX_GROUP_SIZE = 10;
export const OTP_MAX_TOTAL = 40;
export const OTP_REVEAL_MS = 700;
export const OTP_MASK_CHAR = '•';

export type OtpBag = Record<string, string | number | boolean | null>;

/**
 * Clamp a layout: each box holds 1 to 10 characters, 40 in all. Anything else
 * falls back to the default six single boxes.
 */
export function normaliseGroups(groups: readonly number[] | null | undefined): number[] {
  if (!Array.isArray(groups) || groups.length === 0) return [...OTP_DEFAULT_GROUPS];
  const cleaned = groups.map((n) => {
    const i = Math.round(Number(n));
    return !Number.isFinite(i) || i < 1 ? 1 : Math.min(i, OTP_MAX_GROUP_SIZE);
  });
  // Drop trailing boxes until the total fits, keeping at least one.
  const fitted = cleaned.reduce<number[]>((kept, n) => (kept.reduce((a, b) => a + b, 0) + n <= OTP_MAX_TOTAL ? [...kept, n] : kept), []);
  return fitted.length ? fitted : [Math.min(cleaned[0], OTP_MAX_TOTAL)];
}

export const totalLength = (groups: readonly number[]) => groups.reduce((sum, n) => sum + n, 0);

/** Filter to the characters `type` allows, apply `letterCase`, truncate to the layout. */
export function normaliseValue(value: string | null | undefined, type: OtpInputType, letterCase: OtpInputCase, groups: readonly number[]): string {
  const raw = value ?? '';
  const filtered = type === 'numeric' ? raw.replace(/[^0-9]/g, '') : raw.replace(/[^a-zA-Z0-9]/g, '');
  const cased = type === 'numeric' || letterCase === 'preserve' ? filtered : letterCase === 'upper' ? filtered.toUpperCase() : filtered.toLowerCase();
  return cased.slice(0, totalLength(groups));
}

/** The box the caret is in: the next one to fill, or the last when all are full. */
export function activeBox(groups: readonly number[], caret: number): number {
  const ends = groups.map((_, i) => totalLength(groups.slice(0, i + 1)));
  const index = ends.findIndex((end) => caret < end);
  return index === -1 ? groups.length - 1 : index;
}

export interface OtpBoxView {
  readonly key: string;
  readonly bag: OtpBag;
  /** Reserves the box's full width, so it does not reflow while typing. */
  readonly spacer: string;
  readonly content: string;
}

export interface OtpInputView {
  /** The wrapper: the front's host in Angular and Lit. */
  readonly root: OtpBag;
  readonly container: OtpBag;
  readonly input: OtpBag;
  /** Empty before hydration: the input is then a plain visible field. */
  readonly boxes: readonly OtpBoxView[];
  readonly spacer: OtpBag;
  readonly content: OtpBag;
  readonly showFeedback: boolean;
  readonly feedback: { readonly attrs: OtpBag; readonly text: string };
}

export interface OtpInputOptions {
  readonly id: string;
  readonly groups: readonly number[];
  readonly type: OtpInputType;
  readonly size: OtpInputSize;
  readonly disabled: boolean;
  readonly invalid: boolean;
  readonly required: boolean;
  readonly name: string | null;
  readonly label: string | null;
  readonly errorText: string | null;
  readonly value: string;
  readonly hydrated: boolean;
  readonly focused: boolean;
  readonly caret: number;
  /** The index shown in clear for a moment after typing it into a password code. */
  readonly revealed: number | null;
}

const SIZES: ReadonlySet<string> = new Set(['sm', 'md', 'lg']);
const scoped = (bag: OtpBag): OtpBag => ({ ...bag, 'data-mps': OTP_INPUT_SCOPE });

export function connectOtpInput(options: OtpInputOptions): OtpInputView {
  const groups = normaliseGroups(options.groups);
  const total = totalLength(groups);
  const size = SIZES.has(options.size) ? options.size : 'md';
  const error = errorFeedback(`${options.id}-error`, options.errorText, options.invalid);
  const classic = options.type === 'numeric' && groups.every((g) => g === 1);
  const active = options.hydrated && options.focused ? activeBox(groups, Math.min(options.caret, total)) : null;
  const shown = (char: string, index: number) => (options.type !== 'password' || index === options.revealed ? char : OTP_MASK_CHAR);
  const starts = groups.map((_, i) => totalLength(groups.slice(0, i)));

  const boxes: OtpBoxView[] = options.hydrated
    ? groups.map((length, i) => {
        const start = starts[i];
        const slice = options.value.slice(start, start + length);
        const classes = [
          'otp-box',
          slice.length ? 'otp-box-filled' : null,
          active === i ? 'otp-box-active' : null,
          options.invalid ? 'otp-box-invalid' : null,
        ].filter(Boolean);
        return {
          key: String(i),
          bag: scoped({ class: classes.join(' '), 'aria-hidden': 'true' }),
          spacer: 'M'.repeat(length),
          content: [...slice].map((char, j) => shown(char, start + j)).join(''),
        };
      })
    : [];

  return {
    root: scoped({
      class: ['mp-otp-input', size === 'md' ? null : `mp-otp-input-${size}`, options.disabled ? 'mp-otp-input-disabled' : null].filter(Boolean).join(' '),
    }),
    container: scoped({ class: 'otp-container' }),
    input: scoped({
      class: options.hydrated ? 'otp-hidden-input' : size === 'md' ? 'form-control otp-plain-input' : `form-control form-control-${size} otp-plain-input`,
      id: options.id,
      name: options.name,
      // A no-JS password code is masked by the field itself.
      type: options.type === 'password' && !options.hydrated ? 'password' : 'text',
      value: options.value,
      autocomplete: classic ? 'one-time-code' : 'off',
      autocorrect: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      inputmode: options.type === 'numeric' ? 'numeric' : 'text',
      pattern: options.type === 'numeric' ? '[0-9]*' : '[a-zA-Z0-9]*',
      maxlength: total,
      disabled: options.disabled,
      required: options.required,
      'aria-label': options.label ?? 'One-time code',
      'aria-invalid': options.invalid ? 'true' : null,
      'aria-errormessage': error.control['aria-errormessage'],
      'aria-describedby': error.control['aria-describedby'],
    }),
    boxes,
    spacer: scoped({ class: 'otp-box-spacer' }),
    content: scoped({ class: 'otp-box-content' }),
    showFeedback: !!error.message,
    feedback: error.message ? { attrs: scoped(error.message.attrs), text: error.message.text } : { attrs: {}, text: '' },
  };
}
