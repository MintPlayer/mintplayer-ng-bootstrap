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
