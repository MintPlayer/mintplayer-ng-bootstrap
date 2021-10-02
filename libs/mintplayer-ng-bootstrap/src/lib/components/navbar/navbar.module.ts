import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsNavbarComponent } from './navbar/navbar.component';
import { BsNavbarMenuComponent } from './bs-navbar-menu/bs-navbar-menu.component';



@NgModule({
  declarations: [
    BsNavbarComponent,
    BsNavbarMenuComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsNavbarComponent
  ]
})
export class BsNavbarModule { }
