import { computed, Directive, effect, inject, input, ViewContainerRef } from '@angular/core';
import { QRCodeErrorCorrectionLevel } from '@mintplayer/qr-code';
import * as qrCodeService from '@mintplayer/qr-code';
import { RgbaColor } from '../../types/rgba-color';

@Directive({
  selector: 'canvas[qrCode]',
  standalone: true
})
export class QrCodeDirective {
  private viewContainerRef = inject(ViewContainerRef);

  static readonly VALID_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3,4}){1,2}$/;
  static readonly DEFAULT_ERROR_CORRECTION_LEVEL: QRCodeErrorCorrectionLevel = 'M';
  static readonly DEFAULT_CENTER_IMAGE_SIZE = 40;

  readonly value = input.required<string>({ alias: 'qrCode' });

  //#region Version
  readonly qrCodeVersion = input<number | null>(null);
  private version = computed(() => {
    const value = this.qrCodeVersion();
    if (value && (value > 40)) {
      return 40;
    } else if (value && (value < 1)) {
      return 1;
    } else {
      return null;
    }
  });
  //#endregion


  readonly width = input<number | undefined>(undefined);
  readonly height = input<number | undefined>(undefined);
  readonly darkColor = input<RgbaColor | undefined>('#000000FF');
  readonly lightColor = input<RgbaColor | undefined>('#FFFFFFFF');

  readonly errorCorrectionLevel = input<QRCodeErrorCorrectionLevel | undefined>(QrCodeDirective.DEFAULT_ERROR_CORRECTION_LEVEL, { alias: 'qrCodeErrorCorrectionLevel' });
  readonly centerImageSrc = input<string | undefined>(undefined, { alias: 'qrCodeCenterImageSrc' });
  readonly centerImageWidth = input<number | string | undefined>(undefined, { alias: 'qrCodeCenterImageWidth' });
  readonly centerImageHeight = input<number | string | undefined>(undefined, { alias: 'qrCodeCenterImageHeight' });
  readonly margin = input<number | undefined>(16, { alias: 'qrCodeMargin' });

  private centerImage?: HTMLImageElement;

  constructor() {
    effect(() => {
      this.renderQrCode();
    });
  }

  private async renderQrCode() {
    const value = this.value();
    if (!value) {
      return;
    }

    const canvas = this.viewContainerRef.element.nativeElement as HTMLCanvasElement | null;
    if (!canvas || (typeof window === 'undefined')) {
      // native element not available on server side rendering
      return;
    }

    if (typeof window !== 'undefined') {
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        const errorCorrectionLevel = this.errorCorrectionLevel() ?? QrCodeDirective.DEFAULT_ERROR_CORRECTION_LEVEL;
        const darkColor = this.darkColor();
        const lightColor = this.lightColor();

        const dark = !darkColor
          ? undefined
          : QrCodeDirective.VALID_COLOR_REGEX.test(darkColor)
          ? darkColor
          : undefined;
        const light = !lightColor
          ? undefined
          : QrCodeDirective.VALID_COLOR_REGEX.test(lightColor)
          ? lightColor
          : undefined;

        await qrCodeService
          .toCanvas(canvas, value, {
            version: this.version() ?? undefined,
            errorCorrectionLevel,
            width: this.width(),
            margin: this.margin(),
            color: {
              dark,
              light,
            },
          });

        const centerImageSrc = this.centerImageSrc();
        const centerImageWidth = this.getIntOrDefault(this.centerImageWidth(), QrCodeDirective.DEFAULT_CENTER_IMAGE_SIZE);
        const centerImageHeight = this.getIntOrDefault(this.centerImageHeight(), QrCodeDirective.DEFAULT_CENTER_IMAGE_SIZE);

        if (centerImageSrc && context) {

          if (!this.centerImage) {
            this.centerImage = new Image(centerImageWidth, centerImageHeight);
          }

          if (centerImageSrc !== this.centerImage?.src) {
            this.centerImage.src = centerImageSrc;
          }

          if (centerImageWidth !== this.centerImage.width) {
            this.centerImage.width = centerImageWidth;
          }

          if (centerImageHeight !== this.centerImage.height) {
            this.centerImage.height = centerImageHeight;
          }

          const centerImage = this.centerImage;

          centerImage.onload = () => {
            context.drawImage(
              centerImage,
              canvas.width / 2 - centerImageWidth / 2,
              canvas.height / 2 - centerImageHeight / 2, centerImageWidth, centerImageHeight,
            );
          }
        }
      }
    }
  }

  private getIntOrDefault(value: string | number | undefined, defaultValue: number): number {
    if (value === undefined || value === '') {
      return defaultValue;
    } else if (typeof value === 'string') {
      return parseInt(value, 10);
    } else {
      return value;
    }
  }

}
