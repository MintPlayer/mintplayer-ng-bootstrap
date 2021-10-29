import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BsNavbarComponent } from './navbar/navbar.component';
import { BsNavbarNavComponent } from './navbar-nav/navbar-nav.component';
import { BsNavbarDropdownComponent } from './navbar-dropdown/navbar-dropdown.component';
import { BsNavbarItemComponent } from './navbar-item/navbar-item.component';
import { NavLinkDirective } from './nav-link/nav-link.directive';
import { DropdownToggleDirective } from './dropdown-toggle/dropdown-toggle.directive';



@NgModule({
  declarations: [
    BsNavbarComponent,
    BsNavbarNavComponent,
    BsNavbarDropdownComponent,
    BsNavbarItemComponent,
    NavLinkDirective,
    DropdownToggleDirective
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    BsNavbarComponent,
    BsNavbarNavComponent,
    BsNavbarDropdownComponent,
    BsNavbarItemComponent,
    NavLinkDirective,
    DropdownToggleDirective
  ]
})
export class BsNavbarModule { }
