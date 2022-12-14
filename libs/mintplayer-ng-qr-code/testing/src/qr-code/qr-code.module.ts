import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QrCodeMockComponent } from './component/qr-code.component';
import { QrCodeMockDirective } from './directive/qr-code.directive';
import { QrCodeComponent, QrCodeDirective } from '@mintplayer/ng-qr-code';

@NgModule({
  declarations: [QrCodeMockComponent, QrCodeMockDirective],
  imports: [CommonModule],
  exports: [QrCodeMockComponent, QrCodeMockDirective],
  providers: [
    { provide: QrCodeComponent, useClass: QrCodeMockComponent },
    { provide: QrCodeDirective, useClass: QrCodeMockDirective },
  ]
})
export class QrCodeTestingModule {}
