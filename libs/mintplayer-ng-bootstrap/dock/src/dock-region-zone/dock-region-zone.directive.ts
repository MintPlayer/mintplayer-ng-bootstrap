import { Directive, HostBinding, HostListener, Inject, Input, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import type { BsDockPaneRendererComponent } from '../dock-pane-renderer/dock-pane-renderer.component';
import { DockRegionZone } from '../types/dock-region-zone';

@Directive({
  selector: '[bsDockRegionZone]',
})
export class BsDockRegionZoneDirective implements OnDestroy {
  constructor(@Inject('DOCK_PANE_RENDERER') private dockPaneRenderer: BsDockPaneRendererComponent) {
    this.bsDockRegionZone$.pipe(takeUntil(this.destroyed$))
      .subscribe(zone => this.zone = zone ?? 'center');
  }

  //#region bsDockRegionZone
  bsDockRegionZone$ = new BehaviorSubject<DockRegionZone | null>(null);
  public get bsDockRegionZone() {
    return this.bsDockRegionZone$.value;
  }
  @Input() public set bsDockRegionZone(value: DockRegionZone | null) {
    this.bsDockRegionZone$.next(value);
  }
  //#endregion

  @HostBinding('class.dock-region-zone') classes = true;
  @HostBinding('class') zone: DockRegionZone = 'center';

  @HostListener('mouseenter', ['$event']) onMouseEnter(ev: MouseEvent) {
    // setTimeout(() => {
      this.dockPaneRenderer.dock.hoveredZone$.next({
        zone: this.zone,
        panel: this.dockPaneRenderer,
      });
    // }, 5);
  }
  
  @HostListener('mouseout', ['$event']) onMouseLeave(ev: MouseEvent) {
    this.dockPaneRenderer.dock.hoveredZone$.next(null);
  }

  destroyed$ = new Subject();
  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }
}
