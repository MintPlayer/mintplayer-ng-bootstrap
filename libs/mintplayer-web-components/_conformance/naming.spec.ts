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
];

async function mount(html: string, tag: string, target: string): Promise<HTMLElement> {
  document.body.innerHTML = html;
  const host = document.querySelector(tag) as HTMLElement & { updateComplete?: Promise<unknown> };
  await host.updateComplete;
  const node = host.shadowRoot!.querySelector(target);
  expect(node, `${tag}: no ${target} in shadow root`).not.toBeNull();
  return node as HTMLElement;
}

describe.each(CASES)('$tag naming contract', ({ tag, target, extra, defaultName }) => {
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
    expect(node.getAttribute('aria-describedby')).toBeNull();
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
