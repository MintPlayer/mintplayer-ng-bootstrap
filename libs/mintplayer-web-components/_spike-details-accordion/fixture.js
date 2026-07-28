/* Spike 0.1a fixture — the BEHAVIOURAL half of the <details>/<summary> question.
   Pixel parity is a separate spike against a real demo route with Bootstrap CSS
   loaded; nothing here depends on styling beyond the marker checks. */

const TEMPLATE = (name) => `
  <style>
    /* The three marker-removal mechanisms, all applied: engines have
       historically each needed a different one. */
    summary { list-style: none; display: flex; align-items: center; width: 100%; cursor: pointer; }
    summary::marker { content: ''; }
    summary::-webkit-details-marker { display: none; }
    summary::after { content: '>'; margin-left: auto; transition: transform .2s; }
    details[open] > summary::after { transform: rotate(90deg); }
    summary[aria-disabled='true'] { pointer-events: none; opacity: .65; }
  </style>
  <details name="${name}" id="d1"><summary id="s1">One</summary><div><button id="b1">in one</button></div></details>
  <details name="${name}" id="d2"><summary id="s2">Two</summary><div><button id="b2">in two</button></div></details>
  <details name="${name}" id="d3"><summary id="s3" aria-disabled="true" tabindex="-1">Three (disabled)</summary><div><button id="b3">in three</button></div></details>
`;

/** Records every toggle event the UA fires, in order, so the auto-close question
    is answered by observation rather than assumption. */
window.toggleLog = [];

class DetailsAccordion extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = TEMPLATE(this.getAttribute('group') || 'grp');

    /* FINDING (spike 0.1a): `toggle` does NOT bubble, so the obvious delegated
       listener on the shadow root never fires. Non-bubbling events still
       propagate in the CAPTURE phase, so `capture: true` delegates correctly and
       avoids one listener per <details> plus the bookkeeping to add and remove
       them as tabs are added or removed. */
    root.addEventListener(
      'toggle',
      (e) => {
        const el = e.target;
        window.toggleLog.push({
          host: this.id,
          id: el.id,
          open: el.open,
          cancelable: e.cancelable,
          bubbles: e.bubbles,
        });
      },
      true,
    );

    /* FINDING (spike 0.1a): `pointer-events: none` + `tabindex="-1"` is NOT
       enough to disable a <summary>. It blocks the pointer and Tab, but
       programmatic focus followed by Enter still activates it, and `toggle` is
       not cancellable so there is no way to undo it without a visible flash.
       Cancelling the KEYDOWN is the clean fix: keydown IS cancellable, and
       preventDefault() on it suppresses the activation entirely. */
    root.addEventListener('keydown', (e) => {
      const summary = e.target.closest?.('summary');
      if (!summary || summary.getAttribute('aria-disabled') !== 'true') return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') e.preventDefault();
    });
  }
  get details() {
    return Array.from(this.shadowRoot.querySelectorAll('details'));
  }
  openStates() {
    return this.details.map((d) => d.open);
  }
}
customElements.define('mp-details-accordion', DetailsAccordion);
