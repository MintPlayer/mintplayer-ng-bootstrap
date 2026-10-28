// The Angular component of a compiled component: a standalone OnPush
// component over the template stage's `.html`, hosting the core through
// `useCore` (PRD #437 D10). Named slots become structural directives
// (`*bsNavbarBrand`); the default slot is `<ng-content />`.
import { banner, coreImports, jsdoc, styleImports } from './model.mjs';

const angularOutput = (output) => output.lower;

function inputLine(model, input) {
  const type = `${model.inputsType}['${input.name}']`;
  const transform = input.kind === 'boolean' ? 'booleanAttribute' : input.kind === 'number' ? 'numberAttribute' : null;
  const value = input.default ?? 'undefined';
  const call = input.model
    ? `model<${type}>(${value})`
    : transform
    ? `input<${type}, unknown>(${value}, { transform: ${transform} })`
    : input.default !== undefined
      ? `input<${type}>(${value})`
      : `input<${type}>()`;
  return `${jsdoc(input.doc, '  ')}  readonly ${input.name} = ${call};`;
}

/**
 * @returns {{ file: string, text: string, exports: string[] }}
 */
export function emitAngularComponent(model, { generator, runtime = '@mintplayer/ng-bootstrap/machine', extension }) {
  const { names } = model;
  const named = model.slots.filter((slot) => slot.name !== 'default');
  const ext = model.extensions.angular;
  const extNames = ext ? [...ext.exports] : [];
  const has = (name) => extNames.includes(name);

  const angularImports = new Set(['ChangeDetectionStrategy', 'Component', 'ElementRef', 'inject']);
  const oneWay = model.inputs.filter((i) => !i.model);
  if (oneWay.length) angularImports.add('input');
  if (oneWay.length < model.inputs.length) angularImports.add('model');
  if (oneWay.some((i) => i.kind === 'boolean')) angularImports.add('booleanAttribute');
  if (oneWay.some((i) => i.kind === 'number')) angularImports.add('numberAttribute');
  if (model.outputs.length) angularImports.add('output');
  if (named.length) angularImports.add('computed');
  if (named.length) ['contentChild', 'Directive', 'TemplateRef'].forEach((n) => angularImports.add(n));

  const machine = ['MpPropsDirective', 'useCore', 'useScopedStyles'];
  const provides = model.provides;
  if (provides) machine.push('provideCoreContext');

  const types = [model.inputsType, model.methodsType].filter(Boolean);
  const coreNames = [model.core];
  if (provides) coreNames.push(provides);
  const lines = [banner(model, generator), `import { ${[...angularImports].sort().join(', ')} } from '@angular/core';`];
  if (named.length) lines.push(`import { NgTemplateOutlet } from '@angular/common';`);
  lines.push(`import { ${[...new Set(machine)].sort().join(', ')} } from '${runtime}';`);
  lines.push(coreImports(model, { values: coreNames, types, slotTypes: true }));
  styleImports(model)
    .filter(({ module }) => module !== model.entryModule)
    .forEach(({ module, names: list }) => lines.push(`import { ${list.join(', ')} } from '${module}';`));
  if (ext) lines.push(`import { ${extNames.map((n) => `${n} as ext_${n}`).join(', ')} } from '${extension(ext.file)}';`);
  lines.push('');

  // Slot directives.
  named.forEach((slot) => {
    lines.push(
      `/** The \`${slot.name}\` slot of \`<${names.selector}>\`: \`<ng-template ${names.slotSelector(slot.name)}>\` or \`*${names.slotSelector(slot.name)}\`. */`,
      `@Directive({ selector: '[${names.slotSelector(slot.name)}]' })`,
      `export class ${names.slotDirective(slot.name)} {`,
      `  readonly templateRef = inject<TemplateRef<${slot.params ?? 'unknown'}>>(TemplateRef);`,
      `}`,
      '',
    );
  });

  const meta = [
    `  selector: '${names.selector}',`,
    `  templateUrl: './${model.templateBase}.generated.html',`,
    `  imports: [MpPropsDirective${named.length ? ', NgTemplateOutlet' : ''}],`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
  ];
  if (provides) meta.push(`  providers: [provideCoreContext(${provides}, ${names.angular})${has('providers') ? ', ...ext_providers' : ''}],`);
  else if (has('providers')) meta.push(`  providers: ext_providers,`);
  if (has('hostDirectives')) meta.push(`  hostDirectives: ext_hostDirectives,`);

  lines.push(jsdoc(model.doc).trimEnd(), `@Component({`, ...meta, `})`, `export class ${names.angular} {`);
  lines.push(`  /** The host element. */`, `  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);`, '');
  model.inputs.forEach((input) => lines.push(inputLine(model, input)));
  model.outputs.forEach((output) =>
    lines.push(`${jsdoc(output.doc, '  ')}  readonly ${angularOutput(output)} = output<${output.type}>();`),
  );
  if (model.inputs.length || model.outputs.length) lines.push('');

  named.forEach((slot) => lines.push(`  private readonly ${slot.name}Slot = contentChild(${names.slotDirective(slot.name)});`));
  if (named.length) {
    lines.push(
      `  /** The template's named slots. */`,
      `  protected readonly slots = computed(() => ({ ${named.map((slot) => `${slot.name}: this.${slot.name}Slot()?.templateRef`).join(', ')} }));`,
    );
  }

  const inputsObject = `({ ${model.inputs.map((i) => `${i.name}: this.${i.name}()`).join(', ')} })`;
  const inputsFn = has('extendInputs') ? `ext_extendInputs(() => ${inputsObject})` : `() => ${inputsObject}`;
  const options = [`inputs: ${inputsFn}`, `idPrefix: '${names.selector}'`];
  if (model.outputs.length) options.push(`outputs: { ${model.outputs.map((o) => `${o.name}: this.${angularOutput(o)}`).join(', ')} }`);
  if (model.host) {
    const bag = `props.${model.hostExpression}`;
    options.push(`hostBag: (props) => ${model.hostRole ? `({ ...${bag}, role: '${model.hostRole}' })` : bag}`);
  }
  const models = model.inputs.filter((i) => i.model);
  if (models.length) options.push(`models: { ${models.map((i) => `${i.name}: this.${i.name}`).join(', ')} }`);
  lines.push(`  readonly #core = useCore(${model.core}, { ${options.join(', ')} });`);
  if (provides) lines.push(`  /** What this component hands its content. */`, `  readonly provided = this.#core.provided;`);
  if (model.propNames.length) lines.push(`  /** The template's props. */`, `  protected readonly props = this.#core.props;`);
  lines.push('');

  lines.push(`  constructor() {`);
  model.styles.forEach((style) => lines.push(`    useScopedStyles(${style.scope}, ${style.sheet});`));
  lines.push(`  }`);

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

  const text = lines.filter((line) => line !== '').length ? lines.join('\n').replace(/\n{3,}/g, '\n\n') : '';
  return {
    file: `${names.file}.component.generated.ts`,
    text,
    exports: [names.angular, ...named.map((slot) => names.slotDirective(slot.name))],
  };
}
