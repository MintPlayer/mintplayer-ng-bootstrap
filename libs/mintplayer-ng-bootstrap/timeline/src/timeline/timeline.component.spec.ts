import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { MpTimeline } from '@mintplayer/web-components/timeline';
import type {
  TimelineAlign,
  TimelineItem,
  TimelineItemClickDetail,
  TimelineOrientation,
  TimelineSelectable,
} from '@mintplayer/web-components/timeline-core';
import { BsTimelineComponent } from './timeline.component';
import {
  BsTimelineConnectorDirective,
  BsTimelineContentDirective,
  BsTimelineMarkerDirective,
  BsTimelineOppositeDirective,
  BsTimelineTimestampDirective,
  BsTimelineTitleDirective,
} from '../directives/timeline-template.directives';

/**
 * `<bs-timeline>` lowers `[items]` into `<mp-timeline-item>` children (the WC
 * therefore runs in its declarative mode) and projects each `*bsTimeline*`
 * template into the matching slot with a layout context. The contract here is
 * the bridge: inputs reach the element as attributes, the selection model
 * round-trips through the element's ids, and the context each template sees
 * agrees with the layout the WC renders.
 */

const ITEMS: TimelineItem[] = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Beta', description: 'Second', icon: 'bi bi-star', color: 'red', cssClass: 'hot' },
  { id: 'c', title: 'Gamma', time: new Date(2024, 4, 6), disabled: true },
];

@Component({
  imports: [
    BsTimelineComponent,
    BsTimelineMarkerDirective,
    BsTimelineTitleDirective,
    BsTimelineTimestampDirective,
    BsTimelineContentDirective,
    BsTimelineOppositeDirective,
    BsTimelineConnectorDirective,
  ],
  template: `
    <bs-timeline [items]="items()" [orientation]="orientation()" [align]="align()" [reverse]="reverse()"
      [selectable]="selectable()" [activatable]="activatable()" [(selection)]="selection"
      (itemClick)="clicks.push($event)">
      @if (templated()) {
        <span *bsTimelineMarker="let item; let i = index" class="t-marker">{{ item.id }}{{ i }}</span>
        <b *bsTimelineTitle="let item; let v = visualIndex; let first = isFirst; let last = isLast"
          class="t-title">{{ item.title }}|{{ v }}|{{ first }}|{{ last }}</b>
        <i *bsTimelineTimestamp="let item; let s = side" class="t-time">{{ s }}</i>
        <p *bsTimelineContent="let item; let o = orientation" class="t-content">{{ o }}</p>
        <em *bsTimelineOpposite="let item" class="t-opposite">{{ item.id }}</em>
        <u *bsTimelineConnector="let item; let to = toItem; let i = index" class="t-connector">{{ item.id }}>{{ to?.id ?? 'end' }}</u>
      }
    </bs-timeline>`,
})
class HostComponent {
  readonly items = signal<TimelineItem[]>(ITEMS);
  readonly orientation = signal<TimelineOrientation>('vertical');
  readonly align = signal<TimelineAlign>('start');
  readonly reverse = signal(false);
  readonly selectable = signal<TimelineSelectable>('multiple');
  readonly activatable = signal(false);
  readonly selection = signal<TimelineItem[]>([]);
  readonly templated = signal(true);
  readonly clicks: TimelineItemClickDetail[] = [];
}

@Component({
  imports: [BsTimelineComponent],
  template: `
    <bs-timeline selectable="single" [(selection)]="selection">
      <mp-timeline-item item-id="x" title="Ex"></mp-timeline-item>
      <mp-timeline-item item-id="y" title="Why"></mp-timeline-item>
    </bs-timeline>`,
})
class DeclarativeHostComponent {
  readonly selection = signal<TimelineItem[]>([]);
}

describe('BsTimelineComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const host = () => fixture.componentInstance;
  const wc = () => fixture.nativeElement.querySelector('mp-timeline') as MpTimeline;
  const rows = () => Array.from(wc().querySelectorAll<HTMLElement>('mp-timeline-item'));
  const texts = (selector: string) =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll(selector)).map((n) => n.textContent?.trim());
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    await settle();
  });

  describe('inputs reach the element', () => {
    it('writes the layout inputs as attributes', async () => {
      host().orientation.set('horizontal');
      host().align.set('alternate');
      host().reverse.set(true);
      host().activatable.set(true);
      await settle();
      expect(wc().getAttribute('orientation')).toBe('horizontal');
      expect(wc().getAttribute('align')).toBe('alternate');
      expect(wc().hasAttribute('reverse')).toBe(true);
      expect(wc().getAttribute('selectable')).toBe('multiple');
      expect(wc().hasAttribute('activatable')).toBe(true);

      host().reverse.set(false);
      host().activatable.set(false);
      await settle();
      expect(wc().hasAttribute('reverse')).toBe(false);
      expect(wc().hasAttribute('activatable')).toBe(false);
    });

    it('lowers each item onto an mp-timeline-item', () => {
      const [a, b, c] = rows();
      expect(a.getAttribute('item-id')).toBe('a');
      expect(a.getAttribute('title')).toBe('Alpha');
      expect(a.hasAttribute('description')).toBe(false);
      expect(a.hasAttribute('time')).toBe(false);
      expect(b.getAttribute('description')).toBe('Second');
      expect(b.getAttribute('icon')).toBe('bi bi-star');
      expect(b.getAttribute('color')).toBe('red');
      expect(b.getAttribute('item-class')).toBe('hot');
      expect(c.getAttribute('time')).toBe(new Date(2024, 4, 6).toLocaleDateString());
      expect(c.hasAttribute('disabled')).toBe(true);
    });

    it('passes a string time through and omits the id of an id-less item', async () => {
      host().items.set([{ title: 'No id', time: 'yesterday' }]);
      await settle();
      expect(rows()[0].hasAttribute('item-id')).toBe(false);
      expect(rows()[0].getAttribute('time')).toBe('yesterday');
    });
  });

  describe('templates are projected with their layout context', () => {
    it('projects every template into its slot, once per item', () => {
      const slots = rows().map((r) => Array.from(r.children).map((c) => c.getAttribute('slot')));
      expect(slots[0]).toEqual(['marker', 'title', 'opposite', 'opposite', 'content', 'connector']);
      expect(slots).toHaveLength(3);
    });

    it('hands the marker the item and its data index', () => {
      expect(texts('.t-marker')).toEqual(['a0', 'b1', 'c2']);
    });

    it('reports visual position, first and last in data order', () => {
      expect(texts('.t-title')).toEqual(['Alpha|0|true|false', 'Beta|1|false|false', 'Gamma|2|false|true']);
    });

    // Under reverse the visual order flips while the data order does not;
    // a template drawing "first" or "last" decorations must follow the eye.
    it('flips visual position under reverse', async () => {
      host().reverse.set(true);
      await settle();
      expect(texts('.t-title')).toEqual(['Alpha|2|false|true', 'Beta|1|false|false', 'Gamma|0|true|false']);
    });

    it('agrees with the WC on the side of each item', async () => {
      host().align.set('alternate');
      await settle();
      expect(texts('.t-time')).toEqual(['start', 'end', 'start']);
    });

    it('tells the content template the orientation', async () => {
      host().orientation.set('horizontal');
      await settle();
      expect(texts('.t-content')).toEqual(['horizontal', 'horizontal', 'horizontal']);
    });

    it('gives the opposite template the item', () => {
      expect(texts('.t-opposite')).toEqual(['a', 'b', 'c']);
    });

    it('gives the connector the item it leads to, and none after the last', () => {
      expect(texts('.t-connector')).toEqual(['a>b', 'b>c', 'c>end']);
    });

    it('renders no slot wrappers when no template is supplied', async () => {
      host().templated.set(false);
      await settle();
      expect(rows().every((r) => r.children.length === 0)).toBe(true);
    });
  });

  describe('the selection model', () => {
    it('pushes the selection into the element by id', async () => {
      host().selection.set([ITEMS[1]]);
      await settle();
      expect(wc().selectedIds).toEqual(['b']);
    });

    it('writes a selection made in the element back as the bound items', async () => {
      rows()[0].click();
      await settle();
      expect(host().selection()).toEqual([ITEMS[0]]);

      rows()[1].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, ctrlKey: true }));
      await settle();
      expect(host().selection()).toEqual([ITEMS[0], ITEMS[1]]);
    });

    // An attribute is always a string, so the element keys a numeric id as
    // "7"; the wrapper must key the same way or neither direction matches.
    it('round-trips items with numeric ids', async () => {
      const numeric: TimelineItem[] = [
        { id: 7, title: 'Seven' },
        { id: 8, title: 'Eight' },
      ];
      host().items.set(numeric);
      host().selection.set([numeric[1]]);
      await settle();
      expect(wc().selectedIds).toEqual(['8']);

      rows()[0].click();
      await settle();
      expect(host().selection()).toEqual([numeric[0]]);
    });

    it('round-trips id-less items by their position', async () => {
      const anonymous: TimelineItem[] = [{ title: 'One' }, { title: 'Two' }];
      host().items.set(anonymous);
      host().selection.set([anonymous[1]]);
      await settle();
      expect(wc().selectedIds).toEqual([1]);

      rows()[0].click();
      await settle();
      expect(host().selection()).toEqual([anonymous[0]]);
    });

    // An id-less item is keyed by its position, which only an item actually
    // in [items] has; anything else must not select some other row.
    it('ignores an id-less selection entry that is not one of the items', async () => {
      const anonymous: TimelineItem[] = [{ title: 'One' }, { title: 'Two' }];
      host().items.set(anonymous);
      host().selection.set([{ title: 'One' }]);
      await settle();
      expect(wc().selectedIds).toEqual([]);
    });
  });

  it('re-emits item-click with the element detail', async () => {
    rows()[1].click();
    await settle();
    expect(host().clicks.map((d) => [d.item.id, d.index])).toEqual([['b', 1]]);
  });
});

@Component({
  imports: [BsTimelineComponent],
  template: `
    <bs-timeline selectable="single" [(selection)]="selection">
      <mp-timeline-item title="One"></mp-timeline-item>
      <mp-timeline-item title="Two"></mp-timeline-item>
    </bs-timeline>`,
})
class AnonymousDeclarativeHostComponent {
  readonly selection = signal<TimelineItem[]>([]);
}

describe('BsTimelineComponent — declarative children', () => {
  // The element reports an id-less child as a model with no id; writing that
  // model back could only key it by a guess, which moved the selection.
  it('keeps the element selection when the model echoes back an id-less child', async () => {
    const fixture = TestBed.createComponent(AnonymousDeclarativeHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const wcEl = fixture.nativeElement.querySelector('mp-timeline') as MpTimeline;
    const items = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('mp-timeline-item'));

    items[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.selection().map((m) => m.title)).toEqual(['Two']);
    expect(wcEl.selectedIds).toEqual([1]);
  });

  it('projects consumer mp-timeline-items and surfaces their selection', async () => {
    const fixture = TestBed.createComponent(DeclarativeHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const items = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('mp-timeline-item'));
    expect(items.map((i) => i.getAttribute('title'))).toEqual(['Ex', 'Why']);

    items[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selection().map((m) => [m.id, m.title])).toEqual([['y', 'Why']]);
  });
});
