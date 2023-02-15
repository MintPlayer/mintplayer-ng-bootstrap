import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDropdownDividerDirective } from './dropdown-divider.directive';



@NgModule({
  declarations: [BsDropdownDividerDirective],
  imports: [CommonModule],
  exports: [BsDropdownDividerDirective]
})
export class BsDropdownDividerModule { }
