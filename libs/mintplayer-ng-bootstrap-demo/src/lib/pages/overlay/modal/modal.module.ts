import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusOnLoadModule } from '@mintplayer/ng-focus-on-load';
import { BsFontColorPipeModule } from '@mintplayer/ng-bootstrap';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsModalModule } from '@mintplayer/ng-bootstrap/modal';
import { BsSelect2Module } from '@mintplayer/ng-bootstrap/select2';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

import { ModalRoutingModule } from './modal-routing.module';
import { ModalComponent } from './modal.component';


@NgModule({
  declarations: [
    ModalComponent
  ],
  imports: [
    CommonModule,

    BsGridModule,
    BsModalModule,
    BsSelect2Module,
    BsButtonTypeModule,
    FocusOnLoadModule,

    BsFontColorPipeModule,

    ModalRoutingModule
  ]
})
export class ModalModule { }
