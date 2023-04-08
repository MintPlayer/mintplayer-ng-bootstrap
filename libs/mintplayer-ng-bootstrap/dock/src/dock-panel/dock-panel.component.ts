import { DomPortal } from '@angular/cdk/portal';
import { Component, ElementRef, Input, AfterViewInit, ViewChild } from '@angular/core';

@Component({
  selector: 'bs-dock-panel',
  templateUrl: './dock-panel.component.html',
  styleUrls: ['./dock-panel.component.scss']
})
export class BsDockPanelComponent implements AfterViewInit {
  constructor() {
    // this.contentPortal = new DomPortal(this.element.nativeElement);
  }

  @ViewChild('headerElement') headerElement!: ElementRef<HTMLDivElement>;
  @ViewChild('contentElement') contentElement!: ElementRef<HTMLDivElement>;
  headerPortal?: DomPortal;
  contentPortal?: DomPortal;
  @Input() panelId = '';

  ngAfterViewInit() {
    // console.log('attach dockpanel', this.element.nativeElement);
    this.headerPortal = new DomPortal(this.headerElement.nativeElement);
    // setTimeout(() => {
      this.contentPortal = new DomPortal(this.contentElement.nativeElement);
    // }, 2000);
  }
}
