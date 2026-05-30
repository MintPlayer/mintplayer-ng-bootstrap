import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpTreeSelect, type TreeSelectChangeEventDetail } from '@mintplayer/web-components/tree-select';

/**
 * React wrapper for `<mp-tree-select>`. Side-effect-registers the WC.
 *
 * Object/function props (`provider`, `value`, `*Template` render-callbacks)
 * are forwarded by @lit/react as element properties; string/boolean props
 * (`mode`, `variant`, `cascadeSelect`, …) flow through as attributes.
 *
 * A `*Template` callback must return a DOM `Node` (the WC inserts it directly),
 * e.g. `itemTemplate={(node) => { const s = document.createElement('span'); … }}`.
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
