import { Component, ElementRef, HostBinding, HostListener } from '@angular/core';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';
import { BsDockComponent } from '../dock/dock.component';

@Component({
  selector: 'bs-dock-panel-header',
  templateUrl: './dock-panel-header.component.html',
  styleUrls: ['./dock-panel-header.component.scss'],
  standalone: false,
})
export class BsDockPanelHeaderComponent {
  constructor(
    private dockPanel: BsDockPanelComponent,
    private dock: BsDockComponent,
    private element: ElementRef<HTMLElement>,
  ) {}

  private isMouseDown = false;
  private isDragging = false;

  @HostListener('mousedown', ['$event'])
  onMouseDown(ev: MouseEvent) {
    ev.preventDefault();
    this.isMouseDown = true;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(ev: MouseEvent) {
    if (!this.isMouseDown) {
      return;
    }

    if (!this.isDragging) {
      this.isDragging = this.dock.beginDrag(this.dockPanel, this.element.nativeElement, ev);
    }

    if (this.isDragging) {
      this.dock.updateDrag(ev);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(ev: MouseEvent) {
    if (this.isDragging) {
      this.dock.completeDrag(ev);
    } else if (this.isMouseDown) {
      this.dock.cancelDrag();
    }

    this.isDragging = false;
    this.isMouseDown = false;
  }

  @HostBinding('class.d-block')
  dBlock = true;
}
