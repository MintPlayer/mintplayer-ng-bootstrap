import { describe, expect, it } from 'vitest';
import { connectParallax, cssUrl } from './parallax.core';

describe('parallax', () => {
  it('carries the height and image as custom properties on the band', () => {
    expect(connectParallax({ height: 200, image: '/img/a.jpg' }).bandStyle).toEqual({
      '--mp-parallax-height': '200px',
      '--mp-parallax-image': 'url("/img/a.jpg")',
    });
  });

  it('writes no image without one', () => {
    expect(connectParallax({ height: 150, image: null }).bandStyle).toEqual({ '--mp-parallax-height': '150px' });
  });

  it('keeps a hostile URL inside its CSS string', () => {
    expect(cssUrl('a") ; color: red; ("\\\nb')).toBe('url("a\\") ; color: red; (\\"\\\\b")');
  });
});
