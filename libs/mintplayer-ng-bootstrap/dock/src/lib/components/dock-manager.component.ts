import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  DockLayout,
  DockLayoutNode,
  DockLayoutSnapshot,
} from '../types/dock-layout';
import { BsDockPaneComponent } from './dock-pane.component';
import { MintDockManagerElement } from '../web-components/mint-dock-manager.element';

@Component({
  selector: 'bs-dock-manager',
  templateUrl: './dock-manager.component.html',
  styleUrls: ['./dock-manager.component.scss'],
  imports: [NgTemplateOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsDockManagerComponent implements AfterViewInit {
  readonly layout = input<DockLayoutNode | DockLayout | null>(null);

  get layoutSnapshot(): DockLayoutSnapshot | null {
    if (!this._layout.root && this._layout.floating.length === 0) {
      return null;
    }
    return this.cloneLayout(this._layout);
  }

  readonly layoutChange = output<DockLayoutSnapshot | null>();
  readonly layoutSnapshotChange = output<DockLayoutSnapshot>();

  layoutString: string | null = null;

  readonly panes = contentChildren(BsDockPaneComponent);
  readonly managerRef = viewChild<ElementRef<MintDockManagerElement>>('manager');

  protected readonly trackByPane = (_: number, pane: BsDockPaneComponent) => pane.name();

  private _layout: DockLayoutSnapshot = { root: null, floating: [] };

  constructor() {
    const documentRef = inject(DOCUMENT);
    if (documentRef) {
      MintDockManagerElement.configureDocument(documentRef);
    }

    effect(() => {
      const value = this.layout();
      const snapshot = this.cloneLayout(this.ensureSnapshot(value));
      this._layout = snapshot;
      this.layoutString = this.stringifyLayout(snapshot);
      this.applyLayout();
    });
  }

  ngAfterViewInit(): void {
    this.applyLayout();
  }

  captureLayout(): DockLayoutSnapshot {
    const element = this.managerRef()?.nativeElement;
    return element?.snapshot ?? { root: null, floating: [] };
  }

  onLayoutChanged(event: Event): void {
    const snapshot =
      (event as CustomEvent<DockLayoutSnapshot>).detail ?? {
        root: null,
        floating: [],
      };
    this._layout = this.cloneLayout(snapshot);
    this.layoutString = this.stringifyLayout(this._layout);
    this.layoutChange.emit(this.layoutSnapshot);
    this.layoutSnapshotChange.emit(this.cloneLayout(snapshot));
  }

  private applyLayout(): void {
    const ref = this.managerRef();
    if (!ref) {
      return;
    }

    const element = ref.nativeElement;
    const layout = this.layoutSnapshot;
    element.layout = layout ?? null;
  }

  private ensureSnapshot(
    value: DockLayoutNode | DockLayout | null,
  ): DockLayoutSnapshot {
    if (!value) {
      return { root: null, floating: [], titles: {} };
    }

    if ('kind' in value) {
      return { root: value, floating: [], titles: {} };
    }

    return {
      root: value.root ?? null,
      floating: Array.isArray(value.floating) ? [...value.floating] : [],
      titles: value.titles ? { ...value.titles } : {},
    };
  }

  private stringifyLayout(layout: DockLayoutSnapshot): string | null {
    if (!layout.root && layout.floating.length === 0) {
      return null;
    }
    return JSON.stringify(layout);
  }

  private cloneLayout(layout: DockLayoutSnapshot): DockLayoutSnapshot {
    return JSON.parse(JSON.stringify(layout)) as DockLayoutSnapshot;
  }
}
