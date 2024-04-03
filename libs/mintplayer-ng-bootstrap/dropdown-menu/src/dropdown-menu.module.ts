import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDropdownMenuComponent } from './dropdown-menu/dropdown-menu.component';
import { BsDropdownItemComponent } from './dropdown-item/dropdown-item.component';
import { BsDropdownDividerDirective } from '@mintplayer/ng-bootstrap/dropdown-divider';

@NgModule({
  declarations: [BsDropdownMenuComponent, BsDropdownItemComponent],
  imports: [CommonModule, BsDropdownDividerDirective],
  exports: [
    BsDropdownMenuComponent,
    BsDropdownItemComponent,
  
    BsDropdownDividerDirective,
  ],
})
export class BsDropdownMenuModule {}
