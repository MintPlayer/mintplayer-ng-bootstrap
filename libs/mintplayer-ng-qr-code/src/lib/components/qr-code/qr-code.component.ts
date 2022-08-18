import { Component, Input } from '@angular/core';
import { QRCodeErrorCorrectionLevel } from '@mintplayer/qr-code';
import { RgbaColor } from '../../types/rgba-color';

@Component({
  selector: 'qr-code',
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.scss']
})
export class QrCodeComponent {
  @Input() value?: string;
  @Input() size?: number;
  @Input() darkColor?: RgbaColor;
  @Input() lightColor?: RgbaColor;
  @Input() errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
  @Input() centerImageSrc?: string;
  @Input() centerImageSize?: string | number;
  @Input() margin?: number;
}
