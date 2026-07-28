/* Spike: does an accessible name flow from SLOTTED light-DOM text into a control
   inside the shadow root?

   The question decides how much a consumer must type. `mp-checkbox` renders
   `<label class="form-check"><input><span class="form-check-label"><slot></slot></span></label>`,
   so the consumer's visible text is already sitting inside a <label> that wraps the
   <input> — just on the other side of a slot. Accessible-name computation walks the
   FLAT tree, which suggests it should work; but "should, per spec" is what needed
   checking twice already on this branch, so it is measured against Chromium's real
   accessibility tree instead.

   If it works, `<mp-checkbox>Accept terms</mp-checkbox>` is already named and
   `inputLabel` is a fallback for the label-less case rather than something every
   consumer must pass. */

// The real element, so this validates our actual markup rather than a replica.
import '../checkbox/src/components/mp-checkbox';
import '../select/src/components/mp-select';

/* Control A — a hand-built element with the same shape, to separate "does the
   platform do this" from "does our markup happen to be right". */
class SlottedLabelControl extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <label><input type="checkbox" id="inner"><span><slot></slot></span></label>`;
  }
}
customElements.define('mp-slotted-label-control', SlottedLabelControl);

/* Control B — the same, but the text lives in the shadow root instead of being
   slotted. If B is named and A is not, the slot boundary is the difference. */
class ShadowLabelControl extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<label><input type="checkbox" id="inner"><span>Shadow text</span></label>`;
  }
}
customElements.define('mp-shadow-label-control', ShadowLabelControl);

/* Control C — `<label for>` pointing at the input by id, both inside the shadow
   root. Same-tree IDREF, so this is expected to work and acts as a positive
   baseline for the harness itself. */
class ForLabelControl extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<input type="checkbox" id="inner"><label for="inner">For text</label>`;
  }
}
customElements.define('mp-for-label-control', ForLabelControl);
