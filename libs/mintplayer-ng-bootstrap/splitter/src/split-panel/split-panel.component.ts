import { DomPortal } from '@angular/cdk/portal';
import { ChangeDetectionStrategy, Component, ElementRef, inject, AfterViewInit } from '@angular/core';

@Component({
  selector: 'bs-split-panel',
  templateUrl: './split-panel.component.html',
  styleUrls: ['./split-panel.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsSplitPanelComponent implements AfterViewInit {

  private element = inject(ElementRef);

  portal?: DomPortal;

  ngAfterViewInit() {
    setTimeout(() => this.portal = new DomPortal(this.element.nativeElement), 10);
  }
}
