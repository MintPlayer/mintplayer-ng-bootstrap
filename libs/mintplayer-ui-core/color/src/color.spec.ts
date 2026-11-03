import { describe, expect, it } from 'vitest';
import { fillClasses, isColor, isThemeColor } from './color';

describe('colour names', () => {
  it('fills a theme colour with text-bg-*', () => {
    expect(fillClasses('warning')).toEqual(['text-bg-warning']);
  });

  it('pairs body and white with a text colour and only clears transparent', () => {
    expect(fillClasses('body')).toEqual(['bg-body', 'text-body']);
    expect(fillClasses('white')).toEqual(['bg-white', 'text-black']);
    expect(fillClasses('transparent')).toEqual(['bg-transparent']);
  });

  it('ignores an unknown or absent name', () => {
    expect(fillClasses('chartreuse')).toEqual([]);
    expect(fillClasses(null)).toEqual([]);
    expect(isColor(undefined)).toBe(false);
  });

  it('tells the theme colours from the surfaces', () => {
    expect(isThemeColor('dark')).toBe(true);
    expect(isThemeColor('white')).toBe(false);
    expect(isColor('white')).toBe(true);
  });
});
