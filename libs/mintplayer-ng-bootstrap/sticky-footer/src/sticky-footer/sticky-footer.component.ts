import { AfterViewInit, Component, DestroyRef, inject, ViewChild } from '@angular/core';
import { BsStickyFooterParentDirective } from '../sticky-footer-parent/sticky-footer-parent.directive';
import { BsObserveSizeDirective } from '@mintplayer/ng-swiper/observe-size';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'bs-sticky-footer',
  templateUrl: './sticky-footer.component.html',
  styleUrls: ['./sticky-footer.component.scss'],
  standalone: false,
})
export class BsStickyFooterComponent implements AfterViewInit {
  parent = inject(BsStickyFooterParentDirective);
  destroy = inject(DestroyRef);

  ngAfterViewInit() {
    if (this.sizeObserver.height$) {
      this.sizeObserver.height$
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe(height => this.parent.marginBottom = height);
    }
  }

  @ViewChild('sizeObserver') sizeObserver!: BsObserveSizeDirective;
}
