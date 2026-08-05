// Narrow-viewport phone-input spike — page-side driver.
//
// Everything measurable is exposed on `window.spike` so the Playwright specs stay
// declarative and every engine runs byte-identical DOM. The element under test is the
// REAL built `mp-phone-input` from the dist snapshot, not a mock: the questions being
// asked (does the group wrap, how wide is the select's closed face, where does
// `::picker(select)` land) all depend on the real three-shadow-tree composition.

import './vendor/wc/phone-input/index.mjs';
import { phoneCountryList } from './vendor/wc/phone-core/index.mjs';

const $ = (sel, root = document) => root.querySelector(sel);

/** The three shadow trees, resolved from the host. */
function trees(el) {
  const phone = el.shadowRoot;
  const group = phone.querySelector('mp-input-group');
  const select = phone.querySelector('mp-select');
  return {
    phoneHost: el,
    phoneRoot: phone,
    group,
    groupRoot: group?.shadowRoot ?? null,
    select,
    selectRoot: select?.shadowRoot ?? null,
    addon: phone.querySelector('span.addon'),
    input: phone.querySelector('input[type=tel]'),
    innerSelect: select?.shadowRoot?.querySelector('select') ?? null,
    faceButton: select?.shadowRoot?.querySelector('button') ?? null,
  };
}

const round = (n) => Math.round(n * 100) / 100;

function box(node) {
  if (!node) return null;
  const r = node.getBoundingClientRect();
  return { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height), right: round(r.right), bottom: round(r.bottom) };
}

function corners(node) {
  if (!node) return null;
  const cs = getComputedStyle(node);
  return {
    tl: cs.borderTopLeftRadius,
    tr: cs.borderTopRightRadius,
    br: cs.borderBottomRightRadius,
    bl: cs.borderBottomLeftRadius,
    ml: cs.marginLeft,
    mt: cs.marginTop,
    mr: cs.marginRight,
  };
}

/** Variant stylesheets, keyed by the shadow root they must be authored in. */
const VARIANTS = {
  // ── Candidate 1: never break the row.
  nowrap: [['group', `.input-group { flex-wrap: nowrap; }`]],

  // ── Candidate 2a: pin the picker's OUTER width from the composing element.
  //    (`mp-select`'s own `:host` rule outranks the group's ::slotted normal
  //    declaration, so a plain rule here is enough — see the measured cascade.)
  narrowHost: [['phone', `mp-select { flex: 0 0 auto !important; width: 5.5rem !important; }`]],

  // ── Candidate 2b: and make the native <select> INSIDE it obey that width.
  //    A bare native select's intrinsic width is its widest option; a width on the
  //    host does not shrink it, so this rule has to live inside mp-select's root.
  narrowInner: [['select', `select.form-select { width: 100% !important; min-width: 0 !important; box-sizing: border-box; }`]],

  // ── Candidate 3: cap the customizable-select picker and ellipsize its options.
  pickerCap: [
    [
      'select',
      `:host([rich]) select.form-select::picker(select) {
         box-sizing: border-box;
         max-width: min(100vw - 1rem, 20rem);
       }
       :host([rich]) option {
         max-width: 100%;
         overflow: hidden;
       }
       :host([rich]) option .rich-label {
         min-width: 0;
         overflow: hidden;
         text-overflow: ellipsis;
         white-space: nowrap;
       }`,
    ],
  ],

  // ── Candidate 4: container queries. Split into "establish" and "consume" so the
  //    containment side-effect can be measured on its own.
  cqEstablishPhone: [['phone', `:host { container-type: inline-size; }`]],
  cqEstablishGroup: [['group', `.input-group { container-type: inline-size; }`]],
  // Authored in the GROUP's root but querying an ancestor that lives in the PHONE's
  // root — the cross-shadow-boundary question.
  cqConsumeInGroup: [
    ['group', `@container (max-width: 22rem) { .input-group { flex-wrap: nowrap; } }`],
  ],
  cqConsumeInPhone: [
    ['phone', `@container (max-width: 22rem) { mp-select { width: 5.5rem !important; } }`],
  ],

  // ── The minimal candidate: cap the trigger ONLY in the engine that needs it.
  //    base-select sizes the face to the SELECTED content (~70px), so the 334px
  //    widest-option face — and therefore the wrap — exists only on the native path.
  //    Gated the same way select.styles.scss gates its rich rules, so it flips itself
  //    when Firefox ships customizable select.
  fallbackCap: [
    [
      'phone',
      `@supports not (appearance: base-select) {
         mp-select { width: 5.5rem !important; }
       }`,
    ],
  ],

  // Firefox's closed face is a native <select>: once width-capped it can only clip
  // the selected option's text, since no CSS reaches inside a UA-rendered face.
  faceEllipsis: [['select', `select.form-select { text-overflow: ellipsis; }`]],

  // ── Candidate 5, FIRST ATTEMPT (kept as evidence). Authored the obvious way and
  //    measurably WRONG: `::slotted(input)` is (0,0,2) and `::slotted(.addon)` is
  //    (0,1,1), while the group's own pairing rules are
  //    `:host(:dir(ltr)) ::slotted(:not(:first-child))` = (0,3,1) — also `!important`.
  //    Later source order cannot save a less specific selector, so every declaration
  //    that COMPETES with a base pairing rule silently lost.
  stackNaive: [
    [
      'group',
      `.input-group { flex-wrap: wrap; }
       ::slotted(.addon) {
         border-top-right-radius: var(--bs-border-radius) !important;
         border-bottom-right-radius: 0 !important;
       }
       ::slotted(input) {
         flex: 1 1 100% !important;
         width: 100% !important;
         margin-left: 0 !important;
         margin-top: -1px !important;
         border-top-left-radius: 0 !important;
         border-top-right-radius: 0 !important;
         border-bottom-left-radius: var(--bs-border-radius) !important;
         border-bottom-right-radius: var(--bs-border-radius) !important;
       }`,
    ],
  ],

  // ── Candidate 5, CORRECTED: same intent, selectors that out-specify (0,3,1).
  //    Row 1: picker + dial addon. Row 2: the number input, full width.
  stack: [
    [
      'group',
      `.input-group { flex-wrap: wrap; }

       /* Row 1 trailing item: round the outer corner the generic
          ::slotted(:not(:last-child)) rule squared, keep the inner one square.
          (0,2,0) + (0,0,1)+(0,1,0)+(0,1,0) = (0,4,1) > (0,3,1). */
       :host(:dir(ltr)) ::slotted(.addon:not(:last-child)) {
         border-top-right-radius: var(--bs-border-radius) !important;
         border-bottom-right-radius: 0 !important;
       }

       /* Row 2: own line, no stray horizontal overlap, vertical overlap instead.
          (0,2,0) + (0,0,1)+(0,0,1)+(0,1,0) = (0,3,2) > (0,3,1). */
       :host(:dir(ltr)) ::slotted(input:not(:first-child)) {
         flex: 1 1 100% !important;
         width: 100% !important;
         margin-left: 0 !important;
         margin-top: -1px !important;
         border-top-left-radius: 0 !important;
         border-top-right-radius: 0 !important;
         border-bottom-left-radius: var(--bs-border-radius) !important;
         border-bottom-right-radius: var(--bs-border-radius) !important;
       }

       /* The shadow-DOM channel has no per-corner granularity today: the group
          publishes only --mp-group-radius-start/-end and each box sheet maps them
          onto BOTH the top and bottom corner of that side. A stacked row needs
          "round the top, square the bottom", so the contract has to grow to four
          properties. Published here; consumed by the stackSelect variant. */
       ::slotted(mp-select) {
         --mp-group-radius-top-start: var(--bs-border-radius);
         --mp-group-radius-top-end: 0;
         --mp-group-radius-bottom-start: 0;
         --mp-group-radius-bottom-end: 0;
       }`,
    ],
  ],

  // The whole narrow recipe delivered the way it would actually ship: the group's own
  // host as the container, everything else gated on `@container`. `@container` adds no
  // specificity, so the selectors inside still have to out-specify (0,3,1).
  stackViaContainer: [
    [
      'phone',
      `:host { container-type: inline-size; }`,
    ],
    [
      'group',
      `@container (max-width: 22rem) {
         .input-group { flex-wrap: wrap; }

         :host(:dir(ltr)) ::slotted(.addon:not(:last-child)) {
           border-top-right-radius: var(--bs-border-radius) !important;
           border-bottom-right-radius: 0 !important;
         }

         :host(:dir(ltr)) ::slotted(input:not(:first-child)) {
           flex: 1 1 100% !important;
           width: 100% !important;
           margin-left: 0 !important;
           margin-top: -1px !important;
           border-top-left-radius: 0 !important;
           border-top-right-radius: 0 !important;
           border-bottom-left-radius: var(--bs-border-radius) !important;
           border-bottom-right-radius: var(--bs-border-radius) !important;
         }

         ::slotted(mp-select) {
           --mp-group-radius-top-start: var(--bs-border-radius);
           --mp-group-radius-top-end: 0;
           --mp-group-radius-bottom-start: 0;
           --mp-group-radius-bottom-end: 0;
         }
       }`,
    ],
  ],

  // `100vw` INCLUDES a classic vertical scrollbar, so a cap written against it is
  // narrower than the space actually available by ~15px on desktop. Both margins
  // measured with a scrollbar forced, to pick the one with real headroom.
  pickerCap1rem: [
    ['select', `:host([rich]) select.form-select::picker(select) { box-sizing: border-box; max-width: min(100vw - 1rem, 20rem); }`],
  ],
  pickerCap2rem: [
    ['select', `:host([rich]) select.form-select::picker(select) { box-sizing: border-box; max-width: min(100vw - 2rem, 20rem); }`],
  ],

  // The cap exactly as the lead proposed it, including the anchor-size() floor that
  // stops the picker from becoming narrower than the trigger it hangs off.
  pickerCapProposed: [
    [
      'select',
      `:host([rich]) select.form-select::picker(select) {
         box-sizing: border-box;
         max-width: min(100vw - 2rem, 22rem);
         min-width: anchor-size(self-inline);
       }
       :host([rich]) option { max-width: 100%; overflow: hidden; }
       :host([rich]) option .rich-label {
         min-width: 0;
         overflow: hidden;
         text-overflow: ellipsis;
         white-space: nowrap;
       }`,
    ],
  ],

  // Same cap, but let a long country name WRAP inside the option instead of
  // ellipsizing. `select.styles.scss` sets `white-space: nowrap` on the closed face
  // only, so the option's normal value is what has to be re-asserted here.
  pickerCapWrap: [
    [
      'select',
      `:host([rich]) select.form-select::picker(select) {
         box-sizing: border-box;
         max-width: min(100vw - 2rem, 22rem);
         min-width: anchor-size(self-inline);
       }
       :host([rich]) option { max-width: 100%; align-items: start; }
       :host([rich]) option .rich-label {
         min-width: 0;
         white-space: normal;
         overflow-wrap: anywhere;
       }`,
    ],
  ],

  // In a deliberate two-row layout the number input owns its own row, so row 1 has
  // room for a trigger far wider than the 5.5rem a single row can spare — which is
  // what makes the native closed face readable again.
  //    `flex-basis: auto` is WRONG here and measurably so: the native fallback face's
  //    hypothetical size is still its 334px widest-option width, so flex line-breaking
  //    gives it a whole line of its own and the dial addon is pushed to a THIRD row.
  //    `flex-basis: 0` takes the intrinsic width out of the line-breaking decision, so
  //    the addon stays on row 1 and the trigger then grows into whatever is left.
  stackWideTrigger: [
    [
      'phone',
      `@container (max-width: 22rem) {
         mp-select {
           flex: 1 1 auto !important;
           width: auto !important;
           max-width: 100% !important;
           min-width: 0 !important;
         }
       }`,
    ],
  ],
  stackWideTriggerZeroBasis: [
    [
      'phone',
      `@container (max-width: 22rem) {
         mp-select {
           flex: 1 1 0 !important;
           width: auto !important;
           min-width: 0 !important;
         }
       }`,
    ],
  ],

  // RTL mirror of the stacked block. Physical properties under a :dir() guard keyed
  // off the GROUP's direction, never logical ones on the child: the UA forces
  // `input[type=tel]` to ltr even inside dir=rtl, so a logical property on it resolves
  // against the wrong direction (the trap already documented for the base rules).
  stackRtl: [
    [
      'group',
      `.input-group { flex-wrap: wrap; }

       :host(:dir(rtl)) ::slotted(.addon:not(:last-child)) {
         border-top-left-radius: var(--bs-border-radius) !important;
         border-bottom-left-radius: 0 !important;
       }

       :host(:dir(rtl)) ::slotted(input:not(:first-child)) {
         flex: 1 1 100% !important;
         width: 100% !important;
         margin-right: 0 !important;
         margin-top: -1px !important;
         border-top-right-radius: 0 !important;
         border-top-left-radius: 0 !important;
         border-bottom-right-radius: var(--bs-border-radius) !important;
         border-bottom-left-radius: var(--bs-border-radius) !important;
       }

       ::slotted(mp-select) {
         --mp-group-radius-top-start: var(--bs-border-radius);
         --mp-group-radius-top-end: 0;
         --mp-group-radius-bottom-start: 0;
         --mp-group-radius-bottom-end: 0;
       }`,
    ],
  ],

  // What `_styles/form-select.styles.scss` would have to say for the four-property
  // contract above to reach the box inside mp-select's shadow root.
  stackSelect: [
    [
      'select',
      `.form-select {
         border-start-start-radius: var(--mp-group-radius-top-start, var(--mp-group-radius-start, var(--mp-box-radius)));
         border-start-end-radius: var(--mp-group-radius-top-end, var(--mp-group-radius-end, var(--mp-box-radius)));
         border-end-start-radius: var(--mp-group-radius-bottom-start, var(--mp-group-radius-start, var(--mp-box-radius)));
         border-end-end-radius: var(--mp-group-radius-bottom-end, var(--mp-group-radius-end, var(--mp-box-radius)));
       }`,
    ],
  ],
};

const applied = { phone: [], group: [], select: [] };

function sheetFor(css) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  return sheet;
}

const spike = {
  /** Country labels exactly as `mp-phone-input` builds them for `mp-select`. */
  labels(locale = 'en-US') {
    return phoneCountryList({ locale }).map((c) => `${c.name} +${c.dialCode} (${c.iso2.toUpperCase()})`);
  },

  /** Force a classic vertical scrollbar, so `100vw` and the client width diverge. */
  forceScrollbar() {
    document.documentElement.style.scrollbarWidth = 'auto';
    let filler = $('#filler');
    if (!filler) {
      filler = document.createElement('div');
      filler.id = 'filler';
      filler.style.height = '4000px';
      document.body.appendChild(filler);
    }
    return {
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollbar: window.innerWidth - document.documentElement.clientWidth,
    };
  },

  async mount({ hostWidth = null, dir = 'ltr', allowed = null } = {}) {
    const holder = $('#host');
    holder.innerHTML = '';
    holder.style.width = hostWidth ?? '';
    holder.dir = dir;
    const el = document.createElement('mp-phone-input');
    el.setAttribute('default-country', 'be');
    el.setAttribute('input-label', 'Phone number');
    if (allowed) el.setAttribute('allowed-countries', allowed);
    holder.appendChild(el);
    await this.settle(el);
    return true;
  },

  /** Wait for all three trees plus the lazily loaded flag set. */
  async settle(el = $('#host mp-phone-input')) {
    await el.updateComplete;
    const t = trees(el);
    await t.group?.updateComplete;
    await t.select?.updateComplete;
    // `warmFlags` fires on focusin/pointerdown; the closed face's flag also arrives
    // via loadFlag. Give the dynamic chunks a couple of frames either way.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await el.updateComplete;
    await t.select?.updateComplete;
    return true;
  },

  async variant(names) {
    const el = $('#host mp-phone-input');
    const t = trees(el);
    const roots = { phone: t.phoneRoot, group: t.groupRoot, select: t.selectRoot };
    for (const key of names) {
      const spec = VARIANTS[key];
      if (!spec) throw new Error(`unknown variant ${key}`);
      for (const [rootKey, css] of spec) {
        const root = roots[rootKey];
        const sheet = sheetFor(css);
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
        applied[rootKey].push(sheet);
      }
    }
    await this.settle(el);
    return true;
  },

  async clearVariants() {
    const el = $('#host mp-phone-input');
    const t = trees(el);
    const roots = { phone: t.phoneRoot, group: t.groupRoot, select: t.selectRoot };
    for (const key of Object.keys(applied)) {
      const drop = new Set(applied[key]);
      roots[key].adoptedStyleSheets = roots[key].adoptedStyleSheets.filter((s) => !drop.has(s));
      applied[key] = [];
    }
    await this.settle(el);
    return true;
  },

  /** Everything item 1 and 2 need, in one snapshot. */
  measure() {
    const el = $('#host mp-phone-input');
    const t = trees(el);
    const gb = box(t.groupRoot.querySelector('.input-group'));
    const items = {
      select: box(t.select),
      addon: box(t.addon),
      input: box(t.input),
    };
    // A wrapped group is exactly "more than one distinct item top".
    const tops = [...new Set(Object.values(items).map((b) => b && b.y))].filter((v) => v != null);
    const sorted = tops.slice().sort((a, b) => a - b);
    // The "hideous" part, quantified: an item that LEADS a row but still carries the
    // single-row `-1px` overlap and squared leading corners.
    const nodes = { select: t.select, addon: t.addon, input: t.input };
    const strays = Object.entries(items)
      .filter(([, b]) => b)
      .map(([name, b]) => {
        const sameRow = Object.values(items).filter((o) => o && o.y === b.y);
        const leads = Math.min(...sameRow.map((o) => o.x)) === b.x;
        const trails = Math.max(...sameRow.map((o) => o.right)) === b.right;
        const c = corners(nodes[name]);
        return {
          item: name,
          row: sorted.indexOf(b.y),
          leadsRow: leads,
          trailsRow: trails,
          strayOverlap: leads && (c.ml === '-1px' || c.mr === '-1px'),
          squaredLeadingCorners: leads && c.tl === '0px' && c.bl === '0px',
          squaredTrailingCorners: trails && c.tr === '0px' && c.br === '0px',
        };
      });
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      host: box(el),
      group: gb,
      items,
      innerSelect: box(t.innerSelect),
      faceButton: box(t.faceButton),
      rows: tops.length,
      rowTops: sorted,
      strays,
      overflowsHost: items.select && items.select.right > box(el).right + 0.5,
      // A group that overflows the host usually drags the whole page with it.
      pageOverflowX: round(document.documentElement.scrollWidth - document.documentElement.clientWidth),
      corners: { select: corners(t.select), addon: corners(t.addon), input: corners(t.input) },
      innerSelectCorners: corners(t.innerSelect),
      // Does the closed face's own text clip once the control is width-capped?
      innerSelectClipped: t.innerSelect
        ? t.innerSelect.scrollWidth > t.innerSelect.clientWidth + 0.5
        : null,
      innerSelectTextOverflow: t.innerSelect ? getComputedStyle(t.innerSelect).textOverflow : null,
      rich: t.select.hasAttribute('rich'),
      groupWrap: getComputedStyle(t.groupRoot.querySelector('.input-group')).flexWrap,
    };
  },

  /** Item 3(a): a bare native <select>, sized by the UA to its widest option. */
  nativeProbe(mode = 'full') {
    const holder = $('#probe');
    holder.innerHTML = '';
    const sel = document.createElement('select');
    sel.className = 'form-select';
    // Bootstrap's `.form-select { width: 100% }` would otherwise report the holder's
    // width; `auto` is what makes the UA's widest-option sizing observable.
    sel.style.width = 'auto';
    const list = phoneCountryList({ locale: 'en-US' });
    const label = (c) =>
      ({
        full: `${c.name} +${c.dialCode} (${c.iso2.toUpperCase()})`,
        nameOnly: c.name,
        isoDial: `${c.iso2.toUpperCase()} +${c.dialCode}`,
        iso: c.iso2.toUpperCase(),
      })[mode];
    for (const c of list) {
      const o = document.createElement('option');
      o.value = c.iso2;
      o.textContent = label(c);
      sel.appendChild(o);
    }
    holder.appendChild(sel);
    const longest = list.map(label).reduce((a, b) => (b.length > a.length ? b : a), '');
    return { count: list.length, longest, longestLen: longest.length, box: box(sel), holder: box(holder) };
  },

  /**
   * Item 4. `::picker(select)` is a pseudo-element with no JS handle, but in
   * base-select mode its `<option>`s are REAL laid-out DOM, so the picker's box is
   * the union of their rects. In native mode the options report 0×0 and the popup is
   * an out-of-page UA widget — unmeasurable by design, and reported as such.
   */
  pickerBox() {
    const el = $('#host mp-phone-input');
    const t = trees(el);
    const opts = [...t.innerSelect.querySelectorAll('option')];
    const rects = opts.map((o) => o.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) {
      return { measurable: false, optionCount: opts.length, laidOut: 0, open: t.innerSelect.matches(':open') };
    }
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const widest = rects.reduce((a, b) => (b.width > a.width ? b : a));
    // The clipping question is about the LONGEST country name, not whichever option
    // happens to be first — measuring the first one reports "not clipped" no matter
    // what the cap does.
    const labels = opts
      .map((o) => o.querySelector('.rich-label'))
      .filter((n) => n && n.getBoundingClientRect().width > 0);
    const rich = labels.reduce(
      (a, b) => ((b.textContent ?? '').length > (a?.textContent ?? '').length ? b : a),
      labels[0] ?? null,
    );
    const richCs = rich ? getComputedStyle(rich) : null;
    return {
      measurable: true,
      optionCount: opts.length,
      laidOut: rects.length,
      union: { x: round(left), y: round(top), w: round(right - left), h: round(bottom - top), right: round(right) },
      widestOption: round(widest.width),
      viewportW: window.innerWidth,
      overflowsRight: right > window.innerWidth + 0.5,
      overflowsLeft: left < -0.5,
      // Does the ellipsis actually take effect inside an <option>?
      longestLabel: rich?.textContent ?? null,
      richLabelClipped: rich ? rich.scrollWidth > rich.clientWidth + 0.5 : null,
      richLabelOverflow: richCs?.textOverflow ?? null,
      richLabelBox: rich ? box(rich) : null,
    };
  },

  /**
   * Where to click to open the picker, in viewport coordinates. A real mouse click
   * at these coordinates is the only opener that works in all three engines:
   * `showPicker()` throws TypeError in WebKit 26.4, and no synthetic click reaches
   * a UA-owned native popup.
   */
  faceBox() {
    const t = trees($('#host mp-phone-input'));
    // NOT the authored `<button>`: in base-select mode both supporting engines report
    // it as 0x0 (the UA hoists it into the shadow face), so its centre is the page
    // origin. The `<select>`'s own box is the closed face in every mode.
    return box(t.innerSelect);
  },

  /**
   * Force the lazy flag set in before any measurement. Without this the FIRST picker
   * open measures a flagless option list and a later one measures a 20px-wider one —
   * which reads exactly like a layout regression caused by whatever variant was
   * applied in between (it bit the containment comparison until controlled for).
   */
  async warm() {
    const el = $('#host mp-phone-input');
    const t = trees(el);
    t.select.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    const target = t.innerSelect.querySelectorAll('option').length;
    for (let i = 0; i < 100; i++) {
      await new Promise((r) => setTimeout(r, 50));
      await el.updateComplete;
      await t.select.updateComplete;
      const withFlag = [...t.innerSelect.querySelectorAll('option')].filter((o) => o.querySelector('svg')).length;
      if (withFlag >= target) return { warmed: withFlag, of: target };
    }
    return { warmed: [...t.innerSelect.querySelectorAll('option')].filter((o) => o.querySelector('svg')).length, of: target };
  },

  isOpen() {
    const t = trees($('#host mp-phone-input'));
    try {
      return t.innerSelect.matches(':open');
    } catch {
      return null;
    }
  },

  /** Item 5's trap: does the containment break `::picker()` positioning? */
  containment() {
    const el = $('#host mp-phone-input');
    const t = trees(el);
    return {
      phoneContain: getComputedStyle(el).contain,
      phoneContainerType: getComputedStyle(el).containerType,
      groupContainerType: getComputedStyle(t.groupRoot.querySelector('.input-group')).containerType,
    };
  },

  supportsBaseSelect() {
    return CSS.supports('appearance', 'base-select');
  },

  supports() {
    return {
      baseSelect: CSS.supports('appearance', 'base-select'),
      anchorSizeMinWidth: CSS.supports('min-width', 'anchor-size(self-inline)'),
      anchorSizeWidth: CSS.supports('width', 'anchor-size(self-inline)'),
      containerType: CSS.supports('container-type', 'inline-size'),
      overflowWrapAnywhere: CSS.supports('overflow-wrap', 'anywhere'),
    };
  },

  /** Row geometry inside the open picker — the question wrapping actually changes. */
  optionRows() {
    const t = trees($('#host mp-phone-input'));
    const opts = [...t.innerSelect.querySelectorAll('option')];
    const rects = opts.map((o) => ({ o, r: o.getBoundingClientRect() })).filter((x) => x.r.height > 0);
    if (!rects.length) return { measurable: false };
    const heights = [...new Set(rects.map((x) => round(x.r.height)))].sort((a, b) => a - b);
    const tallest = rects.reduce((a, b) => (b.r.height > a.r.height ? b : a));
    const label = tallest.o.querySelector('.rich-label');
    return {
      measurable: true,
      distinctOptionHeights: heights,
      tallestOption: round(tallest.r.height),
      tallestLabel: tallest.o.textContent?.trim() ?? null,
      // Two lines inside one option is exactly what wrapping is supposed to produce.
      tallestLabelLines: label ? Math.round(label.getBoundingClientRect().height / parseFloat(getComputedStyle(label).lineHeight || '0')) : null,
      labelClipped: label ? label.scrollWidth > label.clientWidth + 0.5 : null,
      labelWhiteSpace: label ? getComputedStyle(label).whiteSpace : null,
    };
  },
};

window.spike = spike;
window.__spikeReady = true;
