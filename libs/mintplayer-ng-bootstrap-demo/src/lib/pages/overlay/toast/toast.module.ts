import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FocusOnLoadModule } from '@mintplayer/ng-focus-on-load';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsCloseModule } from '@mintplayer/ng-bootstrap/close';
import { BsToastModule } from '@mintplayer/ng-bootstrap/toast';
import { BsInputGroupModule } from '@mintplayer/ng-bootstrap/input-group';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

import { ToastRoutingModule } from './toast-routing.module';
import { ToastComponent } from './toast.component';


@NgModule({
  declarations: [
    ToastComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    FocusOnLoadModule,
    BsFormModule,
    BsToastModule,
    BsCloseModule,
    BsInputGroupModule,
    BsButtonTypeModule,
    ToastRoutingModule
  ]
})
export class ToastModule { }
