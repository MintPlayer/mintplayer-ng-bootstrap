import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  model,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import {
  BsTimelineComponent,
  BsTimelineMarkerDirective,
  BsTimelineContentDirective,
  BsTimelineTimestampDirective,
  type TimelineItem,
  type TimelineItemClickDetail,
} from '@mintplayer/ng-bootstrap/timeline';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  imports: [
    CommonModule,
    BsButtonTypeDirective,
    BsCodeSnippetComponent,
    BsTimelineComponent,
    BsTimelineMarkerDirective,
    BsTimelineContentDirective,
    BsTimelineTimestampDirective,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineComponent {
  protected readonly colors = Color;

  /** Shared seed data — a list of project milestones. */
  protected readonly milestones = signal<TimelineItem[]>([
    { id: 'kickoff', title: 'Kickoff', description: 'Project scoping and team assembly.', time: '2026-01-10', icon: 'bi bi-flag', color: '#6c757d' },
    { id: 'design', title: 'Design approved', description: 'PRD signed off after design review.', time: '2026-02-02', icon: 'bi bi-pencil-square', color: '#0d6efd' },
    { id: 'beta', title: 'Beta', description: 'Closed beta with 50 testers.', time: '2026-04-15', icon: 'bi bi-flask', color: '#fd7e14' },
    { id: 'ship', title: 'Shipped v1', description: 'First public release.', time: '2026-05-01', icon: 'bi bi-rocket-takeoff', color: '#198754' },
  ]);

  // --- Section 4: Reverse toggle -------------------------------------------
  protected readonly reverse = signal<boolean>(false);

  // --- Section 7: Selectable -----------------------------------------------
  protected readonly selectedMilestones = model<TimelineItem[]>([]);
  protected readonly selectedTitles = computed(() => this.selectedMilestones().map((m) => m.title ?? '(untitled)'));

  protected toggleReverse(): void {
    this.reverse.update((value) => !value);
  }

  protected onItemClick(detail: TimelineItemClickDetail): void {
    // Presentational demo — the selectable section drives the visible state via
    // two-way [(selection)]; this just shows the click payload is wired up.
    console.log('Timeline item clicked:', detail.item.title);
  }

  // --- Snippets ------------------------------------------------------------

  protected readonly snippetBasicHtml = dedent`
    <bs-timeline [items]="milestones()">
      <small *bsTimelineTimestamp="let item">{{ item.time }}</small>
    </bs-timeline>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { BsTimelineComponent, BsTimelineTimestampDirective, type TimelineItem }
      from '@mintplayer/ng-bootstrap/timeline';

    @Component({
      selector: 'my-roadmap',
      templateUrl: './my-roadmap.component.html',
      imports: [BsTimelineComponent, BsTimelineTimestampDirective],
    })
    export class MyRoadmapComponent {
      milestones = signal<TimelineItem[]>([
        { id: 'kickoff', title: 'Kickoff', description: 'Project scoping.', time: '2026-01-10', icon: 'bi bi-flag', color: '#6c757d' },
        { id: 'ship', title: 'Shipped v1', description: 'First public release.', time: '2026-05-01', icon: 'bi bi-rocket-takeoff', color: '#198754' },
      ]);
    }
  `;

  protected readonly snippetHorizontalHtml = dedent`
    <bs-timeline [items]="milestones()" orientation="horizontal">
      <small *bsTimelineTimestamp="let item">{{ item.time }}</small>
    </bs-timeline>
  `;

  protected readonly snippetAlternateHtml = dedent`
    <bs-timeline [items]="milestones()" align="alternate">
      <small *bsTimelineTimestamp="let item">{{ item.time }}</small>
    </bs-timeline>
  `;

  protected readonly snippetReverseHtml = dedent`
    <button [color]="colors.primary" (click)="toggleReverse()">
      {{ reverse() ? 'Newest last' : 'Newest first' }}
    </button>

    <bs-timeline [items]="milestones()" [reverse]="reverse()">
      <small *bsTimelineTimestamp="let item">{{ item.time }}</small>
    </bs-timeline>
  `;

  protected readonly snippetReverseTs = dedent`
    reverse = signal<boolean>(false);

    toggleReverse(): void {
      this.reverse.update((value) => !value);
    }
  `;

  protected readonly snippetCustomMarkerHtml = dedent`
    <bs-timeline [items]="milestones()" align="alternate">
      <!-- *bsTimelineMarker exposes the item as $implicit; render-prop style.
           The wrapper mirrors item.color onto the --mp-tl-item-color CSS var,
           so the marker class reads it — no inline styles needed. -->
      <span *bsTimelineMarker="let item" class="tl-marker">
        <i [class]="item.icon" aria-hidden="true"></i>
      </span>
      <small *bsTimelineTimestamp="let item">{{ item.time }}</small>
    </bs-timeline>
  `;

  protected readonly snippetCardHtml = dedent`
    <!-- Data-driven: custom content template renders a Bootstrap card -->
    <bs-timeline [items]="milestones()" align="alternate">
      <span *bsTimelineMarker="let item" class="tl-marker">
        <i [class]="item.icon" aria-hidden="true"></i>
      </span>
      <div *bsTimelineContent="let item" class="card">
        <div class="card-body">
          <h6 class="card-title mb-1">{{ item.title }}</h6>
          <p class="card-text mb-0">{{ item.description }}</p>
        </div>
      </div>
      <small *bsTimelineTimestamp="let item">{{ item.time }}</small>
    </bs-timeline>
  `;

  protected readonly snippetCardDeclarativeHtml = dedent`
    <!-- Declarative: <mp-timeline-item> children with named slots, no [items] -->
    <bs-timeline align="alternate">
      <mp-timeline-item item-id="kickoff" color="#6c757d">
        <small slot="opposite">2026-01-10</small>
        <div slot="content" class="card">
          <div class="card-body">
            <h6 class="card-title mb-1">Kickoff</h6>
            <p class="card-text mb-0">Project scoping and team assembly.</p>
          </div>
        </div>
      </mp-timeline-item>
      <mp-timeline-item item-id="ship" color="#198754">
        <small slot="opposite">2026-05-01</small>
        <div slot="content" class="card">
          <div class="card-body">
            <h6 class="card-title mb-1">Shipped v1</h6>
            <p class="card-text mb-0">First public release.</p>
          </div>
        </div>
      </mp-timeline-item>
    </bs-timeline>
  `;

  protected readonly snippetSelectableHtml = dedent`
    <bs-timeline
      [items]="milestones()"
      selectable="multiple"
      [(selection)]="selectedMilestones">
      <small *bsTimelineTimestamp="let item">{{ item.time }}</small>
    </bs-timeline>

    <p>Selected: {{ selectedTitles().join(', ') || 'none' }}</p>
  `;

  protected readonly snippetSelectableTs = dedent`
    import { Component, computed, model, signal } from '@angular/core';

    selectedMilestones = model<TimelineItem[]>([]);
    selectedTitles = computed(() => this.selectedMilestones().map((m) => m.title));
  `;
}
