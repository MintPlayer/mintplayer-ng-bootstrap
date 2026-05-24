import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpTabControl,
  MpTabPage,
  type TabActivateEventDetail,
} from '@mintplayer/web-components/tab-control';

/**
 * React wrappers for `<mp-tab-control>` + `<mp-tab-page>`. Side-effect-
 * registers both WCs via the import above. Consumers compose them:
 *
 *   <BsTabControl onTabActivate={…}>
 *     <BsTabPage tabId="..." title="...">...</BsTabPage>
 *   </BsTabControl>
 */
export const BsTabControl = createComponent({
  react: React,
  tagName: 'mp-tab-control',
  elementClass: MpTabControl,
  events: {
    onTabActivate: 'tab-activate' as EventName<CustomEvent<TabActivateEventDetail>>,
  },
});

export const BsTabPage = createComponent({
  react: React,
  tagName: 'mp-tab-page',
  elementClass: MpTabPage,
});
