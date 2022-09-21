import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsPopoverComponent } from './component/popover.component';
import { BsPopoverDirective } from './directives/popover/popover.directive';
import { BsPopoverHeaderDirective } from './directives/popover-header/popover-header.directive';
import { BsPopoverBodyDirective } from './directives/popover-body/popover-body.directive';

@NgModule({
  declarations: [BsPopoverComponent, BsPopoverDirective, BsPopoverHeaderDirective, BsPopoverBodyDirective],
  imports: [CommonModule, OverlayModule],
  exports: [BsPopoverDirective, BsPopoverHeaderDirective, BsPopoverBodyDirective],
})
export class BsPopoverModule {}
