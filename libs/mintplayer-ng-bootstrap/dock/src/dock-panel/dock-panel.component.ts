import { CdkDrag, CdkDragEnd, CdkDragEnter, CdkDragStart } from '@angular/cdk/drag-drop';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { DomPortal } from '@angular/cdk/portal';
import { Component, ElementRef, HostListener, HostBinding, ViewChild, NgZone, AfterViewInit, OnDestroy, Inject, forwardRef } from '@angular/core';
import { BehaviorSubject, Subject, combineLatest, take, takeUntil } from 'rxjs';
import { BsDockRegionComponent } from '../dock-region/dock-region.component';
import { BsDockService } from '../dock-service/dock.service';

@Component({
  selector: 'bs-dock-panel',
  templateUrl: './dock-panel.component.html',
  styleUrls: ['./dock-panel.component.scss'],
})
export class BsDockPanelComponent implements AfterViewInit, OnDestroy {
  constructor(private zone: NgZone, private overlay: Overlay, private dockService: BsDockService, element: ElementRef, @Inject(forwardRef(() => BsDockRegionComponent)) private currentRegion: BsDockRegionComponent) {
    this.element = element;
    this.overlayRef = this.overlay.create({});
    this.isInOverlay$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((isInOverlay) => {
        if (isInOverlay) {
          !this.overlayRef.hasAttached() && this.overlayRef.attach(this.portal);
        } else {
          this.overlayRef && this.overlayRef.hasAttached() && this.overlayRef.detach();
        }
        this.positionAbsolute = isInOverlay;
        this.size100 = !isInOverlay;
      });
  }

  portal: DomPortal | null = null;
  element: ElementRef;
  overlayRef: OverlayRef;
  isInOverlay$ = new BehaviorSubject<boolean>(false);
  destroyed$ = new Subject();

  @ViewChild('dockPanel') dockPanel!: ElementRef<HTMLDivElement>;
  
  @HostBinding('class.d-block') dBlockClass = true;
  // onDragMove(element: HTMLDivElement, ev: CdkDragMove<any>) {
  //   console.log('dragmove', { element, ev, panel: this.dockPanel });
  //   this.zone.runOutsideAngular(() => {
  //     const dragRect = element.getBoundingClientRect();
  //     const targetRect = this.dockPanel.nativeElement.getBoundingClientRect();
  
  //     const width = dragRect.left - targetRect.left + dragRect.width;
  //     const height = dragRect.top - targetRect.top + dragRect.height;
  
  //     this.dockPanel.nativeElement.style.width = (width - 5) + 'px';
  //     this.dockPanel.nativeElement.style.height = (height - 5) + 'px';
  //   });
  // }

  @HostBinding('width.px') width: number | null = null;
  @HostBinding('height.px') height: number | null = null;
  @HostBinding('style.left.px') positionLeft: number | null = null;
  @HostBinding('style.top.px') positionTop: number | null = null;
  @HostBinding('class.position-absolute') positionAbsolute = false;
  @HostBinding('class.w-100') @HostBinding('class.h-100') size100 = false;
  moveAction: { x: number, y: number } | null = null;
  resizeAction: { side: 'top' | 'left' | 'bottom' | 'right', rect: DOMRect } | null = null;

  ngAfterViewInit() {
    this.portal = new DomPortal(this.element.nativeElement);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

  public toggleAttached() {
  //   console.log('isInOverlay', this.portal!.isInOverlay);
  //   if (this.overlayRef && this.overlayRef.hasAttached()) {
  //     this.overlayRef?.detach();
  //     this.overlayRef?.dispose();
  //   } else {
  //     this.overlayRef = this.overlay.create({});
  //     this.overlayRef!.attach(this.portal);
  //   }
  }

  onHeaderMousedown(ev: MouseEvent) {
    ev.preventDefault();
    this.moveAction = {
      x: ev.offsetX,
      y: ev.offsetY,
    };
    this.isInOverlay$.next(true);
    this.dockService.currentDraggedPanel$.next(this);

    this.positionLeft = ev.clientX - ev.offsetX;
    this.positionTop = ev.clientY - ev.offsetY;
    this.currentRegion.dockContent = null!;
  }

  @HostListener('document:mouseup', ['$event'])
  onHeaderMouseUp(ev: MouseEvent) {
    combineLatest([this.dockService.currentDraggedPanel$, this.dockService.currentHoveredRegion$])
      .pipe(take(1))
      .subscribe(([currentDraggedPanel, currentHoveredRegion]) => {
        setTimeout(() => {
          if ((currentDraggedPanel === this) && currentHoveredRegion) {
            this.isInOverlay$.next(false);
            console.log('attach portal to region', currentHoveredRegion);
            currentHoveredRegion!.dockContent = this.portal!;
          }
        }, 20);
      });
  }

  onMouseDown(side: 'top' | 'left' | 'bottom' | 'right', ev: MouseEvent) {
    // this.resizeAction = {
    //   side,
    //   rect: 
    // }
  }

  @HostListener('window:mousemove', ['$event']) 
  onMouseMove(ev: MouseEvent) {
    if (this.moveAction) {
      this.positionLeft = ev.clientX - this.moveAction.x;
      this.positionTop = ev.clientY - this.moveAction.y;
    }
  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(ev: MouseEvent) {
    if (this.moveAction) {
      this.moveAction = null;
      this.dockService.currentDraggedPanel$.next(null);
    }
  }

  // onDragStart(ev: CdkDragStart<any>) {
  //   console.log('ev', ev);
  //   this.dockService.currentDraggedPanel$.next(this);
  // }

  // onDragEnd(ev: CdkDragEnd<any>) {
  //   this.dockService.onDragEnd(this);
  //   this.cdkDrag.reset();
  // }

  // onDockPanelDragEnter(ev: CdkDragEnter<any>) {
  //   console.log('Entered with a panel', ev);
  // }
}
