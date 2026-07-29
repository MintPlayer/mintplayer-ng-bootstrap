import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import {
  HostAriaController,
  sharedInternals,
  supportsAriaElementReferences,
  resetReferenceWarningForTesting,
} from './host-aria';

class PlainHost extends HTMLElement {}
customElements.define('ha-plain-host', PlainHost);

function host(): PlainHost {
  const el = document.createElement('ha-plain-host') as PlainHost;
  document.body.appendChild(el);
  return el;
}

describe('sharedInternals', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns the same ElementInternals for repeated calls', () => {
    // attachInternals() throws if called twice, so HostAriaController and the
    // form-association mixin must not each call it.
    const el = host();

    const first = sharedInternals(el);
    const second = sharedInternals(el);

    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  it('degrades to null rather than throwing on an element that cannot attach', () => {
    const plain = document.createElement('div');
    document.body.appendChild(plain);

    expect(() => sharedInternals(plain)).not.toThrow();
    expect(sharedInternals(plain)).toBeNull();
  });
});

describe('HostAriaController — role', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('puts the role on the host so a host aria-label applies to the right node', () => {
    const el = host();
    const controller = new HostAriaController(el, { role: 'listbox' });

    expect(controller.usesInternals).toBe(true);
    // The role is a default, not an attribute — the host has no role attribute
    // but is exposed as a listbox.
    expect(el.hasAttribute('role')).toBe(false);
    expect(sharedInternals(el)!.role).toBe('listbox');
  });

  it('lets an author-supplied role attribute win', () => {
    const el = host();
    el.setAttribute('role', 'grid');
    new HostAriaController(el, { role: 'listbox' });

    // internals.role is the default; the attribute overrides it per ARIA
    // reflection, so the author keeps control.
    expect(el.getAttribute('role')).toBe('grid');
  });

  it('falls back to the role attribute when internals are unavailable', () => {
    const plain = document.createElement('div');
    document.body.appendChild(plain);

    const controller = new HostAriaController(plain, { role: 'region' });

    expect(controller.usesInternals).toBe(false);
    expect(plain.getAttribute('role')).toBe('region');
  });

  it('does not overwrite an author role in the fallback path either', () => {
    const plain = document.createElement('div');
    plain.setAttribute('role', 'group');
    document.body.appendChild(plain);

    new HostAriaController(plain, { role: 'region' });

    expect(plain.getAttribute('role')).toBe('group');
  });
});

describe('HostAriaController — state', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reflects state through internals without writing attributes', () => {
    const el = host();
    const controller = new HostAriaController(el, { role: 'button' });

    controller.setState({ expanded: false });

    expect(sharedInternals(el)!.ariaExpanded).toBe('false');
    expect(el.hasAttribute('aria-expanded')).toBe(false);
  });

  it('updates state on every call, so it cannot go stale', () => {
    const el = host();
    const controller = new HostAriaController(el, { role: 'button' });
    const internals = sharedInternals(el)!;

    controller.setState({ expanded: false });
    expect(internals.ariaExpanded).toBe('false');

    controller.setState({ expanded: true });
    expect(internals.ariaExpanded).toBe('true');
  });

  it('writes false rather than omitting it, so a two-state control is never silent', () => {
    // aria-pressed written only when true reads as "not a toggle" the rest of
    // the time; the audit found exactly that in the scheduler.
    const el = host();
    new HostAriaController(el, { role: 'button' }).setState({ pressed: false });

    expect(sharedInternals(el)!.ariaPressed).toBe('false');
  });

  it('removes state on null', () => {
    const el = host();
    const controller = new HostAriaController(el, { role: 'progressbar' });
    const internals = sharedInternals(el)!;

    controller.setState({ valueNow: 40 });
    expect(internals.ariaValueNow).toBe('40');

    // Indeterminate progress must OMIT aria-valuenow, not report 0.
    controller.setState({ valueNow: null });
    expect(internals.ariaValueNow).toBeNull();
  });

  it('supports the mixed checkbox state', () => {
    const el = host();
    new HostAriaController(el, { role: 'checkbox' }).setState({ checked: 'mixed' });

    expect(sharedInternals(el)!.ariaChecked).toBe('mixed');
  });

  it('falls back to attributes when internals are unavailable', () => {
    const plain = document.createElement('div');
    document.body.appendChild(plain);
    const controller = new HostAriaController(plain, { role: 'button' });

    controller.setState({ expanded: true, label: 'Toggle' });
    expect(plain.getAttribute('aria-expanded')).toBe('true');
    expect(plain.getAttribute('aria-label')).toBe('Toggle');

    controller.setState({ expanded: null });
    expect(plain.hasAttribute('aria-expanded')).toBe(false);
  });
});

describe('HostAriaController — cross-root references', () => {
  beforeEach(() => {
    // The warning is deliberately once-per-process so an app is not spammed,
    // which means it has to be re-armed between tests.
    resetReferenceWarningForTesting();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('reports whether the platform can assign element references', () => {
    // jsdom implements attachInternals and the ARIA state properties but NOT
    // ariaLabelledByElements, so the resolution path itself has to be verified
    // in a real browser — that is spike 0.2 in the plan, across all three
    // engines. This assertion documents the gap rather than pretending to
    // cover it.
    expect(typeof supportsAriaElementReferences()).toBe('boolean');
  });

  it('reports unresolved reference attributes rather than failing silently', () => {
    const el = host();
    el.setAttribute('aria-labelledby', 'does-not-exist');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const unresolved = new HostAriaController(el).syncReferences();

    // Either the platform cannot assign references (jsdom) or the id does not
    // resolve — both must surface, because a silently dead aria-labelledby is
    // the exact defect this controller exists to remove.
    expect(unresolved).toContain('aria-labelledby');
  });

  it('warns once when the platform cannot honour references', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const el = host();
    el.setAttribute('aria-describedby', 'hint');

    new HostAriaController(el).syncReferences();

    if (!supportsAriaElementReferences()) {
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('label property');
    }
  });

  it('does not report an attribute that is absent', () => {
    const el = host();
    expect(new HostAriaController(el).syncReferences()).not.toContain('aria-labelledby');
  });

  it('resolves ids in the host tree, not the shadow tree', () => {
    // The whole point. A consumer's label lives in the document; the control it
    // names lives in a shadow root. Resolving in the host's tree is what makes
    // the inward assignment legal, and is why copying the IDREF string onto the
    // inner node (what mp-checkbox does today) is silently dead.
    const label = document.createElement('span');
    label.id = 'external-label';
    label.textContent = 'Accept terms';
    document.body.appendChild(label);

    const el = host();
    el.attachShadow({ mode: 'open' }).appendChild(document.createElement('input'));
    el.setAttribute('aria-labelledby', 'external-label');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const unresolved = new HostAriaController(el).syncReferences();

    if (supportsAriaElementReferences()) {
      expect(unresolved).toEqual([]);
      const internals = sharedInternals(el) as unknown as Record<string, unknown>;
      expect(internals['ariaLabelledByElements']).toEqual([label]);
    } else {
      expect(unresolved).toContain('aria-labelledby');
    }
  });
});
