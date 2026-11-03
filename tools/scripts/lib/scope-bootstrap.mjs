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
 * A selector with no class at all (`:root`, `[data-bs-theme=dark]` token
 * blocks) ships verbatim: it styles no component element. A selector with
 * classes but none owned is a hard error, so a Bootstrap upgrade that adds a
 * class family fails the codegen instead of shipping an unscoped rule.
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
    target.parent.insertAfter(target, selectorParser.pseudo({ value: ':where', nodes: [] }));
    const where = target.next();
    const inner = selectorParser.selector({ value: '' });
    inner.append(selectorParser.attribute({ attribute: SCOPE_ATTRIBUTE }));
    where.append(inner);
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
