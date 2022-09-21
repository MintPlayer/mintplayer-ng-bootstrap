import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FocusOnLoadModule } from '@mintplayer/ng-focus-on-load';
import { BsCloseModule, BsToastModule } from '@mintplayer/ng-bootstrap';

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
    BsToastModule,
    BsCloseModule,
    ToastRoutingModule
  ]
})
export class ToastModule { }
