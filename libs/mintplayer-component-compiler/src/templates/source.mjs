// Reads one `*.view.vue` template source (PRD #437 spike S13) into the shape
// every emitter works from: the template AST, the declared props and slots,
// and the type-only imports the generated fronts need.
import { parse as parseSfc } from '@vue/compiler-sfc';
import { parse as parseJs } from '@babel/parser';
import { basename } from 'node:path';

/** The marker that makes a root element the front's host in Angular and Lit. */
export const HOST_MARKER = 'mp-host';

/** Named in every generated file's header. */
export const GENERATOR = '@mintplayer/nx-component-compiler';

export const NODE = { ROOT: 0, ELEMENT: 1, TEXT: 2, COMMENT: 3, INTERPOLATION: 5 };
export const PROP = { ATTRIBUTE: 6, DIRECTIVE: 7 };
export const TAG = { ELEMENT: 0, COMPONENT: 1, SLOT: 2, TEMPLATE: 3 };

export const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

export class TemplateError extends Error {
  constructor(file, node, message) {
    const loc = node?.loc ? `:${node.loc.start.line}:${node.loc.start.column}` : '';
    super(`${file}${loc}: ${message}`);
  }
}

/** `navbar-dropdown.view.vue` → `NavbarDropdown`. */
export function pascalName(file) {
  return basename(file)
    .replace(/\.view\.vue$/, '')
    .split(/[-_.]/)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

/** The members of the type literal passed to `defineProps<…>()` / `defineSlots<…>()`. */
function typeMembers(scriptText, ast, callee) {
  const calls = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === callee) calls.push(node);
    Object.values(node).forEach((value) => (Array.isArray(value) ? value.forEach(visit) : value && typeof value === 'object' && visit(value)));
  };
  visit(ast.program);
  if (calls.length === 0) return { text: '{}', members: [] };
  const literal = calls[0].typeParameters?.params?.[0];
  if (!literal || literal.type !== 'TSTypeLiteral') throw new Error(`${callee}<…>() must take an inline type literal`);
  const members = literal.members.map((member) => {
    const name = member.key.type === 'Identifier' ? member.key.name : member.key.value;
    const annotation = member.typeAnnotation?.typeAnnotation;
    const fn = annotation?.type === 'TSFunctionType' ? annotation : null;
    const param = fn?.parameters?.[0]?.typeAnnotation?.typeAnnotation;
    return {
      name,
      optional: !!member.optional,
      type: annotation ? scriptText.slice(annotation.start, annotation.end) : 'unknown',
      paramType: param ? scriptText.slice(param.start, param.end) : null,
    };
  });
  return { text: scriptText.slice(literal.start, literal.end), members };
}

export function readSource(file, text) {
  const { descriptor, errors } = parseSfc(text, { filename: file });
  if (errors.length) throw new Error(`${file}: ${errors[0].message ?? errors[0]}`);
  if (!descriptor.template?.ast) throw new Error(`${file}: no <template>`);
  const script = descriptor.scriptSetup;
  if (!script || script.lang !== 'ts') throw new Error(`${file}: needs <script setup lang="ts">`);

  const scriptText = script.content;
  const ast = parseJs(scriptText, { sourceType: 'module', plugins: ['typescript'] });
  const imports = ast.program.body
    .filter((node) => node.type === 'ImportDeclaration')
    .map((node) => {
      if (node.importKind !== 'type' && !node.specifiers.every((s) => s.importKind === 'type')) {
        throw new Error(`${file}: the template source may import types only ("${node.source.value}")`);
      }
      if (node.source.value.startsWith('.')) {
        throw new Error(`${file}: import "${node.source.value}" by its package path, so every front resolves it`);
      }
      return scriptText.slice(node.start, node.end).trim().replace(/;?$/, ';');
    });

  const props = typeMembers(scriptText, ast, 'defineProps');
  const slots = typeMembers(scriptText, ast, 'defineSlots');
  return {
    file,
    name: pascalName(file),
    sfcText: text,
    templateContent: descriptor.template.content,
    root: descriptor.template.ast,
    imports,
    props,
    slots,
    propNames: new Set(props.members.map((m) => m.name)),
  };
}

/* ------------------------------------------------------------------------ */
/* Template helpers shared by the emitters                                  */
/* ------------------------------------------------------------------------ */

export const directive = (el, name) => el.props.find((p) => p.type === PROP.DIRECTIVE && p.name === name);
export const attribute = (el, name) => el.props.find((p) => p.type === PROP.ATTRIBUTE && p.name === name);

/** Children without comments and whitespace-only text. */
export function meaningful(children) {
  return children.filter((c) => c.type !== NODE.COMMENT && !(c.type === NODE.TEXT && c.content.trim() === ''));
}

/**
 * Group sibling `v-if` / `v-else-if` / `v-else` elements into one chain item,
 * so each emitter renders a chain as a single conditional.
 */
export function groupChains(src, children) {
  const out = [];
  for (const child of meaningful(children)) {
    if (child.type === NODE.ELEMENT && directive(child, 'if')) {
      out.push({ chain: [{ cond: directive(child, 'if').exp.content, el: child }] });
    } else if (child.type === NODE.ELEMENT && (directive(child, 'else-if') || directive(child, 'else'))) {
      const last = out[out.length - 1];
      if (!last?.chain) throw new TemplateError(src.file, child, 'v-else(-if) without a preceding v-if');
      const elseIf = directive(child, 'else-if');
      last.chain.push({ cond: elseIf ? elseIf.exp.content : null, el: child });
    } else {
      out.push({ node: child });
    }
  }
  return out;
}

/** `(item, i) in items` → { item: 'item', index: 'i', list: 'items' }. */
export function parseFor(src, el) {
  const exp = directive(el, 'for').exp.content;
  const match = /^\s*\(?\s*([A-Za-z_$][\w$]*)\s*(?:,\s*([A-Za-z_$][\w$]*)\s*)?\)?\s+(?:in|of)\s+(.+)$/s.exec(exp);
  if (!match) throw new TemplateError(src.file, el, `unsupported v-for "${exp}"`);
  const key = directive(el, 'bind') && el.props.find((p) => p.type === PROP.DIRECTIVE && p.name === 'bind' && p.arg?.content === 'key');
  return { item: match[1], index: match[2] ?? null, list: match[3].trim(), key: key ? key.exp.content : null };
}

/** The attributes an emitter renders: everything except structure directives and the host marker. */
export function renderedProps(el) {
  return el.props.filter((p) => {
    if (p.type === PROP.ATTRIBUTE) return p.name !== HOST_MARKER && p.name !== 'ref';
    if (['if', 'else-if', 'else', 'for'].includes(p.name)) return false;
    if (p.name === 'bind' && p.arg?.content === 'key') return false;
    return true;
  });
}

export function refName(el) {
  return attribute(el, 'ref')?.value?.content ?? null;
}

export function isHost(el) {
  return !!attribute(el, HOST_MARKER);
}

/** The template's single root element, and whether it is marked as the host. */
export function rootElement(src) {
  const roots = meaningful(src.root.children);
  const hostRoots = roots.filter((r) => r.type === NODE.ELEMENT && isHost(r));
  if (hostRoots.length && roots.length !== 1) throw new TemplateError(src.file, hostRoots[0], `${HOST_MARKER} needs a single root element`);
  return { root: roots.length === 1 ? roots[0] : null, host: hostRoots.length === 1 };
}

export function checkElement(src, el) {
  const bags = el.props.filter((p) => p.type === PROP.DIRECTIVE && p.name === 'bind' && !p.arg);
  const staticClass = attribute(el, 'class');
  if (bags.length > 1) throw new TemplateError(src.file, el, 'one v-bind bag per element');
  if (bags.length && (staticClass || el.props.some((p) => p.name === 'bind' && p.arg?.content === 'class'))) {
    // Angular's [mpProps] writes `class` as an attribute; a static class would be clobbered.
    throw new TemplateError(src.file, el, 'an element with a v-bind bag takes its class from the bag');
  }
  if (el.props.some((p) => p.type === PROP.DIRECTIVE && !['bind', 'on', 'if', 'else-if', 'else', 'for'].includes(p.name))) {
    throw new TemplateError(src.file, el, 'only v-bind, v-on, v-if/v-else-if/v-else and v-for are supported');
  }
  if (el.props.some((p) => p.type === PROP.DIRECTIVE && p.name === 'bind' && p.arg?.content === 'style')) {
    throw new TemplateError(src.file, el, ':style is not supported; put geometry in the bag as a custom property');
  }
}

/** The arguments of a scoped slot: its `:x="…"` bindings (minus `name`). */
export function slotArgs(el) {
  return el.props
    .filter((p) => p.type === PROP.DIRECTIVE && p.name === 'bind' && p.arg)
    .map((p) => ({ name: p.arg.content, exp: p.exp.content }));
}

export function slotName(el) {
  return attribute(el, 'name')?.value?.content ?? 'default';
}
