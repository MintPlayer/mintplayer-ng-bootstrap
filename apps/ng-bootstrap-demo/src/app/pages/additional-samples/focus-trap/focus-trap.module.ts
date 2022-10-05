import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { FocusOnLoadModule } from '@mintplayer/ng-focus-on-load';
import { BsCloseModule, BsForModule, BsGridModule, BsModalModule } from '@mintplayer/ng-bootstrap';

import { FocusTrapRoutingModule } from './focus-trap-routing.module';
import { FocusTrapComponent } from './focus-trap.component';


@NgModule({
  declarations: [
    FocusTrapComponent
  ],
  imports: [
    CommonModule,
    A11yModule,
    BsForModule,
    BsGridModule,
    BsCloseModule,
    BsModalModule,
    FocusOnLoadModule,
    FocusTrapRoutingModule
  ]
})
export class FocusTrapModule { }
