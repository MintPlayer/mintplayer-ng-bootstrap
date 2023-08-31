import { Component, AfterViewInit, ElementRef, ViewChild, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { BsStickyFooterParentDirective } from '../sticky-footer-parent/sticky-footer-parent.directive';
import { isPlatformServer } from '@angular/common';

@Component({
  selector: 'bs-sticky-footer',
  templateUrl: './sticky-footer.component.html',
  styleUrls: ['./sticky-footer.component.scss'],
})
export class BsStickyFooterComponent implements AfterViewInit, OnDestroy {
  constructor(private parent: BsStickyFooterParentDirective, private element: ElementRef, @Inject(PLATFORM_ID) private platformId: any) {
    if (!isPlatformServer(this.platformId)) {
      this.resizeObserver = new ResizeObserver((entries) => {
        this.parent.marginBottom = entries[0].contentRect.height;
      });
    }
  }

  resizeObserver?: ResizeObserver;
  @ViewChild('foot') footer!: ElementRef<HTMLElement>;

  ngAfterViewInit() {
    this.resizeObserver && this.resizeObserver.observe(this.footer.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver && this.resizeObserver.unobserve(this.footer.nativeElement);
  }
}
