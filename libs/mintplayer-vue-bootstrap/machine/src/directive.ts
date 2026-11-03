import type { ObjectDirective } from 'vue';
import { directiveInputs, directiveServerBag, elementCore, type ComponentCore, type CoreBag, type ElementCore, type ElementCoreOptions } from '@mintplayer/ui-core/component';

export interface VueCoreDirectiveOptions<P, I> extends ElementCoreOptions<P, I> {
  /** Installs the group's sheets; called on the server and on the client. */
  readonly install?: () => void;
}

/** A bag as server-rendered attributes: `null` dropped, `true` present and empty. */
function ssrAttrs(bag: CoreBag): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(bag)
      .filter((entry): entry is [string, string | number | true] => entry[1] !== null && entry[1] !== false)
      .map(([name, value]) => [name, value === true ? '' : value]),
  );
}

/**
 * A directive core as a Vue custom directive (#458 §4.3): `v-bs-row`,
 * `v-bs-col="{ md: 6 }"`. The binding's value is the inputs object. A custom
 * directive cannot `inject` or render slots (S4), so a core that needs either
 * is generated as a renderless component instead. `getSSRProps` puts the bag
 * in the server HTML; the client writes it again when the directive is created.
 * Outputs are DOM events on the element, lowercased (`@rowchange`).
 */
export function vueCoreDirective<I, S, P, E, C, PC, M>(
  core: ComponentCore<I, S, P, E, C, PC, M>,
  options: VueCoreDirectiveOptions<P, I>,
): ObjectDirective<HTMLElement, Partial<I> | undefined> {
  const hosts = new WeakMap<HTMLElement, ElementCore<I>>();
  const inputs = (value: Partial<I> | undefined) => directiveInputs(options.defaults, value);
  return {
    created(el, binding) {
      options.install?.();
      hosts.set(el, elementCore(core, el, inputs(binding.value), options));
    },
    mounted(el) {
      hosts.get(el)?.attach();
    },
    updated(el, binding) {
      hosts.get(el)?.update(inputs(binding.value));
    },
    beforeUnmount(el) {
      hosts.get(el)?.detach();
      hosts.delete(el);
    },
    getSSRProps(binding) {
      options.install?.();
      return ssrAttrs(directiveServerBag(core, inputs(binding.value), options));
    },
  };
}
