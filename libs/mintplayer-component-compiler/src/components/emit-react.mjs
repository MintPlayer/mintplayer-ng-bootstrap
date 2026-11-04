// The React component of a compiled component: a forwardRef component over the
// template stage's `<Name>Template`, hosting the core through `useCore` (PRD
// #437 D10). Props extend the root element's HTML attributes and the rest is
// spread onto the root; a named slot is a prop of the same name, typed as the template types it.
import { banner, coreImports, jsdoc, styleImports, styleInstall } from './model.mjs';

/**
 * @returns {{ file: string, text: string, exports: string[] }}
 */
/** The attrs element's tag map: an svg root is not in HTMLElementTagNameMap. */
const SVG_TAGS = new Set(['svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'text']);

export function emitReactComponent(model, { generator, runtime, extension, scopedStyles }) {
  const { names } = model;
  const element = model.rootType;
  const named = model.slots.filter((slot) => slot.name !== 'default');
  const slotNames = new Set(named.map((slot) => slot.name));
  // An input that is also a slot takes rich content in React: the node fills the slot.
  const inputs = model.inputs.filter((input) => !slotNames.has(input.name));
  const ext = model.extensions.react;
  const has = (name) => !!ext?.exports.has(name);
  const own = [...new Set([...model.inputs.map((i) => i.name), ...model.outputs.map((o) => o.react), ...model.changes.map((c) => c.react), ...named.map((s) => s.name)])];
  const propsName = `${names.component}Props`;

  const lines = [
    banner(model, generator),
    `import * as React from 'react';`,
    `import { forwardRef, useImperativeHandle, useRef } from 'react';`,
    `import { installLightStyles } from '${scopedStyles}';`,
    `import { ${model.content.some((c) => c.lends) ? 'lentSlots, ' : ''}${model.provides ? 'reactCoreContext, ' : ''}${model.content.length ? 'useContent, ' : ''}useCore } from '${runtime}';`,
    coreImports(model, { values: [model.core, ...(model.provides ? [model.provides] : [])], types: [model.inputsType].filter(Boolean) }),
  ];
  styleImports(model)
    .filter(({ module }) => module !== model.entryModule)
    .forEach(({ module, names: list }) => lines.push(`import { ${list.join(', ')} } from '${module}';`));
  lines.push(`import { ${model.templateName}Template, type ${model.templateName}TemplateProps } from './${model.templateBase}.generated';`);
  if (ext) lines.push(`import { ${[...ext.exports].map((n) => `${n} as ext_${n}`).join(', ')} } from '${extension(ext.file)}';`);
  // A content query matches its components by identity, so it imports them.
  [...new Set(model.content.flatMap(({ child, within }) => [child, within].filter(Boolean)))]
    .filter((other) => other !== model)
    .forEach((other) => lines.push(`import { ${other.names.component} } from './${other.names.component}.generated';`));
  if (model.provides) lines.push('', `const Context = reactCoreContext(${model.provides});`);
  lines.push('');

  // Props interface.
  lines.push(`export interface ${propsName} extends Omit<React.HTMLAttributes<${SVG_TAGS.has(model.attrsTag) ? 'SVGElementTagNameMap' : 'HTMLElementTagNameMap'}['${model.attrsTag}']>, ${own.map((n) => `'${n}'`).join(' | ') || 'never'}> {`);
  inputs.forEach((input) => lines.push(`${jsdoc(input.doc, '  ')}  ${input.name}?: ${model.inputsType}['${input.name}'];`));
  model.outputs.forEach((output) => lines.push(`${jsdoc(output.doc, '  ')}  ${output.react}?: (detail: ${output.type}) => void;`));
  model.changes.forEach((change) => lines.push(`  /** \`${change.input}\` changed from inside (two-way: pass the value back as \`${change.input}\`). */`, `  ${change.react}?: (value: ${change.type}) => void;`));
  // A slot prop takes what the template's slot takes: a node, or a function of the slot's args.
  named.forEach((slot) => lines.push(`  ${slot.name}?: NonNullable<${model.templateName}TemplateProps['slots']>['${slot.name}'];`));
  lines.push(`  children?: React.ReactNode;`, `}`, '');

  // An array or object default is hoisted: a literal in the destructure is a new value each
  // render, which the core reads as a changed input, re-renders on, and loops forever.
  const literal = (input) => /^[[{]/.test(input.default.trim());
  const hoisted = inputs.filter((input) => input.default !== undefined && literal(input));
  const constName = (input) => `DEFAULT_${input.name.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`;
  hoisted.forEach((input) => lines.push(`const ${constName(input)}: ${model.inputsType}['${input.name}'] = ${input.default};`));
  if (hoisted.length) lines.push('');

  const params = [
    ...inputs.map((input) => (input.default === undefined ? input.name : `${input.name} = ${literal(input) ? constName(input) : input.default}`)),
    ...model.outputs.map((o) => o.react),
    ...model.changes.map((c) => c.react),
    ...named.map((s) => s.name),
    'className',
    'children',
    '...rest',
  ];
  const inputsObject = `{ ${[
    ...model.inputs.map((input) => (slotNames.has(input.name) ? `${input.name}: undefined` : input.name)),
    ...model.content.map(({ input }) => `${input}: content_${input}`),
  ].join(', ')} }`;
  const emit = model.outputs.length
    ? `(name, detail) => { ${model.outputs.map((o) => `if (name === '${o.name}') ${o.react}?.(detail as ${o.type});`).join(' ')} }`
    : `() => undefined`;
  // The models' write-back: the runtime calls it when the core moves a model away from its prop.
  const writeModel = model.changes.length
    ? `(name, value) => { ${model.changes.map((c) => `if (name === '${c.input}') ${c.react}?.(value as ${c.type});`).join(' ')} }`
    : null;

  lines.push(jsdoc(model.doc).trimEnd());
  lines.push(`export const ${names.component} = forwardRef<${element}, ${propsName}>(function ${names.component}(`);
  lines.push(`  { ${params.join(', ')} },`, `  ref,`, `) {`);
  if (model.style) lines.push(`  ${styleInstall(model, 'installLightStyles')}`);
  lines.push(`  const rootRef = useRef<${element}>(null);`, `  useImperativeHandle(ref, () => rootRef.current as ${element});`);
  // A declaration's slot props are not inputs: the template renders them (<content-slot>).
  const query = ({ child, within, lends }) =>
    `{ type: ${child.names.component}${within ? `, within: ${within.names.component}` : ''}${lends ? `, slots: [${child.slots.map((s) => `'${s.name}'`).join(', ')}]` : ''} }`;
  model.content.forEach((c) => lines.push(`  const content_${c.input} = useContent(children, ${query(c)});`));
  model.content.filter((c) => c.lends).forEach((c) => lines.push(`  const lent_${c.input} = lentSlots(children, ${query(c)});`));
  const inputsExpr = has('useExtendInputs') ? `ext_useExtendInputs(${inputsObject}, { children })` : inputsObject;
  lines.push(
    `  const core = useCore(${model.core}, ${inputsExpr}, {`,
    `    idPrefix: '${names.selector}',`,
    `    label: rest['aria-label'],`,
    `    rootRef,`,
    `    emit: ${emit},`,
    ...(writeModel ? [`    models: [${model.changes.map((c) => `'${c.input}'`).join(', ')}],`, `    writeModel: ${writeModel},`] : []),
    `  });`,
  );
  const lent = model.content.filter((c) => c.lends);
  const slotsProp = (named.length ? ` slots={{ ${named.map((s) => s.name).join(', ')} }}` : '') + (lent.length ? ` contentSlots={{ ${lent.map((c) => `${c.input}: lent_${c.input}`).join(', ')} }}` : '');
  // An extension's `Children` component wraps the default slot's content (the nav item marks its link).
  // createElement: JSX would read the lowercase `ext_` alias as an intrinsic tag.
  const content = has('Children') ? '{React.createElement(ext_Children, null, children)}' : '{children}';
  const node = `<${model.templateName}Template {...core.props}${slotsProp} className={className} attrs={rest} rootRef={rootRef}>${content}</${model.templateName}Template>`;
  lines.push(model.provides ? `  return <Context.Provider value={core.provided}>${node}</Context.Provider>;` : `  return ${node};`);
  lines.push(`});`, '');

  return { file: `${names.component}.generated.tsx`, text: lines.join('\n').replace(/\n{3,}/g, '\n\n'), exports: [names.component, `type ${propsName}`] };
}
