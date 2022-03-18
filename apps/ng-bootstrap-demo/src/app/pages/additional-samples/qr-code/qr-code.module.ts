import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { QrCodeModule as LibQrCodeModule } from '@mintplayer/ng-qr-code';

import { QrCodeRoutingModule } from './qr-code-routing.module';
import { QrCodeComponent } from './qr-code.component';


@NgModule({
  declarations: [
    QrCodeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    LibQrCodeModule,
    QrCodeRoutingModule
  ]
})
export class QrCodeModule { }
