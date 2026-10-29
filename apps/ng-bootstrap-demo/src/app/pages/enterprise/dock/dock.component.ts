import { CommonModule } from '@angular/common';
import { Component, isDevMode, signal, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
import {
  BsDockManagerComponent,
  BsDockManagerPaneDirective,
  DockLayoutInput,
  DockLayoutSnapshot,
} from '@mintplayer/ng-bootstrap/dock';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss'],
  imports: [CommonModule, BsButtonTypeDirective, BsDockManagerComponent, BsDockManagerPaneDirective, BsBadgeComponent, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockComponent {
  readonly dockManager = viewChild(BsDockManagerComponent);

  readonly Color = Color;
  readonly isDevMode = isDevMode();

  layout = signal<DockLayoutInput>({
    root: {
      kind: 'split',
      direction: 'horizontal',
      sizes: [1, 2],
      children: [
        {
          kind: 'stack',
          panes: ['panel-1', 'panel-2'],
          activePane: 'panel-1',
        },
        {
          kind: 'split',
          direction: 'vertical',
          sizes: [2, 1],
          children: [
            {
              kind: 'stack',
              panes: ['panel-3'],
            },
            {
              kind: 'stack',
              panes: ['panel-4'],
              activePane: 'panel-4',
            },
          ],
        },
      ],
    },
    floating: [
      {
        id: 'floating-panel-5',
        root: {
          kind: 'stack',
          panes: ['panel-5'],
          activePane: 'panel-5',
        },
        activePane: 'panel-5',
        bounds: { left: 680, top: 96, width: 320, height: 220 },
      },
      {
        id: 'floating-secondary',
        root: {
          kind: 'stack',
          panes: ['panel-floating'],
          activePane: 'panel-floating',
        },
        activePane: 'panel-floating',
        bounds: { left: 520, top: 320, width: 300, height: 210 },
      },
    ],
    titles: {
      'panel-1': 'Panel 1',
      'panel-2': 'Panel 2',
      'panel-3': 'Panel 3',
      'panel-4': 'Panel 4',
      'panel-5': 'Panel 5',
      'panel-floating': 'Floating Utilities',
    },
  });

  liveLayout = signal<DockLayoutSnapshot | undefined>(undefined);
  savedLayout = signal<DockLayoutSnapshot | undefined>(undefined);

  saveLayout(): void {
    if (!this.dockManager()) {
      return;
    }

    this.savedLayout.set(this.dockManager()!.captureLayout());
  }

  readonly layoutError = signal<string | null>(null);

  /** Restores a layout from JSON, e.g. one captured above. */
  applyLayout(json: string): void {
    try {
      this.layout.set(JSON.parse(json));
      this.layoutError.set(null);
    } catch (error) {
      this.layoutError.set(error instanceof Error ? error.message : String(error));
    }
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-dock-manager [(layout)]="layout">
      <ng-template bsDockManagerPane let-pane="pane">
        @switch (pane) {
          @case ('panel-1') { <div class="p-3"><h3>Panel 1</h3></div> }
          @case ('panel-2') { <div class="p-3"><h3>Panel 2</h3></div> }
          @case ('panel-3') { <div class="p-3"><h3>Panel 3</h3></div> }
        }
      </ng-template>
    </bs-dock-manager>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import {
      BsDockManagerComponent,
      BsDockManagerPaneDirective,
      DockLayoutInput,
    } from '@mintplayer/ng-bootstrap/dock';

    @Component({
      selector: 'my-workspace',
      templateUrl: './my-workspace.component.html',
      imports: [BsDockManagerComponent, BsDockManagerPaneDirective],
    })
    export class MyWorkspaceComponent {
      layout = signal<DockLayoutInput>({
        root: {
          kind: 'split',
          direction: 'horizontal',
          sizes: [1, 2],
          children: [
            { kind: 'stack', panes: ['panel-1', 'panel-2'], activePane: 'panel-1' },
            { kind: 'stack', panes: ['panel-3'] },
          ],
        },
        floating: [],
        titles: {
          'panel-1': 'Panel 1',
          'panel-2': 'Panel 2',
          'panel-3': 'Panel 3',
        },
      });
    }
  `;

  protected readonly snippetFloatingTs = dedent`
    // Floating panes are tear-off windows positioned in screen pixels.
    // Drag a tab out of its stack — or press M then F on a focused tab —
    // and the dock writes back a layout with the pane moved into the floating[] array.
    layout = signal<DockLayoutInput>({
      root: {
        kind: 'stack',
        panes: ['main'],
        activePane: 'main',
      },
      floating: [
        {
          id: 'floating-inspector',
          root: { kind: 'stack', panes: ['inspector'], activePane: 'inspector' },
          activePane: 'inspector',
          bounds: { left: 680, top: 96, width: 320, height: 220 },
        },
      ],
      titles: { main: 'Editor', inspector: 'Inspector' },
    });
  `;

  protected readonly snippetCaptureTs = dedent`
    // Persist the user's arrangement. captureLayout() returns a fresh
    // DockLayoutSnapshot you can JSON.stringify into localStorage / a DB.
    readonly dockManager = viewChild(BsDockManagerComponent);

    saveLayout(): void {
      const snapshot = this.dockManager()?.captureLayout();
      if (snapshot) localStorage.setItem('dock-layout', JSON.stringify(snapshot));
    }

    restoreLayout(): void {
      const raw = localStorage.getItem('dock-layout');
      if (raw) this.layout.set(JSON.parse(raw));
    }
  `;
}
