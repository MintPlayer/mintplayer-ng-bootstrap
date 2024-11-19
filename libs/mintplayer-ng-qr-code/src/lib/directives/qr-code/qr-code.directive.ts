import { Directive, Input, isDevMode, OnChanges, ViewContainerRef } from '@angular/core';
import { QRCodeErrorCorrectionLevel } from '@mintplayer/qr-code';
import * as qrCodeService from '@mintplayer/qr-code';
import { RgbaColor } from '../../types/rgba-color';

@Directive({
  selector: 'canvas[qrCode]'
})
export class QrCodeDirective implements OnChanges {

  constructor(private viewContainerRef: ViewContainerRef) {}

  static readonly VALID_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3,4}){1,2}$/;
  static readonly DEFAULT_ERROR_CORRECTION_LEVEL: QRCodeErrorCorrectionLevel = 'M';
  static readonly DEFAULT_CENTER_IMAGE_SIZE = 40;

  @Input('qrCode') value!: string;

  //#region Version
  private version: number | null = null;
  @Input() set qrCodeVersion(value: number | null) {
    if (value && (value > 40)) {
      this.version = 40;
    } else if (value && (value < 1)) {
      this.version = 1;
    } else {
      this.version = null;
    }
  }
  //#endregion

  
  @Input() width?: number;
  @Input() height?: number;
  @Input() darkColor?: RgbaColor = '#000000FF';
  @Input() lightColor?: RgbaColor = '#FFFFFFFF';
  
  @Input('qrCodeErrorCorrectionLevel') errorCorrectionLevel?: QRCodeErrorCorrectionLevel = QrCodeDirective.DEFAULT_ERROR_CORRECTION_LEVEL;
  @Input('qrCodeCenterImageSrc') centerImageSrc?: string;
  @Input('qrCodeCenterImageWidth') centerImageWidth?: number | string;
  @Input('qrCodeCenterImageHeight') centerImageHeight?: number | string;
  @Input('qrCodeMargin') margin? = 16;

  private centerImage?: HTMLImageElement;


  async ngOnChanges() {
    if (!this.value) {
      return;
    }

    const canvas = this.viewContainerRef.element.nativeElement as HTMLCanvasElement | null;
    if (!canvas) {
      // native element not available on server side rendering
      return;
    }

    const context = canvas.getContext('2d');

    if (context) {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    }

    const errorCorrectionLevel = this.errorCorrectionLevel ?? QrCodeDirective.DEFAULT_ERROR_CORRECTION_LEVEL

    const dark = !this.darkColor 
      ? undefined
      : QrCodeDirective.VALID_COLOR_REGEX.test(this.darkColor)
      ? this.darkColor
      : undefined;
    const light = !this.lightColor
      ? undefined
      : QrCodeDirective.VALID_COLOR_REGEX.test(this.lightColor)
      ? this.lightColor
      : undefined;

    await qrCodeService
      .toCanvas(canvas, this.value, {
        version: this.version ?? undefined,
        errorCorrectionLevel,
        width: this.width,
        margin: this.margin,
        color: {
          dark,
          light,
        },
      });

    const centerImageSrc = this.centerImageSrc;
    const centerImageWidth = this.getIntOrDefault(this.centerImageWidth, QrCodeDirective.DEFAULT_CENTER_IMAGE_SIZE);
    const centerImageHeight = this.getIntOrDefault(this.centerImageHeight, QrCodeDirective.DEFAULT_CENTER_IMAGE_SIZE);

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
