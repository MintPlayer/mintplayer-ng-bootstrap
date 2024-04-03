import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { ClickOutsideDirective } from '@mintplayer/ng-click-outside';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsDropdownDirective } from './dropdown/dropdown.directive';
import { BsDropdownMenuDirective } from './dropdown-menu/dropdown-menu.directive';
import { BsDropdownToggleDirective } from './dropdown-toggle/dropdown-toggle.directive';
// import { BsDropdownComponent } from './dropdown/dropdown.component';


@NgModule({
  declarations: [
    BsDropdownDirective,
    BsDropdownToggleDirective,
    BsDropdownMenuDirective,
    // BsDropdownComponent,
  ],
  imports: [CommonModule, OverlayModule, BsHasOverlayComponent, ClickOutsideDirective],
  exports: [
    BsDropdownDirective,
    BsDropdownToggleDirective,
    BsDropdownMenuDirective,
    // BsDropdownComponent,
    BsHasOverlayComponent,
  ],
})
export class BsDropdownModule {}
