// Faithful-enough stand-ins for mp-phone-input -> mp-input-group -> mp-select.
// Plain custom elements + adoptedStyleSheets (the mechanism Lit uses), so the
// shadow-root nesting and the constructable-stylesheet delivery of
// `_styles/form-select.styles.scss` are the real thing.

const formSelectCss = await (await fetch('./form-select.css')).text();
const formSelectSheet = new CSSStyleSheet();
formSelectSheet.replaceSync(formSelectCss);

// ---------------------------------------------------------------- country data

/** ~244 real region codes with localized names, mirroring the PRD's dataset size. */
export function countries(locale = 'nl') {
  const dn = new Intl.DisplayNames([locale], { type: 'region' });
  const out = [];
  for (let a = 65; a <= 90 && out.length < 400; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      let name;
      try { name = dn.of(code); } catch { continue; }
      if (!name || name === code) continue;
      out.push({ iso: code, name, dial: `+${(out.length % 998) + 1}` });
    }
  }
  return out.slice(0, 244);
}

// ---------------------------------------------------------------- flag SVGs
// Synthetic but byte-faithful to `country-flag-icons` 3x2: no ids, no url(#..),
// no <style>. Sizes are spread over the real set's range (183 B .. ~2 KB).

const PALETTE = ['#000', '#FFD90C', '#F31830', '#0052B4', '#FFF', '#009246', '#CE1126', '#FCD116'];

export function flagSvg(i) {
  const paths = 3 + (i % 14) * 2; // 3..29 paths -> ~190 B .. ~2.1 KB
  let body = '';
  for (let p = 0; p < paths; p++) {
    const c = PALETTE[(i + p) % PALETTE.length];
    const x = ((p * 7) % 30) / 10;
    const y = ((p * 11) % 20) / 10;
    body += `<path fill="${c}" d="M${x} ${y}h${(p % 3) + 1}v${(p % 2) + 1}H${x}z"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" width="3" height="2" aria-hidden="true">${body}</svg>`;
}

export function flagBytes(n) {
  let total = 0;
  for (let i = 0; i < n; i++) total += flagSvg(i).length;
  return total;
}

// ---------------------------------------------------------------- CSS recipes

export const RECIPES = {
  // R0 — no customizable select at all (today's mp-select).
  none: '',
  // R1 — the documented Chrome snippet, verbatim. TYPE selector, so Bootstrap's
  // `.form-select { appearance: none }` (a CLASS selector) outranks it: dead on arrival.
  pair: `select, ::picker(select) { appearance: base-select; }`,
  // R2 — same specificity as Bootstrap's rule, but only on the select.
  selectOnly: `select.form-select { appearance: base-select; }`,
  // R3 — select + picker at Bootstrap's specificity. The minimal WORKING recipe.
  pairSpecific: `select.form-select, ::picker(select) { appearance: base-select; }`,
  // R4 — R3 plus the Bootstrap reconciliation, applied UNCONDITIONALLY. Breaks the
  // fallback engines: `background-image: none` strips the caret from a select that
  // is still native. Kept in the matrix as the negative control.
  pairFixed: `
    select.form-select, ::picker(select) { appearance: base-select; }
    select.form-select {
      background-image: none;      /* Bootstrap's caret would double the UA ::picker-icon */
      padding-right: 0.75rem;      /* the 2.25rem gutter existed only for that caret */
      display: flex;
      align-items: center;
      gap: .5rem;
      text-align: start;
      /* Without this the closed face is a real flex box, so a long localized
         country name WRAPS and the control grows from 38px to 62px — a native
         <select> never wraps. Measured in S2.4. */
      white-space: nowrap;
      overflow: hidden;
    }
    selectedcontent { display: flex; align-items: center; gap: .5rem; min-width: 0; }
    selectedcontent .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    select.form-select::picker-icon { margin-inline-start: auto; color: #343a40; }
    select.form-select:open::picker-icon { rotate: 180deg; }
    ::picker(select) {
      border: 1px solid #dee2e6; border-radius: .375rem; background: #fff;
      padding: .25rem 0; max-height: 20rem; overflow-y: auto;
    }
    option { display: flex; align-items: center; gap: .5rem; padding: .25rem .75rem; }
    option:checked { background: #e9ecef; }
    option svg { width: 1.25rem; height: .833rem; flex: 0 0 auto; }
    option .dial { margin-inline-start: auto; color: #6c757d; }
    selectedcontent svg { width: 1.25rem; height: .833rem; flex: 0 0 auto; }
  `,
};

// R5 — the RECOMMENDED recipe: identical to R4 but every reconciliation rule is
// gated behind @supports, so a fallback engine keeps stock Bootstrap `.form-select`.
RECIPES.pairGated = `
  @supports (appearance: base-select) {
${RECIPES.pairFixed.split('\n').map((l) => '  ' + l).join('\n')}
  }
`;

/** Feature-detected variant: rich markup + base-select where supported, text elsewhere. */
export const supportsBaseSelect = () => CSS.supports('appearance', 'base-select');

/**
 * One `<option>`. `labelOrder` matters for native typeahead, which matches a prefix
 * of the option's *text*: putting the ISO code first ("BE +32 België") means typing
 * the country name never matches.
 */
function optionHtml(c, i, cfg) {
  if (cfg.rich) {
    return `<option value="${c.iso}">${flagSvg(i)}<span class="name">${c.name}</span><span class="dial">${c.dial}</span></option>`;
  }
  const text = cfg.labelOrder === 'name-first'
    ? `${c.name} ${c.dial} (${c.iso})`
    : `${c.iso} ${c.dial} ${c.name}`;
  return `<option value="${c.iso}">${text}</option>`;
}

// ---------------------------------------------------------------- the elements

class XSelect extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open', delegatesFocus: true });
    this.shadowRoot.adoptedStyleSheets = [formSelectSheet, new CSSStyleSheet()];
  }

  /** @param {{items:Array, rich:boolean, recipe:string, authorButton:boolean, overlay:string|null}} cfg */
  configure(cfg) {
    this._cfg = cfg;
    this.shadowRoot.adoptedStyleSheets[1].replaceSync(
      (RECIPES[cfg.recipe] ?? '') + (cfg.extraCss ?? ''),
    );
    const sc = cfg.authorButton
      ? '<button><selectedcontent></selectedcontent></button>'
      : '';
    const opts = cfg.items.map((c, i) => optionHtml(c, i, cfg)).join('');
    this.shadowRoot.innerHTML =
      `<select class="form-select" aria-label="Land">${sc}${opts}</select>`;
    this._select = this.shadowRoot.querySelector('select');
    this._select.addEventListener('change', () => {
      this.dispatchEvent(new CustomEvent('value-change', {
        detail: { value: this._select.value }, bubbles: true, composed: true,
      }));
      window.__changes = (window.__changes ?? 0) + 1;
      window.__lastValue = this._select.value;
    });
  }

  get select() { return this._select; }
  get value() { return this._select.value; }
}
customElements.define('x-select', XSelect);

class XGroup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>
      :host { display: inline-block; }
      /* The row itself must be the flex container — with a block .input-group the
         slotted select and tel input stack instead of pairing, which made the S2.9
         row geometry meaningless until it was fixed. */
      .input-group { display: flex; align-items: stretch; width: 100%; }
      ::slotted(*) { flex: 1 1 auto; }
    </style><div class="input-group"><slot></slot></div>`;
  }
}
customElements.define('x-group', XGroup);

/** mp-phone-input stand-in: owns a group in its shadow, slots the select into it. */
class XPhone extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>
      :host { display: inline-flex; position: relative; }
      .flag-overlay {
        position: absolute; inset-inline-start: 1px; inset-block: 1px;
        display: flex; align-items: center; gap: .25rem;
        padding-inline: .75rem; pointer-events: none;
        font: 400 1rem/1.5 system-ui; color: #212529;
      }
      .flag-overlay svg { width: 1.25rem; height: .833rem; flex: 0 0 auto; }
      .flag-overlay.cover { background: #fff; border-radius: .375rem 0 0 .375rem; }
      @supports (appearance: base-select) { .flag-overlay.enhanced-off { display: none; } }
      /* Physical variant, guarded per S1's conclusion about the group's radii. */
      .flag-overlay.physical { inset-inline-start: auto; left: 1px; right: auto; }
      :host(:dir(rtl)) .flag-overlay.physical { left: auto; right: 1px; }
      input[type="tel"] {
        flex: 1 1 auto; min-width: 0; font: 400 1rem/1.5 system-ui;
        padding: .375rem .75rem; border: 1px solid #dee2e6; border-radius: .375rem;
      }
    </style><x-group><x-select></x-select></x-group>`;
    this._select = this.shadowRoot.querySelector('x-select');
    this._group = this.shadowRoot.querySelector('x-group');
  }
  get xselect() { return this._select; }
  get tel() { return this._tel ?? null; }

  /** The sibling the group joins the select to — and the element the UA forces to ltr. */
  addTelInput() {
    const input = document.createElement('input');
    input.type = 'tel';
    input.setAttribute('aria-label', 'Telefoonnummer');
    input.value = '470 12 34 56';
    this._group.appendChild(input);
    this._tel = input;
    return input;
  }

  addOverlay(mode, index) {
    const span = document.createElement('span');
    span.className = `flag-overlay ${mode}`;
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = `${flagSvg(index)}<span class="iso">${this._items[index].iso}</span>`;
    this.shadowRoot.appendChild(span);
    return span;
  }
  set items(v) { this._items = v; }
}
customElements.define('x-phone', XPhone);

// ---------------------------------------------------------------- case builder

/**
 * @param {{
 *  depth?: 0|1|2, rich?: boolean, recipe?: keyof typeof RECIPES, count?: number,
 *  authorButton?: boolean, overlay?: 'plain'|'cover'|'enhanced-off'|null,
 *  overlayIndex?: number, extraCss?: string, autoRich?: boolean, locale?: string,
 *  labelOrder?: 'iso-first'|'name-first', tel?: boolean, dir?: 'ltr'|'rtl'|null
 * }} o
 */
export function buildCase(o = {}) {
  const {
    depth = 2, recipe = 'pairFixed', count = 244, authorButton = true,
    overlay = null, overlayIndex = 0, extraCss = '', autoRich = false, locale = 'nl',
    labelOrder = 'iso-first', tel = false, dir = null,
  } = o;
  const rich = autoRich ? supportsBaseSelect() : (o.rich ?? true);
  const items = countries(locale).slice(0, count);
  const host = document.getElementById('host');
  host.innerHTML = '';
  // `dir` on an ANCESTOR of the host element, not on the component: the direction
  // has to cross both shadow boundaries the way it will in a real page.
  if (dir) host.setAttribute('dir', dir);
  else host.removeAttribute('dir');

  let xsel;
  if (depth === 0) {
    // Light DOM: no shadow root anywhere.
    const style = document.createElement('style');
    style.textContent = formSelectCss.replace(/:host/g, ':root') + (RECIPES[recipe] ?? '') + extraCss;
    host.appendChild(style);
    const wrap = document.createElement('div');
    const sc = authorButton ? '<button><selectedcontent></selectedcontent></button>' : '';
    wrap.innerHTML = `<select class="form-select" aria-label="Land">${sc}${items
      .map((c, i) => optionHtml(c, i, { rich, labelOrder }))
      .join('')}</select>`;
    host.appendChild(wrap);
    window.__case = { select: wrap.querySelector('select'), root: wrap, items, rich };
    return window.__case;
  }

  if (depth === 1) {
    xsel = document.createElement('x-select');
    host.appendChild(xsel);
    xsel.configure({ items, rich, recipe, authorButton, extraCss, labelOrder });
    window.__case = { xsel, select: xsel.select, root: xsel, items, rich };
    return window.__case;
  }

  const phone = document.createElement('x-phone');
  phone.items = items;
  host.appendChild(phone);
  xsel = phone.xselect;
  xsel.configure({ items, rich, recipe, authorButton, extraCss, labelOrder });
  const telInput = tel ? phone.addTelInput() : null;
  const ov = overlay ? phone.addOverlay(overlay, overlayIndex) : null;
  window.__case = {
    phone, xsel, select: xsel.select, overlay: ov, tel: telInput, root: phone, items, rich,
  };
  return window.__case;
}

window.buildCase = buildCase;
window.harness = { countries, flagSvg, flagBytes, RECIPES, supportsBaseSelect };

// ---------------------------------------------------------------- measurement

/** Cost of constructing the option DOM (with or without inline flag SVGs). */
window.measureBuild = (opts) => {
  const t0 = performance.now();
  buildCase(opts);
  const t1 = performance.now();
  document.getElementById('host').getBoundingClientRect(); // force layout+style
  const t2 = performance.now();
  return { build: +(t1 - t0).toFixed(2), layout: +(t2 - t1).toFixed(2), total: +(t2 - t0).toFixed(2) };
};

/**
 * Frame timeline around opening the picker. Armed before the gesture (WebKit has no
 * `HTMLSelectElement.showPicker`, so the picker can only be opened by a real click);
 * a `pointerdown` marker on the select splits the timeline into before/after, and the
 * largest inter-frame gap after that marker is the frame that laid out + painted the
 * 244-option popover.
 */
window.armFrames = () => {
  window.__frames = null;
  const frames = [];
  const t0 = performance.now();
  let tDown = null;
  window.__case.select.addEventListener('pointerdown', () => { tDown = performance.now() - t0; }, { once: true });
  const tick = (t) => {
    frames.push(+(t - t0).toFixed(2));
    if (frames.length < 45) return requestAnimationFrame(tick);
    const after = tDown == null ? frames : frames.filter((f) => f >= tDown);
    const gaps = after.slice(1).map((v, i) => +(v - after[i]).toFixed(2));
    window.__frames = {
      tDown: tDown == null ? null : +tDown.toFixed(2),
      framesAfterDown: after.length,
      firstFrameAfterDown: after[0] == null || tDown == null ? null : +(after[0] - tDown).toFixed(2),
      maxGapAfterDown: gaps.length ? Math.max(...gaps) : null,
      gapsAfterDown: gaps.slice(0, 10),
    };
  };
  requestAnimationFrame(tick);
};

document.getElementById('go').addEventListener('click', () => {
  try {
    window.__case.select.showPicker();
    window.__showPicker = 'ok';
  } catch (e) {
    window.__showPicker = `${e.name}: ${e.message}`;
  }
});

window.__harnessReady = true;
