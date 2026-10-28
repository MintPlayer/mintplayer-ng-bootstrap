import { activeBox, connectOtpInput, normaliseGroups, normaliseValue, OTP_MASK_CHAR, type OtpInputOptions } from './otp-input';

const base: OtpInputOptions = {
  id: 'otp1',
  groups: [1, 1, 1, 1, 1, 1],
  type: 'numeric',
  size: 'md',
  disabled: false,
  invalid: false,
  required: false,
  name: null,
  label: null,
  errorText: null,
  value: '',
  hydrated: true,
  focused: false,
  caret: 0,
  revealed: null,
};

describe('normaliseGroups', () => {
  it('falls back to six single boxes', () => {
    expect(normaliseGroups(null)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(normaliseGroups([])).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('clamps each box to 1..10 and the total to 40', () => {
    expect(normaliseGroups([0, 12, 2.6])).toEqual([1, 10, 3]);
    expect(normaliseGroups([10, 10, 10, 10, 10])).toEqual([10, 10, 10, 10]);
  });
});

describe('normaliseValue', () => {
  it('keeps digits only for a numeric code and truncates to the layout', () => {
    expect(normaliseValue('Code: 123-4567', 'numeric', 'upper', [1, 1, 1, 1, 1, 1])).toBe('123456');
  });

  it('applies letterCase to an alphanumeric code', () => {
    expect(normaliseValue('ab-C1', 'alphanumeric', 'upper', [5])).toBe('ABC1');
    expect(normaliseValue('ab-C1', 'alphanumeric', 'lower', [5])).toBe('abc1');
    expect(normaliseValue('ab-C1', 'alphanumeric', 'preserve', [5])).toBe('abC1');
  });
});

describe('activeBox', () => {
  it('is the box holding the caret, or the last when full', () => {
    expect(activeBox([3, 3], 0)).toBe(0);
    expect(activeBox([3, 3], 3)).toBe(1);
    expect(activeBox([3, 3], 6)).toBe(1);
  });
});

describe('connectOtpInput', () => {
  it('renders a plain form-control and no boxes before hydration', () => {
    const view = connectOtpInput({ ...base, hydrated: false, type: 'password' });
    expect(view.boxes).toEqual([]);
    expect(view.input['class']).toBe('form-control otp-plain-input');
    expect(view.input['type']).toBe('password');
  });

  it('hides the input behind boxes once hydrated', () => {
    const view = connectOtpInput({ ...base, value: '12' });
    expect(view.input['class']).toBe('otp-hidden-input');
    expect(view.boxes).toHaveLength(6);
    expect(view.boxes.map((b) => b.content)).toEqual(['1', '2', '', '', '', '']);
    expect(view.boxes[0].bag['class']).toContain('otp-box-filled');
  });

  it('marks only the caret box active, and only while focused', () => {
    expect(connectOtpInput({ ...base, caret: 2 }).boxes.filter((b) => String(b.bag['class']).includes('otp-box-active'))).toHaveLength(0);
    const focused = connectOtpInput({ ...base, caret: 2, focused: true });
    expect(focused.boxes.map((b) => String(b.bag['class']).includes('otp-box-active'))).toEqual([false, false, true, false, false, false]);
  });

  it('asks for one-time-code autofill only for a classic numeric code', () => {
    expect(connectOtpInput(base).input['autocomplete']).toBe('one-time-code');
    expect(connectOtpInput({ ...base, groups: [3, 3] }).input['autocomplete']).toBe('off');
    expect(connectOtpInput({ ...base, type: 'alphanumeric' }).input['autocomplete']).toBe('off');
  });

  it('masks a password code except the revealed index', () => {
    const view = connectOtpInput({ ...base, type: 'password', value: '1234', revealed: 3 });
    expect(view.boxes.slice(0, 4).map((b) => b.content)).toEqual([OTP_MASK_CHAR, OTP_MASK_CHAR, OTP_MASK_CHAR, '4']);
  });

  it('wires an invalid state with an error message onto the input', () => {
    const view = connectOtpInput({ ...base, invalid: true, errorText: 'Required' });
    expect(view.input['aria-invalid']).toBe('true');
    expect(view.input['aria-describedby']).toBe('otp1-error');
    expect(view.showFeedback).toBe(true);
    expect(view.feedback.text).toBe('Required');
    expect(view.boxes[0].bag['class']).toContain('otp-box-invalid');
  });

  it('scopes every node', () => {
    const view = connectOtpInput(base);
    [view.root, view.container, view.input, view.spacer, view.content, view.boxes[0].bag].forEach((bag) => expect(bag['data-mps']).toBe('otp-input'));
  });
});
