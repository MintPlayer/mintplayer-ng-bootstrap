// The component stage's model: a group manifest, its view templates and each
// front's extension files, resolved into one description per component that
// the four emitters read (PRD #437 D10).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { attribute, attrsTarget, directive, rootElement } from '../templates/source.mjs';

const pascal = (name) => name.split(/[-_]/).map((part) => part[0].toUpperCase() + part.slice(1)).join('');
const camel = (name) => pascal(name).replace(/^./, (c) => c.toLowerCase());

/** The implicit role of a root element that becomes a custom element's host. */
const IMPLICIT_ROLES = {
  nav: 'navigation',
  main: 'main',
  aside: 'complementary',
  header: 'banner',
  footer: 'contentinfo',
  form: 'form',
  ul: 'list',
  ol: 'list',
  li: 'listitem',
  button: 'button',
  table: 'table',
  dialog: 'dialog',
};

/** Members `HTMLElement` already has: a Lit property or Angular input of that name breaks the element. */
const RESERVED = new Set(['props', 'slots', 'provided', 'elementRef', 'title', 'lang', 'dir', 'hidden', 'id', 'slot', 'style', 'className', 'tabIndex', 'role', 'inert', 'draggable', 'translate', 'children', 'shadowRoot', 'scrollHeight', 'scrollWidth', 'click', 'focus', 'blur', 'remove']);

/** What the Lit property options and the Vue runtime prop type need from a field. */
function inputKind(field) {
  if (field.kind !== undefined) return field.kind;
  const value = field.default?.trim();
  if (value === undefined) return false;
  if (value === 'true' || value === 'false') return 'boolean';
  if (/^['"`]/.test(value)) return 'string';
  if (/^-?\d/.test(value)) return 'number';
  return false;
}

/** Named exports of an extension file: `export const x`, `export function x`. */
function exportsOf(file) {
  const text = readFileSync(file, 'utf8');
  return new Set([...text.matchAll(/^export\s+(?:const|function|let|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]));
}

/**
 * @param {object} args
 * @param {object} args.group  The manifest's default export.
 * @param {string} args.entry  The entry directory name.
 * @param {string} args.corePackage  The core lib's package name; the entry imports as `<corePackage>/<entry>`.
 * @param {(element: string) => object} args.template  The parsed view template of an element.
 * @param {(front: string, element: string) => string | null} args.extension  An extension file's path, if one exists.
 * @param {(inputsType: string, member: string) => string[] | null} [args.literals]  A string input's literal members (literal-types.mjs).
 */
export function componentModels({ group, entry, corePackage, template, extension, literals = () => null, partials = new Map(), components = new Map() }) {
  const entryModule = `${corePackage}/${entry}`;
  const models = Object.entries(group.components).map(([element, manifest]) => {
    const src = template(manifest.template ?? `${element}.view.vue`);
    const { root, host } = rootElement(src);
    const where = `${entry}/${element}`;
    if (!root) throw new Error(`${where}: the template needs a single root element`);

    let hostExpression = null;
    if (host) {
      const bag = directive(root, 'bind');
      const expression = bag && !bag.arg ? bag.exp?.content?.trim() : null;
      if (!expression || !/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(expression)) {
        throw new Error(`${where}: an mp-host root needs one v-bind bag that is a plain prop path (e.g. view.root)`);
      }
      hostExpression = expression;
    }
    if (attribute(root, 'ref')?.value?.content !== 'root') throw new Error(`${where}: the template's root element needs ref="root"`);

    const fields = manifest.inputs?.fields ?? {};
    const inputs = Object.entries(fields).map(([name, field]) => {
      const kind = inputKind(field);
      // A string input typed as a literal union: the Lit attribute refuses any other value.
      const values = kind === 'string' ? literals(manifest.inputs?.type, name) : null;
      return { name, ...field, kind, values };
    });
    const clash = inputs.find((input) => RESERVED.has(input.name));
    if (clash) throw new Error(`${where}: input "${clash.name}" shadows an HTMLElement member; pick another name`);

    const slots = src.slots.members.map((member) => ({ name: member.name, params: member.paramType }));
    // A slot is a prop in React and Vue: one named like an input replaces it, silently.
    slots.forEach((slot) => {
      if (!/^[A-Za-z_$][\w$]*$/.test(slot.name)) throw new Error(`${where}: slot "${slot.name}" must be an identifier (camelCase); it names a prop and a directive`);
      if (inputs.some((input) => input.name === slot.name)) throw new Error(`${where}: slot "${slot.name}" has the name of an input; rename one of them`);
    });
    const names = manifest.names ?? {};
    const base = pascal(element);
    const extensions = Object.fromEntries(
      ['angular', 'react', 'vue', 'lit'].flatMap((front) => {
        const file = extension(front, element);
        return file && existsSync(file) ? [[front, { file, exports: exportsOf(file) }]] : [];
      }),
    );

    return {
      element,
      entry,
      entryModule,
      group,
      manifest,
      doc: manifest.doc ?? null,
      core: manifest.core,
      provides: manifest.provides ?? null,
      src,
      // The group's partials, by name, for the fronts that inline them (Angular).
      partials,
      // The registry of composable elements, by tag, with each one's module in this front.
      components,
      templateBase: src.file.replace(/^.*[\\/]/, '').replace(/\.vue$/, ''),
      templateName: src.name,
      rootTag: root.tag,
      // The element the consumer's attributes land on (mp-attrs), which types the React props.
      attrsTag: attrsTarget(src, root).tag,
      host,
      hostExpression,
      hostRole: host ? (IMPLICIT_ROLES[root.tag] ?? null) : null,
      propNames: src.props.members.map((m) => m.name),
      inputs,
      inputsType: manifest.inputs?.type ?? null,
      outputs: Object.entries(manifest.outputs ?? {}).map(([name, output]) => ({ name, lower: name.toLowerCase(), react: `on${name[0].toUpperCase()}${name.slice(1)}`, ...output })),
      methods: Object.entries(manifest.methods?.fields ?? {}).map(([name, method]) => ({ name, ...method })),
      methodsType: manifest.methods?.type ?? null,
      slots,
      styles: group.styles ?? [],
      names: {
        angular: names.angular ?? `Bs${base}Component`,
        selector: names.selector ?? `bs-${element}`,
        component: names.component ?? `Bs${base}`,
        lit: names.lit ?? `Mp${base}`,
        tag: names.tag ?? `mp-${element}`,
        slotDirective: (slot) => `Bs${base}${pascal(slot)}Directive`,
        slotSelector: (slot) => `bs${base}${pascal(slot)}`,
        file: element,
      },
      extensions,
      camel: camel(element),
      // Content queries (filled below): what this parent reads from its content,
      // and whether a parent queries this element or uses it as a `within`.
      content: [],
      queried: null,
      wrapsContent: false,
    };
  });
  return resolveContent(models, entry);
}

/** Links each manifest `content` query to the group's element models it names. */
function resolveContent(models, entry) {
  const byElement = new Map(models.map((model) => [model.element, model]));
  models.forEach((model) => {
    model.content = Object.entries(model.manifest.content ?? {}).map(([input, query]) => {
      const child = byElement.get(query.component);
      const within = query.within ? byElement.get(query.within) : null;
      if (!child) throw new Error(`${entry}/${model.element}: content query "${input}" names "${query.component}", which is not in the group`);
      if (query.within && !within) throw new Error(`${entry}/${model.element}: content query "${input}" names "${query.within}" as within, which is not in the group`);
      if (model.inputs.some((i) => i.name === input)) throw new Error(`${entry}/${model.element}: content query "${input}" is also a manifest input`);
      child.queried = { within };
      if (within) within.wrapsContent = true;
      return { input, child, within };
    });
  });
  return models;
}

/** Type names the generated front imports from the entry (or a style's `from`), grouped by module. */
const BUILTIN_TYPES = new Set(['string', 'number', 'boolean', 'null', 'undefined', 'void', 'unknown', 'any', 'never', 'object', 'Record', 'Array', 'ReadonlyArray', 'Partial', 'Readonly', 'Date']);

export function coreImports(model, { values = [], types = [], slotTypes = false, extraTypes = [] } = {}) {
  const modules = new Map();
  const add = (module, name, isType) => {
    if (!modules.has(module)) modules.set(module, new Map());
    const names = modules.get(module);
    if (!names.has(name) || !isType) names.set(name, isType);
  };
  values.forEach((name) => add(model.entryModule, name, false));
  model.styles
    .filter((style) => (style.from ?? model.entryModule) === model.entryModule)
    .forEach((style) => [style.scope, style.sheet].forEach((name) => add(model.entryModule, name, false)));
  types.forEach((name) => add(model.entryModule, name, true));
  // An output's type may be a builtin (`string`) or an expression (`Foo | null`): import its names only.
  model.outputs.forEach((output) =>
    (output.type.match(/\b[A-Za-z_]\w*\b/g) ?? [])
      .filter((name) => !BUILTIN_TYPES.has(name))
      .forEach((name) => add(output.from ?? model.entryModule, name, true)),
  );
  // Types a slot's parameters name (Angular's slot directives spell them out).
  (slotTypes ? model.slots : [])
    .flatMap((slot) => slot.params?.match(/\b[A-Za-z_]\w*\b/g) ?? [])
    .filter((name) => model.src.importedTypes.has(name))
    .forEach((name) => add(model.src.importedTypes.get(name), name, true));
  extraTypes.forEach(([module, name]) => add(module, name, true));
  return [...modules]
    .map(([module, names]) => {
      const list = [...names].sort(([a], [b]) => a.localeCompare(b)).map(([name, isType]) => (isType ? `type ${name}` : name));
      return `import { ${list.join(', ')} } from '${module}';`;
    })
    .join('\n');
}

/** `import { A, B } from '<module>';` per style module. */
export function styleImports(model) {
  const modules = new Map();
  model.styles.forEach((style) => {
    const module = style.from ?? model.entryModule;
    modules.set(module, [...(modules.get(module) ?? []), style.scope, style.sheet]);
  });
  return [...modules].map(([module, names]) => ({ module, names: [...new Set(names)].sort() }));
}

/** A JSDoc block from a doc string, indented. */
export function jsdoc(doc, indent = '') {
  if (!doc) return '';
  const lines = doc.split('\n');
  if (lines.length === 1) return `${indent}/** ${lines[0]} */\n`;
  return `${indent}/**\n${lines.map((line) => `${indent} *${line ? ` ${line}` : ''}`).join('\n')}\n${indent} */\n`;
}

/** The generated-file banner. */
export const banner = (model, generator, comment = '//') => `${comment} GENERATED from the ${model.group.group} manifest (${model.element}) by ${generator}. Do not edit.`;

export { pascal, camel };
