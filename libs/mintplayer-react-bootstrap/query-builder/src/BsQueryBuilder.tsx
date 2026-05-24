import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpQueryBuilderElement,
  type Expression,
  type SavedQuery,
  type SortDescriptor,
} from '@mintplayer/web-components/query-builder';

/**
 * React wrapper for `<mp-query-builder>`. Side-effect-registers the WC via
 * the import above. Surfaces the WC's seven CustomEvents with full detail
 * typing.
 *
 * `schema`, `value`, `fieldsSelected`, `savedQueries` etc. are JS-object
 * props — pass them as objects and @lit/react forwards them as properties.
 */
export const BsQueryBuilder = createComponent({
  react: React,
  tagName: 'mp-query-builder',
  elementClass: MpQueryBuilderElement,
  events: {
    onQueryChange: 'query-change' as EventName<CustomEvent<{ tree: Expression }>>,
    onSaveQuery: 'save-query' as EventName<CustomEvent<SavedQuery>>,
    onLoadQuery: 'load-query' as EventName<CustomEvent<SavedQuery>>,
    onDeleteQuery: 'delete-query' as EventName<CustomEvent<{ id: string }>>,
    onSortByChange: 'sort-by-change' as EventName<CustomEvent<{ sortBy: SortDescriptor[] }>>,
    onSelectedFieldsChange: 'selected-fields-change' as EventName<CustomEvent<{ selectedFields: string[] }>>,
    onRootEntityChange: 'root-entity-change' as EventName<CustomEvent<{ rootEntity: string }>>,
  },
});
