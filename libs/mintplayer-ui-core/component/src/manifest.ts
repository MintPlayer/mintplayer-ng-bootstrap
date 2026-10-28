/**
 * The manifest of a component group, `<group>/src/<group>.component.ts`
 * (PRD #437 D10). It is what `@mintplayer/nx-component-compiler` reads to
 * generate the four fronts, so it is plain data: Node loads it with its type
 * annotations stripped, which means it may only `import type`.
 *
 *     import type { ComponentGroup } from '@mintplayer/ui-core/component';
 *
 *     export default {
 *       group: 'navbar',
 *       styles: [{ scope: 'NAVBAR_SCOPE', sheet: 'navbarScopedStyles' }],
 *       components: {
 *         'navbar-nav': {
 *           core: 'navbarNavCore',
 *           inputs: { type: 'NavbarNavInputs', fields: { align: { default: "'start'" } } },
 *         },
 *       },
 *     } satisfies ComponentGroup;
 *
 * Names in it (`core`, `inputs.type`, an output's `type`, a style's `scope`
 * and `sheet`) are exports of the group's entry point, or of `from` where
 * given; the generated fronts import them, so a typo is a type error there.
 */

/** How a Lit property converts from its attribute; `false` keeps it a property only. */
export type InputKind = 'string' | 'boolean' | 'number' | false;

export interface InputField {
  /** A TypeScript expression for the default, e.g. `"'md'"` or `'false'`. Omitted: `undefined`. */
  readonly default?: string;
  /** Lit attribute conversion. Inferred from `default` (a string, boolean or number literal), else `false`. */
  readonly kind?: InputKind;
  /** Reflect the property to its attribute (Lit). */
  readonly reflect?: boolean;
  /**
   * Two-way: the core's state key of the same name is the live value, written
   * back when the core changes it (Angular model(), Vue v-model, Lit property).
   * React stays controlled through the matching `<name>Change` output.
   */
  readonly model?: boolean;
  readonly doc?: string;
}

export interface OutputField {
  /** The detail type, an export of the entry (or `from`). */
  readonly type: string;
  readonly from?: string;
  readonly doc?: string;
}

export interface MethodField {
  readonly doc?: string;
}

/** Per-front names, all derived from the element name unless given. */
export interface ComponentNames {
  /** Angular class; default `Bs<Pascal>Component`. */
  readonly angular?: string;
  /** Angular selector; default `bs-<element>`. */
  readonly selector?: string;
  /** React and Vue component; default `Bs<Pascal>`. */
  readonly component?: string;
  /** Lit class; default `Mp<Pascal>`. */
  readonly lit?: string;
  /** Custom element tag; default `mp-<element>`. */
  readonly tag?: string;
}

export interface ComponentManifest {
  /** The `ComponentCore` export. */
  readonly core: string;
  /** The `CoreContext` export the core `provides` to its content, if any. */
  readonly provides?: string;
  /** The template, under `templates/`; default `<element>.view.vue`. */
  readonly template?: string;
  readonly inputs?: {
    /** The core's inputs interface. */
    readonly type: string;
    readonly fields: Readonly<Record<string, InputField>>;
  };
  /**
   * Keyed by the core's event name, camelCase (`expandedChange`). Angular
   * outputs, Vue emits and Lit DOM events use it lowercased (`expandedchange`);
   * React props prefix it with `on` (`onExpandedChange`).
   */
  readonly outputs?: Readonly<Record<string, OutputField>>;
  readonly methods?: {
    /** The core's public method signatures (`ComponentCore`'s `M`). */
    readonly type: string;
    readonly fields: Readonly<Record<string, MethodField>>;
  };
  readonly names?: ComponentNames;
  /** The component's documentation, copied onto every front. */
  readonly doc?: string;
}

export interface GroupStyle {
  readonly scope: string;
  readonly sheet: string;
  /** Module exporting both; default the group's entry. */
  readonly from?: string;
}

export interface ComponentGroup {
  /** The entry point name; also the generated entry in every front lib. */
  readonly group: string;
  /** Sheets every component of the group installs. */
  readonly styles?: readonly GroupStyle[];
  /** Keyed by element name (`navbar`, `navbar-item`, …). */
  readonly components: Readonly<Record<string, ComponentManifest>>;
}
