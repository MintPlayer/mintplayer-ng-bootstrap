/**
 * Attribute-rescoping for light-tier web-component stylesheets.
 *
 * Turns compiled CSS into the emulated-encapsulation form described in
 * docs/prd/wc-style-encapsulation.md §L4: every compound selector gains
 * `[data-mps=<scope>]` (matching only elements the component's own template
 * stamped via `scopedHtml`), and `:host` forms map to the element's tag name
 * (the tag IS the host selector — there is no `_nghost` equivalent).
 *
 * Built on postcss + postcss-selector-parser (both already dependencies of
 * the workspace — PRD D2's recorded exception). This module is the whole
 * abstraction: callers hand in CSS text and options, and never see selector
 * ASTs.
 *
 * Loud-failure contract: selectors this transform cannot scope meaningfully
 * (`:root`, `html`, `body` subjects) and shadow-only constructs (`::slotted`,
 * `:host-context`) throw instead of silently emitting dead rules. Rules that
 * must stay untouched (ancestor-subject rules like `[data-bs-theme=dark] .x`,
 * or rules deliberately targeting unstamped consumer content) are opted out
 * with a preceding loud comment containing `@mps-global` (e.g. a `/*!` comment) — the rule
 * is then emitted verbatim, so it must be authored in final form
 * (`mp-badge .x`, not `:host .x`).
 */

import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

/** At-rules whose inner "selectors" are not element selectors (or whose
 *  contents must ship byte-identical). Rules inside these are left alone. */
const SKIP_ATRULES =
  /^(-\w+-)?(keyframes|font-face|property|page|counter-style|font-feature-values|import|charset|namespace)$/i;

const GLOBAL_MARKER = /@mps-global/;

/** Pseudo-elements must stay last in a compound; the scope attribute is
 *  inserted before the first of these. Covers `::x` plus the four legacy
 *  single-colon spellings. */
const LEGACY_PSEUDO_ELEMENTS = new Set([
  ':before',
  ':after',
  ':first-line',
  ':first-letter',
]);

const isPseudoElement = (node) =>
  node.type === 'pseudo' &&
  (node.value.startsWith('::') ||
    LEGACY_PSEUDO_ELEMENTS.has(node.value.toLowerCase()));

const isCombinator = (node) => node.type === 'combinator';

function insideSkippedAtRule(rule) {
  for (let p = rule.parent; p; p = p.parent) {
    if (p.type === 'atrule' && SKIP_ATRULES.test(p.name)) return true;
  }
  return false;
}

/**
 * Rescope compiled CSS to a light-tier component.
 *
 * @param css     compiled CSS text (dart-sass `expanded` output)
 * @param options.scope  scope name, e.g. `badge` → `[data-mps=badge]`
 * @param options.tag    host tag, defaults to `mp-<scope>`
 * @param options.scopeAllCompounds  Angular-parity: scope every compound of a
 *        complex selector (default), not only the subject — with `.a .b`
 *        scoped only on `.b`, the `.a` ancestor test would be answered by
 *        someone else's DOM.
 * @returns rescoped CSS text
 */
export function rescopeCss(css, { scope, tag, scopeAllCompounds = true } = {}) {
  if (!scope || !/^[a-z][a-z0-9-]*$/.test(scope)) {
    throw new Error(`rescopeCss: invalid scope name ${JSON.stringify(scope)}`);
  }
  const hostTag = tag ?? `mp-${scope}`;

  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (insideSkippedAtRule(rule)) return;

    const prev = rule.prev();
    if (prev?.type === 'comment' && GLOBAL_MARKER.test(prev.text)) {
      prev.remove(); // marker consumed; rule ships verbatim
      return;
    }

    rule.selector = transformSelectorList(rule.selector, {
      scope,
      hostTag,
      scopeAllCompounds,
    });
  });
  return root.toString();
}

function transformSelectorList(selectorList, opts) {
  const processor = selectorParser((selectors) => {
    selectors.each((selector) => transformComplexSelector(selector, opts));
  });
  return processor.processSync(selectorList);
}

/** Split a Selector node's children into compounds (runs of nodes between
 *  combinators). Returns arrays of nodes; combinators are not included. */
function splitCompounds(selector) {
  const compounds = [];
  let current = [];
  for (const node of selector.nodes) {
    if (isCombinator(node)) {
      if (current.length) compounds.push(current);
      current = [];
    } else {
      current.push(node);
    }
  }
  if (current.length) compounds.push(current);
  return compounds;
}

function transformComplexSelector(selector, { scope, hostTag, scopeAllCompounds }) {
  const compounds = splitCompounds(selector);
  const hostCompounds = new Set();

  // Pass 1 — validate, map :host forms, classify host compounds.
  for (const compound of compounds) {
    for (const node of compound) {
      if (node.type !== 'pseudo') continue;
      const name = node.value.toLowerCase();
      if (name === '::slotted' || name === ':host-context') {
        throw new Error(
          `rescopeCss: ${node.value} is shadow-only and has no meaning in a ` +
            `light-tier stylesheet (selector: ${String(selector)})`,
        );
      }
      if (name === ':root') {
        throw new Error(
          `rescopeCss: cannot scope a :root rule (selector: ${String(selector)}). ` +
            `If the rule is deliberately global, mark it with a preceding /*! @mps-global comment ` +
            `and author the final selector.`,
        );
      }
    }

    const hostIdx = compound.findIndex(
      (n) => n.type === 'pseudo' && n.value.toLowerCase() === ':host',
    );
    if (hostIdx !== -1) {
      const hostNode = compound[hostIdx];
      const replacement = [selectorParser.tag({ value: hostTag })];
      // :host(<inner>) — unwrap the inner compound onto the tag.
      if (hostNode.nodes?.length) {
        const inner = hostNode.nodes[0]; // first (only) inner Selector
        for (const innerNode of inner.nodes) {
          if (isCombinator(innerNode)) {
            throw new Error(
              `rescopeCss: :host(...) must contain a single compound ` +
                `(selector: ${String(selector)})`,
            );
          }
          replacement.push(innerNode.clone());
        }
      }
      hostNode.replaceWith(...replacement);
      // The compound array is stale after replaceWith; rebuild below.
      hostCompounds.add(compound);
      continue;
    }

    // A literal host-tag compound (`mp-badge .x`) is the host, not template
    // content — authors should write `:host`, but don't break them for it.
    const firstReal = compound[0];
    if (firstReal?.type === 'tag') {
      const tagName = firstReal.value.toLowerCase();
      if (tagName === hostTag) {
        hostCompounds.add(compound);
      } else if (tagName === 'html' || tagName === 'body') {
        throw new Error(
          `rescopeCss: cannot scope a ${tagName}-rooted rule ` +
            `(selector: ${String(selector)}). Use a preceding /*! @mps-global comment if intended.`,
        );
      }
    }
  }

  // Pass 2 — re-split (:host replacement changed the node list) and insert
  // the scope attribute. Identify host compounds again by their first node.
  const freshCompounds = splitCompounds(selector);
  const targets = scopeAllCompounds
    ? freshCompounds
    : freshCompounds.slice(-1);

  for (const compound of targets) {
    const first = compound[0];
    if (first?.type === 'tag' && first.value.toLowerCase() === hostTag) {
      continue; // host carries no data-mps — the tag is its scope
    }

    const attr = selectorParser.attribute({
      attribute: 'data-mps',
      operator: '=',
      value: scope,
      raws: {},
      quoteMark: null,
    });

    // A lone universal selector IS the attribute.
    if (compound.length === 1 && compound[0].type === 'universal') {
      compound[0].replaceWith(attr);
      continue;
    }

    const firstPseudoElement = compound.find(isPseudoElement);
    if (firstPseudoElement) {
      firstPseudoElement.parent.insertBefore(firstPseudoElement, attr);
    } else {
      const last = compound[compound.length - 1];
      last.parent.insertAfter(last, attr);
    }
  }
}
