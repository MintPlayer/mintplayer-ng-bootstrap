import { describe, it, expect, afterEach } from 'vitest';
import { MpTabControl } from './mp-tab-control';
void MpTabControl;

async function flush(el: MpTabControl): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

function makeTabs(activeTab: string | null = 'overview'): MpTabControl {
  const el = document.createElement('mp-tab-control') as MpTabControl;
  if (activeTab !== null) el.setAttribute('active-tab', activeTab);

  const headerOverview = document.createElement('span');
  headerOverview.setAttribute('slot', 'overview-header');
  headerOverview.textContent = 'Overview';
  const contentOverview = document.createElement('div');
  contentOverview.setAttribute('slot', 'overview-content');
  contentOverview.textContent = 'Overview body';

  const headerDetails = document.createElement('span');
  headerDetails.setAttribute('slot', 'details-header');
  headerDetails.textContent = 'Details';
  const contentDetails = document.createElement('div');
  contentDetails.setAttribute('slot', 'details-content');
  contentDetails.textContent = 'Details body';

  el.append(headerOverview, contentOverview, headerDetails, contentDetails);
  return el;
}

describe('mp-tab-control tab-panel ARIA wiring', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('puts role="tabpanel" on the active content wrapper', async () => {
    const el = makeTabs('overview');
    document.body.appendChild(el);
    await flush(el);

    const panel = el.shadowRoot!.querySelector('.tab-content');
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute('role')).toBe('tabpanel');
  });

  it('panel id matches the tab button\'s aria-controls', async () => {
    const el = makeTabs('overview');
    document.body.appendChild(el);
    await flush(el);

    const button = el.shadowRoot!.querySelector<HTMLButtonElement>(
      'button[id="overview-header-button"]',
    )!;
    expect(button.getAttribute('aria-controls')).toBe('overview-panel');

    const panel = el.shadowRoot!.querySelector('.tab-content')!;
    expect(panel.id).toBe('overview-panel');
  });

  it('panel aria-labelledby points at the active tab button', async () => {
    const el = makeTabs('overview');
    document.body.appendChild(el);
    await flush(el);

    const panel = el.shadowRoot!.querySelector('.tab-content')!;
    expect(panel.getAttribute('aria-labelledby')).toBe('overview-header-button');
  });

  it('panel becomes focusable (tabindex="0") so keyboard users can Tab into the body', async () => {
    const el = makeTabs('overview');
    document.body.appendChild(el);
    await flush(el);

    const panel = el.shadowRoot!.querySelector('.tab-content')!;
    expect(panel.getAttribute('tabindex')).toBe('0');
  });

  it('updates the panel id and aria-labelledby when the active tab changes', async () => {
    const el = makeTabs('overview');
    document.body.appendChild(el);
    await flush(el);

    el.setAttribute('active-tab', 'details');
    await flush(el);

    const panel = el.shadowRoot!.querySelector('.tab-content')!;
    expect(panel.id).toBe('details-panel');
    expect(panel.getAttribute('aria-labelledby')).toBe('details-header-button');
    expect(panel.getAttribute('role')).toBe('tabpanel');
  });

  it('drops role/id/labelledby when no tab is active', async () => {
    const el = makeTabs(null);
    el.setAttribute('select-first-tab', 'false');
    document.body.appendChild(el);
    await flush(el);

    const panel = el.shadowRoot!.querySelector('.tab-content')!;
    expect(panel.hasAttribute('role')).toBe(false);
    expect(panel.hasAttribute('id')).toBe(false);
    expect(panel.hasAttribute('aria-labelledby')).toBe(false);
    expect(panel.hasAttribute('tabindex')).toBe(false);
  });
});
