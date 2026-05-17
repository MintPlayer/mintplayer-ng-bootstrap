import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import {
  BsCardBodyComponent,
  BsCardComponent,
  BsCardFooterComponent,
  BsCardGroupComponent,
  BsCardHeaderComponent,
  BsCardImgComponent,
  BsCardLinkComponent,
  BsCardSubtitleComponent,
  BsCardTextComponent,
  BsCardTitleComponent,
} from '@mintplayer/ng-bootstrap/card';
import {
  BsGridComponent,
  BsGridColumnDirective,
  BsGridRowDirective,
} from '@mintplayer/ng-bootstrap/grid';
import {
  BsListGroupComponent,
  BsListGroupItemComponent,
} from '@mintplayer/ng-bootstrap/list-group';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

// SVG data URLs keep the visual baseline deterministic. The Playwright spec
// would otherwise depend on an external placeholder service responding
// identically every run, which is the canonical recipe for flakey CI.
function makePlaceholder(width: number, height: number, label: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'>` +
    `<rect width='${width}' height='${height}' fill='%236c757d'/>` +
    `<text x='${width / 2}' y='${height / 2}' fill='white' text-anchor='middle' ` +
    `font-size='20' dominant-baseline='middle' font-family='Arial, sans-serif'>${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
}

@Component({
  selector: 'demo-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  imports: [
    BsCodeSnippetComponent,
    BsCardComponent,
    BsCardHeaderComponent,
    BsCardBodyComponent,
    BsCardFooterComponent,
    BsCardTitleComponent,
    BsCardSubtitleComponent,
    BsCardTextComponent,
    BsCardLinkComponent,
    BsCardImgComponent,
    BsCardGroupComponent,
    BsListGroupComponent,
    BsListGroupItemComponent,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  readonly colors = Color;
  readonly colorKeys: ReadonlyArray<keyof typeof Color> = [
    'primary',
    'secondary',
    'success',
    'danger',
    'warning',
    'info',
    'light',
    'dark',
    'body',
    'white',
    'transparent',
  ];

  readonly placeholderTopBottom = makePlaceholder(320, 180, 'Image');
  readonly placeholderOverlay = makePlaceholder(320, 200, 'Background');
  readonly placeholderSquare = makePlaceholder(200, 100, 'Image');
  readonly placeholderHorizontal = makePlaceholder(200, 140, 'Image');

  // Interactive tab / pill state for the demo. Demonstrates that the
  // [navStyle] mechanism on bs-card-header is purely a class-applier:
  // active-state toggling and content swapping are owned by the consumer.
  readonly tabPages = ['Profile', 'Activity', 'Settings'] as const;
  readonly activeTab = signal<typeof this.tabPages[number]>('Profile');
  readonly pillPages = ['Inbox', 'Sent', 'Drafts'] as const;
  readonly activePill = signal<typeof this.pillPages[number]>('Inbox');

  protected readonly snippetBasicHtml = dedent`
    <bs-card class="d-block">
      <bs-card-header>Header</bs-card-header>
      <bs-card-body>
        <bs-card-title>Card title</bs-card-title>
        <bs-card-text>Body paragraph for the card.</bs-card-text>
      </bs-card-body>
    </bs-card>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import {
      BsCardComponent,
      BsCardHeaderComponent,
      BsCardBodyComponent,
      BsCardTitleComponent,
      BsCardTextComponent,
    } from '@mintplayer/ng-bootstrap/card';

    @Component({
      selector: 'my-card-demo',
      templateUrl: './my-card-demo.component.html',
      imports: [
        BsCardComponent,
        BsCardHeaderComponent,
        BsCardBodyComponent,
        BsCardTitleComponent,
        BsCardTextComponent,
      ],
    })
    export class MyCardDemoComponent {}
  `;
}
