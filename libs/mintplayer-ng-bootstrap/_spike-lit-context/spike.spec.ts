/**
 * Spike: verify Lit Context recursive provider/consumer pattern works as
 * spec'd in issue #312 PRD FR-24.
 *
 * Three contexts with different inheritance semantics:
 *  - editorRegistry  → override   (this.value ?? consumed)
 *  - disabled        → OR         (consumed || this.value)
 *  - messages        → merge      ({...consumed, ...this.value})
 *
 * Pattern: each <mp-qb-spike> is BOTH a ContextConsumer (subscribing to any
 * outer ancestor's provider) AND a ContextProvider (broadcasting the
 * effective value to its descendants). Effective value is computed in
 * willUpdate and pushed to the provider.
 *
 * If this spike passes, FR-24 / Phase 7.3 are implementable as written.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { LitElement, html, type PropertyValues } from 'lit';
import { createContext, ContextConsumer, ContextProvider } from '@lit/context';
type Registry = Record<string, (s: string) => string>;
type Messages = Record<string, string>;

const registryContext = createContext<Registry | undefined>('spike.registry');
const disabledContext = createContext<boolean | undefined>('spike.disabled');
const messagesContext = createContext<Messages | undefined>('spike.messages');

class MpQbSpike extends LitElement {
  static override properties = {
    registry: { attribute: false },
    disabled: { attribute: false },
    messages: { attribute: false },
  };

  registry: Registry | undefined = undefined;
  disabled: boolean | undefined = undefined;
  messages: Messages | undefined = undefined;

  private _registryConsumer = new ContextConsumer(this, {
    context: registryContext,
    subscribe: true,
  });
  private _registryProvider = new ContextProvider(this, {
    context: registryContext,
    initialValue: undefined,
  });

  private _disabledConsumer = new ContextConsumer(this, {
    context: disabledContext,
    subscribe: true,
  });
  private _disabledProvider = new ContextProvider(this, {
    context: disabledContext,
    initialValue: undefined,
  });

  private _messagesConsumer = new ContextConsumer(this, {
    context: messagesContext,
    subscribe: true,
  });
  private _messagesProvider = new ContextProvider(this, {
    context: messagesContext,
    initialValue: undefined,
  });

  override willUpdate(_changed: PropertyValues): void {
    // Override semantics
    const effRegistry = this.registry ?? this._registryConsumer.value;
    this._registryProvider.setValue(effRegistry);

    // OR semantics
    const effDisabled =
      (this._disabledConsumer.value ?? false) || (this.disabled ?? false);
    this._disabledProvider.setValue(effDisabled);

    // Merge semantics
    const effMessages = {
      ...(this._messagesConsumer.value ?? {}),
      ...(this.messages ?? {}),
    };
    this._messagesProvider.setValue(effMessages);
  }

  override render() {
    return html`<slot></slot>`;
  }
}

class MpQbSpikeLeaf extends LitElement {
  private _registryConsumer = new ContextConsumer(this, {
    context: registryContext,
    subscribe: true,
  });
  private _disabledConsumer = new ContextConsumer(this, {
    context: disabledContext,
    subscribe: true,
  });
  private _messagesConsumer = new ContextConsumer(this, {
    context: messagesContext,
    subscribe: true,
  });

  // Test accessors
  get observedRegistry(): Registry | undefined {
    return this._registryConsumer.value;
  }
  get observedDisabled(): boolean | undefined {
    return this._disabledConsumer.value;
  }
  get observedMessages(): Messages | undefined {
    return this._messagesConsumer.value;
  }

  override render() {
    const reg = this._registryConsumer.value;
    const dis = this._disabledConsumer.value;
    const msg = this._messagesConsumer.value;
    return html`<span
      data-registry-keys=${reg ? Object.keys(reg).sort().join(',') : ''}
      data-disabled=${String(dis ?? false)}
      data-messages=${msg ? JSON.stringify(msg) : ''}
    ></span>`;
  }
}

beforeAll(() => {
  if (!customElements.get('mp-qb-spike')) {
    customElements.define('mp-qb-spike', MpQbSpike);
  }
  if (!customElements.get('mp-qb-spike-leaf')) {
    customElements.define('mp-qb-spike-leaf', MpQbSpikeLeaf);
  }
});

/** Build a DOM tree from a fragment of HTML and append to document.body. */
function mount(html: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  return wrapper;
}

/** Wait for all elements to finish updating (Lit microtask queue). */
async function settle(...elements: LitElement[]): Promise<void> {
  await Promise.all(elements.map((el) => el.updateComplete));
}

function $<T extends Element = Element>(root: ParentNode, sel: string): T {
  const el = root.querySelector(sel);
  if (!el) throw new Error(`Selector ${sel} not found`);
  return el as T;
}

function $$leaf(root: ParentNode): MpQbSpikeLeaf {
  return $<MpQbSpikeLeaf>(root, 'mp-qb-spike-leaf');
}

function $$spike(root: ParentNode, idx = 0): MpQbSpike {
  const all = root.querySelectorAll('mp-qb-spike');
  const el = all[idx];
  if (!el) throw new Error(`No mp-qb-spike at index ${idx}`);
  return el as MpQbSpike;
}

describe('Lit Context recursive provider/consumer (spike for issue #312 FR-24)', () => {
  it('Scenario 1: single-level provider → leaf inherits', async () => {
    const root = mount(`
      <mp-qb-spike id="outer"><mp-qb-spike-leaf></mp-qb-spike-leaf></mp-qb-spike>
    `);
    const outer = $$spike(root);
    outer.registry = { date: (s) => `d:${s}` };
    const leaf = $$leaf(root);
    await settle(outer, leaf);

    expect(leaf.observedRegistry).toBeDefined();
    expect(Object.keys(leaf.observedRegistry!)).toEqual(['date']);
  });

  it('Scenario 2: two-level inheritance (inner has no own registry → inherits outer)', async () => {
    const root = mount(`
      <mp-qb-spike><mp-qb-spike><mp-qb-spike-leaf></mp-qb-spike-leaf></mp-qb-spike></mp-qb-spike>
    `);
    const [outer, inner] = root.querySelectorAll('mp-qb-spike');
    (outer as MpQbSpike).registry = { date: (s) => `outer:${s}` };
    const leaf = $$leaf(root);
    await settle(outer as MpQbSpike, inner as MpQbSpike, leaf);

    expect(leaf.observedRegistry).toBeDefined();
    expect(Object.keys(leaf.observedRegistry!)).toEqual(['date']);
    expect(leaf.observedRegistry!.date('x')).toBe('outer:x');
  });

  it('Scenario 3: two-level override (inner has its own registry → leaf reads inner)', async () => {
    const root = mount(`
      <mp-qb-spike><mp-qb-spike><mp-qb-spike-leaf></mp-qb-spike-leaf></mp-qb-spike></mp-qb-spike>
    `);
    const [outer, inner] = root.querySelectorAll('mp-qb-spike');
    (outer as MpQbSpike).registry = { date: (s) => `outer:${s}` };
    (inner as MpQbSpike).registry = { tag: (s) => `inner:${s}` };
    const leaf = $$leaf(root);
    await settle(outer as MpQbSpike, inner as MpQbSpike, leaf);

    expect(Object.keys(leaf.observedRegistry!)).toEqual(['tag']);
    expect(leaf.observedRegistry!.tag('y')).toBe('inner:y');
  });

  it('Scenario 4: reactive — outer change after mount propagates to inner leaf', async () => {
    const root = mount(`
      <mp-qb-spike><mp-qb-spike><mp-qb-spike-leaf></mp-qb-spike-leaf></mp-qb-spike></mp-qb-spike>
    `);
    const [outer, inner] = root.querySelectorAll('mp-qb-spike');
    (outer as MpQbSpike).registry = { date: (s) => `v1:${s}` };
    const leaf = $$leaf(root);
    await settle(outer as MpQbSpike, inner as MpQbSpike, leaf);
    expect(leaf.observedRegistry!.date('z')).toBe('v1:z');

    // Mutate outer's registry
    (outer as MpQbSpike).registry = { date: (s) => `v2:${s}` };
    await settle(outer as MpQbSpike, inner as MpQbSpike, leaf);

    expect(leaf.observedRegistry!.date('z')).toBe('v2:z');
  });

  it('Scenario 5: clearing inner reverts to inherited', async () => {
    const root = mount(`
      <mp-qb-spike><mp-qb-spike><mp-qb-spike-leaf></mp-qb-spike-leaf></mp-qb-spike></mp-qb-spike>
    `);
    const [outer, inner] = root.querySelectorAll('mp-qb-spike');
    (outer as MpQbSpike).registry = { outerKey: (s) => `o:${s}` };
    (inner as MpQbSpike).registry = { innerKey: (s) => `i:${s}` };
    const leaf = $$leaf(root);
    await settle(outer as MpQbSpike, inner as MpQbSpike, leaf);
    expect(Object.keys(leaf.observedRegistry!)).toEqual(['innerKey']);

    // Clear inner
    (inner as MpQbSpike).registry = undefined;
    await settle(outer as MpQbSpike, inner as MpQbSpike, leaf);

    expect(Object.keys(leaf.observedRegistry!)).toEqual(['outerKey']);
  });

  it('Scenario 6: disabled OR semantics — outer disabled wins even if inner explicitly false', async () => {
    const root = mount(`
      <mp-qb-spike><mp-qb-spike><mp-qb-spike-leaf></mp-qb-spike-leaf></mp-qb-spike></mp-qb-spike>
    `);
    const [outer, inner] = root.querySelectorAll('mp-qb-spike');
    (outer as MpQbSpike).disabled = true;
    (inner as MpQbSpike).disabled = false;
    const leaf = $$leaf(root);
    await settle(outer as MpQbSpike, inner as MpQbSpike, leaf);

    expect(leaf.observedDisabled).toBe(true);

    // Inverse: outer false, inner true → leaf true
    (outer as MpQbSpike).disabled = false;
    (inner as MpQbSpike).disabled = true;
    await settle(outer as MpQbSpike, inner as MpQbSpike, leaf);
    expect(leaf.observedDisabled).toBe(true);

    // Both false → leaf false
    (outer as MpQbSpike).disabled = false;
    (inner as MpQbSpike).disabled = false;
    await settle(outer as MpQbSpike, inner as MpQbSpike, leaf);
    expect(leaf.observedDisabled).toBe(false);
  });

  it('Scenario 7: messages merge semantics — inner keys override outer per-key', async () => {
    const root = mount(`
      <mp-qb-spike><mp-qb-spike><mp-qb-spike-leaf></mp-qb-spike-leaf></mp-qb-spike></mp-qb-spike>
    `);
    const [outer, inner] = root.querySelectorAll('mp-qb-spike');
    (outer as MpQbSpike).messages = { a: 'outerA', b: 'outerB' };
    (inner as MpQbSpike).messages = { b: 'innerB', c: 'innerC' };
    const leaf = $$leaf(root);
    await settle(outer as MpQbSpike, inner as MpQbSpike, leaf);

    expect(leaf.observedMessages).toEqual({
      a: 'outerA',
      b: 'innerB', // inner overrides per-key
      c: 'innerC',
    });
  });

  it('Scenario 8: deep nesting (3 levels) — inheritance + override at level 2, falls through to level 3', async () => {
    const root = mount(`
      <mp-qb-spike>
        <mp-qb-spike>
          <mp-qb-spike>
            <mp-qb-spike-leaf></mp-qb-spike-leaf>
          </mp-qb-spike>
        </mp-qb-spike>
      </mp-qb-spike>
    `);
    const [outer, mid, inner] = root.querySelectorAll('mp-qb-spike');
    (outer as MpQbSpike).registry = { from: (s) => `outer:${s}` };
    (mid as MpQbSpike).registry = { from: (s) => `mid:${s}` };
    // inner has no own registry → should inherit mid's
    const leaf = $$leaf(root);
    await settle(outer as MpQbSpike, mid as MpQbSpike, inner as MpQbSpike, leaf);

    expect(leaf.observedRegistry!.from('z')).toBe('mid:z');
  });
});
