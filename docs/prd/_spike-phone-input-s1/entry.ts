// Throwaway fixture for spike S1 — the mp-input-group group contract.
// Deleted before merge; verdicts recorded in docs/prd/phone-input-wc.md §9.
//
// Fidelity notes:
//  - `spike-select` adopts the REAL compiled `form-select.styles.scss` (via
//    prepare.mjs + sass) plus the CANDIDATE contract rules, so we measure
//    production CSS, not an approximation.
//  - Styles arrive through Lit's `static styles` → `adoptedStyleSheets`, the
//    same path the generated `unsafeCSS` stylesheets take in the real lib.
import { LitElement, css, html, unsafeCSS } from 'lit';
import { realFormSelectCss } from './generated-form-select.css.js';

/**
 * Shared container + contract rules. The positional GEOMETRY for light-DOM
 * children is factored out into two variants below, because the first
 * measurement refuted the naive version: a normal declaration in a
 * `::slotted()` rule loses to any rule in the tree the child actually lives in
 * (the page's own `.form-control { border-radius }`), so only the properties
 * nobody else sets (margins, custom properties) were taking effect.
 */
const groupBaseStyles = css`
  :host {
    display: block;
  }
  /* Named input-group deliberately: the page also carries a Bootstrap-style
     rule keyed on .input-group > .form-control, so S1.7 proves a child
     combinator still cannot reach a slotted element even when the class
     name matches. */
  .input-group {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    width: 100%;
  }

  /* Every group item needs a stacking context for the focus lift below. */
  ::slotted(*) {
    position: relative;
  }

  /* width needs the same importance as the radii: Bootstrap's .form-control
     declares width:100%, which otherwise wins and forces the item onto its own
     flex line. flex and min-width are marked too — a consumer's own control
     styling can set either, and overriding standalone sizing is precisely this
     rule's job. */
  ::slotted(input),
  ::slotted(textarea),
  ::slotted(select) {
    flex: 1 1 auto !important;
    width: 1% !important;
    min-width: 0 !important;
  }

  /* ── Channel 2: shadow-DOM children (mp-*) — set the inherited contract ── */
  ::slotted(:not(:first-child)) {
    --mp-group-radius-start: 0;
  }
  ::slotted(:not(:last-child)) {
    --mp-group-radius-end: 0;
  }
  ::slotted(spike-select),
  ::slotted(spike-select-hostdecl) {
    flex: 1 1 auto;
    min-width: 0;
  }

  /* ── Focus lift: the focused control's ring must not be clipped by the
        -1px overlap of its next sibling. ──────────────────────────────────── */
  ::slotted(:focus),
  ::slotted(:focus-within) {
    z-index: 5;
  }

  /* ── Sizing: Bootstrap sets an explicit font-size on .form-select, so the
        group must hand a shadow child an explicit value. ─────────────────── */
  :host([size='sm']) ::slotted(*) {
    --mp-group-font-size: 0.875rem;
  }
  :host([size='sm']) ::slotted(input),
  :host([size='sm']) ::slotted(.addon) {
    font-size: 0.875rem;
  }
`;

/**
 * Candidate A (recommended if it holds): the corner pairing for light-DOM
 * children is marked `!important`. Per CSS Scoping, importance inverts the
 * tree-order rule — important declarations from the INNER tree beat normal
 * declarations from the outer tree — which is the only way a group can square
 * a child whose page stylesheet already gave it a radius.
 */
const lightGeometryImportant = css`
  /* PHYSICAL properties under :dir() guards, not logical ones. A logical
     property on a slotted child resolves against THAT CHILD's direction, and
     the UA stylesheet forces input[type=tel|url|email] to ltr even inside an
     rtl context — so border-start-start-radius squared the wrong corner of the
     tel input, and margin-inline-start put the overlap on the wrong side.
     Keying physical properties off the group's own direction is immune. The two
     blocks are mutually exclusive, so nothing has to be restored. */
  :host(:dir(ltr)) ::slotted(:not(:first-child)) {
    margin-left: -1px !important;
    border-top-left-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
  }
  :host(:dir(ltr)) ::slotted(:not(:last-child)) {
    border-top-right-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
  }
  :host(:dir(rtl)) ::slotted(:not(:first-child)) {
    margin-right: -1px !important;
    border-top-right-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
  }
  :host(:dir(rtl)) ::slotted(:not(:last-child)) {
    border-top-left-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
  }
`;

/** Candidate B (the naive version, kept to record the refutation). */
const lightGeometryPlain = css`
  ::slotted(:not(:first-child)) {
    margin-left: -1px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
  ::slotted(:not(:last-child)) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
`;

const groupTemplate = () => html`<div class="input-group" part="group"><slot></slot></div>`;

class SpikeGroup extends LitElement {
  static override styles = [groupBaseStyles, lightGeometryImportant];
  override render() {
    return groupTemplate();
  }
}
customElements.define('spike-group', SpikeGroup);

class SpikeGroupPlain extends LitElement {
  static override styles = [groupBaseStyles, lightGeometryPlain];
  override render() {
    return groupTemplate();
  }
}
customElements.define('spike-group-plain', SpikeGroupPlain);

/**
 * Candidate contract consumed by an `mp-*` form control: per-side logical
 * radii, each falling back to the Bootstrap default so a standalone control is
 * unchanged. Deliberately NOT declared on `:host` — see `spike-select-hostdecl`
 * for the negative control.
 */
const groupContractStyles = css`
  .form-select {
    border-start-start-radius: var(--mp-group-radius-start, var(--bs-border-radius));
    border-end-start-radius: var(--mp-group-radius-start, var(--bs-border-radius));
    border-start-end-radius: var(--mp-group-radius-end, var(--bs-border-radius));
    border-end-end-radius: var(--mp-group-radius-end, var(--bs-border-radius));
    /* Sizing probe: Bootstrap sets an explicit font-size, so a group cannot
       size a shadow child by inheritance alone. */
    font-size: var(--mp-group-font-size, 1rem);
  }
`;

const selectTemplate = () => html`
  <select class="form-select">
    <option>BE +32</option>
    <option>FR +33</option>
  </select>
`;

class SpikeSelect extends LitElement {
  static override styles = [unsafeCSS(realFormSelectCss), groupContractStyles];
  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  override render() {
    return selectTemplate();
  }
}
customElements.define('spike-select', SpikeSelect);

/** Negative control: declaring the contract prop on `:host` should defeat the
 *  inherited value from the group (documented shadow-migration trap). */
class SpikeSelectHostDecl extends LitElement {
  static override styles = [
    unsafeCSS(realFormSelectCss),
    groupContractStyles,
    css`
      :host {
        --mp-group-radius-start: var(--bs-border-radius);
        --mp-group-radius-end: var(--bs-border-radius);
      }
    `,
  ];
  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  override render() {
    return selectTemplate();
  }
}
customElements.define('spike-select-hostdecl', SpikeSelectHostDecl);

/** Outer host, so the group can be measured one shadow level deeper — the real
 *  arrangement (`mp-phone-input` → `mp-input-group` → `mp-select`). This is the
 *  case that rules out a document-injected stylesheet. */
class SpikePhone extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    /* The page's Bootstrap classes cannot reach in here, so a composite control
       must declare its own child styling — which also makes this stylesheet the
       OUTER tree for the group's slotted children, the same cascade contest the
       page loses in c1. */
    .form-control {
      display: block;
      width: 100%;
      padding: 0.375rem 0.75rem;
      font-size: 1rem;
      line-height: 1.5;
      border: var(--bs-border-width) solid var(--bs-border-color);
      border-radius: var(--bs-border-radius);
    }
    .addon {
      display: flex;
      align-items: center;
      padding: 0.375rem 0.75rem;
      white-space: nowrap;
      background-color: rgb(233, 236, 239);
      border: var(--bs-border-width) solid var(--bs-border-color);
      border-radius: var(--bs-border-radius);
    }
  `;
  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  override render() {
    return html`
      <spike-group id="inner">
        <spike-select></spike-select>
        <span class="addon">+32</span>
        <input type="tel" class="form-control" />
      </spike-group>
    `;
  }
}
customElements.define('spike-phone', SpikePhone);
