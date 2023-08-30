import { Component, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { BsStickyFooterParentDirective } from '../sticky-footer-parent/sticky-footer-parent.directive';

@Component({
  selector: 'bs-sticky-footer',
  templateUrl: './sticky-footer.component.html',
  styleUrls: ['./sticky-footer.component.scss'],
})
export class BsStickyFooterComponent implements AfterViewInit, OnDestroy {
  constructor(private parent: BsStickyFooterParentDirective, private element: ElementRef) {
    this.resizeObserver = new ResizeObserver((entries) => {
      this.parent.marginBottom = entries[0].contentRect.height;
    });
  }

  resizeObserver: ResizeObserver;
  @ViewChild('foot') footer!: ElementRef<HTMLElement>;

  ngAfterViewInit() {
    this.resizeObserver.observe(this.footer.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver.unobserve(this.footer.nativeElement);
  }
}
