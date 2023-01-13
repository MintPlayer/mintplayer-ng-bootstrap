import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BsNavigationLockDirective } from './directive/navigation-lock.directive';

@NgModule({
  declarations: [
    BsNavigationLockDirective
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    BsNavigationLockDirective
  ]
})
export class BsNavigationLockModule { }
