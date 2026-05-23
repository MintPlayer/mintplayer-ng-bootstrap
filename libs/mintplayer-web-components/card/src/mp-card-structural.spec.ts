import { describe, it, expect, afterEach } from 'vitest';
import './mp-card-body.element';
import './mp-card-title.element';
import './mp-card-subtitle.element';
import './mp-card-text.element';
import './mp-card-group.element';

interface Case {
  tag: string;
  cls: string;
}

const cases: Case[] = [
  { tag: 'mp-card-body', cls: 'card-body' },
  { tag: 'mp-card-title', cls: 'card-title' },
  { tag: 'mp-card-subtitle', cls: 'card-subtitle' },
  { tag: 'mp-card-text', cls: 'card-text' },
  { tag: 'mp-card-group', cls: 'card-group' },
];

describe('Structural WC elements — host class smoke', () => {
  let el: HTMLElement | null = null;
  afterEach(() => { el?.remove(); el = null; });

  for (const { tag, cls } of cases) {
    it(`<${tag}> applies .${cls} on connect`, () => {
      el = document.createElement(tag);
      document.body.appendChild(el);
      expect(el.classList.contains(cls)).toBe(true);
    });
  }
});
