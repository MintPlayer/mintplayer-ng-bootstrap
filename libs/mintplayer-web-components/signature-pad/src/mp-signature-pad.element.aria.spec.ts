import { afterEach, describe, expect, it } from 'vitest';
import { sharedInternals } from '@mintplayer/web-components/a11y';
import './mp-signature-pad.element';
import type { MpSignaturePadElement } from './mp-signature-pad.element';

/**
 * The LIVE half of `<mp-signature-pad>`'s ARIA surface.
 *
 * The main spec asserts the roles and labels as rendered at mount, and
 * `_conformance/naming.spec.ts` asserts the shared naming contract (including
 * the `'Signature pad'` default and that IDREF strings are never copied inward).
 * What neither covers is what a screen reader sees *after* something changes:
 * the pad's only ARIA channel is its name, and each of its four label inputs is
 * a live attribute whose change must reach the right node — including when the
 * host's `aria-label` appears and disappears, and when the re-render replaces
 * the controls row.
 *
 * There is no ARIA *state* to assert: strokes, undo and clear mutate the model
 * without any announcement, by design (the canvas is `role="img"`, and the
 * typed input's value is the accessible representation of the signature).
 */
async function mount(setup?: (el: MpSignaturePadElement) => void): Promise<MpSignaturePadElement> {
  const el = document.createElement('mp-signature-pad') as MpSignaturePadElement;
  setup?.(el);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function canvas(el: MpSignaturePadElement): HTMLCanvasElement {
  return el.shadowRoot!.querySelector('canvas') as HTMLCanvasElement;
}

function typedInput(el: MpSignaturePadElement): HTMLInputElement | null {
  return el.shadowRoot!.querySelector('input.form-control');
}

function buttonLabels(el: MpSignaturePadElement): (string | undefined)[] {
  return Array.from(el.shadowRoot!.querySelectorAll('button')).map((b) => b.textContent?.trim());
}

describe('mp-signature-pad ARIA — the role-bearing node', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps the role on the canvas and takes none for the host, so the name is announced once', async () => {
    const el = await mount((host) => host.setAttribute('aria-label', 'Client signature'));
    expect(el.hasAttribute('role')).toBe(false);
    // HostAriaController here is reference-resolution only — no host role is claimed
    // through ElementInternals either.
    expect(sharedInternals(el)?.role ?? null).toBeNull();
    expect(canvas(el).getAttribute('role')).toBe('img');
    expect(canvas(el).getAttribute('aria-label')).toBe('Client signature');
  });

  it('survives the controls re-render with its role and name intact, in both directions', async () => {
    const el = await mount((host) => {
      host.setAttribute('input-label', 'Handtekening');
      host.setAttribute('undo-label', 'Ongedaan maken');
    });

    el.showAccessibilityToggle = false;
    await el.updateComplete;
    expect(typedInput(el)).toBeNull();
    expect(canvas(el).getAttribute('role')).toBe('img');
    expect(canvas(el).getAttribute('aria-label')).toBe('Handtekening');
    expect(buttonLabels(el)).toEqual(['Ongedaan maken', 'Clear']);

    el.showAccessibilityToggle = true;
    await el.updateComplete;
    expect(typedInput(el)?.getAttribute('aria-label')).toBe('Type your signature');
    expect(canvas(el).getAttribute('aria-label')).toBe('Handtekening');
  });
});

describe('mp-signature-pad ARIA — the name stays live', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('follows an input-label change and falls back to the default when it is removed', async () => {
    const el = await mount();
    expect(canvas(el).getAttribute('aria-label')).toBe('Signature pad');

    el.setAttribute('input-label', 'Handtekening');
    await el.updateComplete;
    expect(canvas(el).getAttribute('aria-label')).toBe('Handtekening');

    el.removeAttribute('input-label');
    await el.updateComplete;
    expect(canvas(el).getAttribute('aria-label')).toBe('Signature pad');
  });

  it('lets a host aria-label take over the moment it appears, and hands the name back when it goes', async () => {
    const el = await mount((host) => host.setAttribute('input-label', 'From property'));
    expect(canvas(el).getAttribute('aria-label')).toBe('From property');

    el.setAttribute('aria-label', 'From host');
    await el.updateComplete;
    expect(canvas(el).getAttribute('aria-label')).toBe('From host');

    el.removeAttribute('aria-label');
    await el.updateComplete;
    expect(canvas(el).getAttribute('aria-label')).toBe('From property');
  });

  it('re-labels and re-prompts the typed alternative when type-label changes', async () => {
    const el = await mount();
    expect(typedInput(el)?.getAttribute('aria-label')).toBe('Type your signature');
    expect(typedInput(el)?.getAttribute('placeholder')).toBe('Type your signature');

    el.setAttribute('type-label', 'Typ je handtekening');
    await el.updateComplete;
    expect(typedInput(el)?.getAttribute('aria-label')).toBe('Typ je handtekening');
    expect(typedInput(el)?.getAttribute('placeholder')).toBe('Typ je handtekening');
  });

  it('re-labels Undo and Clear live — their text content IS their accessible name', async () => {
    const el = await mount();
    expect(buttonLabels(el)).toEqual(['Undo', 'Clear']);

    el.undoLabel = 'Ongedaan maken';
    el.clearLabel = 'Wissen';
    await el.updateComplete;
    expect(buttonLabels(el)).toEqual(['Ongedaan maken', 'Wissen']);
    // Labels are text, not aria-label: nothing may override the visible name.
    expect(Array.from(el.shadowRoot!.querySelectorAll('button')).some((b) => b.hasAttribute('aria-label'))).toBe(false);
  });

  it('never lets the signature content rewrite the canvas name', async () => {
    const el = await mount((host) => host.setAttribute('input-label', 'Client signature'));

    const input = typedInput(el) as HTMLInputElement;
    input.value = 'Ada Lovelace';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await el.updateComplete;
    expect(canvas(el).getAttribute('aria-label')).toBe('Client signature');

    el.signature = { strokes: [{ points: [{ x: 1, y: 1 }] }], text: 'Ada Lovelace' };
    await el.updateComplete;
    expect(canvas(el).getAttribute('aria-label')).toBe('Client signature');
    // The typed value is the accessible representation of the signature.
    expect((typedInput(el) as HTMLInputElement).value).toBe('Ada Lovelace');
  });
});
