import { DomPortal } from '@angular/cdk/portal';
import { Component, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';

@Component({
  selector: 'bs-split-panel',
  templateUrl: './split-panel.component.html',
  styleUrls: ['./split-panel.component.scss'],
  standalone: false,
})
export class BsSplitPanelComponent implements AfterViewInit {
  element = inject(ElementRef);
  portal?: DomPortal;

  ngAfterViewInit() {
    setTimeout(() => this.portal = new DomPortal(this.element.nativeElement), 10);
  }
}
