import { afterEach, describe, expect, it } from 'vitest';
import { MpProgress, MpProgressBar } from './generated';

void MpProgress; // force the side-effect registrations
void MpProgressBar;

async function mount(markup: string): Promise<HTMLElement> {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  const elements = [...host.querySelectorAll<MpProgress | MpProgressBar>('mp-progress, mp-progress-bar')];
  for (const el of elements) while (!(await el.updateComplete));
  return host;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-progress', () => {
  it('renders each bar as a named progressbar inside the track, its rounded share as data-progress', async () => {
    const host = await mount('<mp-progress><mp-progress-bar value="30" maximum="60" aria-label="Upload"></mp-progress-bar></mp-progress>');
    const bar = host.querySelector('.progress > mp-progress-bar > .progress-bar') as HTMLElement;
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('30');
    expect(bar.getAttribute('aria-valuemax')).toBe('60');
    expect(bar.getAttribute('aria-label')).toBe('Upload');
    expect(bar.getAttribute('data-progress')).toBe('50');
    expect(bar.hasAttribute('style')).toBe(false);
  });

  it('an indeterminate track shows one valueless progressbar instead of its bars', async () => {
    const host = await mount('<mp-progress indeterminate label="Laden"><mp-progress-bar value="30"></mp-progress-bar></mp-progress>');
    const bars = host.querySelectorAll('[role=progressbar]');
    expect(bars).toHaveLength(1);
    expect(bars[0].getAttribute('aria-label')).toBe('Laden');
    expect(bars[0].hasAttribute('aria-valuenow')).toBe(false);
  });
});
