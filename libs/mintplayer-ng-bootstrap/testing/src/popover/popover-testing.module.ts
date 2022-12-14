import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsPopoverMockDirective } from './directive/popover.directive';

@NgModule({
  declarations: [BsPopoverMockDirective],
  imports: [CommonModule],
  exports: [BsPopoverMockDirective]
})
export class BsPopoverTestingModule { }
