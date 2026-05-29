import * as React from 'react';
import '@mintplayer/web-components/timeline';
import type { MpTimelineItem } from '@mintplayer/web-components/timeline';

export interface BsTimelineItemProps {
  itemId?: string | number;
  title?: string;
  description?: string;
  time?: string;
  icon?: string;
  color?: string;
  cssClass?: string;
  disabled?: boolean;
  /** Seeds the timeline's initial selection (when selectable). */
  selected?: boolean;
  children?: React.ReactNode;
}

/**
 * `<BsTimelineItem>` — declarative row for `<BsTimeline>`. Renders the
 * `<mp-timeline-item>` custom element directly (no extra wrapper host), so it
 * projects cleanly into the timeline's default slot.
 */
export const BsTimelineItem = React.forwardRef<MpTimelineItem, BsTimelineItemProps>(
  function BsTimelineItem(
    { itemId, title, description, time, icon, color, cssClass, disabled, selected, children },
    ref,
  ) {
    return (
      <mp-timeline-item
        ref={ref}
        item-id={itemId}
        title={title}
        description={description}
        time={time}
        icon={icon}
        color={color}
        item-class={cssClass}
        disabled={disabled ? '' : undefined}
        selected={selected ? '' : undefined}
      >
        {children}
      </mp-timeline-item>
    );
  },
);
