import { DomPortal } from '@angular/cdk/portal';
import { Component, ElementRef, OnDestroy, AfterViewInit } from '@angular/core';

@Component({
  selector: 'bs-split-panel',
  templateUrl: './split-panel.component.html',
  styleUrls: ['./split-panel.component.scss'],
})
export class BsSplitPanelComponent implements AfterViewInit, OnDestroy {
  constructor(private element: ElementRef) {}

  portal?: DomPortal;

  ngAfterViewInit() {
    setTimeout(() => this.portal = new DomPortal(this.element.nativeElement), 10);
  }

  ngOnDestroy() {
    this.portal?.detach();
  }
}
