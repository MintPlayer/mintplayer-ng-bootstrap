import * as React from 'react';
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  BsQuickAccessToolbar,
  BsRibbon,
  BsRibbonButton,
  BsRibbonContextualTabSet,
  BsRibbonGroup,
  BsRibbonTab,
  BsRibbonToggleButton,
  type RibbonItemClickEventDetail,
  type RibbonTabChangeEventDetail,
} from '@mintplayer/react-bootstrap/ribbon';

import { renderEl } from './harness';

/**
 * `BsRibbon` renders the headless ribbon itself (#437). The core's and the Lit
 * front's specs cover the behaviour; this pins what is React's own: the tab
 * strip comes from the authored `BsRibbonTab` children (a content query, so it
 * server-renders), two-way inputs report through `on<Name>Change`, outputs are
 * `on<Name>` props receiving the payload, and the slot props render React content.
 */

const click = (el: Element) => act(async () => (el as HTMLElement).click());
const tabLabels = (root: Element) => [...root.querySelectorAll('[role="tab"]')].map((t) => t.textContent?.trim());

const ribbon = (props: React.ComponentProps<typeof BsRibbon> = {}, pictureTools = false) => (
  <BsRibbon {...props}>
    <BsRibbonTab tabId="home" label="Home">
      <BsRibbonGroup groupId="font" label="Font">
        <BsRibbonButton itemId="paste" label="Paste" iconTemplate={<i className="probe-icon" />} />
      </BsRibbonGroup>
    </BsRibbonTab>
    <BsRibbonContextualTabSet label="Picture Tools" visible={pictureTools}>
      <BsRibbonTab tabId="format" label="Format" />
    </BsRibbonContextualTabSet>
    <BsRibbonTab tabId="insert" label="Insert" />
  </BsRibbon>
);

describe('BsRibbon', () => {
  it('server-renders the tab strip from its tab children', () => {
    const html = renderToString(ribbon({}, true));
    expect(html).toContain('role="tablist"');
    expect([...html.matchAll(/role="tab"[^>]*>([^<]*)</g)].map((m) => m[1].trim())).toEqual(['Home', 'Format', 'Insert']);
  });

  it('leaves a hidden contextual set out of the strip', async () => {
    const root = await renderEl(ribbon(), 'div.ribbon');
    expect(tabLabels(root)).toEqual(['Home', 'Insert']);
  });

  it('reports a tab click through onActiveTabIdChange and onTabChange', async () => {
    const ids: string[] = [];
    const changes: RibbonTabChangeEventDetail[] = [];
    const root = await renderEl(ribbon({ onActiveTabIdChange: (id) => ids.push(id), onTabChange: (d) => changes.push(d) }), 'div.ribbon');
    await click(root.querySelector('[data-ribbon-tab="insert"]')!);
    expect(ids).toEqual(['insert']);
    expect(changes).toEqual([{ previousTabId: 'home', activeTabId: 'insert' }]);
  });

  it('renders the tellMe and iconTemplate slots as React content', async () => {
    const root = await renderEl(ribbon({ tellMe: <input className="probe-tell-me" /> }), 'div.ribbon');
    expect(root.querySelector('.probe-tell-me')).not.toBeNull();
    expect(root.querySelector('.ribbon-button-icon .probe-icon')).not.toBeNull();
  });

  it('items report on<Name> with the payload, and two-way pressed through onPressedChange', async () => {
    const clicks: RibbonItemClickEventDetail[] = [];
    const pressed: boolean[] = [];
    const root = await renderEl(
      <BsQuickAccessToolbar aria-label="QAT">
        <BsRibbonButton itemId="save" label="Save" size="small" onItemClick={(d) => clicks.push(d)} />
        <BsRibbonToggleButton itemId="bold" label="Bold" size="small" onPressedChange={(p) => pressed.push(p)} />
      </BsQuickAccessToolbar>,
      'div.qat',
    );
    expect(root.getAttribute('aria-label')).toBe('QAT');
    const [save, bold] = [...root.querySelectorAll<HTMLElement>('button')];
    await click(save);
    await click(bold);
    expect(clicks.map((c) => c.itemId)).toEqual(['save']);
    expect(pressed).toEqual([true]);
  });
});
