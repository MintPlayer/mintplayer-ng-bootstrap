import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * A fixed-background parallax band (#458 M5): a decorative box whose
 * background image stays put while the page scrolls past it.
 *
 *   <div class="parallax-host">
 *     <div class="parallax" style="--mp-parallax-image: url("…"); --mp-parallax-height: 150px"></div>
 *   </div>
 *
 * The image and height travel as custom properties on the inner box (a
 * compiled root may not bind `:style`); the sheet reads them. Under reduced
 * motion the background scrolls with the page. No-JS tier 2: presentational.
 */
export interface ParallaxInputs {
  /** The band's height in pixels. */
  height: number;
  /** The background image's URL. */
  image: string | null;
}

export interface ParallaxView {
  readonly root: CoreBag;
  readonly band: CoreBag;
  readonly bandStyle: Record<string, string>;
}

/** A CSS `url("…")` whose quotes, backslashes and line breaks cannot end the string. */
export function cssUrl(url: string): string {
  return `url("${url.replace(/[\\"]/g, (c) => `\\${c}`).replace(/[\r\n\f]/g, '')}")`;
}

export function connectParallax({ height, image }: ParallaxInputs): ParallaxView {
  const style: Record<string, string> = {};
  if (Number.isFinite(height)) style['--mp-parallax-height'] = `${height}px`;
  if (image) style['--mp-parallax-image'] = cssUrl(image);
  return { root: { class: 'parallax-host' }, band: { class: 'parallax' }, bandStyle: style };
}

export const parallaxCore = defineCore<ParallaxInputs, object, { view: ParallaxView }>({
  view: ({ inputs }) => ({ view: connectParallax(inputs) }),
});
