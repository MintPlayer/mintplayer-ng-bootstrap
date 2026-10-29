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

/**
 * Native elements newer than Vue's tag list, which it would parse as components.
 * The Vue front's build lists them in `isCustomElement` too.
 */
export const NATIVE_TAGS = new Set(['selectedcontent']);

function markNativeTags(node) {
  if (node.type === NODE.ELEMENT && node.tagType === TAG.COMPONENT && NATIVE_TAGS.has(node.tag)) node.tagType = TAG.ELEMENT;
  (node.children ?? []).forEach(markNativeTags);
}

export function readSource(file, text) {
  const { descriptor, errors } = parseSfc(text, { filename: file });
  if (errors.length) throw new Error(`${file}: ${errors[0].message ?? errors[0]}`);
  if (!descriptor.template?.ast) throw new Error(`${file}: no <template>`);
  const script = descriptor.scriptSetup;
  if (!script || script.lang !== 'ts') throw new Error(`${file}: needs <script setup lang="ts">`);

  const scriptText = script.content;
  const ast = parseJs(scriptText, { sourceType: 'module', plugins: ['typescript'] });
  const declarations = ast.program.body.filter((node) => node.type === 'ImportDeclaration');
  // A partial (a sibling `.view.vue`) is the one value import, and the one relative one.
  const isPartialImport = (node) => /^\.\/[\w.-]+\.view\.vue$/.test(node.source.value);
  const partialImports = new Map(
    declarations.filter(isPartialImport).map((node) => {
      const spec = node.specifiers;
      const target = node.source.value.slice(2);
      if (node.importKind === 'type' || spec.length !== 1 || spec[0].type !== 'ImportDefaultSpecifier' || spec[0].local.name !== pascalName(target)) {
        throw new Error(`${file}: import a partial as its default, named after its file (import ${pascalName(target)} from '${node.source.value}')`);
      }
      return [spec[0].local.name, target];
    }),
  );
  const imports = declarations
    .filter((node) => !isPartialImport(node))
    .map((node) => {
      if (node.importKind !== 'type' && !node.specifiers.every((s) => s.importKind === 'type')) {
        throw new Error(`${file}: the template source may import types only ("${node.source.value}")`);
      }
      if (node.source.value.startsWith('.')) {
        throw new Error(`${file}: import "${node.source.value}" by its package path, so every front resolves it`);
      }
      return scriptText.slice(node.start, node.end).trim().replace(/;?$/, ';');
    });

  markNativeTags(descriptor.template.ast);
  const props = typeMembers(scriptText, ast, 'defineProps');
  const slots = typeMembers(scriptText, ast, 'defineSlots');
  return {
    file,
    name: pascalName(file),
    sfcText: text,
    templateContent: descriptor.template.content,
    root: descriptor.template.ast,
    imports,
    // name → module of every type the source imports, for fronts that rebuild their own import lines.
    importedTypes: new Map(declarations.filter((node) => !isPartialImport(node)).flatMap((node) => node.specifiers.map((s) => [s.local.name, node.source.value]))),
    // Local name → file of each partial this template imports (`QbNode` → `qb-node.view.vue`).
    partialImports,
    props,
    slots,
    propNames: new Set(props.members.map((m) => m.name)),
  };
}

/* ------------------------------------------------------------------------ */
/* Template helpers shared by the emitters                                  */
/* ------------------------------------------------------------------------ */

/**
 * `:value.prop` on a `<select>` seeds the selection for React only (its `defaultValue`,
 * since React refuses `selected` on options). The other fronts select through each
 * option's `selected` and drop the binding: a live `select.value` write lands before the
 * options exist, and stringifies a multiple select's array into a value nothing matches.
 */
export const isSelectSeed = (el, p) =>
  el.tag === 'select' && p.type === PROP.DIRECTIVE && p.name === 'bind' && p.arg?.content === 'value' && p.modifiers.some((m) => (m.content ?? m) === 'prop');

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

/** The attribute every element a group's templates render carries (S15). */
export const SCOPE_ATTRIBUTE = 'data-mps';

/**
 * Stamps `data-mps=<scope>` on every native element of a template (S15), so a
 * core's bags never carry it and the group sheet's rescoped rules match exactly
 * what this group renders. Composed children, partial calls, slots, teleports
 * and `<template>` are not elements of this group: a composed child stamps its
 * own, and slot content is the consumer's. The stamp is a synthetic attribute
 * (no source location); the Vue emitter writes it into the source text.
 */
export function stampScope(src, scope) {
  const visit = (node) => {
    // <selectedcontent> takes no attributes: the browser fills it with a clone of the selected option.
    if (node.type === NODE.ELEMENT && node.tagType === TAG.ELEMENT && node.tag !== 'selectedcontent') {
      // compiler-sfc caches the parse by source text, so the same AST can come back
      // already stamped: keep our own stamp, refuse another group's.
      const stamp = attribute(node, SCOPE_ATTRIBUTE);
      if (stamp?.synthetic) {
        if (stamp.value.content !== scope) throw new TemplateError(src.file, node, `stamped for two groups: ${stamp.value.content} and ${scope}`);
      } else if (stamp || node.props.some((p) => p.type === PROP.DIRECTIVE && p.arg?.content === SCOPE_ATTRIBUTE)) {
        throw new TemplateError(src.file, node, `the compiler stamps ${SCOPE_ATTRIBUTE}; remove it from the template`);
      } else node.props.unshift({ type: PROP.ATTRIBUTE, name: SCOPE_ATTRIBUTE, value: { content: scope }, synthetic: true });
    }
    (node.children ?? []).forEach(visit);
  };
  visit(src.root);
  return src;
}

/** The attributes an emitter renders: everything except structure directives and the host marker. */
export function renderedProps(el) {
  return el.props.filter((p) => {
    if (p.type === PROP.ATTRIBUTE) return p.name !== HOST_MARKER && p.name !== ATTRS_MARKER && p.name !== 'ref';
    if (['if', 'else-if', 'else', 'for', 'html'].includes(p.name)) return false;
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

/** Marks the element that receives the consumer's attributes (`aria-*`, `id`, ...) in React and Vue. */
export const ATTRS_MARKER = 'mp-attrs';

/**
 * Where a consumer's attributes land: the `mp-attrs` element (the one carrying the role,
 * when that is not the root), else the root. Its class stays on the root.
 */
export function attrsTarget(src, root) {
  const marked = [];
  const walk = (node) => {
    if (node.type === NODE.ELEMENT && attribute(node, ATTRS_MARKER)) marked.push(node);
    (node.children ?? []).forEach(walk);
  };
  walk(src.root);
  if (marked.length > 1) throw new TemplateError(src.file, marked[1], `only one element can be ${ATTRS_MARKER}`);
  if (marked[0] && marked[0].tag !== 'template' && (directive(marked[0], 'if') || directive(marked[0], 'for') || directive(marked[0], 'else') || directive(marked[0], 'else-if'))) {
    throw new TemplateError(src.file, marked[0], `the ${ATTRS_MARKER} element must always render`);
  }
  return marked[0] ?? root;
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
  if (el.props.some((p) => p.type === PROP.DIRECTIVE && !['bind', 'on', 'if', 'else-if', 'else', 'for', 'html'].includes(p.name))) {
    throw new TemplateError(src.file, el, 'only v-bind, v-on, v-if/v-else-if/v-else, v-for and v-html are supported');
  }
  if (directive(el, 'html') && meaningful(el.children).length) {
    throw new TemplateError(src.file, el, 'an element with v-html takes no content');
  }
  // `:style` takes a core's style bag (geometry custom properties, PRD D7). The
  // consumer's own style lands on the root and the mp-attrs element, so those
  // two never take one.
  if (el.props.some((p) => p.type === PROP.DIRECTIVE && p.name === 'bind' && p.arg?.content === 'style')) {
    const { root } = rootElement(src);
    if (el === root || attribute(el, HOST_MARKER) || attribute(el, ATTRS_MARKER)) {
      throw new TemplateError(src.file, el, ':style (a style bag) is not allowed on the root or the mp-attrs element');
    }
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

/* ------------------------------------------------------------------------ */
/* Composed children                                                        */
/* ------------------------------------------------------------------------ */

/** Native attributes a composed child takes besides its inputs; the front forwards them like a consumer's. */
const isNativeAttribute = (name) => ['class', 'id', 'title'].includes(name) || /^(aria|data)-/.test(name);
const isMemberPath = (exp) => /^[A-Za-z_$][\w$]*(\??\.[A-Za-z_$][\w$]*)*$/.test(exp.trim());

/** `{ a, b }` → ['a', 'b']; a slot's parameters are destructured by name. */
function slotParams(src, el, exp) {
  if (!exp) return [];
  const match = /^\s*\{([\s\w$,]*)\}\s*$/.exec(exp);
  if (!match) throw new TemplateError(src.file, el, `destructure a slot's parameters by name (#slot="{ a, b }"), not "${exp}"`);
  return match[1].split(',').map((name) => name.trim()).filter(Boolean);
}

/**
 * A composed child's use site, `<mp-x :input="…" @output="…" v-model:y="…">content</mp-x>`:
 * the child from the registry, and each binding sorted and checked against its manifest.
 * Null when the tag is not a registered element.
 *
 * @param {Map<string, object>} [components]  tag → registry entry (see `componentModels`)
 */
export function composedUse(src, el, components) {
  const child = components?.get(el.tag);
  if (!child) return null;
  const use = { child, inputs: [], outputs: [], models: [], attrs: [], binds: [], bag: null, slots: [], content: [] };
  const inputNamed = (name) => child.inputs.find((input) => input.name === camelCase(name));
  el.props.forEach((p) => {
    if (p.type === PROP.ATTRIBUTE) {
      if (inputNamed(p.name)) use.inputs.push({ name: inputNamed(p.name).name, exp: JSON.stringify(p.value?.content ?? ''), value: p.value?.content ?? '' });
      else if (isNativeAttribute(p.name)) use.attrs.push({ name: p.name, value: p.value?.content ?? '' });
      else throw new TemplateError(src.file, el, `<${el.tag}> has no input "${p.name}"`);
      return;
    }
    if (['if', 'else-if', 'else', 'for'].includes(p.name) || (p.name === 'bind' && p.arg?.content === 'key')) return;
    if (p.name === 'bind' && !p.arg) {
      use.bag = p.exp.content;
      return;
    }
    if (p.name === 'bind') {
      const name = p.arg.content;
      if (inputNamed(name)) use.inputs.push({ name: inputNamed(name).name, exp: p.exp.content });
      else if (isNativeAttribute(name)) use.binds.push({ name, exp: p.exp.content });
      else throw new TemplateError(src.file, el, `<${el.tag}> has no input "${name}"`);
      return;
    }
    if (p.name === 'on') {
      const output = child.outputs.find((o) => o.name === p.arg?.content);
      if (!output) throw new TemplateError(src.file, el, `<${el.tag}> has no output "${p.arg?.content}" (write the manifest's name)`);
      if (!isMemberPath(p.exp.content)) throw new TemplateError(src.file, el, `@${output.name} takes a handler path (view.onX), called with the output's payload`);
      use.outputs.push({ output, exp: p.exp.content.trim() });
      return;
    }
    if (p.name === 'model') {
      const input = inputNamed(p.arg?.content ?? '');
      if (!input?.model) throw new TemplateError(src.file, el, `v-model:${p.arg?.content} needs a model input of <${el.tag}>`);
      const output = child.outputs.find((o) => o.name === `${input.name}Change`);
      if (!output) throw new TemplateError(src.file, el, `v-model:${input.name} needs a ${input.name}Change output on <${el.tag}>`);
      if (!isMemberPath(p.exp.content)) throw new TemplateError(src.file, el, `v-model:${input.name} takes a ModelBinding path (view.x)`);
      use.models.push({ name: input.name, output, exp: p.exp.content.trim() });
      return;
    }
    if (p.name === 'slot') throw new TemplateError(src.file, el, `put #slot on a <template> inside <${el.tag}>`);
    throw new TemplateError(src.file, el, `<${el.tag}> takes inputs, native attributes, @outputs and v-model:x`);
  });
  const slotOf = (node) => (node.type === NODE.ELEMENT && node.tag === 'template' ? node.props.find((p) => p.type === PROP.DIRECTIVE && p.name === 'slot') : null);
  meaningful(el.children).forEach((node) => {
    const slot = slotOf(node);
    const name = slot ? (slot.arg?.content ?? 'default') : 'default';
    if (!child.slots.some((s) => s.name === name)) throw new TemplateError(src.file, node, `<${el.tag}> has no "${name}" slot`);
    if (!slot) {
      use.content.push(node);
      return;
    }
    const declared = child.slots.find((s) => s.name === name);
    const params = slotParams(src, node, slot.exp?.content);
    if (params.length && !declared.params) throw new TemplateError(src.file, node, `the "${name}" slot of <${el.tag}> takes no parameters`);
    if (name === 'default' && params.length) throw new TemplateError(src.file, node, 'a default slot takes no parameters');
    if (name === 'default') use.content.push(...node.children);
    else use.slots.push({ name, scoped: !!declared.params, params, children: node.children });
  });
  return use;
}

/** Every `mp-*` tag a template composes. */
export function composedTags(src, components) {
  return componentTags(src).filter((el) => components?.has(el.tag)).map((el) => el.tag);
}

/* ------------------------------------------------------------------------ */
/* Partials                                                                 */
/* ------------------------------------------------------------------------ */

const camelCase = (name) => name.replace(/-(\w)/g, (_, c) => c.toUpperCase());

/**
 * `<teleport :to="exp">`: its content renders into the element `exp` names, and
 * nothing renders while that is null (the server's case). React portals it, Vue
 * teleports it, Angular moves an embedded view's nodes and Lit renders into it.
 * It takes `:to` only: loop or guard it from a `<template>` around it, since Vue
 * cannot combine the null guard it needs with a `v-for` on the same element.
 * Returns the `:to` expression, or null for any other element.
 */
export function teleportTarget(src, el) {
  if (el.type !== NODE.ELEMENT || el.tag.toLowerCase() !== 'teleport') return null;
  const to = el.props.find((p) => p.type === PROP.DIRECTIVE && p.name === 'bind' && p.arg?.content === 'to');
  if (!to || el.props.length !== 1) throw new TemplateError(src.file, el, '<teleport> takes :to only (put v-if / v-for on a <template> around it)');
  return to.exp.content;
}

/** Every component tag (a partial or a composed element) in a template. */
export function componentTags(src) {
  const tags = [];
  const walk = (node) => {
    if (node.type === NODE.ELEMENT && node.tagType === TAG.COMPONENT && node.tag.toLowerCase() !== 'teleport') tags.push(node);
    (node.children ?? []).forEach(walk);
  };
  walk(src.root);
  return tags;
}

/** The partials a template calls by name: its imports, and itself. */
export function partialNames(src) {
  return new Set(componentTags(src).map((el) => el.tag).filter((tag) => tag === src.name || src.partialImports.has(tag)));
}

/**
 * A partial's use site, `<QbNode :node="child" />`: the partial (an import, or the template
 * itself), and its bindings checked against the partial's props. Null when the tag is no partial.
 *
 * @param {Map<string, object>} [partials]  name → source of the group's partials
 * @returns {{ partial: object, binds: { name: string, exp: string }[] } | null}
 */
export function partialUse(src, el, partials) {
  const self = el.tag === src.name;
  if (!self && !src.partialImports.has(el.tag)) return null;
  const partial = partials?.get(el.tag);
  if (!partial) {
    throw new TemplateError(src.file, el, self ? `<${el.tag}> is this template itself, which only a partial may call` : `<${el.tag}> is not a partial of this group`);
  }
  if (meaningful(el.children).length) throw new TemplateError(src.file, el, `a partial takes no content: its slots are filled from this template's own`);
  const binds = el.props.flatMap((p) => {
    if (p.type === PROP.ATTRIBUTE) return [{ name: camelCase(p.name), exp: JSON.stringify(p.value?.content ?? '') }];
    if (['if', 'else-if', 'else', 'for'].includes(p.name)) return [];
    if (p.name === 'bind' && p.arg?.content === 'key') return [];
    if (p.name === 'bind' && p.arg && !p.modifiers.length) return [{ name: camelCase(p.arg.content), exp: p.exp.content }];
    throw new TemplateError(src.file, el, `a partial takes :prop bindings only`);
  });
  const unknown = binds.find((b) => !partial.propNames.has(b.name));
  if (unknown) throw new TemplateError(src.file, el, `<${el.tag}> has no prop "${unknown.name}"`);
  const missing = partial.props.members.find((m) => !m.optional && !binds.some((b) => b.name === m.name));
  if (missing) throw new TemplateError(src.file, el, `<${el.tag}> needs its "${missing.name}" prop`);
  const unfilled = partial.slots.members.find((s) => !src.slots.members.some((m) => m.name === s.name));
  if (unfilled) throw new TemplateError(src.file, el, `<${el.tag}> has a "${unfilled.name}" slot this template does not declare`);
  return { partial, binds };
}

/**
 * The partials of one group: every source another one imports. A partial has no host,
 * no mp-attrs and no ref, takes named slots only, and two partials may not call each
 * other (only itself). `components` are the files a manifest names; any other source
 * that nothing imports is an orphan.
 *
 * @param {Map<string, object>} sources  file → source
 * @param {Set<string> | null} components  the manifest's template files, or null without one
 * @returns {Map<string, object>}  name → source
 */
export function groupPartials(sources, components) {
  const byFile = sources;
  const imported = new Set([...byFile.values()].flatMap((src) => [...src.partialImports.values()]));
  [...byFile.values()].forEach((src) =>
    src.partialImports.forEach((target, name) => {
      if (!byFile.has(target)) throw new Error(`${src.file}: no partial ${target} next to it (imported as ${name})`);
    }),
  );
  if (components) {
    const both = [...imported].find((file) => components.has(file));
    if (both) throw new Error(`${byFile.get(both).file}: a component's template cannot also be a partial`);
    const orphan = [...byFile.keys()].find((file) => !components.has(file) && !imported.has(file));
    if (orphan) throw new Error(`${byFile.get(orphan).file}: an orphan partial (no manifest element names it and no template imports it)`);
  }
  const partials = new Map([...imported].map((file) => [byFile.get(file).name, byFile.get(file)]));
  // Vue imports a partial under its name, so a type of that name would clash.
  [...byFile.values()].forEach((src) => {
    const clash = [...src.partialImports.keys(), ...(partials.has(src.name) ? [src.name] : [])].find((name) => src.importedTypes.has(name));
    if (clash) throw new Error(`${src.file}: the partial ${clash} has the name of an imported type; rename one of them`);
  });
  partials.forEach((src) => {
    if (src.slots.members.some((s) => s.name === 'default')) throw new Error(`${src.file}: a partial takes named slots only`);
    const marked = [];
    const walk = (node) => {
      if (node.type === NODE.ELEMENT && [HOST_MARKER, ATTRS_MARKER, 'ref'].some((name) => attribute(node, name))) marked.push(node);
      (node.children ?? []).forEach(walk);
    };
    walk(src.root);
    if (marked.length) throw new TemplateError(src.file, marked[0], 'a partial has no mp-host, mp-attrs or ref');
  });
  // Two partials calling each other: Angular would inline them into each other forever.
  const calls = (src) => [...partialNames(src)].filter((name) => name !== src.name);
  const visit = (name, path) => {
    if (path.includes(name)) throw new Error(`partials call each other: ${[...path.slice(path.indexOf(name)), name].join(' → ')} (only a partial calling itself is allowed)`);
    calls(partials.get(name)).forEach((next) => visit(next, [...path, name]));
  };
  partials.forEach((_, name) => visit(name, []));
  return partials;
}
