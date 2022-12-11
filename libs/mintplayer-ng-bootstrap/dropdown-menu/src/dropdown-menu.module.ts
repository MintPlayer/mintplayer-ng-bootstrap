import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDropdownMenuComponent } from './dropdown-menu/dropdown-menu.component';
import { BsDropdownItemComponent } from './dropdown-item/dropdown-item.component';
import { BsHasOverlayModule } from '@mintplayer/ng-bootstrap/has-overlay';

@NgModule({
  declarations: [BsDropdownMenuComponent, BsDropdownItemComponent],
  imports: [CommonModule, BsHasOverlayModule],
  exports: [BsDropdownMenuComponent, BsDropdownItemComponent],
})
export class BsDropdownMenuModule {}
