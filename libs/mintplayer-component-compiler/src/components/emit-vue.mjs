// The Vue component of a compiled component: an SFC over the template stage's
// SFC, hosting the core through `useCore` (PRD #437 D10). Props are declared
// at runtime (`PropType` casts), so Vue never has to resolve a core's types
// across packages; attributes fall through to the template's root.
import { banner, coreImports, jsdoc, styleImports } from './model.mjs';

const RUNTIME_TYPES = { string: 'String', boolean: 'Boolean', number: 'Number' };

function propLine(model, input) {
  const type = `${model.inputsType}['${input.name}']`;
  const runtime = RUNTIME_TYPES[input.kind];
  const typed = runtime ? `${runtime} as PropType<${type}>` : `null as unknown as PropType<${type}>`;
  return `${jsdoc(input.doc, '  ')}  ${input.name}: { type: ${typed}, default: ${input.default ?? 'undefined'} },`;
}

/**
 * @returns {{ file: string, text: string, exports: string[] }}
 */
export function emitVueComponent(model, { generator, runtime, extension }) {
  const { names } = model;
  const named = model.slots.filter((slot) => slot.name !== 'default');
  const hasDefault = model.slots.some((slot) => slot.name === 'default');
  const ext = model.extensions.vue;
  const has = (name) => !!ext?.exports.has(name);

  const script = [
    banner(model, generator),
    `import { useTemplateRef, type ComponentPublicInstance${model.inputs.length ? ', type PropType' : ''} } from 'vue';`,
    `import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';`,
    `import { useCore } from '${runtime}';`,
    coreImports(model, { values: [model.core], types: [model.inputsType, model.methodsType].filter(Boolean) }),
  ];
  styleImports(model)
    .filter(({ module }) => module !== model.entryModule)
    .forEach(({ module, names: list }) => script.push(`import { ${list.join(', ')} } from '${module}';`));
  script.push(`import ${model.templateName}Template from './${model.templateBase}.generated.vue';`);
  if (ext) script.push(`import { ${[...ext.exports].map((n) => `${n} as ext_${n}`).join(', ')} } from '${extension(ext.file)}';`);
  script.push('');
  if (model.doc) script.push(jsdoc(model.doc).trimEnd());
  script.push(`defineOptions({ name: '${names.component}' });`, '');

  script.push(`const props = defineProps({`, ...model.inputs.map((input) => propLine(model, input)), `});`);
  const models = model.inputs.filter((i) => i.model);
  if (model.outputs.length || models.length) {
    script.push(
      `const emit = defineEmits<{`,
      ...model.outputs.map((o) => `${jsdoc(o.doc, '  ')}  ${o.lower}: [detail: ${o.type}];`),
      ...models.map((i) => `  'update:${i.name}': [value: ${model.inputsType}['${i.name}']];`),
      `}>();`,
    );
  }
  script.push('');
  model.styles.forEach((style) => script.push(`installLightStyles(${style.scope}, ${style.sheet});`));
  script.push(`const template = useTemplateRef<ComponentPublicInstance>('template');`);
  const inputsFn = `() => ({ ${model.inputs.map((i) => `${i.name}: props.${i.name}`).join(', ')} })`;
  // An output is lowercased; a v-model update keeps its input name.
  const emit = model.outputs.length || models.length
    ? `(name, detail) => emit((name.startsWith('update:') ? name : name.toLowerCase()) as never, detail as never)`
    : `() => undefined`;
  script.push(
    `const core = useCore(${model.core}, ${has('extendInputs') ? `ext_extendInputs(${inputsFn})` : inputsFn}, {`,
    `  idPrefix: '${names.selector}',`,
    `  root: () => template.value?.$el as HTMLElement | undefined,`,
    `  emit: ${emit},`,
    ...(models.length ? [`  models: [${models.map((i) => `'${i.name}'`).join(', ')}],`] : []),
    `});`,
    `const templateProps = core.props;`,
  );
  if (model.methods.length) {
    script.push(
      `defineExpose({`,
      ...model.methods.map((method) => {
        const sig = `${model.methodsType}['${method.name}']`;
        return `${jsdoc(method.doc, '  ')}  ${method.name}: (...args: Parameters<${sig}>) => core.call('${method.name}', args) as ReturnType<${sig}>,`;
      }),
      `});`,
    );
  }

  const slots = [
    ...named.map((slot) =>
      slot.params
        ? `    <template v-if="$slots.${slot.name}" #${slot.name}="slotProps"><slot name="${slot.name}" v-bind="slotProps" /></template>`
        : `    <template v-if="$slots.${slot.name}" #${slot.name}><slot name="${slot.name}" /></template>`,
    ),
    ...(hasDefault ? ['    <slot />'] : []),
  ];
  const text = [
    `<script setup lang="ts">`,
    ...script,
    `</script>`,
    '',
    `<template>`,
    slots.length
      ? `  <${model.templateName}Template ref="template" v-bind="templateProps">\n${slots.join('\n')}\n  </${model.templateName}Template>`
      : `  <${model.templateName}Template ref="template" v-bind="templateProps" />`,
    `</template>`,
    '',
  ].join('\n');
  return { file: `${names.component}.generated.vue`, text: text.replace(/\n{3,}/g, '\n\n'), exports: [names.component] };
}
