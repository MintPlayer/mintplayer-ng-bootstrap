import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsNavbarMockComponent } from './navbar/navbar.component';
import { BsNavbarNavMockComponent } from './navbar-nav/navbar-nav.component';
import { BsNavbarDropdownMockComponent } from './navbar-dropdown/navbar-dropdown.component';
import { BsNavbarItemMockComponent } from './navbar-item/navbar-item.component';
import { NavbarContentMockDirective } from './navbar-content/navbar-content.directive';
import { BsNavbarBrandMockComponent } from './navbar-brand/navbar-brand.component';

@NgModule({
  declarations: [
    BsNavbarMockComponent,
    BsNavbarNavMockComponent,
    BsNavbarDropdownMockComponent,
    BsNavbarItemMockComponent,
    NavbarContentMockDirective,
    BsNavbarBrandMockComponent,
  ],
  imports: [CommonModule],
  exports: [
    BsNavbarMockComponent,
    BsNavbarNavMockComponent,
    BsNavbarDropdownMockComponent,
    BsNavbarItemMockComponent,
    NavbarContentMockDirective,
    BsNavbarBrandMockComponent,
  ],
})
export class BsNavbarTestingModule {}
