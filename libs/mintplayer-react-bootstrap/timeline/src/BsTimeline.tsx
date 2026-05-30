import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
// Side-effect import: registers <mp-timeline> + <mp-timeline-item>.
import '@mintplayer/web-components/timeline';
import { MpTimeline, resolveSides } from '@mintplayer/web-components/timeline';
import type {
  TimelineAlign,
  TimelineItem,
  TimelineItemClickDetail,
  TimelineItemContext,
  TimelineOrientation,
  TimelineSelectable,
  TimelineSelectionChangeDetail,
} from '@mintplayer/web-components/timeline-core';
import { BsTimelineItem } from './BsTimelineItem';

type RenderProp = (item: TimelineItem, ctx: TimelineItemContext) => React.ReactNode;

const MpTimelineBase = createComponent({
  react: React,
  tagName: 'mp-timeline',
  elementClass: MpTimeline,
  events: {
    onItemClick: 'item-click' as EventName<CustomEvent<TimelineItemClickDetail>>,
    onSelectionChange: 'selection-change' as EventName<CustomEvent<TimelineSelectionChangeDetail>>,
  },
});

export interface BsTimelineProps {
  items?: TimelineItem[];
  orientation?: TimelineOrientation;
  align?: TimelineAlign;
  reverse?: boolean;
  selectable?: TimelineSelectable;
  /** Controlled selection (array of items, identity via `id`). */
  selection?: TimelineItem[];
  onSelectionChange?: (selected: TimelineItem[]) => void;
  onItemClick?: (detail: TimelineItemClickDetail) => void;
  /** Render-props — lowered into `<BsTimelineItem>` children. */
  renderMarker?: RenderProp;
  renderTitle?: RenderProp;
  renderTimestamp?: RenderProp;
  renderOpposite?: RenderProp;
  renderContent?: RenderProp;
  className?: string;
  /** Declarative `<BsTimelineItem>` children (used when no render-props). */
  children?: React.ReactNode;
}

const idOf = (item: TimelineItem, index: number): string | number => item.id ?? index;

/**
 * `<BsTimeline>` — React wrapper around `<mp-timeline>`.
 *
 * Render-props lower into `<BsTimelineItem>` children with their output in the
 * item's named slots (one shadow boundary). With no render-props, `items` is
 * set as the WC property, or declarative `<BsTimelineItem>` children pass
 * straight through.
 */
export function BsTimeline(props: BsTimelineProps): React.ReactElement {
  const {
    items,
    orientation = 'vertical',
    align = 'start',
    reverse = false,
    selectable = 'none',
    selection,
    onSelectionChange,
    onItemClick,
    renderMarker,
    renderTitle,
    renderTimestamp,
    renderOpposite,
    renderContent,
    className,
    children,
  } = props;

  const hasTemplates = !!(renderMarker || renderTitle || renderTimestamp || renderOpposite || renderContent);
  const dataMode = !!items && !hasTemplates;
  const lowering = hasTemplates && !!items;

  const handleItemClick = (e: CustomEvent<TimelineItemClickDetail>): void => onItemClick?.(e.detail);
  const handleSelectionChange = (e: CustomEvent<TimelineSelectionChangeDetail>): void => {
    const detail = e.detail;
    if (items && items.length) {
      const byId = new Map(items.map((it, i) => [String(idOf(it, i)), it] as const));
      onSelectionChange?.(
        detail.selected.map((m) => byId.get(String(m.id ?? '')) ?? m),
      );
    } else {
      onSelectionChange?.(detail.selected);
    }
  };

  const sides = resolveSides(items?.length ?? 0, align, reverse);

  return (
    <MpTimelineBase
      orientation={orientation}
      align={align}
      reverse={reverse}
      selectable={selectable}
      className={className}
      onItemClick={handleItemClick}
      onSelectionChange={handleSelectionChange}
      {...(dataMode ? { items } : {})}
      {...(selectable !== 'none' ? { selectedIds: selection ? selection.map((it, i) => idOf(it, i)) : [] } : {})}
    >
      {lowering && items
        ? items.map((item, i) => {
            const len = items.length;
            const visualIndex = reverse ? len - 1 - i : i;
            const ctx: TimelineItemContext = {
              index: i,
              visualIndex,
              isFirst: visualIndex === 0,
              isLast: visualIndex === len - 1,
              orientation,
              side: sides[i] ?? 'start',
            };
            const time = item.time instanceof Date ? item.time.toLocaleDateString() : item.time;
            return (
              <BsTimelineItem
                key={item.id ?? i}
                itemId={item.id}
                title={item.title}
                description={item.description}
                time={time ?? undefined}
                icon={item.icon}
                color={item.color}
                itemClass={item.cssClass}
                disabled={item.disabled}
              >
                {renderMarker && <span slot="marker">{renderMarker(item, ctx)}</span>}
                {renderTitle && <span slot="title">{renderTitle(item, ctx)}</span>}
                {renderTimestamp && <span slot="opposite">{renderTimestamp(item, ctx)}</span>}
                {renderOpposite && <span slot="opposite">{renderOpposite(item, ctx)}</span>}
                {renderContent && <div slot="content">{renderContent(item, ctx)}</div>}
              </BsTimelineItem>
            );
          })
        : dataMode
          ? null
          : children}
    </MpTimelineBase>
  );
}
