import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsNavigationLockModule } from '@mintplayer/ng-bootstrap/navigation-lock';

import { NavigationLockRoutingModule } from './navigation-lock-routing.module';
import { NavigationLockComponent } from './navigation-lock.component';


@NgModule({
  declarations: [
    NavigationLockComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsToggleButtonModule,
    BsNavigationLockModule,
    NavigationLockRoutingModule
  ]
})
export class NavigationLockModule { }
