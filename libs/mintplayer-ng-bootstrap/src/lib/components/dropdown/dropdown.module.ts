import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDropdownDirective } from './dropdown/dropdown.directive';
import { BsDropdownMenuDirective } from './dropdown-menu/dropdown-menu.directive';
import { BsDropdownToggleDirective } from './dropdown-toggle/dropdown-toggle.directive';

@NgModule({
  declarations: [
    BsDropdownDirective,
    BsDropdownMenuDirective,
    BsDropdownToggleDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsDropdownDirective,
    BsDropdownMenuDirective,
    BsDropdownToggleDirective
  ]
})
export class BsDropdownModule { }
