import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarRouterLinkActiveDirective } from './navbar-routerlink-active/navbar-router-link-active.directive';



@NgModule({
  declarations: [
    NavbarRouterLinkActiveDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    NavbarRouterLinkActiveDirective
  ]
})
export class DirectivesModule { }
