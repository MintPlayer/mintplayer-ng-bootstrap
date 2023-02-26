import { CdkDragEnter, CdkDragStart } from '@angular/cdk/drag-drop';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { DomPortal } from '@angular/cdk/portal';
import { Component, ElementRef, HostListener, HostBinding, ViewChild, NgZone, AfterViewInit } from '@angular/core';
import { BsDockService } from '../dock-service/dock.service';

@Component({
  selector: 'bs-dock-panel',
  templateUrl: './dock-panel.component.html',
  styleUrls: ['./dock-panel.component.scss'],
})
export class BsDockPanelComponent implements AfterViewInit {
  constructor(private zone: NgZone, private overlay: Overlay, private dockService: BsDockService) {
  }

  portal: DomPortal | null = null;
  overlayRef: OverlayRef | null = null;

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
  resizeAction: { side: 'top' | 'left' | 'bottom' | 'right', rect: DOMRect } | null = null;

  ngAfterViewInit() {
    this.portal = new DomPortal(this.dockPanel.nativeElement);
  }

  public toggleAttached() {
    console.log('isAttached', this.portal!.isAttached);
    if (this.overlayRef && this.overlayRef.hasAttached()) {
      this.overlayRef?.detach();
      this.overlayRef?.dispose();
    } else {
      this.overlayRef = this.overlay.create({});
      this.overlayRef!.attach(this.portal);
    }
  }

  onMouseDown(side: 'top' | 'left' | 'bottom' | 'right', ev: MouseEvent) {
    // this.resizeAction = {
    //   side,
    //   rect: 
    // }
  }

  @HostListener('window:mousemove', ['$event']) 
  onMouseMove(ev: MouseEvent) {

  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(ev: MouseEvent) {

  }

  onDragStart(ev: CdkDragStart<any>) {
    console.log('ev', ev);
  }

  // onDockPanelDragEnter(ev: CdkDragEnter<any>) {
  //   console.log('Entered with a panel', ev);
  // }
}
