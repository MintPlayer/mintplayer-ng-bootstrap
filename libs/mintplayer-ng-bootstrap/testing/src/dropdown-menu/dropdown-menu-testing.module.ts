import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDropdownItemMockComponent } from './dropdown-item/dropdown-item.component';
import { BsDropdownMenuMockComponent } from './dropdown-menu/dropdown-menu.component';
import { BsDropdownItemComponent, BsDropdownMenuComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';

@NgModule({
  declarations: [BsDropdownItemMockComponent, BsDropdownMenuMockComponent],
  imports: [CommonModule],
  exports: [BsDropdownItemMockComponent, BsDropdownMenuMockComponent],
  providers: [
    { provide: BsDropdownItemMockComponent, useClass: BsDropdownItemComponent },
    { provide: BsDropdownMenuMockComponent, useClass: BsDropdownMenuComponent },
  ]
})
export class BsDropdownMenuTestingModule {}
