import { CdkDragMove } from '@angular/cdk/drag-drop';
import { Component, ElementRef, HostListener, HostBinding, ViewChild, NgZone } from '@angular/core';

@Component({
  selector: 'bs-dock-panel',
  templateUrl: './dock-panel.component.html',
  styleUrls: ['./dock-panel.component.scss'],
})
export class BsDockPanelComponent {
  constructor(private zone: NgZone) {
  }

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
}
