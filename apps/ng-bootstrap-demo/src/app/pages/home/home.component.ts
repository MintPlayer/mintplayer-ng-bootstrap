import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
import { BsCardBodyComponent, BsCardComponent, BsCardHeaderComponent } from '@mintplayer/ng-bootstrap/card';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { dedent } from 'ts-dedent';
import { BOOTSTRAP_VERSION } from '../../providers/bootstrap-version.provider';

interface FlagshipCard {
  title: string;
  pitch: string;
  routerLink: string;
}

@Component({
  selector: 'demo-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    RouterLink,
    BsAlertComponent,
    BsBadgeComponent,
    BsCardComponent,
    BsCardHeaderComponent,
    BsCardBodyComponent,
    BsCodeSnippetComponent,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  protected readonly colors = Color;
  protected readonly version = inject(BOOTSTRAP_VERSION);

  protected readonly flagshipCards: readonly FlagshipCard[] = [
    {
      title: 'Scheduler',
      pitch: 'Day / week / month calendar with drag-drop event editing, ARIA-keyboard navigation, and signal-driven data binding. Built on Lit 3 internally.',
      routerLink: '/enterprise/scheduler',
    },
    {
      title: 'Dock manager',
      pitch: 'VS Code-style splittable, draggable panel manager with same-layer splitter intersection glyphs.',
      routerLink: '/enterprise/dock',
    },
    {
      title: 'Ribbon',
      pitch: 'Microsoft-style command surface — nine item kinds, quick-access toolbar, touch mode.',
      routerLink: '/enterprise/ribbon',
    },
    {
      title: 'Tile manager',
      pitch: 'Windowless push-and-reflow tiling layout. Alternative to dock for dashboard shells.',
      routerLink: '/enterprise/tile-manager',
    },
    {
      title: 'Datatable',
      pitch: 'CDK virtual-scroll-backed table with pagination, selection, and resizable columns; one signal-driven data contract.',
      routerLink: '/enterprise/datatables',
    },
    {
      title: 'Query builder',
      pitch: 'Visual builder for nested AND/OR queries — full operator catalog with relative-date and array ops, drag-and-drop, sub-queries, custom value editors. Emits a canonical JSON tree the backend translates server-side.',
      routerLink: '/enterprise/query-builder',
    },
    {
      title: 'Theming',
      pitch: "Live light / dark / auto plus custom variants like sepia, all via a single signal-based service. SSR-safe.",
      routerLink: '/additional-samples/theming',
    },
  ];

  protected readonly installSnippet = dedent`
    npm install @mintplayer/ng-bootstrap
  `;

  protected readonly angularJsonSnippet = dedent`
    {
      "projects": {
        "your-app": {
          "architect": {
            "build": {
              "options": {
                "styles": [
                  "node_modules/@mintplayer/ng-bootstrap/bootstrap.scss",
                  "src/styles.scss"
                ]
              }
            }
          }
        }
      }
    }
  `;

  protected readonly styleScssSnippet = dedent`
    // Optional: override Bootstrap 5.3 SCSS variables BEFORE the import.
    $primary: #ff5722;
    @forward '@mintplayer/ng-bootstrap/bootstrap';
  `;

  protected readonly quickstartSnippet = dedent`
    import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    import { BsThemeService } from '@mintplayer/ng-bootstrap/theming';

    @Component({
      selector: 'app-root',
      template: \`
        <bs-alert [type]="colors.info">
          Current theme: <strong>{{ theme.effectiveMode() }}</strong>
        </bs-alert>
        <button [color]="colors.primary" (click)="theme.setMode('dark')">
          Switch to dark
        </button>
      \`,
      imports: [BsAlertComponent, BsButtonTypeDirective],
      changeDetection: ChangeDetectionStrategy.OnPush,
    })
    export class AppComponent {
      protected readonly colors = Color;
      protected readonly theme = inject(BsThemeService);
    }
  `;
}
