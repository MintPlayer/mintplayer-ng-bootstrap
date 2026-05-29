import * as React from 'react';
// Side-effect import: registers <mp-timeline> + <mp-timeline-item>.
import '@mintplayer/web-components/timeline';
import { resolveSides, type MpTimeline } from '@mintplayer/web-components/timeline';
import type {
  TimelineAlign,
  TimelineItem,
  TimelineItemClickDetail,
  TimelineItemContext,
  TimelineOrientation,
  TimelineSelectable,
  TimelineSelectionChangeDetail,
} from '@mintplayer/web-components/timeline-core';

type RenderProp = (item: TimelineItem, ctx: TimelineItemContext) => React.ReactNode;

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
  /** Render-props — lowered into `<mp-timeline-item>` children. */
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
 * Render-props lower into `<mp-timeline-item>` children with their output in
 * the item's named slots (one shadow boundary). With no render-props, the
 * `items` array is set as the WC property, or declarative `<BsTimelineItem>`
 * children pass straight through.
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

  const ref = React.useRef<MpTimeline | null>(null);
  const hasTemplates = !!(renderMarker || renderTitle || renderTimestamp || renderOpposite || renderContent);
  const lowering = hasTemplates && !!items;

  // Custom-event listeners (React doesn't bind custom events via on* props).
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClick = (e: Event) => onItemClick?.((e as CustomEvent<TimelineItemClickDetail>).detail);
    const onSel = (e: Event) => {
      const detail = (e as CustomEvent<TimelineSelectionChangeDetail>).detail;
      if (items && items.length) {
        const ids = el.selectedIds ?? detail.selected.map((m, i) => m.id ?? i);
        const byId = new Map(items.map((it, i) => [idOf(it, i), it] as const));
        onSelectionChange?.(
          ids.map((id) => byId.get(id)).filter((x): x is TimelineItem => x !== undefined),
        );
      } else {
        onSelectionChange?.(detail.selected);
      }
    };
    el.addEventListener('item-click', onClick);
    el.addEventListener('selection-change', onSel);
    return () => {
      el.removeEventListener('item-click', onClick);
      el.removeEventListener('selection-change', onSel);
    };
  }, [items, onItemClick, onSelectionChange]);

  // Controlled selection → WC.
  React.useEffect(() => {
    const el = ref.current;
    if (!el || selectable === 'none') return;
    el.selectedIds = (selection ?? []).map((it, i) => idOf(it, i));
  }, [selection, selectable]);

  // Data path: set the WC `items` property only when not lowering to children.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.items = !lowering && items ? items : [];
  }, [items, lowering]);

  const sides = resolveSides(items?.length ?? 0, align, reverse);

  return (
    <mp-timeline
      ref={ref}
      orientation={orientation}
      align={align}
      reverse={reverse ? '' : undefined}
      selectable={selectable}
      className={className}
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
              <mp-timeline-item
                key={item.id ?? i}
                item-id={item.id}
                title={item.title}
                description={item.description}
                time={time}
                icon={item.icon}
                color={item.color}
                item-class={item.cssClass}
                disabled={item.disabled ? '' : undefined}
              >
                {renderMarker && <span slot="marker">{renderMarker(item, ctx)}</span>}
                {renderTitle && <span slot="title">{renderTitle(item, ctx)}</span>}
                {renderTimestamp && <span slot="opposite">{renderTimestamp(item, ctx)}</span>}
                {renderOpposite && <span slot="opposite">{renderOpposite(item, ctx)}</span>}
                {renderContent && <div slot="content">{renderContent(item, ctx)}</div>}
              </mp-timeline-item>
            );
          })
        : children}
    </mp-timeline>
  );
}
