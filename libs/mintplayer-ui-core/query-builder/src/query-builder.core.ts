import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import { DragController } from './drag/drag-controller';
import {
  addEmptyConditionTo,
  addEmptyGroupTo,
  addEmptySubqueryTo,
  changeConditionField,
  changeConditionOperator,
  collectDescendantIds,
  findNodeById,
  findParentGroup,
  moveNode,
  removeNode,
  setGroupLogic,
  updateCondition,
  type EntitySchema,
  type Expression,
  type Group,
  type Operator,
  type QueryBuilderMessages,
  type SavedQuery,
  type SortDescriptor,
} from './model';
import {
  DEFAULT_MAX_DEPTH,
  connectQueryBuilder,
  entityForNode,
  inputKey,
  mergeMessages,
  parseScalar,
  type QueryBuilderView,
  type ValueParse,
} from './query-builder';

/**
 * The query builder's core (PRD #437 D10): what the generated Angular, React,
 * Vue and Lit components host. `query-builder.component.ts` is their manifest
 * and `templates/query-builder.view.vue` their markup.
 *
 * The tree renders as flat rows (a group header, its children at the next
 * level, a sub-query's header followed by its body), complete on the server,
 * so a no-JS render shows the whole query. JS adds every edit, by delegation on
 * the root: each control names its command in `data-qb-act` and its node in
 * `data-qb-id`.
 */
export interface QueryBuilderInputs {
  /** The query. Two-way; null starts from an empty AND group. */
  query: Expression | null;
  schema: readonly EntitySchema[];
  /** The entity the root group filters. Two-way. */
  rootEntity: string;
  /** Show the toolbar (entity picker, columns, sort) when the schema has more than one entity. */
  multiEntityPickerEnabled: boolean;
  /** The projected columns' field names. Two-way; presentation only. */
  selectedFields: readonly string[];
  /** The sort, in priority order. Two-way. */
  sortBy: readonly SortDescriptor[];
  disabled: boolean;
  messages?: Partial<QueryBuilderMessages> | null;
  maxDepth: number;
  showPreview: boolean;
  showSavedQueries: boolean;
  savedQueries: readonly SavedQuery[];
}

export interface QueryBuilderState {
  query: Expression | null;
  rootEntity: string;
  selectedFields: readonly string[];
  sortBy: readonly SortDescriptor[];
  saveDraft: string;
  dragging: boolean;
  /** The raw text of the value input being typed in, so a re-render never reformats it. */
  drafts: Readonly<Record<string, string>>;
}

export interface SaveQueryDetail {
  name: string;
  tree: Expression;
}

export interface SavedQueryNameDetail {
  name: string;
}

export interface QueryBuilderEvents {
  queryChange: Expression;
  rootEntityChange: string;
  selectedFieldsChange: string[];
  sortByChange: SortDescriptor[];
  saveQuery: SaveQueryDetail;
  loadQuery: SavedQueryNameDetail;
  deleteQuery: SavedQueryNameDetail;
}

type Api = CoreApi<QueryBuilderInputs, QueryBuilderState, QueryBuilderEvents>;

/**
 * By instance id: each attached builder's value command. The view is pure and
 * has no host, so the `editor` slot's onChange reaches its builder through this.
 */
const valueCommands = new Map<string, (nodeId: string, value: unknown) => void>();

/** The tree as the view renders it: an empty group with a deterministic id stands in for null. */
const treeOf = (id: string, query: Expression | null): Expression =>
  query ?? { kind: 'group', id: `${id}-root`, logic: 'and', children: [] };

export const queryBuilderCore = defineCore<QueryBuilderInputs, QueryBuilderState, { view: QueryBuilderView }, QueryBuilderEvents>({
  state: (inputs) => ({
    query: inputs.query ?? null,
    rootEntity: inputs.rootEntity ?? '',
    selectedFields: inputs.selectedFields ?? [],
    sortBy: inputs.sortBy ?? [],
    saveDraft: '',
    dragging: false,
    drafts: {},
  }),
  view: ({ inputs, state, id, label }) => ({
    view: connectQueryBuilder({
      id,
      tree: treeOf(id, state.query),
      schema: inputs.schema ?? [],
      rootEntity: state.rootEntity,
      disabled: !!inputs.disabled,
      messages: mergeMessages(inputs.messages),
      maxDepth: inputs.maxDepth ?? DEFAULT_MAX_DEPTH,
      multiEntityPickerEnabled: !!inputs.multiEntityPickerEnabled,
      selectedFields: state.selectedFields,
      sortBy: state.sortBy,
      showPreview: !!inputs.showPreview,
      showSavedQueries: !!inputs.showSavedQueries,
      savedQueries: inputs.savedQueries ?? [],
      saveDraft: state.saveDraft,
      dragging: state.dragging,
      drafts: state.drafts,
      label,
      onValue: (nodeId, value) => valueCommands.get(id)?.(nodeId, value),
    }),
  }),
  attach: (api) => {
    const host = api.host;
    // The instance id rides on the root: the view's ids and the value command derive from it.
    const id = host.getAttribute('data-qb-instance') ?? '';
    const schema = () => api.inputs().schema ?? [];
    const disabled = () => !!api.inputs().disabled;
    const rootEntity = () => api.state().rootEntity;

    /**
     * The tree commands apply to. A non-group root is wrapped in the group the
     * view renders around it, so commands on that group find it.
     */
    const tree = (): Expression => {
      const q = treeOf(id, api.state().query);
      return q.kind === 'group' ? q : ({ kind: 'group', id: `${id}-synthetic`, logic: 'and', children: [q] } satisfies Group);
    };
    const entityNamed = (name: string | null): EntitySchema | null => schema().find((s) => s.name === name) ?? null;
    const entityOfNode = (nodeId: string) => entityNamed(entityForNode(tree(), schema(), rootEntity(), nodeId));

    const mutate = (next: Expression, drafts: Readonly<Record<string, string>> = {}) => {
      api.setState({ query: next, drafts });
      api.emit('queryChange', next);
    };

    // ── Focus after a rebuild, by node id ─────────────────────────────────
    const rowOf = (nodeId: string) =>
      [...host.querySelectorAll<HTMLElement>('[data-row-id]')].find((el) => el.getAttribute('data-row-id') === nodeId) ?? null;
    let refocusFrame = 0;
    const refocus = (nodeId: string) => {
      cancelAnimationFrame(refocusFrame);
      // Two frames: every front has rendered by then (Angular's scheduler races a frame).
      refocusFrame = requestAnimationFrame(() => {
        refocusFrame = requestAnimationFrame(() => {
          const row = rowOf(nodeId);
          // A condition and a sub-query are tab stops; a group's first button stands in for it.
          row?.querySelector<HTMLElement>('.qb-condition, .qb-subquery-header, .qb-add-condition')?.focus();
        });
      });
    };

    // ── Commands ──────────────────────────────────────────────────────────
    const setValue = (nodeId: string, value: unknown, drafts: Readonly<Record<string, string>> = {}) =>
      mutate(updateCondition(tree(), nodeId, { value }), drafts);
    valueCommands.set(id, (nodeId, value) => setValue(nodeId, value));

    const conditionOf = (nodeId: string) => {
      const node = findNodeById(tree(), nodeId);
      return node?.kind === 'condition' ? node : null;
    };

    const readValue = (el: HTMLInputElement | HTMLSelectElement, nodeId: string): void => {
      const node = conditionOf(nodeId);
      const field = node ? entityOfNode(nodeId)?.fields.find((f) => f.name === node.field) : undefined;
      if (!node || !field) return;
      const parse = el.getAttribute('data-qb-parse') as ValueParse;
      const index = Number(el.getAttribute('data-qb-index') ?? 0);
      const options = field.options ?? [];
      const optionValue = (raw: string) => options.find((opt) => String(opt.value) === raw)?.value ?? raw;
      if (parse === 'select') {
        setValue(nodeId, el.value === '' ? null : optionValue(el.value));
        return;
      }
      if (parse === 'multiselect') {
        setValue(nodeId, [...(el as HTMLSelectElement).selectedOptions].map((o) => optionValue(o.value)));
        return;
      }
      const drafts = { [inputKey(nodeId, node.field, node.operator, index)]: el.value };
      if (parse === 'n') {
        setValue(nodeId, { n: Math.max(1, Number.parseInt(el.value, 10) || 1) }, drafts);
        return;
      }
      const scalar = parseScalar(el.value, parse as 'string' | 'number' | 'integer' | 'date' | 'datetime');
      const shapeIsTuple = el.closest('.qb-editor-tuple') !== null;
      if (!shapeIsTuple) {
        setValue(nodeId, scalar, drafts);
        return;
      }
      const pair = Array.isArray(node.value) ? [node.value[0] ?? null, node.value[1] ?? null] : [null, null];
      setValue(nodeId, pair.map((v, k) => (k === index ? scalar : v)), drafts);
    };

    const addChip = (el: HTMLInputElement, nodeId: string) => {
      const raw = el.value.trim();
      const node = conditionOf(nodeId);
      if (!raw || !node) return;
      const parse = el.getAttribute('data-qb-parse');
      const parsed = parse === 'chip-integer' ? Number.parseInt(raw, 10) : parse === 'chip-number' ? Number(raw) : raw;
      el.value = '';
      setValue(nodeId, [...(Array.isArray(node.value) ? node.value : []), parsed]);
    };

    const removeAt = (nodeId: string) => {
      const t = tree();
      if (t.id === nodeId) return;
      // The removed row held focus (its Remove button): re-home on its parent group.
      refocus(findParentGroup(t, nodeId)?.parent.id ?? t.id);
      mutate(removeNode(t, nodeId));
    };

    const keyboardMove = (nodeId: string, direction: 'up' | 'down') => {
      const t = tree();
      const located = findParentGroup(t, nodeId);
      if (!located) return;
      const index = direction === 'up' ? located.index - 1 : located.index + 1;
      if (index < 0 || index >= located.parent.children.length) return;
      refocus(nodeId);
      mutate(moveNode(t, nodeId, located.parent.id, index));
    };

    const emitSort = (next: SortDescriptor[]) => {
      api.setState({ sortBy: next });
      api.emit('sortByChange', next);
    };
    const projectable = () => entityNamed(rootEntity())?.fields.filter((f) => f.type !== 'relation') ?? [];

    // ── Drag and drop ─────────────────────────────────────────────────────
    const drag = new DragController();
    const onMove = (e: PointerEvent) => drag.move(e);
    const stopListening = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
    const onUp = (e: PointerEvent) => {
      // Read the source BEFORE end(): end() resets the controller.
      const source = drag.source();
      const target = drag.end(e);
      stopListening();
      api.setState({ dragging: false });
      if (!source || !target) return;
      // Across a sub-query boundary the fields change: moveNode resets what the target entity lacks.
      const targetSchema = target.qbRoot !== source.qbRoot ? entityOfNode(target.parentId) ?? undefined : undefined;
      mutate(moveNode(tree(), source.id, target.parentId, target.index, targetSchema));
    };
    const onCancel = () => {
      drag.cancel();
      stopListening();
      api.setState({ dragging: false });
    };
    const startDrag = (handle: HTMLElement, nodeId: string, e: PointerEvent) => {
      const source = findNodeById(tree(), nodeId);
      const rowElement = handle.closest<HTMLElement>('[data-row-id]');
      if (!source || !rowElement || disabled()) return;
      drag.start(
        {
          id: nodeId,
          descendantIds: collectDescendantIds(source),
          qbRoot: `entity:${entityForNode(tree(), schema(), rootEntity(), nodeId) ?? ''}`,
          rowElement,
        },
        e,
      );
      api.setState({ dragging: true });
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    };

    // ── Delegation ────────────────────────────────────────────────────────
    const actOf = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('[data-qb-act]');
      return el && host.contains(el) ? { el, act: el.getAttribute('data-qb-act') ?? '', nodeId: el.getAttribute('data-qb-id') ?? '' } : null;
    };

    const onClick = (e: MouseEvent) => {
      const hit = actOf(e);
      if (!hit || disabled() && hit.act !== 'load' && hit.act !== 'delete') return;
      const { el, act, nodeId } = hit;
      const t = tree();
      const index = Number(el.getAttribute('data-qb-index') ?? 0);
      const name = el.getAttribute('data-name') ?? '';
      switch (act) {
        case 'logic-and':
        case 'logic-or': {
          const logic = act === 'logic-and' ? 'and' : 'or';
          const group = findNodeById(t, nodeId);
          if (group?.kind === 'group' && group.logic !== logic) mutate(setGroupLogic(t, nodeId, logic));
          return;
        }
        case 'add-condition': {
          const entity = entityOfNode(nodeId);
          if (entity) mutate(addEmptyConditionTo(t, nodeId, entity));
          return;
        }
        case 'add-group':
          mutate(addEmptyGroupTo(t, nodeId, 'and'));
          return;
        case 'add-subquery': {
          const entity = entityOfNode(nodeId);
          if (entity) mutate(addEmptySubqueryTo(t, nodeId, entity));
          return;
        }
        case 'remove':
          removeAt(nodeId);
          return;
        case 'chip-remove': {
          const node = conditionOf(nodeId);
          if (!node || !Array.isArray(node.value)) return;
          setValue(nodeId, node.value.filter((_, k) => k !== index));
          // The chip and its button are gone: keep focus in the editor.
          refocusChipInput(nodeId);
          return;
        }
        case 'sort-remove':
          emitSort(api.state().sortBy.filter((_, k) => k !== index));
          return;
        case 'sort-add': {
          const fields = projectable();
          const used = new Set(api.state().sortBy.map((s) => s.field));
          const candidate = fields.find((f) => !used.has(f.name)) ?? fields[0];
          if (candidate) emitSort([...api.state().sortBy, { field: candidate.name, direction: 'asc' }]);
          return;
        }
        case 'load':
          api.emit('loadQuery', { name });
          return;
        case 'delete':
          api.emit('deleteQuery', { name });
          return;
        case 'save': {
          const draft = api.state().saveDraft.trim();
          if (!draft) return;
          api.emit('saveQuery', { name: draft, tree: treeOf(id, api.state().query) });
          api.setState({ saveDraft: '' });
          return;
        }
      }
    };

    const refocusChipInput = (nodeId: string) =>
      requestAnimationFrame(() => rowOf(nodeId)?.querySelector<HTMLElement>('.qb-editor-chip-add')?.focus());

    const onChange = (e: Event) => {
      const hit = actOf(e);
      if (!hit || disabled()) return;
      const { el, act, nodeId } = hit;
      const value = (el as HTMLInputElement | HTMLSelectElement).value;
      const index = Number(el.getAttribute('data-qb-index') ?? 0);
      const t = tree();
      switch (act) {
        case 'field': {
          const field = entityOfNode(nodeId)?.fields.find((f) => f.name === value);
          if (field) mutate(changeConditionField(t, nodeId, field));
          return;
        }
        case 'operator':
          mutate(changeConditionOperator(t, nodeId, value as Operator));
          return;
        case 'value':
          if (el instanceof HTMLSelectElement) readValue(el, nodeId);
          return;
        case 'entity':
          if (value === rootEntity()) return;
          api.setState({ rootEntity: value });
          api.emit('rootEntityChange', value);
          return;
        case 'sort-field':
          emitSort(api.state().sortBy.map((s, k) => (k === index ? { ...s, field: value } : s)));
          return;
        case 'sort-direction':
          emitSort(api.state().sortBy.map((s, k) => (k === index ? { ...s, direction: value as 'asc' | 'desc' } : s)));
          return;
        case 'project': {
          const checked = (el as HTMLInputElement).checked;
          const current = api.state().selectedFields;
          const next = checked ? [...current.filter((f) => f !== value), value] : current.filter((f) => f !== value);
          api.setState({ selectedFields: next });
          api.emit('selectedFieldsChange', next);
          return;
        }
      }
    };

    const onInput = (e: Event) => {
      const hit = actOf(e);
      if (!hit) return;
      if (hit.act === 'save-name') {
        api.setState({ saveDraft: (hit.el as HTMLInputElement).value });
        return;
      }
      if (hit.act === 'value' && hit.el instanceof HTMLInputElement && !disabled()) readValue(hit.el, hit.nodeId);
    };

    const onKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === 'Enter' && target.getAttribute?.('data-qb-act') === 'chip-add') {
        e.preventDefault();
        addChip(target as HTMLInputElement, target.getAttribute('data-qb-id') ?? '');
        return;
      }
      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || disabled()) return;
      // On the row's own tab stop or its drag handle, whose name advertises the keys.
      // Never inside a field: a select's arrows are its own.
      if (!target.matches?.('.qb-condition, .qb-subquery-header, .qb-drag-handle')) return;
      const nodeId = target.closest('[data-row-id]')?.getAttribute('data-row-id');
      if (!nodeId) return;
      e.preventDefault();
      keyboardMove(nodeId, e.key === 'ArrowUp' ? 'up' : 'down');
    };

    const onPointerDown = (e: PointerEvent) => {
      const hit = actOf(e);
      if (hit?.act === 'drag') startDrag(hit.el, hit.nodeId, e);
    };

    // ── Keep live form state on what the core rendered ────────────────────
    // A rendered `selected` / `value` / `checked` only seeds a control: once the
    // user (or a re-render) changed it, a later attribute change no longer
    // applies. Selects carry their value as data-qb-value; an unfocused input
    // follows its value attribute (the focused one is the user's own text).
    let syncFrame = 0;
    const sync = () => {
      syncFrame = 0;
      [...host.querySelectorAll<HTMLSelectElement>('select[data-qb-value]')].map((select) => {
        const values: string[] = JSON.parse(select.getAttribute('data-qb-value') ?? '[]');
        return [...select.options].map((o) => (o.selected = values.includes(o.value)));
      });
      [...host.querySelectorAll<HTMLInputElement>('input[data-qb-act="value"], input[data-qb-act="save-name"]')]
        .filter((input) => input !== document.activeElement && input.value !== (input.getAttribute('value') ?? ''))
        .map((input) => (input.value = input.getAttribute('value') ?? ''));
      [...host.querySelectorAll<HTMLInputElement>('input[data-qb-act="project"]')].map((input) => (input.checked = input.hasAttribute('checked')));
    };
    const scheduleSync = () => {
      if (!syncFrame) syncFrame = requestAnimationFrame(sync);
    };
    const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(scheduleSync);
    observer?.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-qb-value', 'value', 'checked'] });

    host.addEventListener('click', onClick);
    host.addEventListener('change', onChange);
    host.addEventListener('input', onInput);
    host.addEventListener('keydown', onKeydown);
    host.addEventListener('pointerdown', onPointerDown);

    return () => {
      valueCommands.delete(id);
      observer?.disconnect();
      cancelAnimationFrame(syncFrame);
      cancelAnimationFrame(refocusFrame);
      drag.cancel();
      stopListening();
      host.removeEventListener('click', onClick);
      host.removeEventListener('change', onChange);
      host.removeEventListener('input', onInput);
      host.removeEventListener('keydown', onKeydown);
      host.removeEventListener('pointerdown', onPointerDown);
    };
  },
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    const state = api.state();
    const patch: Partial<QueryBuilderState> = {};
    if (inputs.query !== prev.query && inputs.query !== state.query) {
      patch.query = inputs.query ?? null;
      patch.drafts = {};
    }
    if (inputs.rootEntity !== prev.rootEntity && inputs.rootEntity !== state.rootEntity) patch.rootEntity = inputs.rootEntity ?? '';
    if (inputs.selectedFields !== prev.selectedFields && inputs.selectedFields !== state.selectedFields)
      patch.selectedFields = inputs.selectedFields ?? [];
    if (inputs.sortBy !== prev.sortBy && inputs.sortBy !== state.sortBy) patch.sortBy = inputs.sortBy ?? [];
    if (Object.keys(patch).length) api.setState(patch);
  },
});

export type { Api as QueryBuilderApi };
