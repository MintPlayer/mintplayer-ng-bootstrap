import { hostCore } from '../../_conformance/host-core';
import { cssUrl, parallaxCore } from './parallax.core';

describe('parallaxCore', () => {
  it('writes the height and an escaped image url as custom properties', () => {
    expect(hostCore(parallaxCore, { height: 300, image: 'a "b"\\c\n.png' }).props().view.bandStyle).toEqual({
      '--mp-parallax-height': '300px',
      '--mp-parallax-image': 'url("a \\"b\\"\\\\c.png")',
    });
    expect(hostCore(parallaxCore, { height: NaN, image: null }).props().view.bandStyle).toEqual({});
    expect(cssUrl('x')).toBe('url("x")');
  });
});
