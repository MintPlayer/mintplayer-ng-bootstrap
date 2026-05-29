import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { MpTimeline, MpTimelineItem } from '@mintplayer/web-components/timeline';

type CustomElement<T> = DetailedHTMLProps<HTMLAttributes<T>, T>;

// Make the timeline custom elements usable as JSX intrinsics with their
// kebab-case attributes typed. Primitive props are applied as attributes on
// custom elements by React 19; `items` / `selectedIds` (which exist as
// properties on MpTimeline) are applied as properties.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mp-timeline': CustomElement<MpTimeline> & {
        orientation?: string;
        align?: string;
        reverse?: string;
        selectable?: string;
      };
      'mp-timeline-item': CustomElement<MpTimelineItem> & {
        'item-id'?: string | number;
        title?: string;
        description?: string;
        time?: string;
        icon?: string;
        color?: string;
        'item-class'?: string;
        disabled?: string;
        selected?: string;
        side?: string;
        slot?: string;
      };
    }
  }
}
