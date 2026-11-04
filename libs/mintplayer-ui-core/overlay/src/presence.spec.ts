import { afterEach, describe, expect, it } from 'vitest';
import { BODY_HOST_ATTRIBUTE } from './body-host';
import { resetOverlayStackForTesting } from './overlay-stack';
import { afterTransition, findByAttribute, OverlayPresence, transitionMs, whenRendered, type OverlayPhase } from './presence';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A stand-in front: renders `[data-of=x]` into a body host whenever the phase renders. */
function harness(initial: OverlayPhase = 'closed') {
  const phases: OverlayPhase[] = [];
  let host: HTMLElement | null = null;
  const render = (phase: OverlayPhase) => {
    if (phase === 'closed') {
      host?.remove();
      host = null;
      return;
    }
    if (!host) {
      host = document.createElement('div');
      host.setAttribute(BODY_HOST_ATTRIBUTE, 'x');
      const el = document.createElement('div');
      el.setAttribute('data-of', 'x');
      el.innerHTML = '<button>in</button>';
      host.appendChild(el);
      // The framework renders later than the state write.
      setTimeout(() => host && document.body.appendChild(host));
    }
    host.firstElementChild!.className = phase === 'shown' ? 'show' : '';
  };
  const presence = new OverlayPresence(
    {
      doc: document,
      find: () => findByAttribute(document, 'data-of', 'x'),
      setPhase: (phase) => {
        phases.push(phase);
        render(phase);
      },
      overlay: () => ({ modal: true }),
    },
    initial,
  );
  return { presence, phases };
}

describe('OverlayPresence', () => {
  afterEach(() => {
    resetOverlayStackForTesting();
    document.body.innerHTML = '';
  });

  it('renders, waits for the markup, opens it on the stack, then shows it', async () => {
    const { presence, phases } = harness();
    presence.set(true);
    expect(phases).toEqual(['entering']);
    expect(presence.handle).toBeNull();
    await flush();
    expect(phases).toEqual(['entering', 'shown']);
    expect(presence.handle).not.toBeNull();
    // The trap moved focus in.
    expect(document.activeElement?.textContent).toBe('in');
  });

  it('closes through leaving: off the stack at once, unrendered after the transition', async () => {
    const { presence, phases } = harness();
    presence.set(true);
    await flush();
    presence.set(false);
    // jsdom has no transitions: the leave ends at once.
    expect(phases).toEqual(['entering', 'shown', 'leaving', 'closed']);
    expect(presence.handle).toBeNull();
  });

  it('is idempotent, and an overlay open at load goes straight onto the stack', async () => {
    const { presence, phases } = harness();
    presence.set(false);
    expect(phases).toEqual([]);
    presence.set(true);
    presence.set(true);
    await flush();
    expect(phases).toEqual(['entering', 'shown']);
  });

  it('dispose releases the stack', async () => {
    const { presence } = harness();
    presence.set(true);
    await flush();
    const handle = presence.handle!;
    presence.dispose();
    expect(presence.handle).toBeNull();
    expect(handle.isTop()).toBe(false);
  });
});

describe('overlay helpers', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('whenRendered fires now, or on the mutation that adds the element', async () => {
    const seen: string[] = [];
    const find = () => findByAttribute(document, 'data-k', 'a');
    whenRendered(document, find, () => seen.push('late'));
    expect(seen).toEqual([]);
    const el = document.createElement('p');
    el.setAttribute('data-k', 'a');
    document.body.appendChild(el);
    await flush();
    expect(seen).toEqual(['late']);
    whenRendered(document, find, () => seen.push('now'));
    expect(seen).toEqual(['late', 'now']);
  });

  it('findByAttribute matches the value exactly, quotes and all', () => {
    document.body.innerHTML = '<i data-k=\'a"b\'></i><i data-k="ab"></i>';
    expect(findByAttribute(document, 'data-k', 'a"b')).toBe(document.body.firstElementChild);
    expect(findByAttribute(document, 'data-k', null)).toBeNull();
  });

  it('reads the longest transition, and ends at once without one', () => {
    const el = document.createElement('div');
    el.style.transitionDuration = '0.15s, 300ms';
    el.style.transitionDelay = '0s, 50ms';
    document.body.appendChild(el);
    expect(transitionMs(el)).toBe(350);
    let done = false;
    afterTransition([document.createElement('div')], () => (done = true));
    expect(done).toBe(true);
  });
});
