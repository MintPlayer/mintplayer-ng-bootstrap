import { afterEach, describe, expect, it } from 'vitest';
import { MpShell } from './index';

void MpShell; // force the side-effect registration

/** The generated Lit shell (#458 M4): light DOM, named regions from `slot=` children. */
async function mount(attrs = ''): Promise<MpShell> {
  document.body.innerHTML = `<mp-shell ${attrs}>
    <span slot="topbar" class="brand">Brand</span>
    <nav slot="sidebar" class="links">Links</nav>
    <main class="page">Content</main>
  </mp-shell>`;
  const el = document.querySelector('mp-shell') as MpShell;
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-shell (generated, #458)', () => {
  it('renders the shell on its host with each child in its region', async () => {
    const el = await mount();
    expect(el.shadowRoot).toBeNull();
    expect(el.matches('.shell[data-mps=shell][data-breakpoint=md]')).toBe(true);
    expect(el.querySelector('.topbar .brand')?.textContent).toBe('Brand');
    expect(el.querySelector('aside.sidebar .links')?.textContent).toBe('Links');
    expect(el.querySelector('.content .page')?.textContent).toBe('Content');
  });

  it('starts from the state attribute and fires statechange when a toggle flips', async () => {
    const el = await mount('state="show"');
    const narrow = el.querySelector<HTMLInputElement>('input.shell-toggle-narrow')!;
    expect(narrow.checked).toBe(true);
    const changes: boolean[] = [];
    el.addEventListener('statechange', (ev) => changes.push((ev as CustomEvent<{ open: boolean }>).detail.open));
    narrow.click();
    expect(changes).toEqual([false]);
  });

  it('lowers size onto the sidebar root', async () => {
    const el = await mount('size="18rem"');
    expect(el.querySelector<HTMLElement>('.sidebar-root')!.style.getPropertyValue('--mp-shell-size')).toBe('18rem');
  });
});
