import { DomPortal } from '@angular/cdk/portal';
import { Component, ElementRef, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'bs-dock-panel',
  templateUrl: './dock-panel.component.html',
  styleUrls: ['./dock-panel.component.scss']
})
export class BsDockPanelComponent {
  constructor(element: ElementRef<any>) {
    this.portal = new DomPortal(element);
  }

  portal: DomPortal;
}
