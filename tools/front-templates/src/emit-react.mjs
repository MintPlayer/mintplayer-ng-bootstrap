// React: a function component the hand-written front renders. Props arrive as
// declared; named slots as `slots.<name>` (a node, or a render function for a
// scoped slot), the default slot as `children`. The root element also takes
// the consumer's `className` / `attrs` and the `rootRef`.
import { rewrite } from './expressions.mjs';
import { GENERATOR, NODE, PROP, TAG, TemplateError, VOID_TAGS, checkElement, groupChains, parseFor, refName, renderedProps, rootElement, slotArgs, slotName } from './source.mjs';

const RENAME = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', autocomplete: 'autoComplete', maxlength: 'maxLength', colspan: 'colSpan', rowspan: 'rowSpan' };
const FORM_TAGS = new Set(['input', 'select', 'textarea']);

const eventProp = (name) => 'on' + name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('');

export function emitReact(src, { generator = GENERATOR, runtime } = {}) {
  if (!runtime) throw new Error('emitReact: options.runtime must name the module that exports reactProps / reactFormProps');
  const ctx = { src, locals: new Set(), refs: new Map(), uses: new Set(['reactProps']), root: null };
  const { root } = rootElement(src);
  ctx.root = root;
  const body = children(ctx, src.root.children);
  const name = `${src.name}Template`;

  const slotMembers = src.slots.members
    .filter((s) => s.name !== 'default')
    .map((s) => `${s.name}?: React.ReactNode${s.paramType ? ` | ((args: ${s.paramType}) => React.ReactNode)` : ''};`);
  const refMembers = [...ctx.refs].map(([r, tag]) => `${r}Ref?: React.Ref<HTMLElementTagNameMap['${tag}']>;`);
  const propNames = [...src.propNames];
  const destructure = [...propNames, 'slots = {}', 'children', 'className', 'attrs', ...[...ctx.refs.keys()].map((r) => `${r}Ref`)].join(', ');

  const helpers = [];
  if (ctx.uses.has('renderSlot')) {
    helpers.push(
      'function renderSlot<A>(slot: React.ReactNode | ((args: A) => React.ReactNode), args: A): React.ReactNode {',
      "  return typeof slot === 'function' ? (slot as (args: A) => React.ReactNode)(args) : slot;",
      '}',
      '',
    );
  }
  const machine = [...ctx.uses].filter((u) => u === 'reactProps' || u === 'reactFormProps').sort().join(', ');

  return [
    `// GENERATED from ${src.file.replace(/\\/g, '/')} by ${generator}. Do not edit.`,
    "import * as React from 'react';",
    `import { ${machine} } from '${runtime}';`,
    ...src.imports,
    '',
    `export type ${name}Props = ${src.props.text} & {`,
    `  slots?: { ${slotMembers.join(' ')} };`,
    '  children?: React.ReactNode;',
    '  /** Merged onto the root element after the bag. */',
    '  className?: string;',
    '  /** The consumer\'s remaining attributes, spread onto the root element. */',
    '  attrs?: Record<string, unknown>;',
    ...refMembers.map((m) => `  ${m}`),
    '};',
    '',
    ...helpers,
    `export function ${name}({ ${destructure} }: ${name}Props): React.ReactElement {`,
    `  return (\n    <>\n${body}    </>\n  );`,
    '}',
    '',
  ].join('\n');
}

function x(ctx, expr) {
  return rewrite(expr, { locals: ctx.locals, props: ctx.src.propNames, prop: (name) => name, slots: 'slots' });
}

const pad = (depth) => '  '.repeat(depth);

function children(ctx, nodes, depth = 3) {
  return groupChains(ctx.src, nodes)
    .map((item) => (item.chain ? chain(ctx, item.chain, depth) : node(ctx, item.node, depth)))
    .join('');
}

/** A child list as one JSX expression (for a conditional branch or a fallback). */
function fragment(ctx, nodesHtml, depth) {
  return `<>\n${nodesHtml}${pad(depth)}</>`;
}

function chain(ctx, branches, depth) {
  const parts = branches.map((b) => ({ cond: b.cond === null ? null : x(ctx, b.cond), jsx: fragment(ctx, element(ctx, b.el, depth + 1), depth) }));
  const expr = parts.reduceRight((rest, part) => (part.cond === null ? part.jsx : `(${part.cond}) ? ${part.jsx} : ${rest}`), 'null');
  return `${pad(depth)}{${expr}}\n`;
}

function node(ctx, n, depth) {
  if (n.type === NODE.TEXT) return `${pad(depth)}{${JSON.stringify(n.content)}}\n`;
  if (n.type === NODE.INTERPOLATION) return `${pad(depth)}{${x(ctx, n.content.content)}}\n`;
  if (n.type === NODE.ELEMENT) return element(ctx, n, depth);
  return '';
}

function element(ctx, el, depth) {
  if (el.props.some((p) => p.type === PROP.DIRECTIVE && p.name === 'for')) {
    const loop = parseFor(ctx.src, el);
    const list = x(ctx, loop.list);
    const inner = { ...ctx, locals: new Set([...ctx.locals, loop.item, ...(loop.index ? [loop.index] : [])]) };
    const key = loop.key ? x(inner, loop.key) : (loop.index ?? '__i');
    const params = `${loop.item}, ${loop.index ?? '__i'}`;
    return `${pad(depth)}{(${list}).map((${params}) => (\n${pad(depth + 1)}<React.Fragment key={${key}}>\n${bare(inner, el, depth + 2)}${pad(depth + 1)}</React.Fragment>\n${pad(depth)}))}\n`;
  }
  return bare(ctx, el, depth);
}

function bare(ctx, el, depth) {
  if (el.tagType === TAG.SLOT) return slot(ctx, el, depth);
  if (el.tagType === TAG.TEMPLATE) return children(ctx, el.children, depth);
  if (el.tagType === TAG.COMPONENT) throw new TemplateError(ctx.src.file, el, `components are not supported (<${el.tag}>)`);
  checkElement(ctx.src, el);
  const isRoot = el === ctx.root;
  // A form control's bag seeds the DOM; script owns its state afterwards.
  const spread = FORM_TAGS.has(el.tag) ? 'reactFormProps' : 'reactProps';

  let bagExpr = null;
  const attrs = renderedProps(el).map((p) => {
    if (p.type === PROP.ATTRIBUTE) {
      const name = RENAME[p.name] ?? p.name;
      return p.value ? `${name}=${JSON.stringify(p.value.content)}` : `${name}`;
    }
    const exp = x(ctx, p.exp.content);
    if (p.name === 'bind' && !p.arg) {
      ctx.uses.add(spread);
      bagExpr = exp;
      return `{...${spread}(${exp})}`;
    }
    if (p.name === 'bind') {
      const name = RENAME[p.arg.content] ?? p.arg.content;
      return `${name}={${exp}}`;
    }
    return `${eventProp(p.arg.content)}={${exp}}`;
  });
  const ref = refName(el);
  if (ref) {
    ctx.refs.set(ref, el.tag);
    attrs.push(`ref={${ref}Ref}`);
  }
  if (isRoot) {
    attrs.push('{...attrs}');
    const base = bagExpr ? `${bagExpr}['class']` : JSON.stringify(el.props.find((p) => p.type === PROP.ATTRIBUTE && p.name === 'class')?.value?.content ?? '');
    attrs.push(`className={[${base}, className].filter(Boolean).join(' ') || undefined}`);
  }
  const open = `<${el.tag}${attrs.length ? ' ' + attrs.join(' ') : ''}`;
  if (VOID_TAGS.has(el.tag)) return `${pad(depth)}${open} />\n`;
  const inner = children(ctx, el.children, depth + 1);
  return inner ? `${pad(depth)}${open}>\n${inner}${pad(depth)}</${el.tag}>\n` : `${pad(depth)}${open} />\n`;
}

function slot(ctx, el, depth) {
  const name = slotName(el);
  const args = slotArgs(el).filter((a) => a.name !== 'name');
  const fallbackHtml = children(ctx, el.children, depth + 1);
  const fallback = fallbackHtml ? fragment(ctx, fallbackHtml, depth) : 'null';
  if (name === 'default') return `${pad(depth)}{children ?? ${fallback}}\n`;
  const ref = `slots.${name}`;
  const value = args.length
    ? (ctx.uses.add('renderSlot'), `renderSlot(${ref}, { ${args.map((a) => `${a.name}: ${x(ctx, a.exp)}`).join(', ')} })`)
    : ref;
  return `${pad(depth)}{${ref} !== undefined ? ${value} : ${fallback}}\n`;
}
