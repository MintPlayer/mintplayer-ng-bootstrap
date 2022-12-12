import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { ClickOutsideModule } from '@mintplayer/ng-click-outside';
import { BsHasOverlayModule } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsDropdownMenuDirective } from './dropdown-menu/dropdown-menu.directive';
import { BsDropdownToggleDirective } from './dropdown-toggle/dropdown-toggle.directive';
import { BsDropdownComponent } from './dropdown/dropdown.component';

@NgModule({
  declarations: [
    BsDropdownComponent,
    BsDropdownToggleDirective,
    BsDropdownMenuDirective,
  ],
  imports: [
    CommonModule,
    OverlayModule,
    BsHasOverlayModule,
    ClickOutsideModule
  ],
  exports: [
    BsDropdownComponent,
    BsDropdownToggleDirective,
    BsDropdownMenuDirective,
  ],
})
export class BsDropdownModule {}
