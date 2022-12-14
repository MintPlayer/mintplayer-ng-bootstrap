import { Directive, Input } from '@angular/core';
import { QrCodeDirective } from '@mintplayer/ng-qr-code';
import { QRCodeErrorCorrectionLevel } from '../types/error-correction-level';
import { RgbaColor } from '../types/rgba-color';

@Directive({
  selector: 'canvas[qrCode]',
  providers: [
    { provide: QrCodeDirective, useExisting: QrCodeMockDirective }
  ]
})
export class QrCodeMockDirective {

  @Input('qrCode') value!: string;
  @Input() qrCodeVersion: number | null = null;

  @Input() width?: number;
  @Input() height?: number;
  @Input() darkColor?: RgbaColor = '#000000FF';
  @Input() lightColor?: RgbaColor = '#FFFFFFFF';

  @Input() qrCodeErrorCorrectionLevel?: QRCodeErrorCorrectionLevel = 'M';
  @Input() qrCodeCenterImageSrc?: string;
  @Input() qrCodeCenterImageWidth?: number | string;
  @Input() qrCodeCenterImageHeight?: number | string;
  @Input() qrCodeMargin? = 16;
}
