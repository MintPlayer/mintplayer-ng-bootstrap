import { Directive, HostBinding, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformServer } from '@angular/common';
import { take } from 'rxjs';
import { BsOffcanvasHostComponent } from '../../components/offcanvas-host/offcanvas-host.component';

@Directive({
  selector: 'label[bsOffcanvasClose]'
})
export class BsOffcanvasCloseDirective {
  constructor(private offcanvas: BsOffcanvasHostComponent, @Inject(PLATFORM_ID) platformId: any) {
    if (isPlatformServer(platformId)) {
      offcanvas.offcanvasName$.pipe(take(1), takeUntilDestroyed()).subscribe((id) => {
        this.forTarget = id;
      });
    }
  }

  @HostListener('click') onClick() {
    this.offcanvas.isVisible = false;
  }

  @HostBinding('attr.for') forTarget?: string;
}
