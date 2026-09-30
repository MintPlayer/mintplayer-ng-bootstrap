import { computed, Directive, effect, inject, input, ViewContainerRef } from '@angular/core';
import { QRCodeErrorCorrectionLevel } from '@mintplayer/qr-code';
import * as qrCodeService from '@mintplayer/qr-code';
import { RgbaColor } from '../../types/rgba-color';

interface QrCodeRenderRequest {
  value: string;
  options: Parameters<typeof qrCodeService.toCanvas>[2];
  centerImage: { src: string; width: number; height: number } | null;
}

/**
 * Renders a QR code onto the host canvas.
 *
 * A QR code is square: the canvas is sized from `width` (or, without one, from
 * the module count), so there is deliberately no `height` input.
 */
@Directive({
  selector: 'canvas[qrCode]',
})
export class QrCodeDirective {
  private viewContainerRef = inject(ViewContainerRef);

  static readonly VALID_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3,4}){1,2}$/;
  static readonly DEFAULT_ERROR_CORRECTION_LEVEL: QRCodeErrorCorrectionLevel = 'M';
  static readonly DEFAULT_CENTER_IMAGE_SIZE = 40;

  readonly value = input.required<string>({ alias: 'qrCode' });

  /** QR version 1..40; values outside the range are clamped, null/0 lets the encoder choose. */
  readonly qrCodeVersion = input<number | null>(null);
  private readonly version = computed(() => {
    const value = this.qrCodeVersion();
    return value ? Math.min(40, Math.max(1, value)) : null;
  });

  readonly width = input<number | undefined>(undefined);
  readonly darkColor = input<RgbaColor | undefined>('#000000FF');
  readonly lightColor = input<RgbaColor | undefined>('#FFFFFFFF');

  readonly errorCorrectionLevel = input<QRCodeErrorCorrectionLevel | undefined>(QrCodeDirective.DEFAULT_ERROR_CORRECTION_LEVEL, { alias: 'qrCodeErrorCorrectionLevel' });
  readonly centerImageSrc = input<string | undefined>(undefined, { alias: 'qrCodeCenterImageSrc' });
  readonly centerImageWidth = input<number | string | undefined>(undefined, { alias: 'qrCodeCenterImageWidth' });
  readonly centerImageHeight = input<number | string | undefined>(undefined, { alias: 'qrCodeCenterImageHeight' });
  readonly margin = input<number | undefined>(16, { alias: 'qrCodeMargin' });

  private centerImage?: HTMLImageElement;
  /** The src the centre image has finished loading, so a redraw can paint it at once. */
  private centerImageLoadedSrc?: string;

  /**
   * Everything one render needs, read synchronously. The render itself is async,
   * and a signal read after its first `await` is not tracked by the effect — the
   * centre-image inputs used to be read there, so changing only them never redrew.
   */
  private readonly renderRequest = computed((): QrCodeRenderRequest => {
    const centerImageSrc = this.centerImageSrc();
    return {
      value: this.value(),
      options: {
        version: this.version() ?? undefined,
        errorCorrectionLevel: this.errorCorrectionLevel() ?? QrCodeDirective.DEFAULT_ERROR_CORRECTION_LEVEL,
        width: this.width(),
        margin: this.margin(),
        color: {
          dark: QrCodeDirective.validColor(this.darkColor()),
          light: QrCodeDirective.validColor(this.lightColor()),
        },
      },
      centerImage: centerImageSrc
        ? {
          src: centerImageSrc,
          width: this.getIntOrDefault(this.centerImageWidth(), QrCodeDirective.DEFAULT_CENTER_IMAGE_SIZE),
          height: this.getIntOrDefault(this.centerImageHeight(), QrCodeDirective.DEFAULT_CENTER_IMAGE_SIZE),
        }
        : null,
    };
  });

  constructor() {
    effect(() => {
      this.renderQrCode(this.renderRequest());
    });
  }

  private async renderQrCode(request: QrCodeRenderRequest) {
    if (!request.value) {
      return;
    }

    const canvas = this.viewContainerRef.element.nativeElement as HTMLCanvasElement | null;
    if (!canvas || (typeof window === 'undefined')) {
      // native element not available on server side rendering
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    await qrCodeService.toCanvas(canvas, request.value, request.options);

    if (request.centerImage) {
      this.drawCenterImage(context, canvas, request.centerImage);
    }
  }

  private drawCenterImage(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    { src, width, height }: NonNullable<QrCodeRenderRequest['centerImage']>,
  ) {
    const image = this.centerImage ??= new Image(width, height);
    image.width = width;
    image.height = height;

    const draw = () => context.drawImage(
      image,
      canvas.width / 2 - width / 2,
      canvas.height / 2 - height / 2, width, height,
    );

    // A redraw (colour, size, value change) repaints the canvas; an image that has
    // already loaded fires no second load event, so it must be drawn right away or
    // the centre image disappears.
    if (this.centerImageLoadedSrc === src) {
      image.onload = null;
      draw();
      return;
    }

    image.onload = () => {
      this.centerImageLoadedSrc = src;
      draw();
    };
    if (image.getAttribute('src') !== src) {
      image.src = src;
    }
  }

  private static validColor(color: RgbaColor | undefined) {
    return color && QrCodeDirective.VALID_COLOR_REGEX.test(color) ? color : undefined;
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
