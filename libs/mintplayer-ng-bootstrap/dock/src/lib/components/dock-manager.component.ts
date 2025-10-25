import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewChild,
} from '@angular/core';
import { DockLayoutNode, DockLayoutSnapshot } from '../types/dock-layout';
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
  set layout(value: DockLayoutNode | null) {
    this._layout = value;
    this.layoutString = value ? JSON.stringify(value) : null;
    this.applyLayout();
  }
  get layout(): DockLayoutNode | null {
    return this._layout;
  }

  @Output() layoutChange = new EventEmitter<DockLayoutNode | null>();
  @Output() layoutSnapshotChange = new EventEmitter<DockLayoutSnapshot>();

  layoutString: string | null = null;

  @ContentChildren(BsDockPaneComponent) panes: QueryList<BsDockPaneComponent> = new QueryList();
  @ViewChild('manager', { static: true }) managerRef!: ElementRef<MintDockManagerElement>;

  protected readonly trackByPane = (_: number, pane: BsDockPaneComponent) => pane.name;

  private _layout: DockLayoutNode | null = null;

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.applyLayout();
  }

  captureLayout(): DockLayoutSnapshot {
    const element = this.managerRef?.nativeElement;
    return element?.snapshot ?? { root: null };
  }

  onLayoutChanged(event: CustomEvent<DockLayoutSnapshot>): void {
    const snapshot = event.detail ?? { root: null };
    this._layout = snapshot.root;
    this.layoutString = this._layout ? JSON.stringify(this._layout) : null;
    this.layoutChange.emit(this._layout);
    this.layoutSnapshotChange.emit(snapshot);
    this.changeDetector.markForCheck();
  }

  private applyLayout(): void {
    if (!this.managerRef) {
      return;
    }

    const element = this.managerRef.nativeElement;
    if (this._layout) {
      element.layout = this._layout;
    } else {
      element.layout = null;
    }
  }
}
