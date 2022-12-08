import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDropdownMenuComponent } from './dropdown-menu/dropdown-menu.component';
import { BsDropdownItemComponent } from './dropdown-item/dropdown-item.component';

@NgModule({
  declarations: [BsDropdownMenuComponent, BsDropdownItemComponent],
  imports: [CommonModule],
  exports: [BsDropdownMenuComponent, BsDropdownItemComponent],
})
export class BsDropdownMenuModule {}
