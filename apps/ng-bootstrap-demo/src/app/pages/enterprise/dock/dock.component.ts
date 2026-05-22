import { CommonModule } from '@angular/common';
import { Component, isDevMode, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
import { BsDockManagerComponent, BsDockPaneComponent, DockLayoutSnapshot } from '@mintplayer/ng-bootstrap/dock';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss'],
  imports: [CommonModule, BsButtonTypeDirective, BsDockManagerComponent, BsDockPaneComponent, BsBadgeComponent, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockComponent {
  readonly dockManager = viewChild(BsDockManagerComponent);

  readonly Color = Color;
  readonly isDevMode = isDevMode();

  layout = signal<DockLayoutSnapshot>({
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

  onLayoutSnapshot(snapshot: DockLayoutSnapshot): void {
    this.liveLayout.set(snapshot);
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-dock-manager
      [layout]="layout()"
      (layoutChange)="$event && layout.set($event)">
      <bs-dock-pane name="panel-1">
        <div class="p-3">
          <h3>Panel 1</h3>
          <p>Content projected through a named slot.</p>
        </div>
      </bs-dock-pane>
      <bs-dock-pane name="panel-2">
        <div class="p-3">
          <h3>Panel 2</h3>
        </div>
      </bs-dock-pane>
      <bs-dock-pane name="panel-3">
        <div class="p-3">
          <h3>Panel 3</h3>
        </div>
      </bs-dock-pane>
    </bs-dock-manager>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { BsDockManagerComponent, BsDockPaneComponent, DockLayoutSnapshot } from '@mintplayer/ng-bootstrap/dock';
    @Component({
      selector: 'my-workspace',
      templateUrl: './my-workspace.component.html',
      imports: [BsDockManagerComponent, BsDockPaneComponent],
    })
    export class MyWorkspaceComponent {
      layout = signal<DockLayoutSnapshot>({
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
    // and the WC emits a layout with the pane moved into the floating[] array.
    layout = signal<DockLayoutSnapshot>({
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
