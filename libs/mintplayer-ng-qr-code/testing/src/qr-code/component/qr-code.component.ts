import { Component, Input } from '@angular/core';
import { QrCodeComponent } from '@mintplayer/ng-qr-code';
import { QRCodeErrorCorrectionLevel } from '../types/error-correction-level';
import { RgbaColor } from '../types/rgba-color';

@Component({
  selector: 'qr-code',
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.scss'],
  providers: [
    { provide: QrCodeComponent, useExisting: QrCodeMockComponent }
  ]
})
export class QrCodeMockComponent {
  @Input() value?: string;
  @Input() size?: number;
  @Input() darkColor?: RgbaColor;
  @Input() lightColor?: RgbaColor;
  @Input() errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
  @Input() centerImageSrc?: string;
  @Input() centerImageSize?: string | number;
  @Input() margin?: number;
}
