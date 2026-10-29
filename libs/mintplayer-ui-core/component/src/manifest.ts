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
 *       style: { scope: 'navbar' },
 *       components: {
 *         'navbar-nav': {
 *           core: 'navbarNavCore',
 *           inputs: { type: 'NavbarNavInputs', fields: { align: { default: "'start'" } } },
 *         },
 *       },
 *     } satisfies ComponentGroup;
 *
 * Names in it (`core`, `inputs.type`, an output's `type`, the group sheet) are
 * exports of the group's entry point, or of `from` where given; the generated
 * fronts import them, so a typo is a type error there.
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

/** A content query: every `component` in the content, in document order. */
export interface ContentQuery {
  /** The queried element of the same group (`ribbon-tab`). */
  readonly component: string;
  /** An element of the same group that may wrap it; its inputs ride along as `within`. */
  readonly within?: string;
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
  /**
   * Content queries, keyed by the input they fill (the core's inputs type must
   * declare it as `readonly ContentChild[]`). Each front reads the inputs of the
   * named components in the consumer's content WHILE RENDERING (Angular
   * `contentChildren`, React `props.children`, Vue slot vnodes, Lit child
   * elements), so a parent can render what its children declare on the server.
   */
  readonly content?: Readonly<Record<string, ContentQuery>>;
  readonly names?: ComponentNames;
  /** The component's documentation, copied onto every front. */
  readonly doc?: string;
}

/**
 * The group's one scoped sheet (S15). The compiler stamps `data-mps=<scope>` on
 * every element its templates render, so a core's bags carry no scope. The
 * sheet is `<scope>.scoped.scss`, exported as `<camelScope>ScopedStyles` (the
 * codegen derives both from the file name, so the stamp and the sheet agree).
 * A group that renders another core's bags `@use`s that core's sheet in its own.
 */
export interface GroupStyle {
  /** The literal scope, e.g. `'navbar'`. */
  readonly scope: string;
  /** Module exporting the sheet; default the group's entry. */
  readonly from?: string;
}

export interface ComponentGroup {
  /** The entry point name; also the generated entry in every front lib. */
  readonly group: string;
  /** The sheet every component of the group installs, and the scope its templates are stamped with. */
  readonly style?: GroupStyle;
  /** Keyed by element name (`navbar`, `navbar-item`, …). */
  readonly components: Readonly<Record<string, ComponentManifest>>;
}
