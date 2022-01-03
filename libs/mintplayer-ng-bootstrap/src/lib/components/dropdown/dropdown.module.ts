import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { ClickOutsideModule } from '@mintplayer/ng-click-outside';
import { BsDropdownDirective } from './dropdown/dropdown.directive';
import { BsDropdownMenuDirective } from './dropdown-menu/dropdown-menu.directive';
import { BsDropdownToggleDirective } from './dropdown-toggle/dropdown-toggle.directive';



@NgModule({
  declarations: [
    BsDropdownDirective,
    BsDropdownToggleDirective,
    BsDropdownMenuDirective
  ],
  imports: [
    CommonModule,
    OverlayModule,
    ClickOutsideModule
  ],
  exports: [
    BsDropdownDirective,
    BsDropdownToggleDirective,
    BsDropdownMenuDirective
  ]
})
export class BsDropdownModule { }
