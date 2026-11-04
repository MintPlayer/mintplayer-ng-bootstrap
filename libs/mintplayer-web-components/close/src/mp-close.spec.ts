import { afterEach, describe, expect, it, vi } from 'vitest';
import { MpClose } from './generated';

void MpClose; // force the side-effect registration

async function mount(markup: string): Promise<MpClose> {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  const el = host.querySelector('mp-close') as MpClose;
  await el.updateComplete;
  return el;
}

const button = (el: MpClose) => el.querySelector('button') as HTMLButtonElement;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-close', () => {
  it('renders a real, named, non-submit button', async () => {
    const el = await mount('<mp-close></mp-close>');
    expect(button(el).className).toBe('btn-close');
    expect(button(el).type).toBe('button');
    expect(button(el).getAttribute('aria-label')).toBe('Close');
  });

  it("forwards the consumer's id, tabindex and aria-* to the button (#458)", async () => {
    const el = await mount('<mp-close id="dismiss" tabindex="3" aria-label="Dismiss alert"></mp-close>');
    expect(button(el).id).toBe('dismiss');
    expect(button(el).getAttribute('tabindex')).toBe('3');
    expect(button(el).getAttribute('aria-label')).toBe('Dismiss alert');
    expect(el.hasAttribute('id')).toBe(false);
    expect(el.hasAttribute('tabindex')).toBe(false);
  });

  it('lets the native click bubble to the element, and a disabled button sends none', async () => {
    const el = await mount('<mp-close></mp-close>');
    const onClick = vi.fn();
    el.addEventListener('click', onClick);
    button(el).click();
    expect(onClick).toHaveBeenCalledTimes(1);
    el.disabled = true;
    await el.updateComplete;
    expect(button(el).disabled).toBe(true);
    button(el).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
