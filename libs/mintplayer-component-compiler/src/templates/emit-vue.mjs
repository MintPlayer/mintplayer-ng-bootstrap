// Vue: the source SFC is already a Vue component. The changes are dropping the
// markers that mean nothing to a front without a host element (`mp-host`,
// `mp-attrs`), dropping React-only select seeds, and routing the consumer's
// attributes to the `mp-attrs` element when that is not the root.
import { basename } from 'node:path';
import { ATTRS_MARKER, BODY_TARGET, GENERATOR, HOST_MARKER, NODE, PROP, TemplateError, attrsTarget, componentTags, composedUse, contentSlotUse, instanceStyleUse, isSelectSeed, partialNames, partialUse, rootElement, teleportTarget } from './source.mjs';

/** The Vue slot-name prefix of one content query's lent slots; the component emitter names them alike. */
export const contentSlotPrefix = (query) => `content:${query}:`;

// `$attrs` values are `unknown`, which vue-tsc refuses for `class` and `style`: cast them to
// the element's own attribute types (a type-only import, erased from the output).
const ATTRS_TYPE_IMPORT = "import type { HTMLAttributes as MpHtmlAttributes } from 'vue';\n";
const typedClass = (exp) => `(${exp}) as MpHtmlAttributes['class']`;
const ATTRS_STYLE = "$attrs.style as MpHtmlAttributes['style']";

const walk = (node, visit) => {
  visit(node);
  (node.children ?? []).forEach((child) => walk(child, visit));
};

export function emitVue(src, { generator = GENERATOR, runtime = '@mintplayer/vue-bootstrap/machine', partials, components } = {}) {
  const header = `<!-- GENERATED from ${src.file.replace(/\\/g, '/')} by ${generator}. Do not edit. -->\n`;
  const text = src.sfcText;
  // AST offsets index the whole SFC; each edit replaces [start, end) of it.
  const edits = [];
  const remove = (loc) => {
    if (text.slice(loc.start.offset, loc.end.offset) !== loc.source) throw new Error(`${src.file}: template offsets do not match the source`);
    const start = text.slice(0, loc.start.offset).search(/\s+$/);
    edits.push({ start: start < 0 ? loc.start.offset : start, end: loc.end.offset, text: '' });
  };

  walk(src.root, (node) =>
    (node.props ?? [])
      .filter((p) => (p.type === PROP.ATTRIBUTE && (p.name === HOST_MARKER || p.name === ATTRS_MARKER)) || isSelectSeed(node, p))
      .forEach((p) => remove(p.loc)),
  );

  // The group's scope stamp (stampScope) has no source location: write it after the tag name.
  walk(src.root, (node) =>
    (node.props ?? [])
      .filter((p) => p.synthetic)
      .forEach((p) => {
        const at = node.loc.start.offset + 1 + node.tag.length;
        edits.push({ start: at, end: at, text: ` ${p.name}="${p.value.content}"` });
      }),
  );

  // A teleport renders nothing while its target is null (the server's case), as in the
  // other fronts; Vue's own <Teleport> would warn and mount nowhere.
  let bodyTeleport = false;
  walk(src.root, (node) => {
    const to = teleportTarget(src, node);
    if (to === null) return;
    if (to === BODY_TARGET) {
      // The overlay form (#458 §4.4): a runtime component around Vue's <Teleport to="body">.
      bodyTeleport = true;
      const start = node.loc.start.offset + 1;
      const toProp = node.props.find((p) => p.type === PROP.ATTRIBUTE && p.name === 'to');
      edits.push({ start: toProp.loc.start.offset, end: toProp.loc.end.offset, text: '' });
      edits.push({ start, end: start + node.tag.length, text: 'MpBodyTeleport' });
      if (!node.isSelfClosing) edits.push({ start: node.loc.end.offset - node.tag.length - 1, end: node.loc.end.offset - 1, text: 'MpBodyTeleport' });
      return;
    }
    const at = node.loc.start.offset + 1 + node.tag.length;
    edits.push({ start: at, end: at, text: ` v-if="${to}"` });
  });

  // A queried child's lent slot arrives as a slot of its own, named by query, position and
  // slot (`content:pages:0:header`): the component forwards each child's slot functions.
  let lends = false;
  walk(src.root, (node) => {
    const lent = node.type === NODE.ELEMENT ? contentSlotUse(src, node) : null;
    if (!lent) return;
    lends = true;
    const name = `'${contentSlotPrefix(lent.query)}' + (${lent.index}) + ':${lent.name}'`;
    edits.push({ start: node.loc.start.offset, end: node.loc.end.offset, text: `<slot :name="${name}" />` });
  });
  // An instance's own sheet: Vue's template compiler drops a literal <style>.
  walk(src.root, (node) => {
    const sheet = node.type === NODE.ELEMENT ? instanceStyleUse(src, node) : null;
    if (!sheet) return;
    edits.push({ start: node.loc.start.offset, end: node.loc.end.offset, text: `<component :is="'style'" v-if="${sheet.css}">{{ ${sheet.css} }}</component>` });
  });
  // Those names are computed, so the declared slots gain an index signature for them.
  const LENT_SLOTS = 'Record<string, (() => unknown) | undefined>';
  const slotsAt = lends ? text.indexOf('defineSlots<') : -1;
  if (slotsAt >= 0) edits.push({ start: slotsAt + 'defineSlots<'.length, end: slotsAt + 'defineSlots<'.length, text: `${LENT_SLOTS} & ` });

  // A partial call forwards this template's slots into the partial, which declares a subset of them.
  // A composed child is its Vue component, under its component name: an output listens
  // to the lowercased event the child emits, v-model:x binds a ModelBinding's value and set.
  const composed = new Map();
  componentTags(src).forEach((el) => {
    const use = composedUse(src, el, components);
    if (!use) return;
    composed.set(use.child.tag, use.child);
    const Name = use.child.names.component;
    const start = el.loc.start.offset + 1;
    edits.push({ start, end: start + el.tag.length, text: Name });
    if (!el.isSelfClosing) edits.push({ start: el.loc.end.offset - el.tag.length - 1, end: el.loc.end.offset - 1, text: Name });
    el.props
      .filter((p) => p.type === PROP.DIRECTIVE && (p.name === 'on' || p.name === 'model'))
      .forEach((p) => {
        const exp = p.exp.content.trim();
        const output = use.outputs.find((o) => o.output.name === p.arg.content);
        const text = output
          ? `@${output.output.lower}="${exp}"`
          : `:${p.arg.content}="${exp}.value" @update:${p.arg.content}="${exp}.set"`;
        edits.push({ start: p.loc.start.offset, end: p.loc.end.offset, text });
      });
  });
  const composedImports = [...composed.values()]
    .map((c) => (c.module.vue.endsWith('.vue') ? `import ${c.names.component} from '${c.module.vue}';\n` : `import { ${c.names.component} } from '${c.module.vue}';\n`))
    .join('');

  componentTags(src).forEach((el) => {
    if (composed.has(el.tag)) return;
    const use = partialUse(src, el, partials);
    if (!use) throw new TemplateError(src.file, el, `<${el.tag}> is neither a partial nor a registered component`);
    const forward = use.partial.slots.members
      .map((s) => (s.paramType
        ? `<template v-if="$slots.${s.name}" #${s.name}="scope"><slot name="${s.name}" v-bind="scope" /></template>`
        : `<template v-if="$slots.${s.name}" #${s.name}><slot name="${s.name}" /></template>`))
      .join('');
    if (!forward) return;
    const end = el.loc.end.offset;
    if (el.isSelfClosing) edits.push({ start: end - 2, end, text: `>${forward}</${el.tag}>` });
    else edits.push({ start: end - el.tag.length - 3, end: end - el.tag.length - 3, text: forward });
  });

  const { root, host } = rootElement(src);
  const target = attrsTarget(src, root);
  let script = composedImports + (bodyTeleport ? `import { MpBodyTeleport } from '${runtime}';\n` : '');
  if (lends && slotsAt < 0) script += `defineSlots<${LENT_SLOTS}>();\n`;
  // A partial imports its generated sibling; one that calls itself imports itself, since
  // Vue would name it after its generated file.
  if (partialNames(src).has(src.name)) script += `import ${src.name} from './${basename(src.file).replace(/\.vue$/, '')}.generated.vue';\n`;
  if (target && target !== root) {
    // The consumer's class and style stay on the root; everything else reaches the target.
    const bag = target.props.find((p) => p.type === PROP.DIRECTIVE && p.name === 'bind' && !p.arg);
    const merged = bag
      ? `{ ...${bag.exp.content}, ...$attrs, class: String(${bag.exp.content}['class'] ?? ''), style: undefined, role: String(${bag.exp.content}['role'] ?? $attrs['role'] ?? '') || undefined }`
      : `{ ...$attrs, class: undefined, style: undefined }`;
    if (bag) edits.push({ start: bag.loc.start.offset, end: bag.loc.end.offset, text: `v-bind="${merged}"` });
    else edits.push({ start: target.loc.start.offset + 1 + target.tag.length, end: target.loc.start.offset + 1 + target.tag.length, text: ` v-bind="${merged}"` });
    const at = root.loc.start.offset + 1 + root.tag.length;
    edits.push({ start: at, end: at, text: ` :class="${typedClass('$attrs.class')}" :style="${ATTRS_STYLE}"` });
    script += ATTRS_TYPE_IMPORT + 'defineOptions({ inheritAttrs: false });\n';
  } else if (host && root) {
    // The root takes the consumer's attributes itself. Vue's fallthrough would let a consumer
    // role replace the core's (#458: a role the core writes is its contract), so merge by hand.
    const bag = root.props.find((p) => p.type === PROP.DIRECTIVE && p.name === 'bind' && !p.arg);
    if (bag) {
      const b = bag.exp.content;
      edits.push({
        start: bag.loc.start.offset,
        end: bag.loc.end.offset,
        text: `v-bind="{ ...${b}, ...$attrs, class: undefined, style: undefined, role: String(${b}['role'] ?? $attrs['role'] ?? '') || undefined }" :class="${typedClass(`[${b}['class'], $attrs.class]`)}" :style="${ATTRS_STYLE}"`,
      });
      script += ATTRS_TYPE_IMPORT + 'defineOptions({ inheritAttrs: false });\n';
    }
  }

  const body = edits
    .sort((a, b) => b.start - a.start || b.end - a.end)
    .reduce((out, edit) => out.slice(0, edit.start) + edit.text + out.slice(edit.end), text)
    .replace(/(['"])\.\/([\w.-]+)\.view\.vue\1/g, '$1./$2.view.generated.vue$1');
  return header + (script ? body.replace(/(<script setup[^>]*>[\s\S]*?)(<\/script>)/, `$1${script}$2`) : body);
}
