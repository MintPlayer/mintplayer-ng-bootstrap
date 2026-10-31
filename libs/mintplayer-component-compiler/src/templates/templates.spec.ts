/**
 * The view-template compiler, driven on inline sources. Each test pins one
 * translation rule in every front it touches, so a regression names the rule
 * and the front rather than showing up as a diff in a generated navbar.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { compileComponents, emitAngular, emitLit, emitReact, emitVue, groupPartials, groupStyle, readSource, stampScope } from '../index.mjs';

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

describe('scope stamping (S15)', () => {
  const stamped = () =>
    stampScope(
      read('<div mp-host v-bind="bag"><span v-if="label">{{ label }}</span><select v-bind="bag"><button><selectedcontent></selectedcontent></button></select><slot /></div>'),
      'demo',
    );

  it('stamps every native element of the template, in every front', () => {
    const count = (text: string) => (text.match(/data-mps="demo"/g) ?? []).length;
    // div (the host), span, select, button; never <selectedcontent>, never a slot.
    expect(count(emitVue(stamped()))).toBe(4);
    expect(count(emitReact(stamped(), RUNTIME))).toBe(4);
    // Angular and Lit drop the mp-host element: their host is stamped through hostBag.
    expect(count(emitAngular(stamped()).text)).toBe(3);
    expect(count(emitLit(stamped(), RUNTIME))).toBe(3);
    expect(emitVue(stamped())).toMatch(/<selectedcontent>/);
  });

  it('is idempotent over the parser cache, and refuses a second scope', () => {
    // Every stamped() above parsed the same text, so they shared one cached AST.
    expect(() => stampScope(read('<div mp-host v-bind="bag"><span v-if="label">{{ label }}</span><select v-bind="bag"><button><selectedcontent></selectedcontent></button></select><slot /></div>'), 'other')).toThrow(/two groups/);
  });

  it('refuses a template that writes data-mps itself, static or bound', () => {
    expect(() => stampScope(read('<div v-bind="bag" data-mps="x"></div>'), 'demo')).toThrow(/stamps data-mps/);
    expect(() => stampScope(read('<div v-bind="bag" :data-mps="label"></div>'), 'demo')).toThrow(/stamps data-mps/);
  });

  it('takes one kebab-case literal scope per group and refuses the old styles list', () => {
    expect(groupStyle({ style: { scope: 'tree-select' } }, 'x')).toEqual({ scope: 'tree-select', sheet: 'treeSelectScopedStyles', from: null, bootstrap: [], bootstrapModule: '@mintplayer/ui-core/bootstrap' });
    expect(groupStyle({}, 'x')).toBeNull();
    expect(() => groupStyle({ style: { scope: 'TREE_SCOPE' } }, 'x')).toThrow();
    expect(() => groupStyle({ styles: [{ scope: 'A', sheet: 'a' }] }, 'x')).toThrow(/S15/);
  });

  it('installs the named Bootstrap parts in Bootstrap order and refuses unknown ones (#452)', () => {
    expect(groupStyle({ style: { scope: 'navbar', bootstrap: ['dropdown', 'navbar', 'nav'] } }, 'x').bootstrap).toEqual([
      'bootstrapDropdown',
      'bootstrapNav',
      'bootstrapNavbar',
    ]);
    expect(() => groupStyle({ style: { scope: 'x', bootstrap: ['bootstrap'] } }, 'x')).toThrow(/unknown Bootstrap part/);
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

describe('v-html', () => {
  const src = read('<div v-bind="bag"><code v-bind="bag" v-html="label"></code></div>');

  it('each front sets the markup its own way, as content rather than an attribute', () => {
    const angular = emitAngular(src);
    expect(angular.text).toContain('[innerHTML]="label() | mpTrustedHtml"');
    expect(angular.uses).toContain('MpTrustedHtmlPipe');
    expect(emitReact(src, RUNTIME)).toContain('dangerouslySetInnerHTML={{ __html: label }}');
    const lit = emitLit(src, RUNTIME);
    expect(lit).toContain("import { unsafeHTML } from 'lit/directives/unsafe-html.js'");
    expect(lit).toContain('${unsafeHTML(label)}</code>');
    expect(emitVue(src)).toContain('v-html="label"');
  });

  it('rejects content next to v-html', () => {
    expect(() => emitLit(read('<div v-bind="bag"><code v-html="label">x</code></div>'), RUNTIME)).toThrow(/takes no content/);
  });
});

describe('teleport', () => {
  const script =
    'defineProps<{ bag: Record<string, string | null>; hosts: Record<string, HTMLElement | null>; names: string[] }>();\ndefineSlots<{ pane?: (args: { pane: string }) => unknown }>();';
  const src = read(
    '<div v-bind="bag"><template v-for="name in names" :key="name"><teleport :to="hosts[name]"><slot name="pane" :pane="name" /></teleport></template></div>',
    script,
  );

  it('each front renders the content into the target, and nothing without one', () => {
    const angular = emitAngular(src).text;
    expect(angular).toContain('<ng-template [mpTeleport]="hosts()[name]">');
    expect(emitAngular(src).uses).toContain('MpTeleportDirective');
    const react = emitReact(src, RUNTIME);
    expect(react).toContain("import { createPortal } from 'react-dom';");
    expect(react).toMatch(/\{\(hosts\[name\]\) \? createPortal\(<>[\s\S]*renderSlot\(slots\.pane, \{ pane: name \}\)[\s\S]*<\/>, hosts\[name\]\) : null\}/);
    const lit = emitLit(src, RUNTIME);
    expect(lit).toContain("import { props, teleport } from '@test/machine'");
    expect(lit).toContain('${teleport(hosts[name], html`');
    expect(emitVue(src)).toContain('<teleport v-if="hosts[name]" :to="hosts[name]">');
  });

  it('takes :to only, so Vue can guard it', () => {
    expect(() => emitLit(read('<div v-bind="bag"><teleport v-if="label" :to="bag"></teleport></div>'), RUNTIME)).toThrow(/takes :to only/);
    expect(() => emitLit(read('<div v-bind="bag"><teleport></teleport></div>'), RUNTIME)).toThrow(/takes :to only/);
  });
});

describe('mp-attrs', () => {
  const src = read('<div v-bind="bag"><select mp-attrs v-bind="bag"><slot /></select></div>');

  it("React spreads the consumer attributes on the marked element, the class on the root, the core's role last", () => {
    const text = emitReact(src, RUNTIME);
    expect(text).toContain(
      `<select {...reactFormProps(bag)} {...attrs} role={(bag['role'] as string | null | undefined) ?? (attrs?.['role'] as string | undefined)}>`,
    );
    expect(text).toMatch(/<div \{\.\.\.reactProps\(bag\)\} className=/);
  });

  it("Vue merges $attrs into the marked bag, keeps class and style on the root and the core's role over a consumer's", () => {
    const text = emitVue(src);
    expect(text).toContain('defineOptions({ inheritAttrs: false });');
    expect(text).toContain(
      `<select v-bind="{ ...bag, ...$attrs, class: String(bag['class'] ?? ''), style: undefined, role: String(bag['role'] ?? $attrs['role'] ?? '') || undefined }">`,
    );
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

  it('rejects :style on the root, where the consumer style lands', () => {
    expect(() => emitAngular(read('<div :style="label"></div>'))).toThrow();
  });

  it('Lit keeps text-only content on the element line, so textContent carries no indentation', () => {
    const lit = emitLit(read('<div v-bind="bag">\n  <span v-if="label">\n    Hi {{ label }}\n  </span>\n</div>'), RUNTIME);
    expect(lit).toContain('<span>Hi ${label}</span>');
  });

  it('binds a style bag below the root in every front', () => {
    const styled = read('<div v-bind="bag"><span :style="bag"></span></div>');
    expect(emitAngular(styled).text).toContain('<span [style]="bag()">');
    expect(emitReact(styled, RUNTIME)).toContain('style={reactStyle(bag)}');
    expect(emitVue(styled)).toContain('<span :style="bag">');
    const lit = emitLit(styled, RUNTIME);
    expect(lit).toContain('style=${styleMap(bag)}');
    expect(lit).toContain("import { styleMap } from 'lit/directives/style-map.js';");
  });

  it('rejects a component', () => {
    expect(() => emitAngular(read('<Other />'))).toThrow();
  });
});

describe('partials', () => {
  const NODE_SCRIPT = "import type { Tree } from '@test/core/x';\ndefineProps<{ node: Tree }>();\ndefineSlots<{ editor?: (args: { ctx: number }) => unknown }>();";
  const node = readSource(
    'core/x/src/templates/tree-item.view.vue',
    sfc('<li v-bind="node.bag"><slot v-if="node.leaf" name="editor" :ctx="node.n" /><ul v-if="node.kids.length"><TreeItem v-for="k in node.kids" :key="k.id" :node="k" /></ul></li>', NODE_SCRIPT),
  );
  const PARENT_SCRIPT = "import type { Tree } from '@test/core/x';\nimport TreeItem from './tree-item.view.vue';\ndefineProps<{ tree: Tree }>();\ndefineSlots<{ editor?: (args: { ctx: number }) => unknown }>();";
  const parent = readSource('core/x/src/templates/tree.view.vue', sfc('<ul><TreeItem :node="tree" /></ul>', PARENT_SCRIPT));
  const partials = groupPartials(new Map([['tree.view.vue', parent], ['tree-item.view.vue', node]]), new Set(['tree.view.vue']));

  it('Angular inlines the partial once as an ng-template that recurses through its own outlet', () => {
    const { text, uses, partials: used } = emitAngular(parent, { partials });
    expect(text).toContain('<ng-container [ngTemplateOutlet]="partial_TreeItem" [ngTemplateOutletContext]="{ node: tree() }" />');
    expect(text.match(/<ng-template #partial_TreeItem mpPartialTreeItem let-pp_node="node">/g)).toHaveLength(1);
    expect(text).toContain('@for (k of pp_node.kids; track k.id)');
    expect(text).toContain('[ngTemplateOutletContext]="{ node: k }"');
    // The slot inside the partial reads the component's own slots.
    expect(text).toContain('@if (slots().editor; as slot_editor)');
    expect(uses).toContain('NgTemplateOutlet');
    expect(used).toEqual([node]);
  });

  it('React calls a function component of its own file and passes the slots down', () => {
    expect(emitReact(parent, { ...RUNTIME, partials })).toContain("import { TreeItemTemplate } from './tree-item.view.generated';");
    const self = emitReact(node, { ...RUNTIME, partials });
    expect(self).toContain('<TreeItemTemplate node={k} slots={slots} />');
    expect(self).not.toContain("from './tree-item.view.generated'");
  });

  it('Lit calls a template function and passes the slots down', () => {
    expect(emitLit(parent, { ...RUNTIME, partials })).toContain("import { treeItemTemplate } from './tree-item.view.generated';");
    expect(emitLit(node, { ...RUNTIME, partials })).toContain('${treeItemTemplate({ node: k, slots })}');
  });

  it('Vue imports the generated SFC, imports itself to recurse, and forwards the slots', () => {
    expect(emitVue(parent, { partials })).toContain("import TreeItem from './tree-item.view.generated.vue';");
    const self = emitVue(node, { partials });
    expect(self).toContain("import TreeItem from './tree-item.view.generated.vue';");
    expect(self).toContain('<template v-if="$slots.editor" #editor="scope"><slot name="editor" v-bind="scope" /></template></TreeItem>');
  });

  it('checks the bindings against the partial', () => {
    const call = (template: string) => readSource('core/x/src/templates/tree.view.vue', sfc(template, PARENT_SCRIPT));
    expect(() => emitAngular(call('<ul><TreeItem :nod="tree" /></ul>'), { partials })).toThrow(/no prop "nod"/);
    expect(() => emitAngular(call('<ul><TreeItem /></ul>'), { partials })).toThrow(/needs its "node" prop/);
    expect(() => emitAngular(call('<ul><TreeItem :node="tree">x</TreeItem></ul>'), { partials })).toThrow(/takes no content/);
  });

  it('rejects an orphan, a cycle between two partials, a component calling itself and a type clash', () => {
    expect(() => groupPartials(new Map([['tree.view.vue', parent], ['tree-item.view.vue', node], ['lost.view.vue', readSource('core/x/src/templates/lost.view.vue', sfc('<b />'))]]), new Set(['tree.view.vue']))).toThrow(/orphan/);
    const a = readSource('core/x/src/templates/a.view.vue', sfc('<b><B :bag="bag" /></b>', "import B from './b.view.vue';\ndefineProps<{ bag: Record<string, string> }>();"));
    const b = readSource('core/x/src/templates/b.view.vue', sfc('<i><A :bag="bag" /></i>', "import A from './a.view.vue';\ndefineProps<{ bag: Record<string, string> }>();"));
    const host = readSource('core/x/src/templates/host.view.vue', sfc('<p><A :bag="bag" /></p>', "import A from './a.view.vue';\ndefineProps<{ bag: Record<string, string> }>();"));
    expect(() => groupPartials(new Map([['host.view.vue', host], ['a.view.vue', a], ['b.view.vue', b]]), new Set(['host.view.vue']))).toThrow(/call each other/);
    expect(() => emitAngular(read('<div><Demo :bag="bag" /></div>'), { partials })).toThrow(/only a partial may call/);
    const clash = readSource('core/x/src/templates/tree.view.vue', sfc('<ul><TreeItem :node="tree" /></ul>', PARENT_SCRIPT.replace('type { Tree }', 'type { Tree, TreeItem }')));
    expect(() => groupPartials(new Map([['tree.view.vue', clash], ['tree-item.view.vue', node]]), new Set(['tree.view.vue']))).toThrow(/name of an imported type/);
  });
});

describe('composition', () => {
  const SCRIPT = 'defineProps<{ bag: Record<string, string | null>; view: { nodes: string[]; selected: { value: string; set: (v: string) => void }; onClick: (n: string) => void } }>();';
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  const tree = {
    tag: 'mp-tree',
    names: { angular: 'BsTreeComponent', component: 'BsTree', lit: 'MpTree', tag: 'mp-tree', selector: 'bs-tree', slotDirective: (s: string) => `BsTree${cap(s)}Directive`, slotSelector: (s: string) => `bsTree${cap(s)}` },
    inputs: [{ name: 'nodes' }, { name: 'selected', model: true }],
    outputs: [{ name: 'selectedChange', lower: 'selectedchange', react: 'onSelectedChange' }, { name: 'nodeClick', lower: 'nodeclick', react: 'onNodeClick' }],
    slots: [{ name: 'default', params: null }, { name: 'item', params: '{ node: string }' }],
    module: { angular: '@test/ng/tree', react: '../../tree/src/generated/index', vue: './bs-tree.generated.vue', lit: '@test/wc/tree' },
  };
  const components = new Map([['mp-tree', tree]]);
  const compose = (inner: string) => readSource('core/x/src/templates/demo.view.vue', sfc(`<div v-bind="bag">${inner}</div>`, SCRIPT));
  const src = compose('<mp-tree :nodes="view.nodes" v-model:selected="view.selected" @nodeClick="view.onClick" class="t" aria-label="Files"><template #item="{ node }"><b>{{ node }}</b></template><span>Empty</span></mp-tree>');

  it('Angular renders the child component, a model as value + change, a scoped slot as its directive', () => {
    const { text, composed } = emitAngular(src, { components });
    expect(text).toContain('<bs-tree class="t" aria-label="Files" [nodes]="view().nodes" [selected]="view().selected.value" (selectedChange)="view().selected.set($event)" (nodeclick)="view().onClick($event)">');
    expect(text).toContain('<ng-template bsTreeItem let-node="node">');
    expect(text).toMatch(/<\/ng-template>\s*<span>\s*Empty\s*<\/span>\s*<\/bs-tree>/);
    expect([...composed].map((c: { child: { tag: string }; slots: Set<string> }) => [c.child.tag, [...c.slots]])).toEqual([['mp-tree', ['item']]]);
  });

  it('React renders the child component with render props and children', () => {
    const text = emitReact(src, { ...RUNTIME, components });
    expect(text).toContain("import { BsTree } from '../../tree/src/generated/index';");
    expect(text).toContain('<BsTree className="t" aria-label="Files" nodes={view.nodes} selected={view.selected.value} onSelectedChange={view.selected.set} onNodeClick={view.onClick} item={({ node }) => (<>');
    expect(text).toMatch(/<span>\s*\{"Empty"\}\s*<\/span>\s*<\/BsTree>/);
  });

  it('Lit renders the element as owned, passing every slot as a renderer, never as children', () => {
    const text = emitLit(src, { ...RUNTIME, components });
    expect(text).toContain("import '@test/wc/tree';");
    expect(text).toContain("import type { MpTree } from '@test/wc/tree';");
    expect(text).toContain('<mp-tree data-mp-owned class="t" aria-label="Files" .nodes=${view.nodes} .selected=${view.selected.value} @selectedchange=${(e: CustomEvent) => e.target === e.currentTarget && view.selected.set(e.detail)} @nodeclick=${(e: CustomEvent) => e.target === e.currentTarget && view.onClick(e.detail)}');
    expect(text).toContain(".itemRenderer=${({ node }: Parameters<NonNullable<MpTree['itemRenderer']>>[0]) => html`");
    expect(text).toMatch(/\.defaultRenderer=\$\{\(\) => html`\s*<span>Empty<\/span>\s*`\}><\/mp-tree>/);
  });

  it('Vue renders the child component, a model as value + update, an output as its lowercased event', () => {
    const text = emitVue(src, { components });
    expect(text).toContain("import BsTree from './bs-tree.generated.vue';");
    expect(text).toContain('<BsTree :nodes="view.nodes" :selected="view.selected.value" @update:selected="view.selected.set" @nodeclick="view.onClick" class="t" aria-label="Files"><template #item="{ node }"><b>{{ node }}</b></template><span>Empty</span></BsTree>');
  });

  it("checks every binding against the child's manifest", () => {
    const fails = (inner: string, error: RegExp) => expect(() => emitAngular(compose(inner), { components })).toThrow(error);
    fails('<mp-tree :nodez="view.nodes" />', /no input "nodez"/);
    fails('<mp-tree spellcheck="x" />', /no input "spellcheck"/);
    fails('<mp-tree @nodeclick="view.onClick" />', /no output "nodeclick"/);
    fails('<mp-tree @nodeClick="view.onClick($event)" />', /takes a handler path/);
    fails('<mp-tree v-model:nodes="view.nodes" />', /needs a model input/);
    fails('<mp-tree><template #footer>x</template></mp-tree>', /no "footer" slot/);
    fails('<mp-tree v-slot:item="{ node }" />', /on a <template>/);
    expect(() => emitAngular(compose('<mp-list />'), { components })).toThrow(/neither a partial nor a registered component/);
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
