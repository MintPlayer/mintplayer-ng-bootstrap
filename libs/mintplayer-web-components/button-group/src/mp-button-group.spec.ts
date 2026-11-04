import { afterEach, describe, expect, it } from 'vitest';
import { MpButtonGroup } from './generated';

void MpButtonGroup; // force the side-effect registration

async function mount(markup: string): Promise<MpButtonGroup> {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  const el = host.querySelector('mp-button-group') as MpButtonGroup;
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-button-group', () => {
  it('is a named group around its buttons, which keep their identity', async () => {
    const el = await mount('<mp-button-group label="Alignment"><button class="btn btn-primary">L</button><button class="btn btn-primary">R</button></mp-button-group>');
    expect(el.classList.contains('btn-group')).toBe(true);
    expect(el.getAttribute('role')).toBe('group');
    expect(el.getAttribute('aria-label')).toBe('Alignment');
    expect([...el.querySelectorAll(':scope > button')].map((b) => b.textContent)).toEqual(['L', 'R']);
  });

  it('stacks and sizes', async () => {
    const el = await mount('<mp-button-group vertical size="sm"></mp-button-group>');
    expect(el.classList.contains('btn-group-vertical')).toBe(true);
    expect(el.classList.contains('btn-group')).toBe(false);
    expect(el.classList.contains('btn-group-sm')).toBe(true);
  });
});
