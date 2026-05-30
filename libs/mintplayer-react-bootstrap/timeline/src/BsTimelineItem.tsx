import * as React from 'react';
import { createComponent } from '@lit/react';
// Side-effect import: registers <mp-timeline-item>.
import '@mintplayer/web-components/timeline';
import { MpTimelineItem } from '@mintplayer/web-components/timeline';

/**
 * `<BsTimelineItem>` — declarative row for `<BsTimeline>`. Renders the
 * `<mp-timeline-item>` custom element directly (props map to element
 * properties), so it projects cleanly into the timeline's default slot.
 *
 * Props mirror the element's properties: `itemId`, `title`, `description`,
 * `time`, `icon`, `color`, `itemClass`, `disabled`, `selected`. Slot content is
 * passed as children with `slot="marker|title|opposite|content|connector"`.
 */
export const BsTimelineItem = createComponent({
  react: React,
  tagName: 'mp-timeline-item',
  elementClass: MpTimelineItem,
});
