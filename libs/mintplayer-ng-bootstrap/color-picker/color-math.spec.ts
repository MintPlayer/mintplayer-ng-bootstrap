import { hex2hsv, hex2rgb, hs2polar, hsl2hsv, hsv2hex, hsv2hsl, hsv2rgb, polar2hs, rgb2hex, rgb2hsl, rgb2hsv } from './color-math';

describe('color-math', () => {
  describe('hex <-> rgb', () => {
    it('parses 6-digit hex', () => {
      expect(hex2rgb('#ff8800')).toEqual({ r: 255, g: 136, b: 0 });
    });

    it('parses 3-digit hex', () => {
      expect(hex2rgb('#f80')).toEqual({ r: 255, g: 136, b: 0 });
    });

    it('returns black for invalid hex input', () => {
      const black = { r: 0, g: 0, b: 0 };
      expect(hex2rgb('#xyz')).toEqual(black);
      expect(hex2rgb('#1234')).toEqual(black);
      expect(hex2rgb('#12')).toEqual(black);
      expect(hex2rgb('#')).toEqual(black);
      expect(hex2rgb('')).toEqual(black);
      expect(hex2rgb('#12345g')).toEqual(black);
    });

    it('round-trips rgb -> hex -> rgb', () => {
      const samples = [
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
        { r: 128, g: 128, b: 128 },
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
        { r: 0, g: 0, b: 255 },
        { r: 17, g: 142, b: 235 },
      ];
      for (const rgb of samples) {
        const round = hex2rgb(rgb2hex(rgb));
        expect(round).toEqual(rgb);
      }
    });
  });

  describe('rgb <-> hsv', () => {
    it('white = (any, 0, 1)', () => {
      const hsv = rgb2hsv({ r: 255, g: 255, b: 255 });
      expect(hsv.saturation).toBe(0);
      expect(hsv.value).toBe(1);
    });

    it('black = (any, 0, 0)', () => {
      const hsv = rgb2hsv({ r: 0, g: 0, b: 0 });
      expect(hsv.saturation).toBe(0);
      expect(hsv.value).toBe(0);
    });

    it('pure red = (0, 1, 1)', () => {
      const hsv = rgb2hsv({ r: 255, g: 0, b: 0 });
      expect(hsv.hue).toBe(0);
      expect(hsv.saturation).toBe(1);
      expect(hsv.value).toBe(1);
    });

    it('pure green = (120, 1, 1)', () => {
      const hsv = rgb2hsv({ r: 0, g: 255, b: 0 });
      expect(hsv.hue).toBe(120);
      expect(hsv.saturation).toBe(1);
      expect(hsv.value).toBe(1);
    });

    it('pure blue = (240, 1, 1)', () => {
      const hsv = rgb2hsv({ r: 0, g: 0, b: 255 });
      expect(hsv.hue).toBe(240);
    });

    it('round-trips hex -> hsv -> rgb -> hex within 1 per channel', () => {
      const samples = ['#000000', '#ffffff', '#808080', '#ff0000', '#00ff00', '#0000ff', '#118ee0', '#abcdef', '#fa8072', '#5a3fb8'];
      for (const hex of samples) {
        const hsv = hex2hsv(hex);
        const rgb = hsv2rgb(hsv);
        const back = rgb2hex(rgb);
        const a = hex2rgb(hex);
        const b = hex2rgb(back);
        expect(Math.abs(a.r - b.r)).toBeLessThanOrEqual(1);
        expect(Math.abs(a.g - b.g)).toBeLessThanOrEqual(1);
        expect(Math.abs(a.b - b.b)).toBeLessThanOrEqual(1);
      }
    });

    it('hsv2hex is the inverse of hex2hsv up to rounding', () => {
      const samples = ['#118ee0', '#abcdef', '#fa8072'];
      for (const hex of samples) {
        const round = hsv2hex(hex2hsv(hex));
        const a = hex2rgb(hex);
        const b = hex2rgb(round);
        expect(Math.abs(a.r - b.r)).toBeLessThanOrEqual(1);
        expect(Math.abs(a.g - b.g)).toBeLessThanOrEqual(1);
        expect(Math.abs(a.b - b.b)).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('rgb <-> hsl', () => {
    it('pure red = (0, 1, 0.5)', () => {
      const hsl = rgb2hsl({ r: 255, g: 0, b: 0 });
      expect(hsl.hue).toBe(0);
      expect(hsl.saturation).toBeCloseTo(1, 5);
      expect(hsl.luminosity).toBeCloseTo(0.5, 5);
    });

    it('white = (any, 0, 1)', () => {
      const hsl = rgb2hsl({ r: 255, g: 255, b: 255 });
      expect(hsl.luminosity).toBe(1);
      expect(hsl.saturation).toBe(0);
    });
  });

  describe('hsv <-> hsl', () => {
    it('hsv (0, 1, 1) <-> hsl (0, 1, 0.5)', () => {
      const hsl = hsv2hsl({ hue: 0, saturation: 1, value: 1 });
      expect(hsl.hue).toBe(0);
      expect(hsl.saturation).toBeCloseTo(1, 5);
      expect(hsl.luminosity).toBeCloseTo(0.5, 5);
      const hsv = hsl2hsv(hsl);
      expect(hsv.value).toBeCloseTo(1, 5);
      expect(hsv.saturation).toBeCloseTo(1, 5);
    });

    it('hsv (180, 0, 1) = white in hsl', () => {
      const hsl = hsv2hsl({ hue: 180, saturation: 0, value: 1 });
      expect(hsl.luminosity).toBe(1);
      expect(hsl.saturation).toBe(0);
    });
  });

  describe('polar <-> hs (wheel hit-test math)', () => {
    const R = 100;

    it('center of disc -> saturation 0', () => {
      const hs = polar2hs(0, 0, R);
      expect(hs.saturation).toBe(0);
    });

    it('rim at 0deg = positive x = hue 0', () => {
      const hs = polar2hs(R, 0, R);
      expect(hs.hue).toBe(0);
      expect(hs.saturation).toBe(1);
    });

    it('rim at 90deg = positive y = hue 90', () => {
      const hs = polar2hs(0, R, R);
      expect(hs.hue).toBeCloseTo(90, 5);
      expect(hs.saturation).toBe(1);
    });

    it('outside disc clamps saturation to 1', () => {
      const hs = polar2hs(R * 2, 0, R);
      expect(hs.saturation).toBe(1);
    });

    it('hs2polar is the inverse of polar2hs', () => {
      const samples = [
        { hue: 0, saturation: 0.5 },
        { hue: 45, saturation: 0.8 },
        { hue: 137, saturation: 1 },
        { hue: 270, saturation: 0.3 },
      ];
      for (const hs of samples) {
        const { dx, dy } = hs2polar(hs.hue, hs.saturation, R);
        const back = polar2hs(dx, dy, R);
        expect(back.hue).toBeCloseTo(hs.hue, 5);
        expect(back.saturation).toBeCloseTo(hs.saturation, 5);
      }
    });
  });
});
