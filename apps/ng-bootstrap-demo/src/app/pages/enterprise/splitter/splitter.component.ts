import { Component, ChangeDetectionStrategy, computed, model, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsSplitterComponent, SplitterResizeEventDetail } from '@mintplayer/ng-bootstrap/splitter';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-splitter',
  templateUrl: './splitter.component.html',
  styleUrls: ['./splitter.component.scss'],
  imports: [FormsModule, BsButtonTypeDirective, BsCheckboxComponent, BsCodeSnippetComponent, BsSplitterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitterComponent {
  readonly Color = Color;

  bgWarning = model(false);
  touchMode = model(false);

  protected readonly sized = viewChild.required<BsSplitterComponent>('sized');

  protected readonly panelSizes = signal<number[] | null>(null);
  protected readonly lastEvent = signal<string | null>(null);

  protected readonly sizesDisplay = computed(
    () => this.panelSizes()?.map(size => Math.round(size)).join(' / ') ?? '—'
  );

  protected onResizing(detail: SplitterResizeEventDetail) {
    this.lastEvent.set(`resizing → ${detail.sizes.map(size => Math.round(size)).join(' / ')}`);
  }

  protected onResizeEnd(detail: SplitterResizeEventDetail) {
    this.lastEvent.set(`resizeEnd → ${detail.sizes.map(size => Math.round(size)).join(' / ')}`);
  }

  protected readSizes() {
    this.panelSizes.set(this.sized().getPanelSizes());
  }

  protected splitEvenly() {
    const sizes = this.sized().getPanelSizes();
    const total = sizes.reduce((sum, size) => sum + size, 0);
    this.sized().setPanelSizes(sizes.map(() => total / sizes.length));
    this.readSizes();
  }

  protected nudgeDivider() {
    this.sized().resizeDividerBy(0, 'ArrowRight');
    this.readSizes();
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-splitter orientation="horizontal">
      <div>Panel 1</div>
      <bs-splitter orientation="vertical">
        <div>Panel 2a</div>
        <div>Panel 2b</div>
      </bs-splitter>
    </bs-splitter>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsSplitterComponent } from '@mintplayer/ng-bootstrap/splitter';

    @Component({
      selector: 'my-splitter-demo',
      templateUrl: './my-splitter-demo.component.html',
      imports: [BsSplitterComponent],
    })
    export class MySplitterDemoComponent {}
  `;

  protected readonly snippetSizedHtml = dedent`
    <bs-splitter #splitter [minPanelSize]="120" [touchMode]="touchMode()"
        (resizing)="onResizing($event)" (resizeEnd)="onResizeEnd($event)">
      <div>Left</div>
      <div>Right</div>
    </bs-splitter>
  `;

  protected readonly snippetSizedTs = dedent`
    export class MySplitterDemoComponent {
      protected readonly splitter = viewChild.required<BsSplitterComponent>('splitter');

      readSizes(): number[] {
        return this.splitter().getPanelSizes();  // px, in document order
      }

      splitEvenly() {
        const sizes = this.splitter().getPanelSizes();
        const total = sizes.reduce((sum, size) => sum + size, 0);
        this.splitter().setPanelSizes(sizes.map(() => total / sizes.length));
      }

      nudgeDivider() {
        this.splitter().resizeDividerBy(0, 'ArrowRight');  // +10%, fine = +1%
      }
    }
  `;
}
