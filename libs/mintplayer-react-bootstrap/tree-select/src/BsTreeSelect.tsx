import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpTreeSelect, type TreeSelectChangeEventDetail } from '@mintplayer/web-components/tree-select';

/**
 * React wrapper for `<mp-tree-select>`. Side-effect-registers the WC.
 *
 * Object props (`provider`, `value`) are forwarded by @lit/react as element
 * properties; string/boolean props (`mode`, `variant`, `cascadeSelect`, …) flow
 * through as attributes.
 *
 * Custom chips / single-value content are projected as light-DOM children with
 * `slot="chips"` / `slot="value"` (JSX children pass through), so the content
 * stays in React's tree and the document light DOM — Bootstrap CSS and DnD
 * libraries work. The consumer owns the `value.map(...)`:
 *
 * ```tsx
 * <BsTreeSelect mode="multiple" value={tags} provider={p} onValueChange={…}>
 *   {tags.map((t) => <span slot="chips" key={t.id} className="badge">{t.label}</span>)}
 * </BsTreeSelect>
 * ```
 *
 * `suggestionTemplate` remains a callback returning a DOM `Node` (dropdown rows
 * render inside the nested mp-treeview shadow).
 */
export const BsTreeSelect = createComponent({
  react: React,
  tagName: 'mp-tree-select',
  elementClass: MpTreeSelect,
  events: {
    onValueChange: 'value-change' as EventName<CustomEvent<TreeSelectChangeEventDetail>>,
    onOpen: 'open' as EventName<CustomEvent<void>>,
    onClose: 'close' as EventName<CustomEvent<void>>,
    onClear: 'clear' as EventName<CustomEvent<void>>,
    onSearch: 'search' as EventName<CustomEvent<{ query: string }>>,
    onLoadError: 'load-error' as EventName<CustomEvent<{ error: unknown }>>,
  },
});
