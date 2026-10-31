import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { CARD_SCOPE, cardScopedStyles } from '@mintplayer/ui-core/card';
import { getLightStyleEntries } from '@mintplayer/ui-core/scoped-styles';
import { BsCardComponent } from './bs-card/bs-card.component';
import { BsCardHeaderComponent } from './bs-card-header/bs-card-header.component';
import { BsCardBodyComponent } from './bs-card-body/bs-card-body.component';
import { BsCardFooterComponent } from './bs-card-footer/bs-card-footer.component';
import { BsCardTitleComponent } from './bs-card-title/bs-card-title.component';
import { BsCardSubtitleComponent } from './bs-card-subtitle/bs-card-subtitle.component';
import { BsCardTextComponent } from './bs-card-text/bs-card-text.component';
import { BsCardImgComponent } from './bs-card-img/bs-card-img.component';

/**
 * #452: the part hosts are custom elements, inline by default, and were blocks
 * only while `.card` was flex. A card that is NOT flex (here: no Bootstrap at
 * all, so `.card` has no display either) must still lay its parts out as
 * blocks, or their vertical padding stops taking up space.
 */
@Component({
  imports: [
    BsCardComponent,
    BsCardHeaderComponent,
    BsCardBodyComponent,
    BsCardFooterComponent,
    BsCardTitleComponent,
    BsCardSubtitleComponent,
    BsCardTextComponent,
    BsCardImgComponent,
  ],
  template: `
    <bs-card class="d-block">
      <bs-card-img src="x.png"></bs-card-img>
      <bs-card-header>Header</bs-card-header>
      <bs-card-body>
        <bs-card-title>Title</bs-card-title>
        <bs-card-subtitle>Subtitle</bs-card-subtitle>
        <bs-card-text>Text</bs-card-text>
      </bs-card-body>
      <bs-card-footer>Footer</bs-card-footer>
    </bs-card>
  `,
})
class HostComponent {}

describe('card part hosts (#452)', () => {
  const PARTS = [
    'bs-card-img',
    'bs-card-header',
    'bs-card-body',
    'bs-card-title',
    'bs-card-subtitle',
    'bs-card-text',
    'bs-card-footer',
  ];

  // jsdom applies neither adopted sheets nor @layer to getComputedStyle, so the
  // cascade itself is checked in a browser; here: the sheet is installed by the
  // parts, sits in the components layer, and gives every part a block display.
  it('install the layered card sheet, which makes every part a block', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const entry = getLightStyleEntries().find((e) => e.key === CARD_SCOPE);
    expect(entry?.cssText).toBe(cardScopedStyles);
    expect(cardScopedStyles).toMatch(/@layer mp\.components\s*\{/);
    const rule = /([^{}]+)\{\s*display:\s*block;?\s*\}/.exec(cardScopedStyles.replace(/^[\s\S]*@layer mp\.components\s*\{/, ''));
    const selectors = rule![1].split(',').map((s) => s.trim());
    expect([...selectors].sort()).toEqual([...PARTS].sort());
  });

  it('carry no d-* utility, so a consumer d-* has nothing to fight', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const utilities = PARTS.flatMap((tag) =>
      Array.from(root.querySelector(tag)!.classList).filter((c) => c.startsWith('d-')),
    );
    expect(utilities).toEqual([]);
  });

});
