import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';
import { isThemeColor, type ThemeColor } from '@mintplayer/ui-core/color';

/**
 * Bootstrap's list group (#458 M5).
 *
 *   <div class="list-group [list-group-flush]" role=list>
 *     <div class="list-group-item [active] [disabled] [list-group-item-<color>]" role=listitem
 *          [aria-current=true] [aria-disabled=true]>…</div>
 *   </div>
 *
 * Both roots are the host in Angular and Lit, so the DOM nests the way stock
 * Bootstrap expects (`.card > .list-group`, `.list-group-item + .list-group-item`).
 * The roles are explicit because the items are not `<li>`. `aria-current`
 * says which item is current; the `.active` class alone was visual-only.
 * No-JS: static markup.
 */
export interface ListGroupInputs {
  /** Bootstrap's `.list-group-flush`: no outer borders or rounded corners, edge to edge in its container. */
  flush: boolean;
}

export function connectListGroup({ flush }: ListGroupInputs): CoreBag {
  return { class: flush ? 'list-group list-group-flush' : 'list-group', role: 'list' };
}

export const listGroupCore = defineCore<ListGroupInputs, object, { root: CoreBag }>({
  view: ({ inputs }) => ({ root: connectListGroup(inputs) }),
});

export interface ListGroupItemInputs {
  /** The current item: Bootstrap's active colour and `aria-current="true"`. */
  active: boolean;
  /** Perceivable but marked: Bootstrap's muted look and `aria-disabled="true"`. */
  disabled: boolean;
  /** A contextual colour (`list-group-item-<color>`), or null. */
  color: ThemeColor | null;
}

export function connectListGroupItem({ active, disabled, color }: ListGroupItemInputs): CoreBag {
  return {
    class: ['list-group-item', isThemeColor(color) ? `list-group-item-${color}` : null, active ? 'active' : null, disabled ? 'disabled' : null]
      .filter(Boolean)
      .join(' '),
    role: 'listitem',
    'aria-current': active ? 'true' : null,
    'aria-disabled': disabled ? 'true' : null,
  };
}

export const listGroupItemCore = defineCore<ListGroupItemInputs, object, { root: CoreBag }>({
  view: ({ inputs }) => ({ root: connectListGroupItem(inputs) }),
});
