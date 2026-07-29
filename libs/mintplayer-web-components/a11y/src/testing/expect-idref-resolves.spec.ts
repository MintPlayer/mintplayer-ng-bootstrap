import { describe, it, expect, afterEach } from 'vitest';
import { expectIdrefResolves, expectNoDanglingIdref, expectNoDanglingIdrefsIn } from './expect-idref-resolves';

/**
 * Reproduces the shape of the six dead references found in the audit: half the
 * relationship rendered in a shadow root, the other half in light DOM.
 */
class SplitHost extends HTMLElement {
  shadowButton: HTMLElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    this.shadowButton = document.createElement('button');
    this.shadowButton.id = 'shadow-tab';
    shadow.appendChild(this.shadowButton);
    const panel = document.createElement('div');
    panel.id = 'shadow-panel';
    shadow.appendChild(panel);
  }
}
customElements.define('idref-split-host', SplitHost);

function mount(): SplitHost {
  const el = document.createElement('idref-split-host') as SplitHost;
  document.body.appendChild(el);
  return el;
}

describe('expectIdrefResolves', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('passes when both ends are minted in the same root', () => {
    // The structural reason every live IDREF in the library is live.
    const el = mount();
    el.shadowButton.setAttribute('aria-controls', 'shadow-panel');

    expect(() => expectIdrefResolves(el.shadowButton, 'aria-controls')).not.toThrow();
  });

  it('fails when the holder is in a shadow root and the target is in light DOM', () => {
    // mp-ribbon: the tab button lives in the shadow root, the panel is slotted.
    const el = mount();
    const lightPanel = document.createElement('div');
    lightPanel.id = 'light-panel';
    document.body.appendChild(lightPanel);
    el.shadowButton.setAttribute('aria-controls', 'light-panel');

    expect(() => expectIdrefResolves(el.shadowButton, 'aria-controls')).toThrow(/does not resolve/);
  });

  it('fails when the holder is the host and the target is in its own shadow root', () => {
    // mp-time-list: aria-activedescendant on the host, option ids in the shadow.
    const el = mount();
    el.setAttribute('aria-activedescendant', 'shadow-tab');

    expect(() => expectIdrefResolves(el, 'aria-activedescendant')).toThrow(/does not resolve/);
  });

  it('names the shadow boundary in the failure message', () => {
    const el = mount();
    el.shadowButton.setAttribute('aria-labelledby', 'nowhere');

    expect(() => expectIdrefResolves(el.shadowButton, 'aria-labelledby'))
      .toThrow(/IDREFs never cross a shadow boundary/);
  });

  it('reports every unresolved token in a multi-id list', () => {
    const el = mount();
    const known = document.createElement('span');
    known.id = 'known';
    document.body.appendChild(known);
    el.setAttribute('aria-describedby', 'known missing-a missing-b');

    expect(() => expectIdrefResolves(el, 'aria-describedby')).toThrow(/#missing-a, #missing-b/);
  });

  it('fails loudly when the attribute is absent rather than passing vacuously', () => {
    const el = mount();
    expect(() => expectIdrefResolves(el, 'aria-controls')).toThrow(/the attribute is absent/);
  });

  it('fails on an empty attribute', () => {
    const el = mount();
    el.setAttribute('aria-labelledby', '   ');

    expect(() => expectIdrefResolves(el, 'aria-labelledby')).toThrow(/empty/);
  });

  it('would pass a string-equality assertion that this helper rejects', () => {
    // The reason the helper exists: the three green tests in the repo asserted
    // the attribute's value, which is true while the relationship is dead.
    const el = mount();
    el.setAttribute('aria-activedescendant', 'shadow-tab');

    expect(el.getAttribute('aria-activedescendant')).toBe('shadow-tab'); // green, and wrong
    expect(() => expectIdrefResolves(el, 'aria-activedescendant')).toThrow();
  });
});

describe('expectNoDanglingIdref', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('tolerates an absent attribute', () => {
    const el = mount();
    expect(() => expectNoDanglingIdref(el, 'aria-controls')).not.toThrow();
  });

  it('still fails on a present-but-dangling attribute', () => {
    const el = mount();
    el.setAttribute('aria-controls', 'missing');

    expect(() => expectNoDanglingIdref(el, 'aria-controls')).toThrow(/does not resolve/);
  });
});

describe('expectNoDanglingIdrefsIn', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('passes on a subtree whose references all resolve', () => {
    const el = mount();
    el.shadowButton.setAttribute('aria-controls', 'shadow-panel');

    expect(() => expectNoDanglingIdrefsIn(el.shadowRoot!)).not.toThrow();
  });

  it('finds a dangling reference nested inside a shadow root', () => {
    const el = mount();
    el.shadowButton.setAttribute('aria-describedby', 'not-here');

    expect(() => expectNoDanglingIdrefsIn(el.shadowRoot!)).toThrow(/aria-describedby/);
  });
});
