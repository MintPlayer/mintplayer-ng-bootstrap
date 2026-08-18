import { afterEach, describe, expect, it, vi } from 'vitest';

import { render } from './canvas';
import { toCanvas } from '../browser';
import { create } from '../core/qr-code';

/**
 * The canvas renderer and the promise wrapper around it.
 *
 * The tests supply a **canvas API double** rather than a real canvas: this
 * package's vitest environment is `node`, and the point of these cases is what
 * the renderer *asks the canvas to do* — how big to be, what to clear, what
 * pixel data to write — not how a browser rasterises it. No geometry is faked;
 * `createImageData` and `putImageData` are the entire surface being exercised.
 *
 * The first case is the one that matters most in this workspace: the renderer
 * is a no-op without a `window`, which is what keeps it importable from a
 * server-rendered page instead of throwing during SSR.
 */

type Stub = {
  canvas: HTMLCanvasElement;
  ctx: {
    createImageData: ReturnType<typeof vi.fn>;
    clearRect: ReturnType<typeof vi.fn>;
    putImageData: ReturnType<typeof vi.fn>;
  };
};

function stubCanvas(): Stub {
  const ctx = {
    createImageData: vi.fn((width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    })),
    clearRect: vi.fn(),
    putImageData: vi.fn(),
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {} as CSSStyleDeclaration,
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx };
}

/** Run `body` with a `window` present, as it would be in a browser. */
function inBrowser<T>(body: () => T): T {
  (globalThis as { window?: unknown }).window = globalThis;
  try {
    return body();
  } finally {
    delete (globalThis as { window?: unknown }).window;
  }
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  vi.restoreAllMocks();
});

describe('render', () => {
  /*
   * Server-side safety. This module is reachable from the package's public
   * entry, so an application that imports the library during SSR loads it —
   * and a canvas call there would throw. Doing nothing is the correct
   * behaviour, and it is the reason the guard exists rather than an oversight.
   */
  it('does nothing at all without a window', () => {
    const { canvas, ctx } = stubCanvas();

    render(create('HELLO', {}), canvas, {});

    expect(canvas.getContext).not.toHaveBeenCalled();
    expect(ctx.putImageData).not.toHaveBeenCalled();
  });

  it('asks the canvas for a 2d context', () => {
    const { canvas } = stubCanvas();

    inBrowser(() => render(create('HELLO', {}), canvas, {}));

    expect(canvas.getContext).toHaveBeenCalledWith('2d');
  });

  // The image is the symbol plus its quiet zone on both sides, scaled — the
  // same figure `getImageWidth` reports.
  it('creates image data the full size of the symbol and its margins', () => {
    const { canvas, ctx } = stubCanvas();
    const code = create('HELLO', {});
    const expected = (code.modules.size + 8) * 4;

    inBrowser(() => render(code, canvas, {}));

    expect(ctx.createImageData).toHaveBeenCalledWith(expected, expected);
  });

  it('resizes the canvas to match the image', () => {
    const { canvas } = stubCanvas();
    const code = create('HELLO', {});
    const expected = (code.modules.size + 8) * 4;

    inBrowser(() => render(code, canvas, {}));

    expect(canvas.width).toBe(expected);
    expect(canvas.height).toBe(expected);
    expect(canvas.style.width).toBe(`${expected}px`);
    expect(canvas.style.height).toBe(`${expected}px`);
  });

  // Clearing before drawing is what makes re-rendering into the same canvas
  // safe: a smaller second symbol would otherwise leave the first one's
  // outer modules behind.
  it('clears the canvas before writing to it', () => {
    const { canvas, ctx } = stubCanvas();

    inBrowser(() => render(create('HELLO', {}), canvas, {}));

    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.clearRect.mock.invocationCallOrder[0]).toBeLessThan(
      ctx.putImageData.mock.invocationCallOrder[0],
    );
  });

  it('writes the image at the origin', () => {
    const { canvas, ctx } = stubCanvas();

    inBrowser(() => render(create('HELLO', {}), canvas, {}));

    expect(ctx.putImageData).toHaveBeenCalledTimes(1);
    expect(ctx.putImageData.mock.calls[0].slice(1)).toEqual([0, 0]);
  });

  it('fills the image data rather than leaving it blank', () => {
    const { canvas, ctx } = stubCanvas();

    inBrowser(() => render(create('HELLO', {}), canvas, {}));

    const image = ctx.putImageData.mock.calls[0][0] as { data: Uint8ClampedArray };
    expect(image.data.some((channel) => channel !== 0)).toBe(true);
  });

  it('honours the requested scale and margin', () => {
    const { canvas, ctx } = stubCanvas();
    const code = create('HELLO', {});

    inBrowser(() => render(code, canvas, { scale: 2, margin: 0 }));

    expect(ctx.createImageData).toHaveBeenCalledWith(code.modules.size * 2, code.modules.size * 2);
  });

  // A canvas that cannot give a 2d context — one already claimed by WebGL, say
  // — must not take the page down.
  it('does nothing when the canvas has no 2d context to give', () => {
    const canvas = { getContext: vi.fn(() => null) } as unknown as HTMLCanvasElement;

    expect(() => inBrowser(() => render(create('HELLO', {}), canvas, {}))).not.toThrow();
  });
});

describe('toCanvas', () => {
  it('resolves once the symbol is drawn', async () => {
    const { canvas, ctx } = stubCanvas();

    await inBrowser(() => toCanvas(canvas, 'HELLO', {}));

    expect(ctx.putImageData).toHaveBeenCalled();
  });

  /*
   * The whole reason it is promise-shaped. `create` throws synchronously for
   * bad input, and a consumer calling `toCanvas(...).catch(...)` would never
   * see that — an unhandled exception from inside what looks like an async
   * call. Converting it into a rejection is the contract.
   */
  it('rejects rather than throwing for an empty input', async () => {
    const { canvas } = stubCanvas();

    await expect(toCanvas(canvas, '', {})).rejects.toThrow(/No input text/);
  });

  it('rejects for data too large to encode', async () => {
    const { canvas } = stubCanvas();

    await expect(
      toCanvas(canvas, 'a'.repeat(4000), { errorCorrectionLevel: 'H' }),
    ).rejects.toThrow(/too big/);
  });

  it('rejects for a version too small for the data', async () => {
    const { canvas } = stubCanvas();

    await expect(toCanvas(canvas, 'a'.repeat(100), { version: 1 })).rejects.toThrow(
      /cannot contain this amount of data/,
    );
  });
});
