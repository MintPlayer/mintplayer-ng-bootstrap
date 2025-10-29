import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  Output,
  QueryList,
  ViewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
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
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsDockManagerComponent implements AfterViewInit {
  @Input()
  set layout(value: DockLayoutNode | DockLayout | null) {
    const snapshot = this.cloneLayout(this.ensureSnapshot(value));
    this._layout = snapshot;
    this.layoutString = this.stringifyLayout(snapshot);
    this.applyLayout();
  }
  get layout(): DockLayoutSnapshot | null {
    if (!this._layout.root && this._layout.floating.length === 0) {
      return null;
    }
    return this.cloneLayout(this._layout);
  }

  @Output() layoutChange = new EventEmitter<DockLayoutSnapshot | null>();
  @Output() layoutSnapshotChange = new EventEmitter<DockLayoutSnapshot>();

  layoutString: string | null = null;

  @ContentChildren(BsDockPaneComponent) panes: QueryList<BsDockPaneComponent> = new QueryList();
  @ViewChild('manager', { static: true }) managerRef!: ElementRef<MintDockManagerElement>;

  protected readonly trackByPane = (_: number, pane: BsDockPaneComponent) => pane.name;

  private _layout: DockLayoutSnapshot = { root: null, floating: [] };

  constructor(
    private readonly changeDetector: ChangeDetectorRef,
    @Inject(DOCUMENT) documentRef: Document,
  ) {
    if (documentRef) {
      MintDockManagerElement.configureDocument(documentRef);
    }
  }

  ngAfterViewInit(): void {
    this.applyLayout();
  }

  captureLayout(): DockLayoutSnapshot {
    const element = this.managerRef?.nativeElement;
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
    this.layoutChange.emit(this.layout);
    this.layoutSnapshotChange.emit(this.cloneLayout(snapshot));
    this.changeDetector.markForCheck();
  }

  private applyLayout(): void {
    if (!this.managerRef) {
      return;
    }

    const element = this.managerRef.nativeElement;
    const layout = this.layout;
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
