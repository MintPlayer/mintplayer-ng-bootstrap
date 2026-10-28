// Angular: an external template (`templateUrl`) for the hand-written component.
// Props are read as signals (`view()`), named slots as `slots().<name>` (a
// TemplateRef the component collects), the default slot is `<ng-content>`.
// A `mp-host` root is the component's host: only its children are emitted, and
// the component applies the root bag to its host itself.
import { rewrite } from './expressions.mjs';
import { GENERATOR, NODE, PROP, TAG, TemplateError, VOID_TAGS, checkElement, directive, groupChains, parseFor, refName, renderedProps, rootElement, composedUse, isSelectSeed, partialUse, slotArgs, slotName } from './source.mjs';

const escapeText = (text) => text.replace(/&(?![a-z#0-9]+;)/gi, '&amp;').replace(/</g, '&lt;').replace(/@/g, '&#64;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
const escapeAttr = (text) => text.replace(/&(?![a-z#0-9]+;)/gi, '&amp;').replace(/"/g, '&quot;');

/**
 * A partial is an `<ng-template>` inlined into each template that calls it, recursing
 * through `ngTemplateOutlet`; the guard directive types its `let-` variables.
 */
export const partialGuard = (partial) => ({ attribute: `mpPartial${partial.name}`, directive: `${partial.name}Partial` });
const partialRef = (partial) => `partial_${partial.name}`;

export function emitAngular(src, { generator = GENERATOR, prop = (name) => `${name}()`, letProps = false, partials, components } = {}) {
  // With `letProps`, each prop the template reads is bound once with `@let`: the
  // type checker narrows a template variable after `@if (p_view.x)`, but never
  // through a call like `props().view.x`.
  const read = new Set();
  const ctx = { src, prop: letProps ? (name) => (read.add(name), `p_${name}`) : prop, locals: new Set(), uses: new Set(), partials, called: new Set(), components, composed: new Map() };
  const { root, host } = rootElement(src);
  const body = host ? children(ctx, root.children, 0) : children(ctx, src.root.children, 0);
  const defined = new Map();
  const definitions = [...ctx.called].map((name) => definePartial(ctx, name, defined)).join('');
  const lets = [...read].map((name) => `@let p_${name} = ${prop(name)};\n`).join('');
  const header = `<!-- GENERATED from ${src.file.replace(/\\/g, '/')} by ${generator}. Do not edit. -->\n`;
  return { text: header + lets + body + definitions, uses: [...ctx.uses], partials: [...defined.values()], composed: [...ctx.composed.values()] };
}

/** One partial's `<ng-template>`, then those it calls in turn; each once per template. */
function definePartial(ctx, name, defined) {
  if (defined.has(name)) return '';
  const partial = ctx.partials.get(name);
  defined.set(name, partial);
  // A partial reads only its own props, which are the ng-template's let- variables.
  const own = { src: partial, prop: (prop) => `pp_${prop}`, locals: new Set(), uses: ctx.uses, partials: ctx.partials, called: new Set(), components: ctx.components, composed: ctx.composed };
  const body = children(own, partial.root.children, 1);
  const lets = partial.props.members.map((m) => ` let-pp_${m.name}="${m.name}"`).join('');
  const template = `<ng-template #${partialRef(partial)} ${partialGuard(partial).attribute}${lets}>\n${body}</ng-template>\n`;
  return template + [...own.called].map((next) => definePartial(ctx, next, defined)).join('');
}

/**
 * A composed child is its Angular component: inputs and models as property bindings,
 * outputs as events (lowercased, as the child declares them), a named slot as an
 * `<ng-template>` carrying the child's slot directive, default content projected.
 */
function composedChild(ctx, { child, inputs, outputs, models, attrs, binds, bag, slots, content }, depth) {
  const used = ctx.composed.get(child.tag) ?? { child, slots: new Set() };
  ctx.composed.set(child.tag, used);
  const parts = [
    ...attrs.map((a) => `${a.name}="${escapeAttr(a.value)}"`),
    ...binds.map((b) => (b.name === 'class' ? `[class]` : `[attr.${b.name}]`) + `="${escapeAttr(x(ctx, b.exp))}"`),
    ...(bag ? (ctx.uses.add('MpPropsDirective'), [`[mpProps]="${escapeAttr(x(ctx, bag))}"`]) : []),
    ...inputs.map((i) => `[${i.name}]="${escapeAttr(x(ctx, i.exp))}"`),
    ...models.flatMap((m) => [`[${m.name}]="${escapeAttr(x(ctx, m.exp))}.value"`, `(${m.name}Change)="${escapeAttr(x(ctx, m.exp))}.set($event)"`]),
    ...outputs.map((o) => `(${o.output.lower})="${escapeAttr(x(ctx, o.exp))}($event)"`),
  ];
  const named = slots.map((slot) => {
    used.slots.add(slot.name);
    const inner = { ...ctx, locals: new Set([...ctx.locals, ...slot.params]) };
    const lets = slot.params.map((p) => ` let-${p}="${p}"`).join('');
    return `${pad(depth + 1)}<ng-template ${child.names.slotSelector(slot.name)}${lets}>\n${children(inner, slot.children, depth + 2)}${pad(depth + 1)}</ng-template>\n`;
  });
  const inner = named.join('') + children(ctx, content, depth + 1);
  const open = `<${child.names.selector}${parts.length ? ' ' + parts.join(' ') : ''}>`;
  return inner ? `${pad(depth)}${open}\n${inner}${pad(depth)}</${child.names.selector}>\n` : `${pad(depth)}${open}</${child.names.selector}>\n`;
}

function partialCall(ctx, { partial, binds }, depth) {
  ctx.uses.add('NgTemplateOutlet');
  ctx.called.add(partial.name);
  const context = `{ ${binds.map((b) => `${b.name}: ${x(ctx, b.exp)}`).join(', ')} }`;
  return `${pad(depth)}<ng-container [ngTemplateOutlet]="${partialRef(partial)}" [ngTemplateOutletContext]="${escapeAttr(context)}" />\n`;
}

function x(ctx, expr) {
  return rewrite(expr, { locals: ctx.locals, props: ctx.src.propNames, prop: ctx.prop, slots: 'slots()' });
}

const pad = (depth) => '  '.repeat(depth);

function children(ctx, nodes, depth) {
  return groupChains(ctx.src, nodes)
    .map((item) => (item.chain ? chain(ctx, item.chain, depth) : node(ctx, item.node, depth)))
    .join('');
}

function chain(ctx, branches, depth) {
  return branches
    .map((branch, i) => {
      const head = i === 0 ? `@if (${x(ctx, branch.cond)})` : branch.cond === null ? '@else' : `@else if (${x(ctx, branch.cond)})`;
      return `${i === 0 ? pad(depth) : ' '}${head} {\n${element(ctx, branch.el, depth + 1)}${pad(depth)}}`;
    })
    .join('')
    .concat('\n');
}

function node(ctx, n, depth) {
  if (n.type === NODE.TEXT) return `${pad(depth)}${escapeText(n.content)}\n`;
  if (n.type === NODE.INTERPOLATION) return `${pad(depth)}{{ ${x(ctx, n.content.content)} }}\n`;
  if (n.type === NODE.ELEMENT) return element(ctx, n, depth);
  return '';
}

function element(ctx, el, depth) {
  const forDir = el.props.find((p) => p.type === PROP.DIRECTIVE && p.name === 'for');
  if (forDir) {
    const loop = parseFor(ctx.src, el);
    const list = x(ctx, loop.list);
    const inner = { ...ctx, locals: new Set([...ctx.locals, loop.item, ...(loop.index ? [loop.index] : [])]) };
    const track = loop.key ? x(inner, loop.key) : '$index';
    const index = loop.index ? `; let ${loop.index} = $index` : '';
    return `${pad(depth)}@for (${loop.item} of ${list}; track ${track}${index}) {\n${bare(inner, el, depth + 1)}${pad(depth)}}\n`;
  }
  return bare(ctx, el, depth);
}

function bare(ctx, el, depth) {
  if (el.tagType === TAG.SLOT) return slot(ctx, el, depth);
  if (el.tagType === TAG.TEMPLATE) return children(ctx, el.children, depth);
  if (el.tagType === TAG.COMPONENT) {
    const use = partialUse(ctx.src, el, ctx.partials);
    if (use) return partialCall(ctx, use, depth);
    const composed = composedUse(ctx.src, el, ctx.components);
    if (composed) return composedChild(ctx, composed, depth);
    throw new TemplateError(ctx.src.file, el, `<${el.tag}> is neither a partial nor a registered component`);
  }
  checkElement(ctx.src, el);

  const attrs = renderedProps(el).filter((p) => !isSelectSeed(el, p)).map((p) => {
    if (p.type === PROP.ATTRIBUTE) return p.value ? `${p.name}="${escapeAttr(p.value.content)}"` : p.name;
    const exp = x(ctx, p.exp.content);
    if (p.name === 'bind' && !p.arg) {
      ctx.uses.add('MpPropsDirective');
      return `[mpProps]="${escapeAttr(exp)}"`;
    }
    if (p.name === 'bind') {
      const name = p.arg.content;
      if (p.modifiers.some((m) => (m.content ?? m) === 'prop')) return `[${name}]="${escapeAttr(exp)}"`;
      if (name === 'class' || name === 'style') return `[${name}]="${escapeAttr(exp)}"`;
      return `[attr.${name}]="${escapeAttr(exp)}"`;
    }
    // v-on: a bare handler name is called with the event.
    const call = /^[\w$.]+$/.test(p.exp.content.trim()) ? `${exp}($event)` : exp;
    return `(${p.arg.content})="${escapeAttr(call)}"`;
  });
  // v-html: core-produced markup. Angular sanitises it, which keeps spans and classes.
  const html = directive(el, 'html');
  if (html) attrs.push(`[innerHTML]="${escapeAttr(x(ctx, html.exp.content))}"`);
  const ref = refName(el);
  if (ref) attrs.push(`#${ref}`);
  const open = `<${el.tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
  if (VOID_TAGS.has(el.tag)) return `${pad(depth)}${open}\n`;
  const inner = children(ctx, el.children, depth + 1);
  return inner ? `${pad(depth)}${open}\n${inner}${pad(depth)}</${el.tag}>\n` : `${pad(depth)}${open}</${el.tag}>\n`;
}

function slot(ctx, el, depth) {
  const name = slotName(el);
  const args = slotArgs(el).filter((a) => a.name !== 'name');
  const fallback = children(ctx, el.children, depth + 1);
  if (name === 'default' && args.length === 0) {
    // Angular projects the default slot; ng-content renders its own content when nothing is projected.
    return fallback ? `${pad(depth)}<ng-content>\n${fallback}${pad(depth)}</ng-content>\n` : `${pad(depth)}<ng-content />\n`;
  }
  ctx.uses.add('NgTemplateOutlet');
  const local = `slot_${name.replace(/\W/g, '_')}`;
  const context = args.length
    ? ` [ngTemplateOutletContext]="{ $implicit: { ${args.map((a) => `${a.name}: ${x(ctx, a.exp)}`).join(', ')} }, ${args.map((a) => `${a.name}: ${x(ctx, a.exp)}`).join(', ')} }"`
    : '';
  const outlet = `<ng-container [ngTemplateOutlet]="${local}"${context} />`;
  if (!fallback) return `${pad(depth)}@if (slots().${name}; as ${local}) {\n${pad(depth + 1)}${outlet}\n${pad(depth)}}\n`;
  return `${pad(depth)}@if (slots().${name}; as ${local}) {\n${pad(depth + 1)}${outlet}\n${pad(depth)}} @else {\n${fallback}${pad(depth)}}\n`;
}
