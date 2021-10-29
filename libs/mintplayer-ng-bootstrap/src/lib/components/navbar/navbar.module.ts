import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BsNavbarComponent } from './navbar/navbar.component';
import { BsNavbarNavComponent } from './navbar-nav/navbar-nav.component';
import { BsNavbarDropdownComponent } from './navbar-dropdown/navbar-dropdown.component';
import { BsNavbarItemComponent } from './navbar-item/navbar-item.component';
import { NavLinkDirective } from './nav-link/nav-link.directive';



@NgModule({
  declarations: [
    BsNavbarComponent,
    BsNavbarNavComponent,
    BsNavbarDropdownComponent,
    BsNavbarItemComponent,
    NavLinkDirective
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
    NavLinkDirective
  ]
})
export class BsNavbarModule { }
