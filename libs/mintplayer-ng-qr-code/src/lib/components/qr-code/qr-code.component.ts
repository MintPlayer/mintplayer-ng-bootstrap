import { Component, input, ChangeDetectionStrategy} from '@angular/core';
import { QRCodeErrorCorrectionLevel } from '@mintplayer/qr-code';
import { RgbaColor } from '../../types/rgba-color';
import { QrCodeDirective } from '../../directives/qr-code/qr-code.directive';

@Component({
  selector: 'qr-code',
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.scss'],
  standalone: true,
  imports: [QrCodeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeComponent {
  readonly value = input<string | undefined>(undefined);
  readonly size = input<number | undefined>(undefined);
  readonly darkColor = input<RgbaColor | undefined>(undefined);
  readonly lightColor = input<RgbaColor | undefined>(undefined);
  readonly errorCorrectionLevel = input<QRCodeErrorCorrectionLevel | undefined>(undefined);
  readonly centerImageSrc = input<string | undefined>(undefined);
  readonly centerImageSize = input<string | number | undefined>(undefined);
  readonly margin = input<number | undefined>(undefined);
}
