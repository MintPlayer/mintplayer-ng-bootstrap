import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './mp-ribbon-tab.element';
import type { MpRibbonTab, RibbonReduceStep } from './mp-ribbon-tab.element';

function nextRaf(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

async function mountTab(setup: (tab: MpRibbonTab) => void): Promise<MpRibbonTab> {
  const tab = document.createElement('mp-ribbon-tab') as MpRibbonTab;
  tab.tabId = 'home';
  tab.label = 'Home';
  setup(tab);
  document.body.appendChild(tab);
  await (tab as unknown as { updateComplete: Promise<void> }).updateComplete;
  await nextRaf();
  return tab;
}

describe('mp-ribbon-tab — reduceOrder validation (FR-6)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    document.body.querySelectorAll('mp-ribbon-tab').forEach((t) => t.remove());
  });

  it('accepts a well-formed reduceOrder without warning', async () => {
    await mountTab((tab) => {
      tab.reduceOrder = [
        ['font', 'medium'],
        ['font', 'small'],
        ['font', 'popup'],
      ] as readonly RibbonReduceStep[];
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns when a target size is outside the four-value enum', async () => {
    await mountTab((tab) => {
      tab.reduceOrder = [
        ['font', 'medium'],
        ['font', 'gigantic' as never],
      ] as readonly RibbonReduceStep[];
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/invalid size/i);
  });

  it('warns when a group steps to an equal or larger size (non-reduction)', async () => {
    await mountTab((tab) => {
      tab.reduceOrder = [
        ['font', 'medium'],
        ['font', 'large'],
      ] as readonly RibbonReduceStep[];
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/not a reduction/i);
  });

  it('honours idealSizes when validating the first step of a group', async () => {
    await mountTab((tab) => {
      tab.idealSizes = { font: 'medium' };
      // Starting at medium, "medium" again is NOT a reduction.
      tab.reduceOrder = [['font', 'medium']] as readonly RibbonReduceStep[];
    });
    expect(warnSpy).toHaveBeenCalled();
  });

  it('does not crash on an empty reduceOrder', async () => {
    await mountTab((tab) => {
      tab.reduceOrder = [];
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('mp-ribbon-tab — tabpanel wiring (FR-2)', () => {
  it('sets role + id + aria-labelledby from tabId', async () => {
    const tab = await mountTab((t) => {
      t.tabId = 'design';
    });
    expect(tab.getAttribute('role')).toBe('tabpanel');
    expect(tab.id).toBe('ribbon-panel-design');
    expect(tab.getAttribute('aria-labelledby')).toBe('ribbon-tab-design');
    tab.remove();
  });
});
