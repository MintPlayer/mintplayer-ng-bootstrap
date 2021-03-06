import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusOnLoadDirective } from './directives/focus-on-load/focus-on-load.directive';

@NgModule({
  imports: [CommonModule],
  declarations: [
    FocusOnLoadDirective
  ],
  exports: [
    FocusOnLoadDirective
  ],
})
export class FocusOnLoadModule {}
