import { Component, Input } from '@angular/core';
import { QRCodeErrorCorrectionLevel } from '@mintplayer/qr-code';
import { RgbaColor } from '../../types/rgba-color';
import { QrCodeDirective } from '../../directives/qr-code/qr-code.directive';

@Component({
  selector: 'qr-code',
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.scss'],
  standalone: true,
  imports: [QrCodeDirective]
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
