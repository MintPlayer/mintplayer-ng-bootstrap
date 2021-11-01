import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownToggleDirective } from './dropdown-toggle/dropdown-toggle.directive';
import { NavLinkDirective } from './nav-link/nav-link.directive';

@NgModule({
  declarations: [
    DropdownToggleDirective,
    NavLinkDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    DropdownToggleDirective,
    NavLinkDirective
  ]
})
export class DirectivesModule { }
