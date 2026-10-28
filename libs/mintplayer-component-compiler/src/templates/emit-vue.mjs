// Vue: the source SFC is already a Vue component. The changes are dropping the
// markers that mean nothing to a front without a host element (`mp-host`,
// `mp-attrs`), dropping React-only select seeds, and routing the consumer's
// attributes to the `mp-attrs` element when that is not the root.
import { basename } from 'node:path';
import { ATTRS_MARKER, GENERATOR, HOST_MARKER, PROP, TemplateError, attrsTarget, componentTags, isSelectSeed, partialNames, partialUse, rootElement } from './source.mjs';

const walk = (node, visit) => {
  visit(node);
  (node.children ?? []).forEach((child) => walk(child, visit));
};

export function emitVue(src, { generator = GENERATOR, partials } = {}) {
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

  // A partial call forwards this template's slots into the partial, which declares a subset of them.
  componentTags(src).forEach((el) => {
    const use = partialUse(src, el, partials);
    if (!use) throw new TemplateError(src.file, el, `components are not supported (<${el.tag}>)`);
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

  const { root } = rootElement(src);
  const target = attrsTarget(src, root);
  let script = '';
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
    edits.push({ start: at, end: at, text: ' :class="$attrs.class" :style="$attrs.style"' });
    script += 'defineOptions({ inheritAttrs: false });\n';
  }

  const body = edits
    .sort((a, b) => b.start - a.start || b.end - a.end)
    .reduce((out, edit) => out.slice(0, edit.start) + edit.text + out.slice(edit.end), text)
    .replace(/(['"])\.\/([\w.-]+)\.view\.vue\1/g, '$1./$2.view.generated.vue$1');
  return header + (script ? body.replace(/(<script setup[^>]*>[\s\S]*?)(<\/script>)/, `$1${script}$2`) : body);
}
