import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSignaturePadModule } from '@mintplayer/ng-bootstrap/signature-pad';

import { SignaturePadRoutingModule } from './signature-pad-routing.module';
import { SignaturePadComponent } from './signature-pad.component';


@NgModule({
  declarations: [
    SignaturePadComponent
  ],
  imports: [
    CommonModule,
    BsSignaturePadModule,
    SignaturePadRoutingModule
  ]
})
export class SignaturePadModule { }
