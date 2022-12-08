import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClickOutsideModule } from '@mintplayer/ng-click-outside';
import { BsNavbarComponent } from './navbar/navbar.component';
import { BsNavbarNavComponent } from './navbar-nav/navbar-nav.component';
import { BsNavbarDropdownComponent } from './navbar-dropdown/navbar-dropdown.component';
import { BsNavbarItemComponent } from './navbar-item/navbar-item.component';
import { DropdownToggleDirective } from './dropdown-toggle/dropdown-toggle.directive';
import { NavLinkDirective } from './nav-link/nav-link.directive';
import { NavbarContentDirective } from './navbar-content/navbar-content.directive';
import { BsNavbarBrandComponent } from './navbar-brand/navbar-brand.component';
import { BsExpandButtonDirective } from './expand-button/expand-button.directive';
import { BsNavbarTogglerComponent } from './navbar-toggler/navbar-toggler.component';

@NgModule({
  declarations: [
    BsNavbarComponent,
    BsNavbarNavComponent,
    BsNavbarDropdownComponent,
    BsNavbarItemComponent,

    DropdownToggleDirective,
    NavLinkDirective,
    NavbarContentDirective,
    BsNavbarBrandComponent,
    BsExpandButtonDirective,
    BsNavbarTogglerComponent
  ],
  imports: [
    CommonModule,
    ClickOutsideModule
  ],
  exports: [
    BsNavbarComponent,
    BsNavbarNavComponent,
    BsNavbarDropdownComponent,
    BsNavbarItemComponent,

    DropdownToggleDirective,
    NavLinkDirective,
    NavbarContentDirective,
    BsNavbarBrandComponent,
    BsExpandButtonDirective,
    BsNavbarTogglerComponent
  ]
})
export class BsNavbarModule { }
