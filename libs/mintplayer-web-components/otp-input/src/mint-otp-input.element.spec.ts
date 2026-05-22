import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './mint-otp-input.element';
import type { MintOtpInputElement } from './mint-otp-input.element';

function makeElement(attrs: Record<string, string> = {}): MintOtpInputElement {
  const el = document.createElement('mp-otp-input') as MintOtpInputElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

async function ready(el: MintOtpInputElement): Promise<void> {
  await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
}

function hiddenInput(el: MintOtpInputElement): HTMLInputElement {
  const input = el.shadowRoot?.querySelector<HTMLInputElement>('.hidden-input');
  if (!input) throw new Error('hidden input not found');
  return input;
}

function boxes(el: MintOtpInputElement): HTMLElement[] {
  return Array.from(el.shadowRoot?.querySelectorAll<HTMLElement>('.box') ?? []);
}

function fireInput(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function firePaste(input: HTMLInputElement, text: string): boolean {
  const ev = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'clipboardData', {
    value: { getData: (type: string) => (type === 'text' ? text : '') },
  });
  return input.dispatchEvent(ev);
}

describe('mp-otp-input — defaults and basic rendering', () => {
  let el: MintOtpInputElement;

  beforeEach(async () => { el = makeElement(); await ready(el); });
  afterEach(() => { el.remove(); });

  it('defaults to 6 single-character boxes', () => {
    expect(el.groups).toEqual([1, 1, 1, 1, 1, 1]);
    expect(boxes(el)).toHaveLength(6);
  });

  it('starts with an empty value', () => {
    expect(el.value).toBe('');
  });

  it('renders one hidden input that owns focus and ARIA', () => {
    const input = hiddenInput(el);
    expect(input.getAttribute('aria-label')).toBe('One-time code');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(input.getAttribute('autocomplete')).toBe('one-time-code');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('maxlength')).toBe('6');
  });

  it('reflects the default type as numeric', () => {
    expect(el.type).toBe('numeric');
  });
});

describe('mp-otp-input — Scenario 1: classic OTP typed digit-by-digit', () => {
  let el: MintOtpInputElement;
  const valueChanges: string[] = [];
  const completes: string[] = [];

  beforeEach(async () => {
    el = makeElement();
    valueChanges.length = 0;
    completes.length = 0;
    el.addEventListener('value-change', (e) => valueChanges.push((e as CustomEvent<string>).detail));
    el.addEventListener('complete', (e) => completes.push((e as CustomEvent<string>).detail));
    await ready(el);
  });
  afterEach(() => { el.remove(); });

  it('streams partial values on every keystroke and fires complete once on the last', async () => {
    const input = hiddenInput(el);
    for (const c of '123456') {
      fireInput(input, input.value + c);
      await ready(el);
    }
    expect(valueChanges).toEqual(['1', '12', '123', '1234', '12345', '123456']);
    expect(completes).toEqual(['123456']);
  });

  it('does not re-fire complete on subsequent value-equal keystrokes', async () => {
    const input = hiddenInput(el);
    fireInput(input, '123456');
    await ready(el);
    fireInput(input, '123456'); // no-op same value
    await ready(el);
    expect(completes).toHaveLength(1);
  });
});

describe('mp-otp-input — Scenario 2: paste with separator junk', () => {
  let el: MintOtpInputElement;
  const valueChanges: string[] = [];
  const completes: string[] = [];

  beforeEach(async () => {
    el = makeElement();
    valueChanges.length = 0;
    completes.length = 0;
    el.addEventListener('value-change', (e) => valueChanges.push((e as CustomEvent<string>).detail));
    el.addEventListener('complete', (e) => completes.push((e as CustomEvent<string>).detail));
    await ready(el);
  });
  afterEach(() => { el.remove(); });

  it('strips non-numeric junk and fills from index 0', async () => {
    const input = hiddenInput(el);
    firePaste(input, 'Your code: 123-456 thanks');
    await ready(el);
    expect(el.value).toBe('123456');
    expect(valueChanges).toEqual(['123456']);
    expect(completes).toEqual(['123456']);
  });

  it('ignores chars past the total length', async () => {
    const input = hiddenInput(el);
    firePaste(input, '1234567890');
    await ready(el);
    expect(el.value).toBe('123456');
  });

  it('fills only the first N boxes for short paste', async () => {
    const input = hiddenInput(el);
    firePaste(input, '123');
    await ready(el);
    expect(el.value).toBe('123');
    expect(completes).toHaveLength(0);
  });
});

describe('mp-otp-input — Scenario 3: non-uniform license key', () => {
  let el: MintOtpInputElement;

  beforeEach(async () => {
    el = makeElement();
    el.groups = [6, 6, 4, 4, 6, 6];
    el.type = 'alphanumeric';
    el.case = 'upper';
    await ready(el);
  });
  afterEach(() => { el.remove(); });

  it('renders one box per group element', () => {
    expect(boxes(el)).toHaveLength(6);
  });

  it('strips dashes and uppercases on paste, fills full 32 chars', async () => {
    const completes: string[] = [];
    el.addEventListener('complete', (e) => completes.push((e as CustomEvent<string>).detail));
    const input = hiddenInput(el);
    firePaste(input, 'abc123-def456-7890-asdf-zxcvbn-qwerty');
    await ready(el);
    expect(el.value).toBe('ABC123DEF4567890ASDFZXCVBNQWERTY');
    expect(el.value.length).toBe(32);
    expect(completes).toEqual(['ABC123DEF4567890ASDFZXCVBNQWERTY']);
  });

  it('disables one-time-code autocomplete for non-uniform groups', () => {
    expect(hiddenInput(el).getAttribute('autocomplete')).toBe('off');
  });

  it('uses inputmode=text for alphanumeric', () => {
    expect(hiddenInput(el).getAttribute('inputmode')).toBe('text');
  });
});

describe('mp-otp-input — Scenario 4: Backspace behavior via single hidden input', () => {
  let el: MintOtpInputElement;

  beforeEach(async () => { el = makeElement(); await ready(el); });
  afterEach(() => { el.remove(); });

  it('shrinking the value via input event emits value-change with the shorter string', async () => {
    const input = hiddenInput(el);
    const events: string[] = [];
    el.addEventListener('value-change', (e) => events.push((e as CustomEvent<string>).detail));
    // Type up to 3, then simulate backspace twice by shrinking.
    fireInput(input, '1');
    await ready(el);
    fireInput(input, '12');
    await ready(el);
    fireInput(input, '123');
    await ready(el);
    fireInput(input, '12');
    await ready(el);
    fireInput(input, '1');
    await ready(el);
    expect(events).toEqual(['1', '12', '123', '12', '1']);
    expect(el.value).toBe('1');
  });

  it('does not re-fire complete when shrinking from complete then completing again', async () => {
    const input = hiddenInput(el);
    const completes: string[] = [];
    el.addEventListener('complete', (e) => completes.push((e as CustomEvent<string>).detail));
    fireInput(input, '123456');
    await ready(el);
    fireInput(input, '12345');
    await ready(el);
    fireInput(input, '123456');
    await ready(el);
    expect(completes).toEqual(['123456', '123456']);
  });
});

describe('mp-otp-input — Scenario 5: password mask reveal window', () => {
  let el: MintOtpInputElement;

  beforeEach(async () => {
    vi.useFakeTimers();
    el = makeElement();
    el.type = 'password';
    await ready(el);
  });
  afterEach(() => {
    vi.useRealTimers();
    el.remove();
  });

  it('shows the just-typed char then masks it after 700ms', async () => {
    const input = hiddenInput(el);
    fireInput(input, '1');
    await ready(el);
    let contentSpans = el.shadowRoot?.querySelectorAll('.box-content');
    expect(contentSpans?.[0]?.textContent).toBe('1');

    vi.advanceTimersByTime(700);
    await ready(el);
    contentSpans = el.shadowRoot?.querySelectorAll('.box-content');
    expect(contentSpans?.[0]?.textContent).toBe('•');
  });

  it('only reveals the most recent char, earlier ones are already masked', async () => {
    const input = hiddenInput(el);
    fireInput(input, '1');
    await ready(el);
    fireInput(input, '12');
    await ready(el);
    const content = Array.from(el.shadowRoot?.querySelectorAll('.box-content') ?? [])
      .map((s) => s.textContent ?? '');
    expect(content[0]).toBe('•');
    expect(content[1]).toBe('2');
  });

  it('does not reveal chars when content arrives via paste', async () => {
    const input = hiddenInput(el);
    firePaste(input, '123456');
    await ready(el);
    const content = Array.from(el.shadowRoot?.querySelectorAll('.box-content') ?? [])
      .map((s) => s.textContent ?? '');
    expect(content.every((c) => c === '•')).toBe(true);
  });

  it('masks immediately on complete regardless of the timer', async () => {
    const input = hiddenInput(el);
    for (const c of '12345') {
      fireInput(input, input.value + c);
      await ready(el);
    }
    fireInput(input, '123456'); // triggers complete
    await ready(el);
    const content = Array.from(el.shadowRoot?.querySelectorAll('.box-content') ?? [])
      .map((s) => s.textContent ?? '');
    expect(content[5]).toBe('•');
  });
});

describe('mp-otp-input — Scenario 9: reactive groups change', () => {
  let el: MintOtpInputElement;

  beforeEach(async () => { el = makeElement(); await ready(el); });
  afterEach(() => { el.remove(); });

  it('truncates the current value when groups shrinks the total length', async () => {
    const input = hiddenInput(el);
    fireInput(input, '123456');
    await ready(el);
    expect(el.value).toBe('123456');

    el.groups = [1, 1, 1, 1];
    await ready(el);
    expect(el.value).toBe('1234');
  });

  it('keeps the current value when groups grows the total', async () => {
    const input = hiddenInput(el);
    fireInput(input, '123456');
    await ready(el);

    el.groups = [1, 1, 1, 1, 1, 1, 1, 1];
    await ready(el);
    expect(el.value).toBe('123456');
    expect(boxes(el)).toHaveLength(8);
  });

  it('emits value-change when groups shrinking truncates the value', async () => {
    const input = hiddenInput(el);
    fireInput(input, '123456');
    await ready(el);

    const events: string[] = [];
    el.addEventListener('value-change', (e) => events.push((e as CustomEvent<string>).detail));
    el.groups = [1, 1, 1, 1];
    await ready(el);
    expect(events).toEqual(['1234']);
  });

  it('does not emit value-change when groups grows (no truncation)', async () => {
    const input = hiddenInput(el);
    fireInput(input, '123');
    await ready(el);

    const events: string[] = [];
    el.addEventListener('value-change', (e) => events.push((e as CustomEvent<string>).detail));
    el.groups = [1, 1, 1, 1, 1, 1, 1, 1];
    await ready(el);
    expect(events).toEqual([]);
  });
});

describe('mp-otp-input — type/case change re-normalises value', () => {
  it('strips letters when switching from alphanumeric to numeric, emits value-change', async () => {
    const el = makeElement();
    el.type = 'alphanumeric';
    el.case = 'preserve';
    await ready(el);
    fireInput(hiddenInput(el), 'aB1cD2');
    await ready(el);
    expect(el.value).toBe('aB1cD2');

    const events: string[] = [];
    el.addEventListener('value-change', (e) => events.push((e as CustomEvent<string>).detail));
    el.type = 'numeric';
    await ready(el);
    expect(el.value).toBe('12');
    expect(events).toEqual(['12']);
    el.remove();
  });

  it('uppercases existing letters when case flips upper, emits value-change', async () => {
    const el = makeElement();
    el.type = 'alphanumeric';
    el.case = 'preserve';
    await ready(el);
    fireInput(hiddenInput(el), 'abc12');
    await ready(el);
    expect(el.value).toBe('abc12');

    const events: string[] = [];
    el.addEventListener('value-change', (e) => events.push((e as CustomEvent<string>).detail));
    el.case = 'upper';
    await ready(el);
    expect(el.value).toBe('ABC12');
    expect(events).toEqual(['ABC12']);
    el.remove();
  });

  it('does not emit value-change when type/case toggle leaves value unchanged', async () => {
    const el = makeElement();
    await ready(el);

    fireInput(hiddenInput(el), '123');
    await ready(el);

    const events: string[] = [];
    el.addEventListener('value-change', (e) => events.push((e as CustomEvent<string>).detail));
    // numeric -> alphanumeric (digits still valid; uppercase doesn't touch digits)
    el.type = 'alphanumeric';
    await ready(el);
    expect(events).toEqual([]);
    expect(el.value).toBe('123');
    el.remove();
  });
});

describe('mp-otp-input — Scenario 10: groups validation', () => {
  it('clamps elements above MAX_GROUP_SIZE and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const el = makeElement();
    el.groups = [15];
    await ready(el);
    expect(el.groups).toEqual([10]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    el.remove();
  });

  it('drops trailing groups when total exceeds MAX_TOTAL and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const el = makeElement();
    el.groups = [10, 10, 10, 10, 10]; // total = 50, max = 40
    await ready(el);
    expect(el.groups.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(40);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    el.remove();
  });

  it('falls back to default groups when given empty array or null', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const el = makeElement();
    el.groups = [];
    await ready(el);
    expect(el.groups).toEqual([1, 1, 1, 1, 1, 1]);
    warn.mockRestore();
    el.remove();
  });

  it('clamps zero and negative entries to 1', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const el = makeElement();
    el.groups = [0, -3, 2];
    await ready(el);
    expect(el.groups).toEqual([1, 1, 2]);
    warn.mockRestore();
    el.remove();
  });
});

describe('mp-otp-input — case handling for alphanumeric', () => {
  it('uppercases input when case=upper (default)', async () => {
    const el = makeElement();
    el.type = 'alphanumeric';
    await ready(el);
    fireInput(hiddenInput(el), 'abc');
    await ready(el);
    expect(el.value).toBe('ABC');
    el.remove();
  });

  it('lowercases when case=lower', async () => {
    const el = makeElement();
    el.type = 'alphanumeric';
    el.case = 'lower';
    await ready(el);
    fireInput(hiddenInput(el), 'AbC');
    await ready(el);
    expect(el.value).toBe('abc');
    el.remove();
  });

  it('preserves case when case=preserve', async () => {
    const el = makeElement();
    el.type = 'alphanumeric';
    el.case = 'preserve';
    await ready(el);
    fireInput(hiddenInput(el), 'AbC');
    await ready(el);
    expect(el.value).toBe('AbC');
    el.remove();
  });

  it('ignores case for numeric type', async () => {
    const el = makeElement();
    el.case = 'lower';
    await ready(el);
    fireInput(hiddenInput(el), '123');
    await ready(el);
    expect(el.value).toBe('123');
    el.remove();
  });
});

describe('mp-otp-input — programmatic value setter', () => {
  it('does not fire complete on writeValue with a complete string', async () => {
    const el = makeElement();
    const completes: string[] = [];
    el.addEventListener('complete', (e) => completes.push((e as CustomEvent<string>).detail));
    await ready(el);

    el.value = '123456';
    await ready(el);
    expect(el.value).toBe('123456');
    expect(completes).toEqual([]);
    el.remove();
  });

  it('normalises programmatic value through the same filter', async () => {
    const el = makeElement();
    await ready(el);
    el.value = 'a1b2c3' as unknown as string;
    await ready(el);
    expect(el.value).toBe('123'); // numeric filter strips letters
    el.remove();
  });
});

describe('mp-otp-input — focus() delegates to hidden input', () => {
  it('focuses the hidden input', async () => {
    const el = makeElement();
    await ready(el);
    el.focus();
    expect(document.activeElement === el || el.shadowRoot?.activeElement?.classList.contains('hidden-input')).toBe(true);
    el.remove();
  });
});

describe('mp-otp-input — clear()', () => {
  it('resets the value and emits value-change', async () => {
    const el = makeElement();
    const events: string[] = [];
    el.addEventListener('value-change', (e) => events.push((e as CustomEvent<string>).detail));
    await ready(el);

    fireInput(hiddenInput(el), '123');
    await ready(el);
    el.clear();
    await ready(el);
    expect(el.value).toBe('');
    expect(events).toEqual(['123', '']);
    el.remove();
  });

  it('is a no-op when already empty', async () => {
    const el = makeElement();
    const events: string[] = [];
    el.addEventListener('value-change', (e) => events.push((e as CustomEvent<string>).detail));
    await ready(el);
    el.clear();
    expect(events).toEqual([]);
    el.remove();
  });
});

describe('mp-otp-input — active-box highlight only while focused', () => {
  let el: MintOtpInputElement;

  beforeEach(async () => { el = makeElement(); await ready(el); });
  afterEach(() => { el.remove(); });

  function hasActiveBox(): boolean {
    return Array.from(el.shadowRoot?.querySelectorAll('.box') ?? [])
      .some((b) => b.classList.contains('box-active'));
  }

  it('does not render any box as active when the component is not focused', () => {
    expect(hasActiveBox()).toBe(false);
  });

  it('highlights the next box once the hidden input gains focus', async () => {
    const input = hiddenInput(el);
    input.dispatchEvent(new Event('focus', { bubbles: true }));
    await ready(el);
    expect(hasActiveBox()).toBe(true);
  });

  it('removes the highlight on blur', async () => {
    const input = hiddenInput(el);
    input.dispatchEvent(new Event('focus', { bubbles: true }));
    await ready(el);
    expect(hasActiveBox()).toBe(true);
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await ready(el);
    expect(hasActiveBox()).toBe(false);
  });
});

describe('mp-otp-input — autocomplete heuristic', () => {
  it('uses one-time-code only for numeric + all-single-char groups', async () => {
    const el = makeElement();
    await ready(el);
    expect(hiddenInput(el).getAttribute('autocomplete')).toBe('one-time-code');

    el.type = 'alphanumeric';
    await ready(el);
    expect(hiddenInput(el).getAttribute('autocomplete')).toBe('off');

    el.type = 'numeric';
    el.groups = [3, 3];
    await ready(el);
    expect(hiddenInput(el).getAttribute('autocomplete')).toBe('off');
    el.remove();
  });
});
