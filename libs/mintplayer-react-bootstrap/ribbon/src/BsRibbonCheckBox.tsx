import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpRibbonCheckBox } from '@mintplayer/web-components/ribbon';

/**
 * React wrapper for `<mp-ribbon-checkbox>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpRibbonCheckBox;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsRibbonCheckBox = createComponent({
  react: React,
  tagName: 'mp-ribbon-checkbox',
  elementClass: MpRibbonCheckBox,
});
