import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDropdownMockDirective } from './dropdown.directive';
import { BsDropdownMenuMockDirective } from './dropdown-menu.directive';
import { BsDropdownToggleMockDirective } from './dropdown-toggle.directive';

@NgModule({
  declarations: [
    BsDropdownMockDirective,
    BsDropdownMenuMockDirective,
    BsDropdownToggleMockDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsDropdownMockDirective,
    BsDropdownMenuMockDirective,
    BsDropdownToggleMockDirective
  ]
})
export class BsDropdownTestingModule { }
