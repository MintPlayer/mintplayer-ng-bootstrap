import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import type { CardColor, CardImagePosition } from '@mintplayer/ui-core/card';
import {
  BsCardBodyComponent,
  BsCardComponent,
  BsCardFooterComponent,
  BsCardGroupComponent,
  BsCardHeaderComponent,
  BsCardImgComponent,
  BsCardLinkComponent,
  BsCardSubtitleComponent,
  BsCardTextComponent,
  BsCardTitleComponent,
} from './index';

@Component({
  selector: 'bs-card-test',
  template: `
    <bs-card-group>
      <bs-card [color]="color()" [outline]="outline()" class="h-100">
        <bs-card-header [color]="capColor()">Header</bs-card-header>
        <bs-card-img [position]="position()" [src]="src()" [alt]="alt()"><span class="caption">Caption</span></bs-card-img>
        <bs-card-body>
          <bs-card-title [level]="level()">Title</bs-card-title>
          <bs-card-subtitle>Subtitle</bs-card-subtitle>
          <bs-card-text>Text</bs-card-text>
          <bs-card-link [href]="href()">One</bs-card-link>
          <bs-card-link href="/two" aria-label="Second">Two</bs-card-link>
        </bs-card-body>
        <bs-card-footer>Footer</bs-card-footer>
      </bs-card>
    </bs-card-group>`,
  imports: [
    BsCardComponent,
    BsCardHeaderComponent,
    BsCardFooterComponent,
    BsCardBodyComponent,
    BsCardTitleComponent,
    BsCardSubtitleComponent,
    BsCardTextComponent,
    BsCardGroupComponent,
    BsCardImgComponent,
    BsCardLinkComponent,
  ],
})
class BsCardTestComponent {
  color = signal<CardColor | null>(null);
  outline = signal(false);
  capColor = signal<CardColor | null>(null);
  position = signal<CardImagePosition>('top');
  src = signal<string | null>('a.png');
  alt = signal<string | null>(null);
  level = signal(5);
  href = signal<string | null>('/one');
}

function setup() {
  TestBed.configureTestingModule({ imports: [BsCardTestComponent] });
  const fixture = TestBed.createComponent(BsCardTestComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = <T extends Element = HTMLElement>(selector: string) => el.querySelector(selector) as T;
  return { fixture, component: fixture.componentInstance, q, el };
}

describe('bs-card group (generated, #458)', () => {
  it('puts each part\'s Bootstrap class on its host, stamped with the card scope', () => {
    const { q } = setup();
    const expected: [string, string][] = [
      ['bs-card-group', 'card-group'],
      ['bs-card', 'card'],
      ['bs-card-header', 'card-header'],
      ['bs-card-body', 'card-body'],
      ['bs-card-title', 'card-title'],
      ['bs-card-subtitle', 'card-subtitle'],
      ['bs-card-text', 'card-text'],
      ['bs-card-footer', 'card-footer'],
    ];
    expected.forEach(([tag, cls]) => {
      expect(q(tag).classList.contains(cls), tag).toBe(true);
      expect(q(tag).getAttribute('data-mps'), tag).toBe('card');
    });
    expect(q('bs-card').classList.contains('h-100')).toBe(true);
  });

  it('maps colour and outline onto the card and its caps', () => {
    const { fixture, component, q } = setup();
    component.color.set('primary');
    component.capColor.set('dark');
    fixture.detectChanges();
    expect([...q('bs-card').classList]).toEqual(expect.arrayContaining(['card', 'text-bg-primary', 'border-primary']));
    expect(q('bs-card-header').classList.contains('text-bg-dark')).toBe(true);

    component.color.set('danger');
    component.outline.set(true);
    fixture.detectChanges();
    expect([...q('bs-card').classList]).toEqual(expect.arrayContaining(['bg-transparent', 'border-danger']));
    expect(q('bs-card').classList.contains('text-bg-primary')).toBe(false);
  });

  it('makes the title a heading at its level', () => {
    const { fixture, component, q } = setup();
    expect(q('bs-card-title').getAttribute('role')).toBe('heading');
    expect(q('bs-card-title').getAttribute('aria-level')).toBe('5');
    component.level.set(3);
    fixture.detectChanges();
    expect(q('bs-card-title').getAttribute('aria-level')).toBe('3');
  });

  it('renders the image with its position class, a decorative alt by default, and an overlay only for overlay', () => {
    const { fixture, component, q } = setup();
    const img = () => q<HTMLImageElement>('bs-card-img img');
    expect(q('bs-card-img').classList.contains('card-img-top')).toBe(true);
    expect(img().className).toBe('card-img-top');
    expect(img().getAttribute('src')).toBe('a.png');
    expect(img().getAttribute('alt')).toBe('');
    expect(q('.card-img-overlay')).toBeNull();

    component.position.set('overlay');
    component.alt.set('Background');
    fixture.detectChanges();
    expect(img().className).toBe('card-img');
    expect(img().getAttribute('alt')).toBe('Background');
    expect(q('.card-img-overlay .caption')?.textContent).toBe('Caption');
  });

  it('renders each link as a real <a> inside a spaced host', () => {
    const { fixture, component, el } = setup();
    const links = () => [...el.querySelectorAll<HTMLAnchorElement>('bs-card-link > a.card-link')];
    expect(links().map((a) => a.getAttribute('href'))).toEqual(['/one', '/two']);
    expect(links()[1].getAttribute('aria-label')).toBe('Second');
    expect([...el.querySelectorAll('bs-card-link')].every((host) => host.classList.contains('card-link'))).toBe(true);

    component.href.set(null);
    fixture.detectChanges();
    expect(links()[0].hasAttribute('href')).toBe(false);
  });
});
