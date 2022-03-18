import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QrCodeComponent } from './components/qr-code/qr-code.component';
import { QrCodeDirective } from './directives/qr-code/qr-code.directive';

@NgModule({
  imports: [CommonModule],
  declarations: [
    QrCodeComponent,
    QrCodeDirective
  ],
  exports: [
    QrCodeComponent,
    QrCodeDirective
  ],
})
export class QrCodeModule {}
