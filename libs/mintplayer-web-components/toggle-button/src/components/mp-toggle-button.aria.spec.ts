import { beforeEach, describe, expect, it } from 'vitest';
import './mp-toggle-button';
import type { MpToggleButton } from './mp-toggle-button';

/**
 * Naming contract for `<mp-toggle-button>` — same contract as `mp-checkbox`
 * (see its aria spec for the full rationale). One render path, so this is the
 * lightest of the three form-toggle specs.
 */
async function mount(html: string): Promise<{ host: MpToggleButton; input: HTMLInputElement }> {
  document.body.innerHTML = html;
  const host = document.querySelector('mp-toggle-button') as MpToggleButton;
  await host.updateComplete;
  return { host, input: host.shadowRoot!.querySelector('input') as HTMLInputElement };
}

describe('mp-toggle-button naming', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('names the inner <input> from input-label (the icon-only case)', async () => {
    const { input } = await mount('<mp-toggle-button input-label="Bold"></mp-toggle-button>');
    expect(input.getAttribute('aria-label')).toBe('Bold');
  });

  it('lets a host aria-label win over input-label', async () => {
    const { input } = await mount(
      '<mp-toggle-button aria-label="From host" input-label="From property"></mp-toggle-button>',
    );
    expect(input.getAttribute('aria-label')).toBe('From host');
  });

  it('writes NO aria-label when the consumer slots visible text', async () => {
    const { input } = await mount('<mp-toggle-button>Bold</mp-toggle-button>');
    expect(input.hasAttribute('aria-label')).toBe(false);
  });

  it('does NOT copy IDREF strings into the shadow root', async () => {
    const { input } = await mount(
      '<span id="outer">Bold</span><mp-toggle-button aria-labelledby="outer"></mp-toggle-button>',
    );
    expect(input.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('removes the override cleanly rather than freezing it', async () => {
    const { host, input } = await mount('<mp-toggle-button input-label="Bold"></mp-toggle-button>');
    host.removeAttribute('input-label');
    await host.updateComplete;
    expect(input.hasAttribute('aria-label')).toBe(false);
  });
});

/**
 * The `error-text` channel — one render path, so the three states and nothing more.
 * `mp-checkbox`'s aria spec carries the rationale and the element-reference half.
 */
describe('mp-toggle-button error-text', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const feedback = (host: MpToggleButton) =>
    host.shadowRoot!.querySelector('.invalid-feedback');

  it('renders no message and no references while the control is valid', async () => {
    const { host, input } = await mount(
      '<mp-toggle-button error-text="Pick at least one."></mp-toggle-button>',
    );
    expect(feedback(host)).toBeNull();
    expect(input.hasAttribute('aria-errormessage')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('renders the message and BOTH references when invalid, resolving in this shadow root', async () => {
    const { host, input } = await mount(
      '<mp-toggle-button invalid error-text="Pick at least one.">Bold</mp-toggle-button>',
    );
    const id = input.getAttribute('aria-errormessage');

    expect(id).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toBe(id);
    expect(host.shadowRoot!.getElementById(id!)).toBe(feedback(host));
    expect(feedback(host)!.textContent).toBe('Pick at least one.');
  });

  it('appears when the control turns invalid after render — PRD 11a', async () => {
    const { host, input } = await mount(
      '<mp-toggle-button error-text="Pick at least one."></mp-toggle-button>',
    );
    host.setAttribute('invalid', '');
    await host.updateComplete;

    expect(input.getAttribute('aria-errormessage')).toBe(feedback(host)!.id);
  });

  it('removes the node AND both references again when validity clears', async () => {
    const { host, input } = await mount(
      '<mp-toggle-button invalid error-text="Pick at least one."></mp-toggle-button>',
    );
    host.removeAttribute('invalid');
    await host.updateComplete;

    expect(feedback(host)).toBeNull();
    expect(input.hasAttribute('aria-errormessage')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('takes the message from the errorText property as well as the attribute', async () => {
    const { host, input } = await mount('<mp-toggle-button invalid></mp-toggle-button>');
    host.errorText = 'Pick at least one.';
    await host.updateComplete;

    expect(input.getAttribute('aria-describedby')).toBe(feedback(host)!.id);
  });
});
