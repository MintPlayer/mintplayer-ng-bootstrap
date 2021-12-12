import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ClickOutsideModule } from '@mintplayer/ng-click-outside';
import { BsNavbarDropdownComponent } from './navbar-dropdown/navbar-dropdown.component';
import { BsNavbarItemComponent } from './navbar-item/navbar-item.component';

@NgModule({
  declarations: [
    BsNavbarDropdownComponent,
    BsNavbarItemComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    BrowserAnimationsModule,
    ClickOutsideModule
  ],
  exports: [
    BsNavbarDropdownComponent,
    BsNavbarItemComponent,
  ],
  providers: [
    { provide: 'bniComponent', useClass: BsNavbarItemComponent }
  ]
})
export class BsNavbarModule { }
