import { DomPortal } from '@angular/cdk/portal';
import { Component, ElementRef, Input, AfterViewInit } from '@angular/core';

@Component({
  selector: 'bs-dock-panel',
  templateUrl: './dock-panel.component.html',
  styleUrls: ['./dock-panel.component.scss']
})
export class BsDockPanelComponent implements AfterViewInit {
  constructor(private element: ElementRef<any>) {
    this.portal = new DomPortal(this.element.nativeElement);
  }

  portal?: DomPortal;
  @Input() panelId = '';

  ngAfterViewInit() {
    console.log('attach dockpanel', this.element.nativeElement);
    this.portal = new DomPortal(this.element.nativeElement);
  }
}
