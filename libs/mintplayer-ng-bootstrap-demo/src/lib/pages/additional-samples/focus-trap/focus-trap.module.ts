import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { FocusOnLoadModule } from '@mintplayer/ng-focus-on-load';
import { BsCloseModule } from '@mintplayer/ng-bootstrap/close';
import { BsForModule } from '@mintplayer/ng-bootstrap/for';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsModalModule } from '@mintplayer/ng-bootstrap/modal';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

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
    BsFormModule,
    BsGridModule,
    BsCloseModule,
    BsModalModule,
    BsButtonTypeModule,
    FocusOnLoadModule,
    FocusTrapRoutingModule
  ]
})
export class FocusTrapModule { }
