// The four fronts of a compiled directive (#458 §4.3): a core without a
// template, placed on an element the consumer renders. The core's `view`
// returns that element's bag; every front stamps it with the group's scope and
// installs the group's sheets, so the element opts in to them.
import { inputLine } from './emit-angular.mjs';
import { emitAngularOverlay, emitLitOverlay, emitReactOverlay, emitVueOverlay } from './emit-overlay-directives.mjs';
import { banner, coreImports, directiveBag, jsdoc, styleImports, styleInstall } from './model.mjs';

/** Sheet imports from another module than the entry. */
export const sheetImports = (model) =>
  styleImports(model)
    .filter(({ module }) => module !== model.entryModule)
    .map(({ module, names }) => `import { ${names.join(', ')} } from '${module}';`);

/** The manifest's defaults as an object literal, for the fronts whose binding passes only what the consumer wrote. */
export const defaultsObject = (model) => {
  const entries = model.inputs.filter((input) => input.default !== undefined).map((input) => `${input.name}: ${input.default}`);
  return entries.length ? `{ ${entries.join(', ')} }` : null;
};

export const finish = (lines) => lines.filter((line, i, all) => !(line === '' && all[i - 1] === '')).join('\n');

/** Angular: an attribute directive hosting the core through `useCore`, its bag on the host. */
export function emitAngularDirective(model, { generator, runtime = '@mintplayer/ng-bootstrap/machine' }) {
  if (model.overlay) return emitAngularOverlay(model, { generator, runtime });
  const { names } = model;
  const angular = new Set(['Directive']);
  if (model.inputs.length) angular.add('input');
  if (model.inputs.some((i) => i.kind === 'boolean')) angular.add('booleanAttribute');
  if (model.inputs.some((i) => i.kind === 'number')) angular.add('numberAttribute');
  if (model.outputs.length) angular.add('output');
  const lines = [
    banner(model, generator),
    `import { ${[...angular].sort().join(', ')} } from '@angular/core';`,
    `import { useCore${model.style ? ', useScopedStyles' : ''} } from '${runtime}';`,
    coreImports(model, { values: [model.core], types: [model.inputsType].filter(Boolean) }),
    ...sheetImports(model),
    '',
    jsdoc(model.doc).trimEnd(),
    `@Directive({ selector: '${names.selector}' })`,
    `export class ${names.angular} {`,
    ...model.inputs.map((input) => inputLine(model, input)),
    ...model.outputs.map((output) => `${jsdoc(output.doc, '  ')}  readonly ${output.name} = output<${output.type}>();`),
    '',
  ];
  const options = [
    `inputs: () => ({ ${model.inputs.map((i) => `${i.name}: this.${i.name}()`).join(', ')} })`,
    `idPrefix: 'bs-${model.element}'`,
    ...(model.outputs.length ? [`outputs: { ${model.outputs.map((o) => `${o.name}: this.${o.name}`).join(', ')} }`] : []),
    `hostBag: (props) => ${directiveBag(model, 'props')}`,
  ];
  lines.push(`  protected readonly core = useCore(${model.core}, { ${options.join(', ')} });`, '');
  if (model.style) lines.push(`  constructor() {`, `    ${styleInstall(model, 'useScopedStyles')}`, `  }`);
  lines.push(`}`, '');
  return { file: `${names.file}.generated.ts`, text: finish(lines), exports: [names.angular] };
}

/**
 * React: a hook returning the element's props, `ref` included. Combine them
 * with the consumer's own through `mergeProps`.
 */
export function emitReactDirective(model, { generator, runtime, scopedStyles }) {
  if (model.overlay) return emitReactOverlay(model, { generator, runtime, scopedStyles });
  const { names } = model;
  const optionsName = `${names.react[3].toUpperCase()}${names.react.slice(4)}Options`;
  // An array or object default is hoisted: a literal in the destructure is a new value each render.
  const literal = (input) => /^[[{]/.test(input.default.trim());
  const constName = (input) => `DEFAULT_${input.name.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`;
  const hoisted = model.inputs.filter((input) => input.default !== undefined && literal(input));
  const lines = [
    banner(model, generator),
    `import { useRef, useState } from 'react';`,
    ...(model.style ? [`import { installLightStyles } from '${scopedStyles}';`] : []),
    `import { reactProps, useCore } from '${runtime}';`,
    coreImports(model, { values: [model.core], types: [model.inputsType].filter(Boolean) }),
    ...sheetImports(model),
    '',
    `export interface ${optionsName} {`,
    ...model.inputs.map((input) => `${jsdoc(input.doc, '  ')}  ${input.name}?: ${model.inputsType}['${input.name}'];`),
    ...model.outputs.map((output) => `${jsdoc(output.doc, '  ')}  ${output.react}?: (detail: ${output.type}) => void;`),
    `}`,
    '',
    ...hoisted.map((input) => `const ${constName(input)}: ${model.inputsType}['${input.name}'] = ${input.default};`),
    '',
  ];
  const params = [
    ...model.inputs.map((input) => (input.default === undefined ? input.name : `${input.name} = ${literal(input) ? constName(input) : input.default}`)),
    ...model.outputs.map((o) => o.react),
  ];
  const emit = model.outputs.length
    ? `(name, detail) => { ${model.outputs.map((o) => `if (name === '${o.name}') ${o.react}?.(detail as ${o.type});`).join(' ')} }`
    : `() => undefined`;
  lines.push(
    jsdoc(model.doc).trimEnd(),
    `export function ${names.react}(${params.length ? `{ ${params.join(', ')} }` : '_options'}: ${optionsName} = {}) {`,
    ...(model.style ? [`  ${styleInstall(model, 'installLightStyles')}`] : []),
    `  const rootRef = useRef<HTMLElement | null>(null);`,
    // A callback ref: it fits any element type, where a RefObject<HTMLElement> would not.
    `  const [ref] = useState(() => (element: HTMLElement | null) => void (rootRef.current = element));`,
    `  const core = useCore(${model.core}, { ${model.inputs.map((i) => i.name).join(', ')} }, { idPrefix: 'bs-${model.element}', rootRef, emit: ${emit} });`,
    `  return { ...reactProps(${directiveBag(model, 'core.props')}), ref };`,
    `}`,
    '',
  );
  return {
    file: `${names.file}.generated.ts`,
    text: finish(lines),
    exports: [names.react, `type ${optionsName}`],
  };
}

/** Vue: a custom directive (`v-bs-row`); its value is the inputs object. */
export function emitVueDirective(model, { generator, runtime, scopedStyles }) {
  if (model.overlay) return emitVueOverlay(model, { generator, runtime, scopedStyles });
  const { names } = model;
  const defaults = defaultsObject(model);
  const options = [
    `idPrefix: 'bs-${model.element}'`,
    `bag: (props) => ${directiveBag(model, 'props')}`,
    ...(defaults ? [`defaults: ${defaults}`] : []),
    ...(model.style ? [`install: () => { ${styleInstall(model, 'installLightStyles')} }`] : []),
  ];
  const lines = [
    banner(model, generator),
    ...(model.style ? [`import { installLightStyles } from '${scopedStyles}';`] : []),
    `import { vueCoreDirective } from '${runtime}';`,
    // Outputs are DOM events here: their types are not named.
    coreImports({ ...model, outputs: [] }, { values: [model.core] }),
    ...sheetImports(model),
    '',
    jsdoc(model.doc).trimEnd(),
    `export const ${names.vue} = vueCoreDirective(${model.core}, { ${options.join(', ')} });`,
    '',
  ];
  return { file: `${names.file}.generated.ts`, text: finish(lines), exports: [names.vue] };
}

/** Lit: an element-part directive (`<div ${bsRow()}>`); its argument is the inputs object. */
export function emitLitDirective(model, { generator, runtime, scopedStyles }) {
  if (model.overlay) return emitLitOverlay(model, { generator, runtime, scopedStyles });
  const { names } = model;
  const defaults = defaultsObject(model);
  const options = [`idPrefix: 'mp-${model.element}'`, `bag: (props) => ${directiveBag(model, 'props')}`, ...(defaults ? [`defaults: ${defaults}`] : [])];
  const lines = [
    banner(model, generator),
    ...(model.style ? [`import { installLightStyles } from '${scopedStyles}';`] : []),
    `import { coreDirective } from '${runtime}';`,
    coreImports({ ...model, outputs: [] }, { values: [model.core] }),
    ...sheetImports(model),
    '',
  ];
  if (model.style) {
    lines.push(`// Angular's SSR DOM shim has a document with no usable head.`, `if (typeof document !== 'undefined' && document.head) {`, `  ${styleInstall(model, 'installLightStyles')}`, `}`, '');
  }
  lines.push(jsdoc(model.doc).trimEnd(), `export const ${names.lit} = coreDirective(${model.core}, { ${options.join(', ')} });`, '');
  return { file: `${names.file}.generated.ts`, text: finish(lines), exports: [names.lit] };
}
