import { afterEach, describe, expect, it, vi } from 'vitest';
import { MpAlert } from './generated';

void MpAlert; // force the side-effect registration

async function mount(markup: string): Promise<MpAlert> {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  const el = host.querySelector('mp-alert') as MpAlert;
  await el.updateComplete;
  return el;
}

const close = (el: MpAlert) => el.querySelector('button.btn-close') as HTMLButtonElement | null;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-alert', () => {
  it('is a coloured alert on the host, with no role unless announcing', async () => {
    const el = await mount('<mp-alert color="warning">Heads up</mp-alert>');
    expect(el.classList.contains('alert')).toBe(true);
    expect(el.classList.contains('alert-warning')).toBe(true);
    expect(el.hasAttribute('role')).toBe(false);
    expect(close(el)).toBeNull();
    el.announce = true;
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('alert');
  });

  it('dismisses through its named close button, writes visible back and keeps focus on the page', async () => {
    const el = await mount('<mp-alert dismissible close-label="Dismiss notice">Heads up</mp-alert><button id="next">next</button>');
    const button = close(el)!;
    expect(button.getAttribute('aria-label')).toBe('Dismiss notice');
    expect(button.hidden).toBe(false);
    const onChange = vi.fn();
    el.addEventListener('visiblechange', onChange);
    button.focus();
    button.click();
    await el.updateComplete;
    expect(el.hidden).toBe(true);
    expect(el.visible).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(document.activeElement?.id).toBe('next');
  });

  it('shows again when visible is set', async () => {
    const el = await mount('<mp-alert dismissible>Heads up</mp-alert>');
    close(el)!.click();
    await el.updateComplete;
    el.visible = true;
    // The core moves its state from the reported input, in a chained update: settle them all.
    while (!(await el.updateComplete));
    expect(el.hidden).toBe(false);
  });
});
