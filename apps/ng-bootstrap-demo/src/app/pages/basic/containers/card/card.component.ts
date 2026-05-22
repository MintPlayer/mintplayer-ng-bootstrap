import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsCardBodyComponent, BsCardComponent, BsCardFooterComponent, BsCardGroupComponent, BsCardHeaderComponent, BsCardImgComponent, BsCardLinkComponent, BsCardSubtitleComponent, BsCardTextComponent, BsCardTitleComponent } from '@mintplayer/ng-bootstrap/card';
import { BsGridComponent, BsGridColumnDirective, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
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
    import { BsCardComponent, BsCardHeaderComponent, BsCardBodyComponent, BsCardTitleComponent, BsCardTextComponent } from '@mintplayer/ng-bootstrap/card';
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

  protected readonly snippetSimpleHtml = dedent`
    <bs-card class="d-block">
      <bs-card-body>
        <bs-card-title>Simple card</bs-card-title>
        <bs-card-text>Basic card with only body content.</bs-card-text>
      </bs-card-body>
    </bs-card>
  `;

  protected readonly snippetHeaderBodyFooterHtml = dedent`
    <bs-card class="d-block">
      <bs-card-header>Header</bs-card-header>
      <bs-card-body>
        <bs-card-title>Body title</bs-card-title>
        <bs-card-subtitle>A subtitle</bs-card-subtitle>
        <bs-card-text>Body paragraph below the heading pair.</bs-card-text>
        <bs-card-link href="#">Link 1</bs-card-link>
        <bs-card-link href="#">Link 2</bs-card-link>
      </bs-card-body>
      <bs-card-footer>Footer</bs-card-footer>
    </bs-card>
  `;

  protected readonly snippetListGroupHtml = dedent`
    <bs-card class="d-block">
      <bs-card-header>List of elements</bs-card-header>
      <bs-list-group>
        <bs-list-group-item>Cras justo odio</bs-list-group-item>
        <bs-list-group-item>Dapibus ac facilisis in</bs-list-group-item>
        <bs-list-group-item>Morbi leo risus</bs-list-group-item>
      </bs-list-group>
      <bs-card-footer>Footer below the list</bs-card-footer>
    </bs-card>
  `;

  protected readonly snippetImageTopHtml = dedent`
    <bs-card class="d-block" style="max-width: 320px;">
      <bs-card-img position="top" [src]="imageUrl" alt="placeholder"></bs-card-img>
      <bs-card-body>
        <bs-card-title>Top image</bs-card-title>
        <bs-card-text>Text below the image, inside the body.</bs-card-text>
      </bs-card-body>
    </bs-card>
  `;

  protected readonly snippetImageBottomHtml = dedent`
    <bs-card class="d-block" style="max-width: 320px;">
      <bs-card-body>
        <bs-card-title>Bottom image</bs-card-title>
        <bs-card-text>Text above the image, inside the body.</bs-card-text>
      </bs-card-body>
      <bs-card-img position="bottom" [src]="imageUrl" alt="placeholder"></bs-card-img>
    </bs-card>
  `;

  protected readonly snippetImageOverlayHtml = dedent`
    <bs-card class="d-block" style="max-width: 320px;">
      <bs-card-img position="overlay" [src]="imageUrl" alt="background">
        <bs-card-title>Overlaid title</bs-card-title>
        <bs-card-text>Overlaid description.</bs-card-text>
      </bs-card-img>
    </bs-card>
  `;

  protected readonly snippetColorFilledHtml = dedent`
    <bs-card class="d-block" [color]="colors.primary">
      <bs-card-body>
        <bs-card-title>primary</bs-card-title>
        <bs-card-text>text-bg-primary applied to the host.</bs-card-text>
      </bs-card-body>
    </bs-card>
  `;

  protected readonly snippetColorOutlineHtml = dedent`
    <bs-card class="d-block" [color]="colors.primary" [outline]="true">
      <bs-card-body>
        <bs-card-title>primary</bs-card-title>
        <bs-card-text>border border-primary bg-transparent applied to the host.</bs-card-text>
      </bs-card-body>
    </bs-card>
  `;

  protected readonly snippetIndependentColorsHtml = dedent`
    <bs-card class="d-block">
      <bs-card-header [color]="colors.dark">Dark header</bs-card-header>
      <bs-card-body>
        <bs-card-text>Card root has no colour; header and footer each carry their own.</bs-card-text>
      </bs-card-body>
      <bs-card-footer [color]="colors.success">Success footer</bs-card-footer>
    </bs-card>
  `;

  protected readonly snippetCardGroupHtml = dedent`
    <bs-card-group>
      <bs-card>
        <bs-card-img position="top" [src]="imageUrl" alt=""></bs-card-img>
        <bs-card-body>
          <bs-card-title>Group A</bs-card-title>
          <bs-card-text>First card in the group.</bs-card-text>
        </bs-card-body>
      </bs-card>
      <bs-card>
        <bs-card-img position="top" [src]="imageUrl" alt=""></bs-card-img>
        <bs-card-body>
          <bs-card-title>Group B</bs-card-title>
          <bs-card-text>Second card in the group.</bs-card-text>
        </bs-card-body>
      </bs-card>
    </bs-card-group>
  `;

  protected readonly snippetHorizontalHtml = dedent`
    <bs-card class="d-block" style="max-width: 540px;">
      <bs-grid>
        <div bsRow class="g-0">
          <div [md]="4">
            <bs-card-img position="top" [src]="imageUrl" alt=""></bs-card-img>
          </div>
          <div [md]="8">
            <bs-card-body>
              <bs-card-title>Horizontal card</bs-card-title>
              <bs-card-text>Image on the left, body on the right at md and up.</bs-card-text>
            </bs-card-body>
          </div>
        </div>
      </bs-grid>
    </bs-card>
  `;

  protected readonly snippetNavTabsHtml = dedent`
    <bs-card class="d-block">
      <bs-card-header [navStyle]="'tabs'">
        <ul class="nav">
          @for (page of tabPages; track page) {
            <li class="nav-item">
              <a class="nav-link" [class.active]="page === activeTab()" href="#"
                 (click)="$event.preventDefault(); activeTab.set(page)">{{ page }}</a>
            </li>
          }
        </ul>
      </bs-card-header>
      <bs-card-body>
        <bs-card-title>{{ activeTab() }}</bs-card-title>
        <bs-card-text>Body content for the active tab.</bs-card-text>
      </bs-card-body>
    </bs-card>
  `;

  protected readonly snippetNavPillsHtml = dedent`
    <bs-card class="d-block">
      <bs-card-header [navStyle]="'pills'">
        <ul class="nav">
          @for (page of pillPages; track page) {
            <li class="nav-item">
              <a class="nav-link" [class.active]="page === activePill()" href="#"
                 (click)="$event.preventDefault(); activePill.set(page)">{{ page }}</a>
            </li>
          }
        </ul>
      </bs-card-header>
      <bs-card-body>
        <bs-card-title>{{ activePill() }}</bs-card-title>
        <bs-card-text>Body content for the active pill.</bs-card-text>
      </bs-card-body>
    </bs-card>
  `;
}
