// Lit: a template function the hand-written light-DOM element calls from
// render(). Named slots arrive as `slots.<name>` (nodes the element captured,
// or a callback for a scoped slot), the default slot as `slots.default`. A
// `mp-host` root is the element itself: only its children are emitted, and the
// element applies the root bag to itself with hostProps().
import { rewrite } from './expressions.mjs';
import { GENERATOR, NODE, PROP, TAG, TemplateError, VOID_TAGS, checkElement, directive, groupChains, parseFor, refName, renderedProps, rootElement, isSelectSeed, slotArgs, slotName } from './source.mjs';

const escapeText = (text) => text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/</g, '&lt;');
const escapeAttr = (text) => escapeText(text).replace(/"/g, '&quot;');

/** `select.view.vue`'s `option` slot → `SelectOptionSlotArgs`. */
export function slotArgsType(src, slot) {
  return `${src.name}${slot[0].toUpperCase()}${slot.slice(1).replace(/-(\w)/g, (_, c) => c.toUpperCase())}SlotArgs`;
}

export function emitLit(src,{ generator = GENERATOR, runtime } = {}) {
  if (!runtime) throw new Error('emitLit: options.runtime must name the module that exports the props() directive');
  const ctx = { src, locals: new Set(), refs: new Map(), uses: new Set(['html']) };
  const { root, host } = rootElement(src);
  const body = host ? children(ctx, root.children, 2) : children(ctx, src.root.children, 2);
  const name = `${src.name[0].toLowerCase()}${src.name.slice(1)}Template`;
  const type = `${src.name}TemplateProps`;

  const slotMembers = src.slots.members.map(
    (s) => `${s.name}?: unknown${s.paramType ? ` | ((args: ${s.paramType}) => unknown)` : ''};`,
  );
  const lit = ['html', 'nothing', 'type TemplateResult'].filter((u) => u === 'type TemplateResult' || ctx.uses.has(u));
  const directives = [];
  if (ctx.uses.has('repeat')) directives.push("import { repeat } from 'lit/directives/repeat.js';");
  if (ctx.uses.has('ref')) directives.push("import { ref, type Ref } from 'lit/directives/ref.js';");
  if (ctx.uses.has('unsafeHTML')) directives.push("import { unsafeHTML } from 'lit/directives/unsafe-html.js';");
  if (ctx.uses.has('styleMap')) directives.push("import { styleMap } from 'lit/directives/style-map.js';");
  if (ctx.uses.has('props')) directives.push(`import { props } from '${runtime}';`);
  const helpers = ctx.uses.has('renderSlot')
    ? ["function renderSlot<A>(slot: unknown, args: A): unknown {", "  return typeof slot === 'function' ? (slot as (args: A) => unknown)(args) : slot;", '}', '']
    : [];
  const destructure = [...src.propNames, 'slots = {}', ...[...ctx.refs.keys()].map((r) => `${r}Ref`)].join(', ');

  return [
    `// GENERATED from ${src.file.replace(/\\/g, '/')} by ${generator}. Do not edit.`,
    `import { ${lit.join(', ')} } from 'lit';`,
    ...directives,
    ...src.imports,
    '',
    // A scoped slot's arguments, for the element's `<slot>Renderer` property.
    ...src.slots.members.filter((s) => s.paramType).map((s) => `export type ${slotArgsType(src, s.name)} = ${s.paramType};`),
    `export type ${type} = ${src.props.text} & {`,
    `  slots?: { ${slotMembers.join(' ')} };`,
    ...[...ctx.refs].map(([r, tag]) => `  ${r}Ref?: Ref<HTMLElementTagNameMap['${tag}']>;`),
    '};',
    '',
    ...helpers,
    `export function ${name}({ ${destructure} }: ${type}): TemplateResult {`,
    `  return html\`\n${body}  \`;`,
    '}',
    '',
  ].join('\n');
}

function x(ctx, expr) {
  return rewrite(expr, { locals: ctx.locals, props: ctx.src.propNames, prop: (name) => name, slots: 'slots' });
}

const pad = (depth) => '  '.repeat(depth);

function children(ctx, nodes, depth) {
  return groupChains(ctx.src, nodes)
    .map((item) => (item.chain ? chain(ctx, item.chain, depth) : node(ctx, item.node, depth)))
    .join('');
}

function sub(inner, depth) {
  return `html\`\n${inner}${pad(depth)}\``;
}

function chain(ctx, branches, depth) {
  ctx.uses.add('nothing');
  const parts = branches.map((b) => ({ cond: b.cond === null ? null : x(ctx, b.cond), tpl: sub(element(ctx, b.el, depth + 1), depth) }));
  const expr = parts.reduceRight((rest, part) => (part.cond === null ? part.tpl : `(${part.cond}) ? ${part.tpl} : ${rest}`), 'nothing');
  return `${pad(depth)}\${${expr}}\n`;
}

function node(ctx, n, depth) {
  if (n.type === NODE.TEXT) return `${pad(depth)}${escapeText(n.content)}\n`;
  if (n.type === NODE.INTERPOLATION) return `${pad(depth)}\${${x(ctx, n.content.content)}}\n`;
  if (n.type === NODE.ELEMENT) return element(ctx, n, depth);
  return '';
}

function element(ctx, el, depth) {
  if (el.props.some((p) => p.type === PROP.DIRECTIVE && p.name === 'for')) {
    const loop = parseFor(ctx.src, el);
    const list = x(ctx, loop.list);
    const inner = { ...ctx, locals: new Set([...ctx.locals, loop.item, ...(loop.index ? [loop.index] : [])]) };
    const params = `${loop.item}${loop.index ? `, ${loop.index}` : ''}`;
    const tpl = sub(bare(inner, el, depth + 1), depth);
    if (!loop.key) return `${pad(depth)}\${(${list}).map((${params}) => ${tpl})}\n`;
    ctx.uses.add('repeat');
    return `${pad(depth)}\${repeat(${list}, (${params}) => ${x(inner, loop.key)}, (${params}) => ${tpl})}\n`;
  }
  return bare(ctx, el, depth);
}

function bare(ctx, el, depth) {
  if (el.tagType === TAG.SLOT) return slot(ctx, el, depth);
  if (el.tagType === TAG.TEMPLATE) return children(ctx, el.children, depth);
  if (el.tagType === TAG.COMPONENT) throw new TemplateError(ctx.src.file, el, `components are not supported (<${el.tag}>)`);
  checkElement(ctx.src, el);

  const attrs = renderedProps(el).filter((p) => !isSelectSeed(el, p)).map((p) => {
    if (p.type === PROP.ATTRIBUTE) return p.value ? `${p.name}="${escapeAttr(p.value.content)}"` : p.name;
    const exp = x(ctx, p.exp.content);
    if (p.name === 'bind' && !p.arg) {
      ctx.uses.add('props');
      return `\${props(${exp})}`;
    }
    if (p.name === 'bind') {
      if (p.modifiers.some((m) => (m.content ?? m) === 'prop')) return `.${p.arg.content}=\${${exp}}`;
      if (p.arg.content === 'style') {
        ctx.uses.add('styleMap');
        return `style=\${styleMap(${exp})}`;
      }
      ctx.uses.add('nothing');
      return `${p.arg.content}=\${(${exp}) ?? nothing}`;
    }
    return `@${p.arg.content}=\${${exp}}`;
  });
  const ref = refName(el);
  if (ref) {
    ctx.refs.set(ref, el.tag);
    ctx.uses.add('ref');
    attrs.push(`\${ref(${ref}Ref)}`);
  }
  const open = `<${el.tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
  if (VOID_TAGS.has(el.tag)) return `${pad(depth)}${open}\n`;
  // v-html: core-produced markup, never consumer input.
  const html = directive(el, 'html');
  if (html) {
    ctx.uses.add('unsafeHTML');
    return `${pad(depth)}${open}\${unsafeHTML(${x(ctx, html.exp.content)})}</${el.tag}>\n`;
  }
  // Text-only content stays on the element's line: indenting it would put the
  // indentation into textContent, which the other fronts condense away.
  const content = el.children.filter((c) => c.type !== NODE.COMMENT);
  if (content.length && content.every((c) => c.type === NODE.TEXT || c.type === NODE.INTERPOLATION)) {
    const text = content
      .map((c) => (c.type === NODE.TEXT ? escapeText(c.content.replace(/\s+/g, ' ')) : `\${${x(ctx, c.content.content)}}`))
      .join('')
      .trim();
    return `${pad(depth)}${open}${text}</${el.tag}>\n`;
  }
  const inner = children(ctx, el.children, depth + 1);
  return inner ? `${pad(depth)}${open}\n${inner}${pad(depth)}</${el.tag}>\n` : `${pad(depth)}${open}</${el.tag}>\n`;
}

function slot(ctx, el, depth) {
  const name = slotName(el);
  const args = slotArgs(el).filter((a) => a.name !== 'name');
  const fallbackHtml = children(ctx, el.children, depth + 1);
  ctx.uses.add('nothing');
  const fallback = fallbackHtml ? sub(fallbackHtml, depth) : 'nothing';
  const ref = `slots.${name}`;
  const value = args.length
    ? (ctx.uses.add('renderSlot'), `renderSlot(${ref}, { ${args.map((a) => `${a.name}: ${x(ctx, a.exp)}`).join(', ')} })`)
    : ref;
  return `${pad(depth)}\${${ref} !== undefined ? ${value} : ${fallback}}\n`;
}
