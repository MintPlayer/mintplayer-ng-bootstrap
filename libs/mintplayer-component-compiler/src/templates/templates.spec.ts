/**
 * The view-template compiler, driven on inline sources. Each test pins one
 * translation rule in every front it touches, so a regression names the rule
 * and the front rather than showing up as a diff in a generated navbar.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { compileComponents, emitAngular, emitLit, emitReact, emitVue, readSource } from '../index.mjs';

const sfc = (template: string, script = 'defineProps<{ bag: Record<string, string | null>; label?: string }>();\ndefineSlots<{ default?: () => unknown }>();') =>
  `<script setup lang="ts">\n${script}\n</script>\n\n<template>\n${template}\n</template>\n`;

const read = (template: string, script?: string) => readSource('core/x/src/templates/demo.view.vue', sfc(template, script));
const RUNTIME = { runtime: '@test/machine' };

describe('emitters', () => {
  const src = read('<div v-bind="bag"><span v-if="label">{{ label }}</span><slot /></div>');

  it('Angular reads props as signals and projects the default slot', () => {
    const { text } = emitAngular(src);
    expect(text).toContain('[mpProps]="bag()"');
    expect(text).toContain('@if (label())');
    expect(text).toContain('{{ label() }}');
    expect(text).toContain('<ng-content');
  });

  it('React spreads the bag through the runtime and renders children', () => {
    const text = emitReact(src, RUNTIME);
    expect(text).toContain("from '@test/machine'");
    expect(text).toContain('reactProps(bag)');
    expect(text).toContain('{children ?? null}');
    expect(text).toContain('export function DemoTemplate(');
  });

  it('Lit binds the bag with props() and falls back for an absent slot', () => {
    const text = emitLit(src, RUNTIME);
    expect(text).toContain("import { props } from '@test/machine'");
    expect(text).toContain('${props(bag)}');
    expect(text).toContain('export function demoTemplate(');
  });

  it('Vue is the source minus the host marker', () => {
    const hosted = read('<div mp-host v-bind="bag"><slot /></div>');
    const text = emitVue(hosted);
    expect(text).toContain('<div v-bind="bag">');
    expect(text).not.toContain('mp-host');
  });

  it('React and Lit refuse to emit without a runtime module', () => {
    expect(() => emitReact(src)).toThrow(/runtime/);
    expect(() => emitLit(src)).toThrow(/runtime/);
  });
});

describe('mp-host', () => {
  const src = read('<nav mp-host v-bind="bag"><a v-bind="bag">x</a></nav>');

  it('Angular and Lit emit only the children; React keeps the element', () => {
    expect(emitAngular(src).text).not.toContain('<nav');
    expect(emitLit(src, RUNTIME)).not.toContain('<nav');
    expect(emitReact(src, RUNTIME)).toContain('<nav');
  });
});

describe('select value seed', () => {
  const src = read('<div v-bind="bag"><select v-bind="bag" :value.prop="label"><slot /></select></div>');

  it('React seeds defaultValue; Angular, Lit and Vue drop the binding', () => {
    expect(emitReact(src, RUNTIME)).toContain('defaultValue={label}');
    expect(emitAngular(src).text).not.toContain('[value]');
    expect(emitLit(src, RUNTIME)).not.toContain('.value=');
    expect(emitVue(src)).toContain('<select v-bind="bag">');
  });
});

describe('mp-attrs', () => {
  const src = read('<div v-bind="bag"><select mp-attrs v-bind="bag"><slot /></select></div>');

  it('React spreads the consumer attributes on the marked element, the class on the root', () => {
    const text = emitReact(src, RUNTIME);
    expect(text).toMatch(/<select \{\.\.\.reactFormProps\(bag\)\} \{\.\.\.attrs\}>/);
    expect(text).toMatch(/<div \{\.\.\.reactProps\(bag\)\} className=/);
  });

  it('Vue merges $attrs into the marked bag and keeps class and style on the root', () => {
    const text = emitVue(src);
    expect(text).toContain('defineOptions({ inheritAttrs: false });');
    expect(text).toContain(`<select v-bind="{ ...bag, ...$attrs, class: bag['class'], style: undefined }">`);
    expect(text).toContain('<div :class="$attrs.class" :style="$attrs.style" v-bind="bag">');
    expect(text).not.toContain('mp-attrs');
  });

  it('Angular and Lit drop the marker', () => {
    expect(emitAngular(src).text).not.toContain('mp-attrs');
    expect(emitLit(src, RUNTIME)).not.toContain('mp-attrs');
  });

  it('rejects a conditional target', () => {
    expect(() => emitReact(read('<div v-bind="bag"><select v-if="label" mp-attrs v-bind="bag"></select></div>'), RUNTIME)).toThrow(/always render/);
  });
});

describe('refusals', () => {
  it('rejects a function in an expression', () => {
    expect(() => emitAngular(read('<div :title="() => label"></div>'))).toThrow();
  });

  it('rejects an unknown identifier', () => {
    expect(() => emitAngular(read('<div :title="nope"></div>'))).toThrow();
  });

  it('rejects :style', () => {
    expect(() => emitAngular(read('<div :style="label"></div>'))).toThrow();
  });

  it('rejects a component', () => {
    expect(() => emitAngular(read('<Other />'))).toThrow();
  });
});

describe('compileComponents (templates)', () => {
  let dir: string;
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const setup = () => {
    dir = mkdtempSync(join(tmpdir(), 'component-compiler-'));
    mkdirSync(join(dir, 'core/x/src/templates'), { recursive: true });
    mkdirSync(join(dir, 'react/machine'), { recursive: true });
    writeFileSync(join(dir, 'core/x/src/templates/demo.view.vue'), sfc('<div v-bind="bag"><slot /></div>'));
    return {
      root: 'core',
      package: '@test/core',
      fronts: {
        angular: { outDir: (entry: string) => `ng/${entry}/generated` },
        react: { outDir: (entry: string) => `react/${entry}/src/generated`, runtime: { file: 'react/machine/react-props' } },
      },
    };
  };

  it('writes each front, imports a file runtime relatively, and is idempotent', async () => {
    const config = setup();
    const { stale } = await compileComponents(config, { cwd: dir });
    expect(stale.map((p: string) => p.split(String.fromCharCode(92)).join('/'))).toContain('react/x/src/generated/demo.view.generated.tsx');
    const react = readFileSync(join(dir, 'react/x/src/generated/demo.view.generated.tsx'), 'utf8');
    expect(react).toContain("from '../../../machine/react-props'");
    expect((await compileComponents(config, { cwd: dir })).stale).toEqual([]);
  });

  it('check reports stale files without writing them', async () => {
    const config = setup();
    const first = (await compileComponents(config, { cwd: dir, check: true })).stale;
    expect(first.length).toBeGreaterThan(0);
    expect((await compileComponents(config, { cwd: dir, check: true })).stale).toEqual(first);
  });

  it('rejects an unknown front', async () => {
    const config = setup();
    await expect(compileComponents({ ...config, fronts: { svelte: { outDir: () => 'x' } } } as never, { cwd: dir })).rejects.toThrow(/unknown front/);
  });
});
