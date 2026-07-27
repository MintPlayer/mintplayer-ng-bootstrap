import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpSplitter,
  type SplitterResizeEventDetail,
} from '@mintplayer/web-components/splitter';

/**
 * React wrapper for `<mp-splitter>`. Side-effect-registers the WC via
 * the import above. Surfaces the 3-stage resize lifecycle as React
 * `on*` props with full detail typing.
 *
 * Each direct child becomes a resizable panel with draggable dividers
 * auto-inserted between them. Configure via the `orientation`
 * (`horizontal` | `vertical`), `minPanelSize` and `touchMode` props;
 * read/write sizes programmatically through a ref
 * (`getPanelSizes()` / `setPanelSizes()` / `resizeDividerBy()`).
 */
export const BsSplitter = createComponent({
  react: React,
  tagName: 'mp-splitter',
  elementClass: MpSplitter,
  events: {
    onResizeStart: 'resize-start' as EventName<CustomEvent<SplitterResizeEventDetail>>,
    onResizing: 'resizing' as EventName<CustomEvent<SplitterResizeEventDetail>>,
    onResizeEnd: 'resize-end' as EventName<CustomEvent<SplitterResizeEventDetail>>,
  },
});
