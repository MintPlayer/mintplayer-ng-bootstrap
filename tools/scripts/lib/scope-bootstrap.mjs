/**
 * Attribute scoping for the compiled Bootstrap parts of @mintplayer/ui-core
 * (#452, docs/prd/per-component-styles-452.md §3.2).
 *
 * A part must match only DOM a @mintplayer component rendered (every front
 * stamps `data-mps` on its own elements), never a consumer's own `.card` or
 * `.table`. The rewrite:
 *
 * 1. scopes by attribute PRESENCE (`[data-mps]`), not by value: partials cross
 *    components (the navbar renders `.dropdown-menu`, the datatable renders
 *    pagination), so "rendered by a @mintplayer component" is the boundary;
 * 2. wraps it in `:where()`, so every selector keeps stock specificity: source
 *    order (the sublayers), the verbatim `…Page` variant and a consumer's
 *    unlayered CSS all behave exactly as with stock Bootstrap;
 * 3. puts it on the LEFTMOST compound carrying a class the partial owns
 *    (`OWNED_CLASSES`), right after that class: `.card > .list-group` →
 *    `.card:where([data-mps]) > .list-group` (the list group is another
 *    component's), `.was-validated .form-control:invalid` →
 *    `.was-validated .form-control:where([data-mps]):invalid` (the form is the
 *    consumer's; state classes are owned by nobody).
 *
 * 4. picks the guard by the owned class's ROLE (`PART_CLASSES`, #458): a ROOT
 *    class (the component's outer element and its modifiers) gets
 *    `:where([data-mps])`; a SUB class (documented content of a root:
 *    `.form-label`, `.modal-title`, `tr.table-active`) gets
 *    `:where([data-mps], <anchors>[data-mps] *)`, so it is styled when stamped
 *    itself OR anywhere inside a stamped root of its own partial. That reaches
 *    content the consumer projects into the component, and nothing else: the
 *    anchors are the partial's own root classes, never "any stamped element"
 *    (bs-shell's stamped `.content` wraps the whole app).
 *
 * A selector with no class at all (`:root`, `[data-bs-theme=dark]` token
 * blocks) ships verbatim: it styles no component element. A selector with
 * classes but none owned is a hard error, and so is an owned class that is
 * neither ROOT nor SUB, so a Bootstrap upgrade that adds a class fails the
 * codegen instead of shipping an unscoped or unclassified rule.
 */

import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

/** The attribute every @mintplayer front stamps on the elements it renders. */
export const SCOPE_ATTRIBUTE = 'data-mps';

/** The guard inserted into the owned compound. */
export const SCOPE_GUARD = `:where([${SCOPE_ATTRIBUTE}])`;

/**
 * Which classes each partial OWNS: the element classes its markup is built
 * from. Modifiers and states that only make sense on such an element
 * (`.active`, `.show`, `.is-invalid`, `.btn-*` sizes) are not listed — they
 * are never the leftmost owned compound. Reviewed against Bootstrap 5.3.
 */
export const OWNED_CLASSES = {
  accordion: /^accordion(-|$)/,
  alert: /^alert(-|$)/,
  badge: /^badge$/,
  breadcrumb: /^breadcrumb(-|$)/,
  'button-group': /^(btn-group(-|$)|btn-toolbar$|dropdown-toggle-split$)/,
  card: /^card(-|$)/,
  carousel: /^carousel(-|$)/,
  close: /^btn-close(-|$)/,
  containers: /^container(-|$)/,
  dropdown: /^(dropdown(-|$)|dropup(-|$)|dropend$|dropstart$)/,
  forms: /^(form-|col-form-label|input-group(-|$)|btn-check$|(in)?valid-(feedback|tooltip)$)/,
  grid: /^(row(-|$)|col(-|$)|g[xy]?-|offset-)/,
  'list-group': /^list-group(-|$)/,
  modal: /^modal(-|$)/,
  nav: /^(nav(-|$)|tab-content$|tab-pane$)/,
  navbar: /^navbar(-|$)/,
  offcanvas: /^offcanvas(-|$)/,
  pagination: /^(pagination(-|$)|page-)/,
  placeholders: /^placeholder(-|$)/,
  popover: /^(popover(-|$)|bs-popover-)/,
  progress: /^progress(-|$)/,
  spinners: /^spinner-/,
  tables: /^(table(-|$)|caption-top$)/,
  toasts: /^toast(-|$)/,
  tooltip: /^(tooltip(-|$)|bs-tooltip-)/,
  transitions: /^(fade|collapse|collapsing|collapse-horizontal)$/,
};

const VARIANTS = 'primary|secondary|success|info|warning|danger|light|dark';
const BREAKPOINTS = 'sm|md|lg|xl|xxl';

/**
 * Each owned class's role (#458, docs/prd/bootstrap-sub-elements-458.md §4.1).
 * `root`: the component's outer element and its modifiers. `sub`: the
 * documented content of a root, which a consumer may write and project in.
 * `anchors`: the root classes (or element) a sub class may sit inside.
 * Every class a partial's selectors target must match `root` or `sub`.
 */
export const PART_CLASSES = {
  accordion: { root: /^accordion(-flush)?$/, sub: /^accordion-(item|header|button|collapse|body)$/, anchors: ['.accordion'] },
  alert: { root: new RegExp(`^alert(-dismissible|-(${VARIANTS}))?$`), sub: /^alert-(heading|link)$/, anchors: ['.alert'] },
  badge: { root: /^badge$/ },
  breadcrumb: { root: /^breadcrumb$/, sub: /^breadcrumb-item$/, anchors: ['.breadcrumb'] },
  'button-group': { root: /^(btn-group(-vertical|-sm|-lg)?|btn-toolbar)$/, sub: /^dropdown-toggle-split$/, anchors: ['.btn-group', '.btn-group-vertical'] },
  card: { root: /^card-group$/, sub: /^card(-.+)?$/, anchors: ['.card', '.card-group'] },
  carousel: { root: /^carousel(-fade|-dark)?$/, sub: /^carousel-.+$/, anchors: ['.carousel'] },
  close: { root: /^btn-close(-white)?$/ },
  containers: { root: /^container(-.+)?$/ },
  dropdown: {
    root: new RegExp(`^(dropup|dropend|dropdown|dropstart|dropup-center|dropdown-center|dropdown-toggle|dropdown-menu(-dark|-start|-end|-(${BREAKPOINTS})-(start|end))?)$`),
    sub: /^dropdown-(divider|item|header|item-text)$/,
    anchors: ['.dropdown-menu'],
  },
  // A form has no root class: its roots are a stamped <form>, input group or floating label.
  forms: { root: /^$/, sub: /^(form-.+|col-form-label(-.+)?|input-group(-.+)?|btn-check|(in)?valid-(feedback|tooltip))$/, anchors: ['form', '.input-group', '.form-floating'] },
  grid: { root: /^(row|row-cols-.+|g[xy]?-.+)$/, sub: /^(col(-.+)?|offset-.+)$/, anchors: ['.row'] },
  'list-group': { root: /^list-group(-numbered|-flush|-horizontal(-.+)?)?$/, sub: /^list-group-item(-.+)?$/, anchors: ['.list-group'] },
  modal: { root: /^modal(-dialog(-.+)?|-content|-backdrop|-sm|-lg|-xl|-fullscreen(-.+)?)?$/, sub: /^modal-(header|title|body|footer)$/, anchors: ['.modal-content'] },
  nav: { root: /^(nav(-tabs|-pills|-underline|-fill|-justified)?|tab-content)$/, sub: /^nav-link$/, anchors: ['.nav', '.navbar-nav'] },
  navbar: { root: /^navbar(-expand(-.+)?|-dark)?$/, sub: /^navbar-(brand|nav|nav-scroll|text|collapse|toggler|toggler-icon)$/, anchors: ['.navbar'] },
  offcanvas: {
    root: new RegExp(`^offcanvas(-(${BREAKPOINTS})|-backdrop)?$`),
    sub: /^offcanvas-(header|title|body)$/,
    anchors: ['.offcanvas', ...BREAKPOINTS.split('|').map((bp) => `.offcanvas-${bp}`)],
  },
  pagination: { root: /^pagination(-lg|-sm)?$/, sub: /^page-(item|link)$/, anchors: ['.pagination'] },
  placeholders: { root: /^placeholder-(glow|wave)$/, sub: /^placeholder(-xs|-sm|-lg)?$/, anchors: ['.placeholder-glow', '.placeholder-wave'] },
  popover: { root: /^(popover|bs-popover-.+)$/, sub: /^popover-(header|body)$/, anchors: ['.popover'] },
  progress: { root: /^progress(-stacked)?$/, sub: /^progress-bar(-.+)?$/, anchors: ['.progress', '.progress-stacked'] },
  spinners: { root: /^spinner-.+$/ },
  tables: {
    root: /^(table(-sm|-bordered|-borderless|-striped(-columns)?|-hover|-responsive(-.+)?)?|caption-top)$/,
    sub: new RegExp(`^table-(active|group-divider|${VARIANTS})$`),
    anchors: ['.table'],
  },
  toasts: { root: /^toast(-container)?$/, sub: /^toast-(header|body)$/, anchors: ['.toast'] },
  tooltip: { root: /^(tooltip|bs-tooltip-.+)$/, sub: /^tooltip-inner$/, anchors: ['.tooltip'] },
  transitions: { root: /^(fade|collapse|collapsing|collapse-horizontal)$/ },
};

/**
 * The guard of a partial's SUB classes, or null when it has none:
 * `:where([data-mps], .table[data-mps] *)`, with several anchors folded into
 * one `:is()` arm (`:is(form, .input-group, .form-floating)[data-mps] *`).
 */
export function subGuard(partial) {
  const anchors = PART_CLASSES[partial]?.anchors;
  if (!anchors?.length) return null;
  const anchor = anchors.length === 1 ? anchors[0] : `:is(${anchors.join(', ')})`;
  return `:where([${SCOPE_ATTRIBUTE}], ${anchor}[${SCOPE_ATTRIBUTE}] *)`;
}

/** At-rules whose blocks hold no element selectors. */
const SKIP_ATRULES = /^(-\w+-)?(keyframes|font-face|property|page|counter-style)$/i;

function insideSkippedAtRule(rule) {
  for (let p = rule.parent; p; p = p.parent) {
    if (p.type === 'atrule' && SKIP_ATRULES.test(p.name)) return true;
  }
  return false;
}

/**
 * Scope one complex selector in place. Returns 'scoped', or 'verbatim' for a
 * selector with no class. Only top-level class nodes count: a class inside
 * `:not()` / `:is()` is a condition, not the element's identity.
 */
function scopeSelector(selector, owns, partial) {
  let sawClass = false;
  let target = null;
  selector.each((node) => {
    if (target || node.type !== 'class') return;
    sawClass = true;
    if (owns.test(node.value)) target = node;
  });
  if (target) {
    const { root, sub } = PART_CLASSES[partial];
    const isSub = !!sub && sub.test(target.value);
    if (!isSub && !root.test(target.value)) {
      throw new Error(
        `scopeBootstrapPart(${partial}): class "${target.value}" is neither root nor sub in ${JSON.stringify(String(selector).trim())}. ` +
          `Classify it in PART_CLASSES in tools/scripts/lib/scope-bootstrap.mjs.`,
      );
    }
    const guard = selectorParser().astSync(`a${isSub ? subGuard(partial) : SCOPE_GUARD}`).first.last;
    target.parent.insertAfter(target, guard);
    return 'scoped';
  }
  if (!sawClass) return 'verbatim';
  throw new Error(
    `scopeBootstrapPart(${partial}): no class owned by the partial in ${JSON.stringify(String(selector).trim())}. ` +
      `Extend OWNED_CLASSES in tools/scripts/lib/scope-bootstrap.mjs.`,
  );
}

/**
 * Rewrite a compiled partial into its scoped variant.
 *
 * @param {string} css      compiled CSS of ONE partial
 * @param {string} partial  partial name, a key of OWNED_CLASSES
 * @returns {{ css: string, verbatim: string[] }} the scoped CSS, and the
 *          selectors shipped verbatim (no class) for the conformance spec
 */
export function scopeBootstrapPart(css, partial) {
  const owns = OWNED_CLASSES[partial];
  if (!owns) throw new Error(`scopeBootstrapPart: unknown partial ${JSON.stringify(partial)} (no OWNED_CLASSES entry)`);
  const roles = PART_CLASSES[partial];
  if (!roles) throw new Error(`scopeBootstrapPart: no PART_CLASSES entry for ${JSON.stringify(partial)}`);
  if (roles.sub && !roles.anchors?.length) throw new Error(`scopeBootstrapPart(${partial}): sub classes need anchors`);
  const verbatim = [];
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (insideSkippedAtRule(rule)) return;
    rule.selector = selectorParser((selectors) => {
      selectors.each((selector) => {
        if (scopeSelector(selector, owns, partial) === 'verbatim') verbatim.push(String(selector).trim());
      });
    }).processSync(rule.selector);
  });
  return { css: root.toString(), verbatim };
}
