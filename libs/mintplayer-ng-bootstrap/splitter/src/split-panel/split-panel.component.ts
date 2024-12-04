import { DomPortal } from '@angular/cdk/portal';
import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

@Component({
  selector: 'bs-split-panel',
  templateUrl: './split-panel.component.html',
  styleUrls: ['./split-panel.component.scss'],
  standalone: false,
})
export class BsSplitPanelComponent implements AfterViewInit {
  constructor(private element: ElementRef) {}

  portal?: DomPortal;

  ngAfterViewInit() {
    setTimeout(() => this.portal = new DomPortal(this.element.nativeElement), 10);
  }
}
