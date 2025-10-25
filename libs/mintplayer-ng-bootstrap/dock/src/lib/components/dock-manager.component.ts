import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  Input,
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

  layoutString: string | null = null;

  @ContentChildren(BsDockPaneComponent) panes: QueryList<BsDockPaneComponent> = new QueryList();
  @ViewChild('manager', { static: true }) managerRef!: ElementRef<MintDockManagerElement>;

  protected readonly trackByPane = (_: number, pane: BsDockPaneComponent) => pane.name;

  private _layout: DockLayoutNode | null = null;

  ngAfterViewInit(): void {
    this.applyLayout();
  }

  captureLayout(): DockLayoutSnapshot {
    const element = this.managerRef?.nativeElement;
    return element?.snapshot ?? { root: null };
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
