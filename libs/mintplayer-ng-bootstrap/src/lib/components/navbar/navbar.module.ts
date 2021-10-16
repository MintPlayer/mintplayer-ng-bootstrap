import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsNavbarComponent } from './navbar/navbar.component';
import { BsNavbarNavComponent } from './navbar-nav/navbar-nav.component';
import { BsNavbarDropdownComponent } from './navbar-dropdown/navbar-dropdown.component';
import { BsNavbarItemComponent } from './navbar-item/navbar-item.component';



@NgModule({
  declarations: [
    BsNavbarComponent,
    BsNavbarNavComponent,
    BsNavbarDropdownComponent,
    BsNavbarItemComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsNavbarComponent,
    BsNavbarNavComponent,
    BsNavbarDropdownComponent,
    BsNavbarItemComponent
  ]
})
export class BsNavbarModule { }
