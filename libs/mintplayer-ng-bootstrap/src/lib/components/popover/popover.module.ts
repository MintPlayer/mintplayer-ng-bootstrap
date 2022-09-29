import { Injector, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { BsPopoverComponent } from './component/popover.component';
import { BsPopoverDirective } from './directives/popover/popover.directive';
import { BsPopoverHeaderDirective } from './directives/popover-header/popover-header.directive';
import { BsPopoverBodyDirective } from './directives/popover-body/popover-body.directive';
import { PORTAL_FACTORY } from './providers/portal-factory.provider';

@NgModule({
  declarations: [BsPopoverComponent, BsPopoverDirective, BsPopoverHeaderDirective, BsPopoverBodyDirective],
  imports: [CommonModule, OverlayModule],
  exports: [BsPopoverDirective, BsPopoverHeaderDirective, BsPopoverBodyDirective],
  providers: [{
    provide: PORTAL_FACTORY,
    useValue: (injector: Injector) => {
      return new ComponentPortal(BsPopoverComponent, null, injector);
    }
  }]
})
export class BsPopoverModule {}
