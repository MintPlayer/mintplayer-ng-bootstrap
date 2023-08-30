import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsStickyFooterComponent } from './sticky-footer/sticky-footer.component';
import { BsStickyFooterParentDirective } from './sticky-footer-parent/sticky-footer-parent.directive';

@NgModule({
  declarations: [BsStickyFooterComponent, BsStickyFooterParentDirective],
  imports: [CommonModule],
  exports: [BsStickyFooterComponent, BsStickyFooterParentDirective],
})
export class BsStickyFooterModule {}
