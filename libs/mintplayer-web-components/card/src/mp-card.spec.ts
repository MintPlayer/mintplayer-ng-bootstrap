import { afterEach, describe, expect, it } from 'vitest';
import { MpCard, MpCardImg, MpCardLink, MpCardTitle } from './index';

void MpCard; // force the side-effect registrations
void MpCardImg;
void MpCardLink;
void MpCardTitle;

/**
 * The generated Lit card group (#458 M4): light DOM, each host is the
 * Bootstrap element, consumer children stay where they are.
 */
type Lit = HTMLElement & { updateComplete: Promise<unknown> };

async function mount(html: string): Promise<void> {
  document.body.innerHTML = html;
  const elements = [...document.body.querySelectorAll<Lit>('*')].filter((el) => el.localName.startsWith('mp-card'));
  await Promise.all(elements.map((el) => el.updateComplete));
  await Promise.all(elements.map((el) => el.updateComplete));
}

describe('mp-card group', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the card in the light DOM with its colour classes, keeping consumer children', async () => {
    await mount('<mp-card color="primary"><mp-card-body><p class="mine">Body</p></mp-card-body></mp-card>');
    const card = document.querySelector('mp-card') as MpCard;
    expect(card.shadowRoot).toBeNull();
    expect([...card.classList]).toEqual(expect.arrayContaining(['card', 'text-bg-primary', 'border-primary']));
    expect(card.getAttribute('data-mps')).toBe('card');
    expect(document.querySelector('mp-card-body.card-body > p.mine')?.textContent).toBe('Body');
  });

  it('makes the title a heading at its level', async () => {
    await mount('<mp-card-title level="2">T</mp-card-title>');
    const title = document.querySelector('mp-card-title')!;
    expect(title.getAttribute('role')).toBe('heading');
    expect(title.getAttribute('aria-level')).toBe('2');
  });

  it('renders the image and its overlay content', async () => {
    await mount('<mp-card-img position="overlay" src="a.png"><span class="caption">C</span></mp-card-img>');
    const img = document.querySelector('mp-card-img img')!;
    expect(img.className).toBe('card-img');
    expect(img.getAttribute('src')).toBe('a.png');
    expect(img.getAttribute('alt')).toBe('');
    expect(document.querySelector('mp-card-img .card-img-overlay .caption')?.textContent).toBe('C');
  });

  it('renders a link as a real <a> carrying the href', async () => {
    await mount('<mp-card-link href="/x">Go</mp-card-link>');
    const a = document.querySelector('mp-card-link > a.card-link')!;
    expect(a.getAttribute('href')).toBe('/x');
    expect(a.textContent?.trim()).toBe('Go');
  });
});
