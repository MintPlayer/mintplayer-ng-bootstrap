// The Lit element of a compiled component: a light-DOM LitElement over the
// template stage's `<name>Template()` function, hosting the core through
// `CoreController` (PRD #437 D10). Authored children are captured by
// `LightChildren` and placed by `slot="…"` into the template's slots.
import { banner, coreImports, jsdoc, scopedHostBag, styleImports, styleInstall } from './model.mjs';
import { rendererProperty, slotArgsType } from '../templates/emit-lit.mjs';

const LIT_TYPES = { string: 'String', boolean: 'Boolean', number: 'Number' };

function propertyOptions(input) {
  const options = [];
  if (input.kind) options.push(`type: ${LIT_TYPES[input.kind]}`);
  else options.push('attribute: false');
  // Removing an attribute restores the input's default, and show-labels="false" switches a
  // default-true flag off, as the hand-written elements did.
  if (input.kind) {
    const fallback = input.kind === 'boolean' ? input.default === 'true' : input.default ?? 'undefined';
    const values = input.values ? `, [${input.values.map((value) => `'${value}'`).join(', ')}]` : '';
    options.push(`converter: ${input.kind}Attribute(${fallback}${values})`);
  }
  // camelCase inputs take a kebab-case attribute (number-visible), as hand-written elements do.
  const kebab = input.name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  if (input.kind && kebab !== input.name) options.push(`attribute: '${kebab}'`);
  if (input.reflect && input.kind) options.push('reflect: true');
  return `{ ${options.join(', ')} }`;
}

/**
 * @returns {{ file: string, text: string, exports: string[] }}
 */
export function emitLitComponent(model, { generator, runtime, scopedStyles }) {
  const { names } = model;
  const slotNames = model.slots.map((slot) => slot.name);
  // Every slot also takes a render callback, the `<slot>Renderer` property: a composing
  // template passes its content that way, and a scoped slot's callback gets the args.
  const renderers = model.slots.map((slot) => ({ slot: slot.name, prop: rendererProperty(slot.name), args: slot.params ? slotArgsType(model.src, slot.name) : null }));
  const types = [model.inputsType, model.methodsType].filter(Boolean);

  const lines = [
    banner(model, generator),
    `import { LitElement } from 'lit';`,
    `import { installLightStyles } from '${scopedStyles}';`,
    `import { ${[...new Set(model.inputs.filter((i) => i.kind).map((i) => `${i.kind}Attribute`))].sort().map((name) => `${name}, `).join('')}${model.content.length ? 'ContentQuery, ' : ''}CoreController${slotNames.length ? ', LightChildren' : ''}${model.queried || model.wrapsContent ? ', notifyContentChange' : ''} } from '${runtime}';`,
    coreImports(model, { values: [model.core], types }),
  ];
  // A content query reads upgraded children, so their definitions come first.
  [...new Set(model.content.flatMap(({ child, within }) => [child, within].filter(Boolean)))]
    .filter((other) => other !== model)
    .forEach((other) => lines.push(`import './${other.names.tag}.generated';`));
  styleImports(model)
    .filter(({ module }) => module !== model.entryModule)
    .forEach(({ module, names: list }) => lines.push(`import { ${list.join(', ')} } from '${module}';`));
  lines.push(`import { ${[templateFunction(model), ...renderers.filter((r) => r.args).map((r) => `type ${r.args}`)].join(', ')} } from './${model.templateBase}.generated';`, '');

  lines.push(jsdoc(model.doc).trimEnd(), `export class ${names.lit} extends LitElement {`);
  lines.push(`  static override properties = {`, ...model.inputs.map((input) => `    ${input.name}: ${propertyOptions(input)},`), ...renderers.map((r) => `    ${r.prop}: { attribute: false },`), `  };`, '');
  model.inputs.forEach((input) => lines.push(`${jsdoc(input.doc, '  ')}  declare ${input.name}: ${model.inputsType}['${input.name}'];`));
  renderers.forEach((r) =>
    lines.push(
      `  /** Renders the ${r.slot} slot${r.args ? ', called per use' : ''}; wins over slot="${r.slot}" children. */`,
      `  declare ${r.prop}: ((${r.args ? `args: ${r.args}` : ''}) => unknown) | null | undefined;`,
    ),
  );
  if (model.inputs.length || renderers.length) lines.push('');
  if (slotNames.length) lines.push(`  readonly #children = new LightChildren(this);`);
  // Before the core: controllers update in the order they were added.
  model.content.forEach(({ input, child, within }) =>
    lines.push(`  readonly #content_${input} = new ContentQuery(this, '${child.names.tag}', ${within ? `'${within.names.tag}'` : 'null'});`),
  );
  const ownInputs = `({ ${model.inputs.map((i) => `${i.name}: this.${i.name}`).join(', ')} })`;
  const inputEntries = [...model.inputs.map((i) => `${i.name}: this.${i.name}`), ...model.content.map(({ input }) => `${input}: this.#content_${input}.value`)];
  const options = [`idPrefix: '${names.tag}'`, `inputs: () => ({ ${inputEntries.join(', ')} })`];
  if (model.host) {
    const bag = `props.${model.hostExpression}`;
    options.push(`hostBag: (props) => ${scopedHostBag(model, bag)}`);
  }
  const models = model.inputs.filter((i) => i.model);
  if (models.length) options.push(`models: [${models.map((i) => `'${i.name}'`).join(', ')}]`);
  lines.push(`  readonly #core = new CoreController(this, ${model.core}, { ${options.join(', ')} });`, '');

  const defaults = model.inputs.filter((input) => input.default !== undefined);
  if (defaults.length) {
    lines.push(`  constructor() {`, `    super();`, ...defaults.map((input) => `    this.${input.name} = ${input.default};`), `  }`, '');
  }
  lines.push(`  protected override createRenderRoot(): HTMLElement {`, `    return this;`, `  }`, '');
  if (slotNames.length) lines.push(`  protected override willUpdate(): void {`, `    this.#children.capture();`, `  }`, '');
  if (model.queried || model.wrapsContent) {
    lines.push(
      `  /** This element's inputs, as a parent's content query reads them. */`,
      `  get contentInputs(): Partial<${model.inputsType ?? 'Record<string, unknown>'}> {`,
      `    return ${ownInputs};`,
      `  }`,
      '',
      `  protected override updated(): void {`,
      `    notifyContentChange(this);`,
      `  }`,
      '',
    );
  }

  // An unscoped slot's callback is called here: the template renders its value.
  const callbacks = renderers.map((r) => `...(this.${r.prop} ? { ${JSON.stringify(r.slot)}: this.${r.prop}${r.args ? '' : '()'} } : {})`);
  const slots = slotNames.length ? (callbacks.length ? `, slots: { ...this.#children.slots, ${callbacks.join(', ')} }` : `, slots: this.#children.slots`) : '';
  lines.push(`  override render() {`, `    return ${templateFunction(model)}({ ...this.#core.props()${slots} });`, `  }`);

  model.methods.forEach((method) => {
    const sig = `${model.methodsType}['${method.name}']`;
    lines.push(
      '',
      jsdoc(method.doc, '  ').trimEnd(),
      `  ${method.name}(...args: Parameters<${sig}>): ReturnType<${sig}> {`,
      `    return this.#core.call('${method.name}', args) as ReturnType<${sig}>;`,
      `  }`,
    );
  });
  lines.push(`}`, '');

  if (model.style) {
    lines.push(
      `// Angular's SSR DOM shim has a document with no usable head.`,
      `if (typeof document !== 'undefined' && document.head) {`,
      `  ${styleInstall(model, 'installLightStyles')}`,
      `}`,
      '',
    );
  }
  lines.push(
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
  );
  return { file: `${names.tag}.generated.ts`, text: lines.filter((l, i, all) => !(l === '' && all[i - 1] === '')).join('\n'), exports: [names.lit] };
}

/** The template stage's Lit function name: `navbar-dropdown.view.vue` → `navbarDropdownTemplate`. */
function templateFunction(model) {
  return `${model.templateName[0].toLowerCase()}${model.templateName.slice(1)}Template`;
}
