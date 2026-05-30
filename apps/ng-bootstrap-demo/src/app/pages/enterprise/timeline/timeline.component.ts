import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  model,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import {
  BsCardComponent,
  BsCardHeaderComponent,
  BsCardBodyComponent,
  BsCardTextComponent,
  BsCardFooterComponent,
} from '@mintplayer/ng-bootstrap/card';
import {
  BsTimelineComponent,
  BsTimelineMarkerDirective,
  BsTimelineContentDirective,
  BsTimelineTimestampDirective,
  type TimelineAlign,
  type TimelineItem,
  type TimelineItemClickDetail,
  type TimelineOrientation,
  type TimelineSelectable,
} from '@mintplayer/ng-bootstrap/timeline';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    BsCheckboxComponent,
    BsCodeSnippetComponent,
    BsSelectComponent,
    BsSelectOption,
    BsCardComponent,
    BsCardHeaderComponent,
    BsCardBodyComponent,
    BsCardTextComponent,
    BsCardFooterComponent,
    BsTimelineComponent,
    BsTimelineMarkerDirective,
    BsTimelineContentDirective,
    BsTimelineTimestampDirective,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineComponent {
  /** Shared seed data — a list of project milestones. */
  protected readonly milestones = signal<TimelineItem[]>([
    { id: 'kickoff', title: 'Kickoff', description: 'Project scoping and team assembly.', time: '2026-01-10', icon: 'bi bi-flag', color: '#6c757d' },
    { id: 'design', title: 'Design approved', description: 'PRD signed off after design review.', time: '2026-02-02', icon: 'bi bi-pencil-square', color: '#0d6efd' },
    { id: 'beta', title: 'Beta', description: 'Closed beta with 50 testers.', time: '2026-04-15', icon: 'bi bi-flask', color: '#fd7e14' },
    { id: 'ship', title: 'Shipped v1', description: 'First public release.', time: '2026-05-01', icon: 'bi bi-rocket-takeoff', color: '#198754' },
  ]);

  // --- Playground controls -------------------------------------------------
  // Each input is driven by a <bs-select> / <bs-checkbox> instead of a
  // dedicated example per combination.
  protected readonly orientation = model<TimelineOrientation>('vertical');
  protected readonly align = model<TimelineAlign>('start');
  protected readonly selectable = model<TimelineSelectable>('none');
  protected readonly reverse = model<boolean>(false);
  protected readonly customMarkers = model<boolean>(false);
  protected readonly cardContent = model<boolean>(false);

  protected readonly orientations: TimelineOrientation[] = ['vertical', 'horizontal'];
  protected readonly alignments: TimelineAlign[] = ['start', 'end', 'alternate', 'alternate-reverse'];
  protected readonly selectables: TimelineSelectable[] = ['none', 'single', 'multiple'];

  /** Two-way bound selection, surfaced below the playground. */
  protected readonly selected = model<TimelineItem[]>([]);
  protected readonly selectedTitles = computed(() => this.selected().map((m) => m.title ?? '(untitled)'));

  protected onItemClick(detail: TimelineItemClickDetail): void {
    console.log('Timeline item clicked:', detail.item.title);
  }

  // --- Live snippet --------------------------------------------------------
  // Mirrors the current control state so the copyable code always matches the
  // live demo above it.
  protected readonly playgroundSnippet = computed(() => {
    const attrs = ['[items]="milestones()"'];
    if (this.orientation() !== 'vertical') attrs.push(`orientation="${this.orientation()}"`);
    if (this.align() !== 'start') attrs.push(`align="${this.align()}"`);
    if (this.reverse()) attrs.push('[reverse]="true"');
    if (this.selectable() !== 'none') {
      attrs.push(`selectable="${this.selectable()}"`);
      attrs.push('[(selection)]="selected"');
    }

    const inner: string[] = [];
    if (this.customMarkers()) {
      inner.push(
        '  <span *bsTimelineMarker="let item" class="tl-marker">',
        '    <i [class]="item.icon" aria-hidden="true"></i>',
        '  </span>',
      );
    }
    if (this.cardContent()) {
      inner.push(
        '  <bs-card *bsTimelineContent="let item">',
        '    <bs-card-header>{{ item.title }}</bs-card-header>',
        '    <bs-card-body>',
        '      <bs-card-text class="mb-0">{{ item.description }}</bs-card-text>',
        '    </bs-card-body>',
        '    <bs-card-footer><small class="text-body-secondary">{{ item.time }}</small></bs-card-footer>',
        '  </bs-card>',
      );
    }
    inner.push('  <small *bsTimelineTimestamp="let item">{{ item.time }}</small>');

    const open = attrs.length === 1 ? `<bs-timeline ${attrs[0]}>` : `<bs-timeline\n  ${attrs.join('\n  ')}>`;
    return `${open}\n${inner.join('\n')}\n</bs-timeline>`;
  });

  protected readonly snippetSetupTs = dedent`
    import { Component, model, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
    import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
    import { BsCardComponent, BsCardHeaderComponent, BsCardBodyComponent, BsCardTextComponent, BsCardFooterComponent }
      from '@mintplayer/ng-bootstrap/card';
    import {
      BsTimelineComponent, BsTimelineMarkerDirective, BsTimelineContentDirective,
      BsTimelineTimestampDirective, type TimelineItem,
    } from '@mintplayer/ng-bootstrap/timeline';

    @Component({
      selector: 'my-roadmap',
      templateUrl: './my-roadmap.component.html',
      imports: [
        FormsModule, BsCheckboxComponent, BsSelectComponent, BsSelectOption,
        BsCardComponent, BsCardHeaderComponent, BsCardBodyComponent, BsCardTextComponent, BsCardFooterComponent,
        BsTimelineComponent, BsTimelineMarkerDirective, BsTimelineContentDirective,
        BsTimelineTimestampDirective,
      ],
    })
    export class MyRoadmapComponent {
      milestones = signal<TimelineItem[]>([
        { id: 'kickoff', title: 'Kickoff', description: 'Project scoping.', time: '2026-01-10', icon: 'bi bi-flag', color: '#6c757d' },
        { id: 'ship', title: 'Shipped v1', description: 'First public release.', time: '2026-05-01', icon: 'bi bi-rocket-takeoff', color: '#198754' },
      ]);

      orientation = model<'vertical' | 'horizontal'>('vertical');
      align = model<'start' | 'end' | 'alternate' | 'alternate-reverse'>('start');
      selectable = model<'none' | 'single' | 'multiple'>('none');
      reverse = model(false);
      selected = model<TimelineItem[]>([]);
    }
  `;

  protected readonly snippetCardDeclarativeHtml = dedent`
    <!-- Declarative: <mp-timeline-item> children with named slots, no [items] -->
    <bs-timeline align="alternate">
      <mp-timeline-item item-id="kickoff" color="#6c757d">
        <small slot="opposite">2026-01-10</small>
        <bs-card slot="content">
          <bs-card-header>Kickoff</bs-card-header>
          <bs-card-body>
            <bs-card-text class="mb-0">Project scoping and team assembly.</bs-card-text>
          </bs-card-body>
          <bs-card-footer><small class="text-body-secondary">2026-01-10</small></bs-card-footer>
        </bs-card>
      </mp-timeline-item>
      <mp-timeline-item item-id="ship" color="#198754">
        <small slot="opposite">2026-05-01</small>
        <bs-card slot="content">
          <bs-card-header>Shipped v1</bs-card-header>
          <bs-card-body>
            <bs-card-text class="mb-0">First public release.</bs-card-text>
          </bs-card-body>
          <bs-card-footer><small class="text-body-secondary">2026-05-01</small></bs-card-footer>
        </bs-card>
      </mp-timeline-item>
    </bs-timeline>
  `;
}
