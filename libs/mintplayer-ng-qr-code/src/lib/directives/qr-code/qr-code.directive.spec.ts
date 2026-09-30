import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrCodeDirective } from './qr-code.directive';
import { RgbaColor } from '../../types/rgba-color';

@Component({
  selector: 'qr-code-test-component',
  imports: [QrCodeDirective],
  template: `
    <canvas
      [qrCode]="value()"
      [qrCodeVersion]="version()"
      [qrCodeCenterImageSrc]="centerImageSrc()"
      [qrCodeCenterImageWidth]="centerImageSize()"
      [qrCodeCenterImageHeight]="centerImageSize()"
      [qrCodeMargin]="margin()"
      [width]="width()"
      [darkColor]="darkColor()"
      [lightColor]="lightColor()">
    </canvas>`,
})
class QrcodeTestComponent {
  readonly value = signal('HELLO');
  readonly version = signal<number | null>(null);
  readonly width = signal<number | undefined>(undefined);
  readonly margin = signal<number | undefined>(16);
  readonly darkColor = signal<RgbaColor | undefined>('#000000FF');
  readonly lightColor = signal<RgbaColor | undefined>('#FFFFFFFF');
  readonly centerImageSrc = signal<string | undefined>(undefined);
  readonly centerImageSize = signal<number | string | undefined>(undefined);
}

/** A version-N symbol is 4N + 17 modules wide; the directive's default margin is 16, scale 4. */
const renderedSize = (version: number, margin = 16, scale = 4) => (4 * version + 17 + margin * 2) * scale;

describe('QrCodeDirective', () => {
  let fixture: ComponentFixture<QrcodeTestComponent>;
  let host: QrcodeTestComponent;
  let srcSetter: ReturnType<typeof vi.spyOn>;
  /** Every centre image the directive has pointed at a source, in order. */
  const images = () => srcSetter.mock.contexts as HTMLImageElement[];
  let context: {
    canvas: HTMLCanvasElement;
    clearRect: ReturnType<typeof vi.fn>;
    createImageData: (w: number, h: number) => ImageData;
    putImageData: ReturnType<typeof vi.fn>;
    drawImage: ReturnType<typeof vi.fn>;
  } | null;

  // jsdom has no 2D canvas. The stub records what was painted; every size and
  // pixel asserted below is computed by the real encoder and renderer.
  const canvas = () => fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
  const lastImage = () => context!.putImageData.mock.calls.at(-1)![0] as ImageData;
  const pixel = (image: ImageData, x: number, y: number) =>
    Array.from(image.data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4));

  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  beforeEach(async () => {
    srcSetter = vi.spyOn(HTMLImageElement.prototype, 'src', 'set');

    context = null;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      context ??= {
        canvas: this,
        clearRect: vi.fn(),
        createImageData: (w: number, h: number) =>
          ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }) as unknown as ImageData,
        putImageData: vi.fn(),
        drawImage: vi.fn(),
      };
      return context as unknown as CanvasRenderingContext2D;
    } as unknown as HTMLCanvasElement['getContext']);

    await TestBed.configureTestingModule({ imports: [QrcodeTestComponent] }).compileComponents();
    fixture = TestBed.createComponent(QrcodeTestComponent);
    host = fixture.componentInstance;
    await settle();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('paints the smallest symbol that fits, sized from the module count and margin', () => {
    expect(context!.putImageData).toHaveBeenCalled();
    expect(canvas().width).toBe(renderedSize(1));
    expect(canvas().height).toBe(renderedSize(1));
  });

  it('honours a requested version anywhere in 1..40', async () => {
    host.version.set(10);
    await settle();
    expect(canvas().width).toBe(renderedSize(10));

    host.version.set(40);
    await settle();
    expect(canvas().width).toBe(renderedSize(40));
  });

  it('clamps a version outside 1..40 and lets the encoder choose for null', async () => {
    host.version.set(55);
    await settle();
    expect(canvas().width).toBe(renderedSize(40));

    host.version.set(-3);
    await settle();
    expect(canvas().width).toBe(renderedSize(1));

    host.version.set(null);
    await settle();
    expect(canvas().width).toBe(renderedSize(1));
  });

  it('scales the symbol to the requested width', async () => {
    host.width.set(424);
    await settle();
    // 424 = 2 x the natural (21 + 32) x 4 size, so the scale is exact.
    expect(canvas().width).toBe(424);
  });

  it('paints the dark modules in the requested colour', async () => {
    host.darkColor.set('#FF0000');
    await settle();
    // The top-left finder pattern starts right after the quiet zone.
    const corner = 16 * 4;
    expect(pixel(lastImage(), corner, corner)).toEqual([255, 0, 0, 255]);
    expect(pixel(lastImage(), 0, 0)).toEqual([255, 255, 255, 255]);
  });

  it('falls back to black on white for colours that are not hex', async () => {
    host.darkColor.set('#GG0000' as RgbaColor);
    host.lightColor.set(undefined);
    await settle();
    const corner = 16 * 4;
    expect(pixel(lastImage(), corner, corner)).toEqual([0, 0, 0, 255]);
    expect(pixel(lastImage(), 0, 0)).toEqual([255, 255, 255, 255]);
  });

  it('renders nothing for an empty value', async () => {
    context!.putImageData.mockClear();
    host.value.set('');
    await settle();
    expect(context!.putImageData).not.toHaveBeenCalled();
  });

  it('draws the centre image once it has loaded, centred at the default size', async () => {
    host.centerImageSrc.set('logo.png');
    await settle();
    expect(context!.drawImage).not.toHaveBeenCalled();

    images()[0].dispatchEvent(new Event('load'));
    const size = renderedSize(1);
    expect(context!.drawImage).toHaveBeenCalledWith(images()[0], size / 2 - 20, size / 2 - 20, 40, 40);
  });

  it('parses a string centre-image size', async () => {
    host.centerImageSrc.set('logo.png');
    host.centerImageSize.set('50');
    await settle();
    images()[0].dispatchEvent(new Event('load'));
    expect(images()[0].width).toBe(50);
    expect(context!.drawImage).toHaveBeenLastCalledWith(images()[0], expect.any(Number), expect.any(Number), 50, 50);
  });

  // An image that has already loaded fires no second load event, so a redraw
  // that only waited for onload wiped the centre image off the canvas.
  it('repaints an already-loaded centre image on every redraw', async () => {
    host.centerImageSrc.set('logo.png');
    await settle();
    images()[0].dispatchEvent(new Event('load'));
    expect(context!.drawImage).toHaveBeenCalledTimes(1);

    host.darkColor.set('#0000FF');
    await settle();
    expect(context!.drawImage).toHaveBeenCalledTimes(2);
    // The same image, and its src was not reassigned by the redraw.
    expect(images()).toHaveLength(1);
  });

  it('waits for a new centre image to load rather than drawing the old one', async () => {
    host.centerImageSrc.set('logo.png');
    await settle();
    images()[0].dispatchEvent(new Event('load'));

    host.centerImageSrc.set('other.png');
    await settle();
    expect(images()[0].getAttribute('src')).toBe('other.png');
    expect(context!.drawImage).toHaveBeenCalledTimes(1);

    images()[0].dispatchEvent(new Event('load'));
    expect(context!.drawImage).toHaveBeenCalledTimes(2);
  });

  it('does nothing when the canvas has no 2D context', async () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    const before = canvas().width;
    host.value.set('SOMETHING ELSE ENTIRELY, LONGER THAN BEFORE');
    await settle();
    expect(canvas().width).toBe(before);
  });
});
