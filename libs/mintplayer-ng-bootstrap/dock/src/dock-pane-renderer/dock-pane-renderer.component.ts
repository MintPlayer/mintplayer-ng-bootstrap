import { Component, ElementRef, HostBinding, Inject, Input, forwardRef, OnDestroy } from '@angular/core';
import { DomPortal } from '@angular/cdk/portal';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { BsDockPane } from '../panes/dock-pane';
import { EPaneType } from '../enums/pane-type.enum';
import { BsSplitPane } from '../panes/split-pane';
import { BsContentPane } from '../panes/content-pane';
import { BsDocumentHost } from '../panes/document-host-pane';
import { BsTabGroupPane } from '../panes/tab-group-pane';
import { BsFloatingPane } from '../panes/floating-pane';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import type { BsDockComponent } from '../dock/dock.component';
import { DockRegionZone } from '../types/dock-region-zone';
import { BsHoveredZone } from '../interfaces/hovered-zone';

@Component({
  selector: 'bs-dock-pane-renderer',
  templateUrl: './dock-pane-renderer.component.html',
  styleUrls: ['./dock-pane-renderer.component.scss'],
  providers: [
    { provide: 'DOCK_PANE_RENDERER', useExisting: forwardRef(() => BsDockPaneRendererComponent) }
  ]
})
export class BsDockPaneRendererComponent implements OnDestroy {

  constructor(private overlay: Overlay, @Inject('DOCK') dock: any, element: ElementRef) {
    this.portal = new DomPortal(element);
    this.dock = dock;
    this.dock.dockPaneRenderers$.next([...this.dock.dockPaneRenderers$.value, this]);

    this.hoveredZone$ = combineLatest([this.hoverLeft$, this.hoverRight$, this.hoverTop$, this.hoverBottom$, this.hoverCenter$])
      .pipe(map(([hoverLeft, hoverRight, hoverTop, hoverBottom, hoverCenter]) => {
        if (hoverLeft) {
          return { zone: 'left', panel: this };
        } else if (hoverRight) {
          return { zone: 'right', panel: this };
        } else if (hoverTop) {
          return { zone: 'top', panel: this };
        } else if (hoverBottom) {
          return { zone: 'bottom', panel: this };
        } else if (hoverCenter) {
          return { zone: 'center', panel: this };
        } else {
          return null;
        }
      }));
  }

  portal: DomPortal;
  readonly dock: BsDockComponent;

  paneTypes = EPaneType;
  readonly BsDocumentHostType = BsDocumentHost;
  readonly BsTabGroupType = BsTabGroupPane;
  readonly BsSplitterType = BsSplitPane;
  readonly BsContentPaneType = BsContentPane;
  readonly BsFloatingPaneType = BsFloatingPane;

  @HostBinding('class.position-relative') positionRelative = true;

  //#region Layout
  layout$ = new BehaviorSubject<BsDockPane | null>(null);
  public get layout() {
    return this.layout$.value;
  }
  @Input() public set layout(value: BsDockPane | null) {
    this.layout$.next(value);
  }
  //#endregion

  private overlayRef?: OverlayRef;
  public moveToOverlay() {
    if (!this.overlayRef && !this.portal.isAttached) {
      this.overlayRef = this.overlay.create({});
      this.portal.attach(this.overlayRef);
    }
  }

  public disposeOverlay() {
    if (this.overlayRef) {
      this.portal.detach();
      this.overlayRef.dispose();
      this.overlayRef = undefined;
    }
  }

  ngOnDestroy() {
    this.dock.dockPaneRenderers$.next(this.dock.dockPaneRenderers$.value.filter(dpr => dpr !== this));
  }

  hoverLeft$ = new BehaviorSubject<boolean>(false);
  hoverRight$ = new BehaviorSubject<boolean>(false);
  hoverTop$ = new BehaviorSubject<boolean>(false);
  hoverBottom$ = new BehaviorSubject<boolean>(false);
  hoverCenter$ = new BehaviorSubject<boolean>(false);
  hoveredZone$: Observable<BsHoveredZone | null>;
}
