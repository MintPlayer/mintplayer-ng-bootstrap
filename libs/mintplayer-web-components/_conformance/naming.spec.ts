import { beforeEach, describe, expect, it } from 'vitest';

import '@mintplayer/web-components/select';
import '@mintplayer/web-components/checkbox';
import '@mintplayer/web-components/radio';
import '@mintplayer/web-components/toggle-button';
import '@mintplayer/web-components/dropdown-menu';
import '@mintplayer/web-components/datepicker';
import '@mintplayer/web-components/timepicker';
import '@mintplayer/web-components/tree-select';
import '@mintplayer/web-components/timeline';
import '@mintplayer/web-components/datatable';
import '@mintplayer/web-components/otp-input';
import '@mintplayer/web-components/signature-pad';
import '@mintplayer/web-components/phone-input';

/**
 * The one naming contract, asserted across every component that implements it —
 * the WC-side counterpart of the Angular/React passthrough guards, and like them
 * it lives in `_conformance/` (no `src/index.ts`, so vite's entry discovery never
 * publishes it).
 *
 * Contract per PRD 5.2b/5.3:
 *  - `input-label` lands on the component's role-bearing node.
 *  - a host `aria-label` WINS over `input-label`.
 *  - components with no default invent NO name when the consumer gives none;
 *    components with a category-2 default (otp-input) apply exactly that default.
 *  - host `aria-labelledby`/`aria-describedby` are never copied inward as IDREF
 *    strings (they resolve as cross-root element references — spike 0.2; jsdom
 *    cannot observe the positive path, so only the never-copied half is here).
 *
 * The per-component `.aria.spec.ts` files cover component-specific shapes (type
 * switches, caption, defaults); this file exists so the next component cannot
 * implement the contract slightly differently — the drift this phase exists to end.
 */
interface NamingCase {
  tag: string;
  /** Selector for the role-bearing node inside the shadow root. */
  target: string;
  /** Attributes required for the element to render its target at all. */
  extra?: string;
  /** Category-2 default applied when the consumer names nothing. */
  defaultName?: string;
  /**
   * The component describes its own role-bearing node from inside its shadow root
   * (mp-phone-input points its tel input at the static dial code). The contract is
   * that a HOST IDREF is never copied inward — not that `aria-describedby` is
   * absent — so for these the assertions check what the attribute must NOT contain,
   * and the error-text references are matched within it rather than as its whole
   * value.
   */
  ownDescribedBy?: boolean;
}

const CASES: NamingCase[] = [
  { tag: 'mp-select', target: 'select' },
  { tag: 'mp-checkbox', target: 'input' },
  { tag: 'mp-radio', target: 'input' },
  { tag: 'mp-toggle-button', target: 'input' },
  { tag: 'mp-dropdown-menu', target: 'ul' },
  { tag: 'mp-datepicker', target: 'input.form-control', defaultName: 'Selected date' },
  { tag: 'mp-timepicker', target: 'input.form-control', defaultName: 'Selected time' },
  // Placeholder-less tree-select falls back to 'Search' for its combobox input.
  { tag: 'mp-tree-select', target: 'input.ts-search', defaultName: 'Search' },
  { tag: 'mp-timeline', target: '.timeline' },
  { tag: 'mp-datatable', target: 'table' },
  // Class is MintOtpInputElement, but the registered tag is mp-otp-input.
  { tag: 'mp-otp-input', target: 'input.hidden-input', defaultName: 'One-time code' },
  { tag: 'mp-signature-pad', target: 'canvas', defaultName: 'Signature pad' },
  // The role-bearing control is the tel input; its picker is named separately by
  // `country-label`, which is why a host `aria-label` must not land on both.
  { tag: 'mp-phone-input', target: 'input[type="tel"]', defaultName: 'Phone number', ownDescribedBy: true },
];

async function mount(html: string, tag: string, target: string): Promise<HTMLElement> {
  document.body.innerHTML = html;
  const host = document.querySelector(tag) as HTMLElement & { updateComplete?: Promise<unknown> };
  await host.updateComplete;
  const node = host.shadowRoot!.querySelector(target);
  expect(node, `${tag}: no ${target} in shadow root`).not.toBeNull();
  return node as HTMLElement;
}

describe.each(CASES)('$tag naming contract', ({ tag, target, extra, defaultName, ownDescribedBy }) => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const attrs = extra ?? '';

  it('applies input-label to the role-bearing node', async () => {
    const node = await mount(`<${tag} ${attrs} input-label="Probe name"></${tag}>`, tag, target);
    expect(node.getAttribute('aria-label')).toBe('Probe name');
  });

  it('lets a host aria-label win over input-label', async () => {
    const node = await mount(
      `<${tag} ${attrs} aria-label="From host" input-label="From property"></${tag}>`,
      tag,
      target,
    );
    expect(node.getAttribute('aria-label')).toBe('From host');
  });

  it(defaultName ? `defaults to "${defaultName}"` : 'invents no name', async () => {
    const node = await mount(`<${tag} ${attrs}></${tag}>`, tag, target);
    if (defaultName) expect(node.getAttribute('aria-label')).toBe(defaultName);
    else expect(node.hasAttribute('aria-label')).toBe(false);
  });

  it('never copies IDREF strings into the shadow root', async () => {
    const node = await mount(
      `<span id="outer">Name</span><${tag} ${attrs} aria-labelledby="outer" aria-describedby="outer"></${tag}>`,
      tag,
      target,
    );
    expect(node.getAttribute('aria-labelledby')).toBeNull();
    // The host's IDREF must not appear inward. A component that describes its own
    // control from inside its shadow root still has an attribute — it just must
    // never contain the consumer's id, which would resolve to nothing in here.
    if (ownDescribedBy) expect(node.getAttribute('aria-describedby')).not.toContain('outer');
    else expect(node.getAttribute('aria-describedby')).toBeNull();
  });
});

/**
 * The `error-text` channel, asserted across every form control that has one — same
 * reason as the naming contract above: five components, seven render branches, and
 * two rules that are easy to implement *almost* right.
 *
 * A message may only be referenced while the control is invalid (`aria-errormessage`
 * is undefined otherwise), and `aria-describedby` must carry the same node because
 * `aria-errormessage` support is uneven — so both references appear together, point
 * at the same in-shadow node, and disappear together.
 */
const ERROR_TEXT_CASES = CASES.filter(({ tag }) =>
  ['mp-select', 'mp-checkbox', 'mp-radio', 'mp-toggle-button', 'mp-otp-input', 'mp-phone-input'].includes(tag),
);

describe.each(ERROR_TEXT_CASES)('$tag error-text contract', ({ tag, target, extra, ownDescribedBy }) => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const attrs = extra ?? '';
  const host = () => document.querySelector(tag) as HTMLElement & { updateComplete: Promise<unknown> };

  it('references nothing and renders nothing while the control is valid', async () => {
    const node = await mount(`<${tag} ${attrs} error-text="Probe message."></${tag}>`, tag, target);
    expect(node.hasAttribute('aria-errormessage')).toBe(false);
    if (ownDescribedBy) expect(node.getAttribute('aria-describedby') ?? '').not.toMatch(/-error$/);
    else expect(node.hasAttribute('aria-describedby')).toBe(false);
    expect(host().shadowRoot!.querySelector('.invalid-feedback')).toBeNull();
  });

  it('points BOTH references at an in-shadow message node when invalid', async () => {
    const node = await mount(
      `<${tag} ${attrs} invalid error-text="Probe message."></${tag}>`,
      tag,
      target,
    );
    const id = node.getAttribute('aria-errormessage');

    expect(id, `${tag}: no aria-errormessage`).toBeTruthy();
    if (ownDescribedBy) expect(node.getAttribute('aria-describedby')).toContain(id!);
    else expect(node.getAttribute('aria-describedby')).toBe(id);
    const message = host().shadowRoot!.getElementById(id!);
    expect(message, `${tag}: aria-errormessage does not resolve in its own shadow root`).not.toBeNull();
    expect(message!.textContent).toBe('Probe message.');
  });

  it('drops node and both references when validity clears', async () => {
    const node = await mount(
      `<${tag} ${attrs} invalid error-text="Probe message."></${tag}>`,
      tag,
      target,
    );

    host().removeAttribute('invalid');
    await host().updateComplete;

    expect(node.hasAttribute('aria-errormessage')).toBe(false);
    if (ownDescribedBy) expect(node.getAttribute('aria-describedby') ?? '').not.toMatch(/-error$/);
    else expect(node.hasAttribute('aria-describedby')).toBe(false);
    expect(host().shadowRoot!.querySelector('.invalid-feedback')).toBeNull();
  });
});

describe('mp-datatable caption', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a real, visible <caption> — the native table name', async () => {
    const table = await mount('<mp-datatable caption="Quarterly results"></mp-datatable>', 'mp-datatable', 'table');
    expect(table.querySelector('caption')?.textContent).toBe('Quarterly results');
  });

  it('renders no caption element when unset', async () => {
    const table = await mount('<mp-datatable></mp-datatable>', 'mp-datatable', 'table');
    expect(table.querySelector('caption')).toBeNull();
  });
});
