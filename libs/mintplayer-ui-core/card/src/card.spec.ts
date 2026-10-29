import { describe, expect, it } from 'vitest';
import { capColorClasses, cardColorClasses, cardImgClass, isCardColor } from './card';

describe('card classes', () => {
  it('fills a theme colour as background and border', () => {
    expect(cardColorClasses('primary')).toEqual(['text-bg-primary', 'border-primary']);
  });

  it('colours only the border of an outline card', () => {
    expect(cardColorClasses('danger', true)).toEqual(['bg-transparent', 'border-danger']);
    expect(cardColorClasses('body', true)).toEqual(['bg-transparent']);
  });

  it('pairs body, white and transparent with a contrasting text colour', () => {
    expect(cardColorClasses('body')).toEqual(['bg-body', 'text-body']);
    expect(cardColorClasses('white')).toEqual(['bg-white', 'text-black', 'border-white']);
    expect(cardColorClasses('transparent')).toEqual(['bg-transparent']);
  });

  it('ignores an unknown or absent colour', () => {
    expect(cardColorClasses('chartreuse')).toEqual([]);
    expect(cardColorClasses(undefined)).toEqual([]);
    expect(isCardColor(null)).toBe(false);
  });

  it('gives caps a fill without a border', () => {
    expect(capColorClasses('dark')).toEqual(['text-bg-dark']);
    expect(capColorClasses(null)).toEqual([]);
  });

  it('maps an image position to its class', () => {
    expect(cardImgClass()).toBe('card-img-top');
    expect(cardImgClass('bottom')).toBe('card-img-bottom');
    expect(cardImgClass('overlay')).toBe('card-img');
  });
});
