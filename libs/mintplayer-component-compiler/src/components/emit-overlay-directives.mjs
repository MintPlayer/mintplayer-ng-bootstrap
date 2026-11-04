// The four fronts of an overlay directive (#458 M6: tooltip, popover). The
// directive's core runs on the consumer's element (the anchor) and its view
// returns `{ anchor, overlay }`: the anchor's bag, and the inputs of the group's
// panel component while it renders. Each front renders that panel into a body
// host with the consumer's content as its default slot.
import { inputLine } from './emit-angular.mjs';
import { propLine } from './emit-vue.mjs';
import { defaultsObject, finish, sheetImports } from './emit-directives.mjs';
import { banner, coreImports, jsdoc, styleInstall } from './model.mjs';

const angularImports = (model, extra) => {
  const names = new Set(extra);
  if (model.inputs.length) names.add('input');
  if (model.inputs.some((i) => i.kind === 'boolean')) names.add('booleanAttribute');
  if (model.inputs.some((i) => i.kind === 'number')) names.add('numberAttribute');
  if (model.outputs.length) names.add('output');
  return [...names].sort().join(', ');
};

/**
 * Angular: a structural directive (`<span *bsTooltip="'top'">…</span>` inside
 * the trigger). Its anchor is the element the template sits in; its template
 * is the panel's content.
 */
export function emitAngularOverlay(model, { generator, runtime }) {
  const { names, overlay } = model;
  const options = [
    `inputs: () => ({ ${model.inputs.map((i) => `${i.name}: this.${i.name}()`).join(', ')} })`,
    `idPrefix: 'bs-${model.element}'`,
    ...(model.outputs.length ? [`outputs: { ${model.outputs.map((o) => `${o.name}: this.${o.name}`).join(', ')} }`] : []),
    `element: this.#anchor`,
    `hostBag: (props) => props.anchor`,
  ];
  const lines = [
    banner(model, generator),
    `import { ${angularImports(model, ['Directive'])} } from '@angular/core';`,
    `import { anchorElement, useCore, useOverlayComponent${model.style ? ', useScopedStyles' : ''} } from '${runtime}';`,
    coreImports(model, { values: [model.core], types: [model.inputsType].filter(Boolean) }),
    ...sheetImports(model),
    `import { ${overlay.names.angular} } from './${overlay.names.file}.component.generated';`,
    '',
    jsdoc(model.doc).trimEnd(),
    `@Directive({ selector: '${names.selector}' })`,
    `export class ${names.angular} {`,
    ...model.inputs.map((input) => inputLine(model, input)),
    ...model.outputs.map((output) => `${jsdoc(output.doc, '  ')}  readonly ${output.name} = output<${output.type}>();`),
    '',
    `  /** The element the template sits in: the trigger. */`,
    `  readonly #anchor = anchorElement();`,
    `  protected readonly core = useCore(${model.core}, { ${options.join(', ')} });`,
    '',
    `  constructor() {`,
    ...(model.style ? [`    ${styleInstall(model, 'useScopedStyles')}`] : []),
    `    useOverlayComponent(${overlay.names.angular}, () => this.core.props().overlay, this.#anchor);`,
    `  }`,
    `}`,
    '',
  ];
  return { file: `${names.file}.generated.ts`, text: finish(lines), exports: [names.angular] };
}

/**
 * React: `const [props, overlay] = useBsTooltip({ position, content })`. Spread
 * `props` on the trigger (through `mergeProps` with your own) and render
 * `overlay` anywhere: it portals into a body host.
 */
export function emitReactOverlay(model, { generator, runtime, scopedStyles }) {
  const { names, overlay } = model;
  const optionsName = `${names.react[3].toUpperCase()}${names.react.slice(4)}Options`;
  const params = [
    ...model.inputs.map((input) => (input.default === undefined ? input.name : `${input.name} = ${input.default}`)),
    ...model.outputs.map((o) => o.react),
    'content',
  ];
  const emit = model.outputs.length
    ? `(name, detail) => { ${model.outputs.map((o) => `if (name === '${o.name}') ${o.react}?.(detail as ${o.type});`).join(' ')} }`
    : `() => undefined`;
  const lines = [
    banner(model, generator),
    `import { useRef, useState, type ReactNode } from 'react';`,
    ...(model.style ? [`import { installLightStyles } from '${scopedStyles}';`] : []),
    `import { BodyPortal, reactProps, useCore } from '${runtime}';`,
    coreImports(model, { values: [model.core], types: [model.inputsType].filter(Boolean) }),
    ...sheetImports(model),
    `import { ${overlay.names.component} } from './${overlay.names.component}.generated';`,
    '',
    `export interface ${optionsName} {`,
    ...model.inputs.map((input) => `${jsdoc(input.doc, '  ')}  ${input.name}?: ${model.inputsType}['${input.name}'];`),
    ...model.outputs.map((output) => `${jsdoc(output.doc, '  ')}  ${output.react}?: (detail: ${output.type}) => void;`),
    `  /** What the panel shows. */`,
    `  content?: ReactNode;`,
    `}`,
    '',
    jsdoc(model.doc).trimEnd(),
    `export function ${names.react}({ ${params.join(', ')} }: ${optionsName} = {}) {`,
    ...(model.style ? [`  ${styleInstall(model, 'installLightStyles')}`] : []),
    `  const rootRef = useRef<HTMLElement | null>(null);`,
    `  const [ref] = useState(() => (element: HTMLElement | null) => void (rootRef.current = element));`,
    `  const core = useCore(${model.core}, { ${model.inputs.map((i) => i.name).join(', ')} }, { idPrefix: 'bs-${model.element}', rootRef, emit: ${emit} });`,
    `  const panel = core.props.overlay;`,
    `  const node: ReactNode = panel ? (`,
    `    <BodyPortal from={rootRef}>`,
    `      <${overlay.names.component} {...panel}>{content}</${overlay.names.component}>`,
    `    </BodyPortal>`,
    `  ) : null;`,
    `  return [{ ...reactProps(core.props.anchor), ref }, node] as const;`,
    `}`,
    '',
  ];
  return { file: `${names.file}.generated.tsx`, text: finish(lines), exports: [names.react, `type ${optionsName}`] };
}

/**
 * Vue: a renderless component (S4: a custom directive cannot render a slot).
 *
 *     <BsTooltip position="top" v-slot="{ props }">
 *       <button v-bind="props">Save</button>
 *       <template #content>Saves the draft</template>
 *     </BsTooltip>
 */
export function emitVueOverlay(model, { generator, runtime, scopedStyles }) {
  const { names, overlay } = model;
  const component = names.vueComponent;
  const script = [
    `// ${banner(model, generator).slice(3)}`,
    `import { computed, shallowRef${model.inputs.length ? ', type PropType' : ''} } from 'vue';`,
    ...(model.style ? [`import { installLightStyles } from '${scopedStyles}';`] : []),
    `import { MpBodyTeleport, useCore } from '${runtime}';`,
    coreImports(model, { values: [model.core], types: [model.inputsType].filter(Boolean) }),
    ...sheetImports(model),
    `import ${overlay.names.component} from './${overlay.names.component}.generated.vue';`,
    '',
    ...(model.doc ? [jsdoc(model.doc).trimEnd()] : []),
    `defineOptions({ name: '${component}', inheritAttrs: false });`,
    '',
    `const props = defineProps({`,
    ...model.inputs.map((input) => propLine(model, input)),
    `});`,
    ...(model.outputs.length ? [`const emit = defineEmits<{`, ...model.outputs.map((o) => `${jsdoc(o.doc, '  ')}  ${o.name}: [detail: ${o.type}];`), `}>();`] : []),
    `defineSlots<{`,
    `  /** The trigger: bind \`props\` on it (\`v-bind="props"\`). */`,
    `  default?: (scope: { props: Record<string, unknown> }) => unknown;`,
    `  /** What the panel shows. */`,
    `  content?: () => unknown;`,
    `}>();`,
    '',
    ...(model.style ? [styleInstall(model, 'installLightStyles')] : []),
    `const anchor = shallowRef<HTMLElement | null>(null);`,
    `const core = useCore(${model.core}, () => ({ ${model.inputs.map((i) => `${i.name}: props.${i.name}`).join(', ')} }), {`,
    `  idPrefix: 'bs-${model.element}',`,
    `  root: () => anchor.value,`,
    `  emit: ${model.outputs.length ? '(name, detail) => emit(name as never, detail as never)' : '() => undefined'},`,
    `});`,
    `/** The trigger's element: a native element, or a component's root. */`,
    `const setAnchor = (el: unknown) => {`,
    `  const node = el instanceof HTMLElement ? el : (el as { $el?: unknown } | null)?.$el;`,
    `  anchor.value = node instanceof HTMLElement ? node : null;`,
    `};`,
    `/** The anchor bag; the template puts the consumer's attributes on the trigger first (it renders no element of its own). */`,
    `const anchorProps = computed(() => ({ ...core.props.value.anchor, ref: setAnchor }));`,
    `const panel = computed(() => core.props.value.overlay);`,
  ];
  const text = [
    `<script setup lang="ts">`,
    ...script,
    `</script>`,
    '',
    `<template>`,
    `  <slot v-bind="{ props: { ...$attrs, ...anchorProps } }" />`,
    `  <MpBodyTeleport v-if="panel">`,
    `    <${overlay.names.component} v-bind="panel"><slot name="content" /></${overlay.names.component}>`,
    `  </MpBodyTeleport>`,
    `</template>`,
    '',
  ].join('\n');
  return {
    file: `${component}.generated.vue`,
    text,
    exports: [component],
    barrel: (out) => `export { default as ${out.exports[0]} } from './${out.file}';`,
  };
}

/**
 * Lit: an element-part directive whose second argument is the content,
 * `html\`<button ${bsTooltip({ position: 'top' }, () => html\`Saves the draft\`)}>Save</button>\``.
 */
export function emitLitOverlay(model, { generator, runtime, scopedStyles }) {
  const { names, overlay } = model;
  const defaults = defaultsObject(model);
  const properties = overlay.inputs.map((input) => `.${input.name}=\${panel.${input.name}}`).join(' ');
  const options = [
    `idPrefix: 'mp-${model.element}'`,
    `bag: (props) => props.anchor`,
    ...(defaults ? [`defaults: ${defaults}`] : []),
    [
      `overlay: (props, content) => {`,
      `    const panel = props.overlay;`,
      `    return panel ? html\`<${overlay.names.tag} ${properties}>\${content?.()}</${overlay.names.tag}>\` : null;`,
      `  }`,
    ].join('\n'),
  ];
  const lines = [
    banner(model, generator),
    `import { html } from 'lit';`,
    ...(model.style ? [`import { installLightStyles } from '${scopedStyles}';`] : []),
    `import { coreDirective } from '${runtime}';`,
    coreImports({ ...model, outputs: [] }, { values: [model.core] }),
    ...sheetImports(model),
    `import './${overlay.names.tag}.generated';`,
    '',
  ];
  if (model.style) {
    lines.push(`// Angular's SSR DOM shim has a document with no usable head.`, `if (typeof document !== 'undefined' && document.head) {`, `  ${styleInstall(model, 'installLightStyles')}`, `}`, '');
  }
  lines.push(jsdoc(model.doc).trimEnd(), `export const ${names.lit} = coreDirective(${model.core}, {\n  ${options.join(',\n  ')},\n});`, '');
  return { file: `${names.file}.generated.ts`, text: finish(lines), exports: [names.lit] };
}
