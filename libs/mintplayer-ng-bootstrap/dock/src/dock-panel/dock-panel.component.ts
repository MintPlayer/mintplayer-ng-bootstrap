import { CdkDragMove } from '@angular/cdk/drag-drop';
import { Component, ElementRef, HostBinding, ViewChild, NgZone } from '@angular/core';

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
  onDragMove(element: HTMLDivElement, ev: CdkDragMove<any>) {
    console.log('dragmove', { element, ev, panel: this.dockPanel });
    this.zone.runOutsideAngular(() => {
      const dragRect = element.getBoundingClientRect();
      const targetRect = this.dockPanel.nativeElement.getBoundingClientRect();
  
      const width = dragRect.left - targetRect.left + dragRect.width;
      const height = dragRect.top - targetRect.top + dragRect.height;
  
      this.dockPanel.nativeElement.style.width = (width - 5) + 'px';
      this.dockPanel.nativeElement.style.height = (height - 5) + 'px';
    });
  }
}
