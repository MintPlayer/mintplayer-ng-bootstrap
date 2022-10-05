import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusOnLoadModule } from '@mintplayer/ng-focus-on-load';
import { BsFontColorPipeModule, BsGridModule, BsModalModule, BsSelect2Module } from '@mintplayer/ng-bootstrap';

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
    FocusOnLoadModule,

    BsFontColorPipeModule,

    ModalRoutingModule
  ]
})
export class ModalModule { }
