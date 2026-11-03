// The four fronts of a declaration (#458 Q15): an element with inputs and slots
// but no core and no markup of its own. A parent of the group collects it with a
// content query and renders its slots with `<content-slot>`, so the declaration
// only has to hand them over:
//
// - Angular: a hidden component. Its default slot is `<ng-content>` inside an
//   `<ng-template>`, its named slots are structural directives (`*bsTabPageHeader`);
//   `contentSlots` exposes the TemplateRefs the parent renders.
// - React: a component rendering null; the parent reads its slot props and children.
// - Vue: a component rendering nothing; the parent reads its vnode's slot functions.
// - Lit: a hidden light-DOM element; it captures its `slot=` children and the
//   parent moves them into its own markup.
import { inputLine } from './emit-angular.mjs';
import { propertyOptions } from './emit-lit.mjs';
import { propLine } from './emit-vue.mjs';
import { banner, coreImports, jsdoc } from './model.mjs';

const named = (model) => model.slots.filter((slot) => slot.name !== 'default');
const lends = (model) => `Renders nothing itself: the parent that collects it renders its slots (${model.slots.map((slot) => slot.name).join(', ')}).`;
const docOf = (model) => [model.doc, lends(model)].filter(Boolean).join('\n\n');
const typesImport = (model) => coreImports(model, { types: [model.inputsType].filter(Boolean) });

/** @returns {{ file: string, text: string, exports: string[] }} */
export function emitAngularDeclaration(model, { generator }) {
  const { names } = model;
  const slots = named(model);
  const within = model.queried?.within ?? null;
  const parent = model.queried?.by ?? null;
  const angular = new Set(['ChangeDetectionStrategy', 'Component', 'TemplateRef', 'computed', 'viewChild']);
  if (model.inputs.length) angular.add('input');
  if (model.inputs.some((i) => i.kind === 'boolean')) angular.add('booleanAttribute');
  if (model.inputs.some((i) => i.kind === 'number')) angular.add('numberAttribute');
  if (slots.length) ['Directive', 'contentChild', 'inject'].forEach((n) => angular.add(n));
  if (within || parent) angular.add('inject');

  const lines = [banner(model, generator), `import { ${[...angular].sort().join(', ')} } from '@angular/core';`, typesImport(model)];
  if (within) lines.push(`import { ${within.names.angular} } from './${within.names.file}.component.generated';`);
  if (parent) lines.push(`import { ${parent.names.angular} } from './${parent.names.file}.component.generated';`);
  lines.push('');
  slots.forEach((slot) => {
    const directive = names.slotDirective(slot.name);
    lines.push(
      `/** The \`${slot.name}\` slot of \`<${names.selector}>\`: \`<ng-template ${names.slotSelector(slot.name)}>\` or \`*${names.slotSelector(slot.name)}\`.${slot.doc ? ` ${slot.doc}` : ''} */`,
      `@Directive({ selector: '[${names.slotSelector(slot.name)}]' })`,
      `export class ${directive} {`,
      `  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);`,
      `}`,
      '',
    );
  });
  const ownInputs = `({ ${model.inputs.map((i) => `${i.name}: this.${i.name}()`).join(', ')} })`;
  lines.push(
    jsdoc(docOf(model)).trimEnd(),
    `@Component({`,
    `  selector: '${names.selector}',`,
    `  template: '<ng-template #lent><ng-content /></ng-template>',`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    `  host: { hidden: '' },`,
    `})`,
    `export class ${names.angular} {`,
    ...model.inputs.map((input) => inputLine(model, input)),
    ...slots.map((slot) => `  private readonly ${slot.name}Slot = contentChild(${names.slotDirective(slot.name)});`),
    `  private readonly defaultSlot = viewChild<TemplateRef<unknown>>('lent');`,
    ...(parent ? [`  /** The nearest parent that collects this element; a nested one of the same kind owns it, not an outer one. */`, `  readonly contentParent = inject(${parent.names.angular}, { optional: true });`] : []),
    ...(within ? [`  readonly #contentWithin = inject(${within.names.angular}, { optional: true });`] : []),
    `  /** What a parent's content query reads from this element. */`,
    `  readonly contentChild = computed(() => ({ inputs: ${ownInputs}, within: ${within ? 'this.#contentWithin?.contentInputs() ?? null' : 'null'} }));`,
    `  /** The slots this element lends the parent that renders them. */`,
    `  readonly contentSlots = computed(() => ({ default: this.defaultSlot(), ${slots.map((slot) => `${slot.name}: this.${slot.name}Slot()?.templateRef`).join(', ')} }));`,
    `}`,
    '',
  );
  return {
    file: `${names.file}.component.generated.ts`,
    text: lines.join('\n').replace(/\n{3,}/g, '\n\n'),
    exports: [names.angular, ...slots.map((slot) => names.slotDirective(slot.name))],
  };
}

/** @returns {{ file: string, text: string, exports: string[] }} */
export function emitReactDeclaration(model, { generator }) {
  const { names } = model;
  const propsName = `${names.component}Props`;
  const lines = [
    banner(model, generator),
    `import * as React from 'react';`,
    typesImport(model),
    '',
    `export interface ${propsName} {`,
    ...model.inputs.map((input) => `${jsdoc(input.doc, '  ')}  ${input.name}?: ${model.inputsType}['${input.name}'];`),
    ...named(model).map((slot) => `${jsdoc(slot.doc, '  ')}  ${slot.name}?: React.ReactNode;`),
    `  children?: React.ReactNode;`,
    `}`,
    '',
    jsdoc(docOf(model)).trimEnd(),
    `export function ${names.component}(_props: ${propsName}): null {`,
    `  return null;`,
    `}`,
    '',
  ];
  return { file: `${names.component}.generated.tsx`, text: lines.join('\n').replace(/\n{3,}/g, '\n\n'), exports: [names.component, `type ${propsName}`] };
}

/** @returns {{ file: string, text: string, exports: string[] }} */
export function emitVueDeclaration(model, { generator }) {
  const { names } = model;
  const lines = [
    banner(model, generator),
    `import { defineComponent${model.inputs.length ? ', type PropType' : ''}, type SlotsType } from 'vue';`,
    typesImport(model),
    '',
    jsdoc(docOf(model)).trimEnd(),
    `export const ${names.component} = defineComponent({`,
    `  name: '${names.component}',`,
    `  props: {`,
    ...model.inputs.map((input) => `  ${propLine(model, input).replace(/\n {2}/g, '\n    ')}`),
    `  },`,
    `  slots: Object as SlotsType<{ ${model.slots.map((slot) => `${slot.name}?: () => unknown;`).join(' ')} }>,`,
    `  setup: () => () => null,`,
    `});`,
    '',
  ];
  return { file: `${names.component}.generated.ts`, text: lines.join('\n').replace(/\n{3,}/g, '\n\n'), exports: [names.component] };
}

/** @returns {{ file: string, text: string, exports: string[] }} */
export function emitLitDeclaration(model, { generator, runtime }) {
  const { names } = model;
  const converters = [...new Set(model.inputs.filter((i) => i.kind).map((i) => `${i.kind}Attribute`))].sort();
  const defaults = model.inputs.filter((input) => input.default !== undefined);
  const lines = [
    banner(model, generator),
    `import { LitElement, nothing } from 'lit';`,
    `import { ${[...converters, 'LightChildren', 'notifyContentChange'].join(', ')} } from '${runtime}';`,
    typesImport(model),
    '',
    jsdoc(docOf(model)).trimEnd(),
    `export class ${names.lit} extends LitElement {`,
    `  static override properties = {`,
    ...model.inputs.map((input) => `    ${input.name}: ${propertyOptions(input)},`),
    `  };`,
    '',
    ...model.inputs.map((input) => `${jsdoc(input.doc, '  ')}  declare ${input.name}: ${model.inputsType}['${input.name}'];`),
    `  readonly #children = new LightChildren(this);`,
    '',
    ...(defaults.length ? [`  constructor() {`, `    super();`, ...defaults.map((input) => `    this.${input.name} = ${input.default};`), `  }`, ''] : []),
    `  protected override createRenderRoot(): HTMLElement {`,
    `    return this;`,
    `  }`,
    '',
    `  override connectedCallback(): void {`,
    `    super.connectedCallback();`,
    `    this.hidden = true;`,
    `  }`,
    '',
    `  /** This element's inputs, as a parent's content query reads them. */`,
    `  get contentInputs(): Partial<${model.inputsType ?? 'Record<string, unknown>'}> {`,
    `    return { ${model.inputs.map((i) => `${i.name}: this.${i.name}`).join(', ')} };`,
    `  }`,
    '',
    `  /** The slots this element lends the parent that renders them: its captured children, by \`slot=\`. */`,
    `  get lentSlots(): Readonly<Record<string, Node[] | undefined>> {`,
    `    return this.#children.slots;`,
    `  }`,
    '',
    `  protected override willUpdate(): void {`,
    `    this.#children.capture();`,
    `  }`,
    '',
    `  protected override updated(): void {`,
    `    notifyContentChange(this);`,
    `  }`,
    '',
    `  override render() {`,
    `    return nothing;`,
    `  }`,
    `}`,
    '',
    `if (!customElements.get('${names.tag}')) {`,
    `  customElements.define('${names.tag}', ${names.lit});`,
    `}`,
    '',
    `declare global {`,
    `  interface HTMLElementTagNameMap {`,
    `    '${names.tag}': ${names.lit};`,
    `  }`,
    `}`,
    '',
  ];
  return { file: `${names.tag}.generated.ts`, text: lines.join('\n').replace(/\n{3,}/g, '\n\n'), exports: [names.lit] };
}
