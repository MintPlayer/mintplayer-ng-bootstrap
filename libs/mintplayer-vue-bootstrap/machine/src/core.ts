import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  onServerPrefetch,
  provide,
  shallowRef,
  toRaw,
  useAttrs,
  useId,
  watch,
  type ComputedRef,
  type InjectionKey,
} from 'vue';
import { coreRuntime, type ComponentCore, type CoreContext, type ViewArgs } from '@mintplayer/ui-core/component';
import { runPrefetch } from '@mintplayer/ui-core/transfer-state';
import { MP_SSR } from './transfer-state';

const keys = new WeakMap<CoreContext<unknown>, InjectionKey<ComputedRef<unknown>>>();

/** The Vue injection key for a core context: one per context object. */
export function vueCoreContextKey<T>(context: CoreContext<T>): InjectionKey<ComputedRef<T>> {
  let key = keys.get(context as CoreContext<unknown>);
  if (!key) {
    key = Symbol(context.name) as InjectionKey<ComputedRef<unknown>>;
    keys.set(context as CoreContext<unknown>, key);
  }
  return key as InjectionKey<ComputedRef<T>>;
}

export interface UseCoreOptions {
  /** Prefix of the deterministic id, e.g. `bs-navbar`. */
  readonly idPrefix: string;
  /** The template's root element, once mounted. */
  readonly root: () => HTMLElement | null | undefined;
  readonly emit: (name: string, detail: unknown) => void;
  /** Two-way inputs (v-model), written back as an `update:<name>` emit. */
  readonly models?: readonly string[];
}

export interface CoreHandle<P> {
  readonly props: ComputedRef<P>;
  call(name: string, args: unknown[]): unknown;
}

/**
 * Host a `ComponentCore` in a generated Vue component (PRD #437 D10). Call it
 * in `<script setup>`; `useId` keeps the id identical on the server and on
 * hydration. A core that `provides` a context provides it to the slot content.
 */
export function useCore<I extends object, S, P, E, C, PC, M>(
  core: ComponentCore<I, S, P, E, C, PC, M>,
  props: () => I,
  options: UseCoreOptions,
): CoreHandle<P> {
  // The core sees raw values. A v-model target is usually a ref, which hands the
  // written-back array back as a reactive Proxy: never === the core's own array,
  // so a model that compares identity re-fits and writes again, forever.
  const inputs = () => Object.fromEntries(Object.entries(props()).map(([key, value]) => [key, toRaw(value)])) as I;
  const id = `${options.idPrefix}-${useId()}`;
  const attrs = useAttrs();
  const consumed = core.consume ? inject(vueCoreContextKey(core.consume), null) : null;
  const hydrated = shallowRef(false);
  // #448: the server awaits the prefetch before rendering; the client seeds from
  // what the server transferred under the same key, once.
  const ssr = core.transferKey ? inject(MP_SSR, null) : null;
  const initial = inputs();
  const transferKey = ssr ? core.transferKey?.(initial) : undefined;
  const transferred = ssr && transferKey && !ssr.server ? ssr.store.get(transferKey) : undefined;
  if (ssr && transferKey && !ssr.server) ssr.store.remove(transferKey);
  const state = shallowRef<S>(core.state ? core.state(initial, transferred) : ({} as S));
  if (ssr?.server && core.prefetch && core.state) {
    onServerPrefetch(async () => {
      const now = inputs();
      const result = await runPrefetch(core, now, { timeout: ssr.prefetchTimeout });
      if (!result) return;
      ssr.store.set(result.key, result.seed);
      state.value = core.state!(now, result.seed);
    });
  }

  const args = computed<ViewArgs<I, S, C, E>>(() => ({
    inputs: inputs(),
    state: state.value,
    id,
    hydrated: hydrated.value,
    context: (consumed ? consumed.value : core.consume?.defaultValue) as C,
    label: (attrs['aria-label'] as string | undefined) ?? null,
    api: () => runtime.api,
  }));
  if (core.provides) provide(vueCoreContextKey(core.provides), computed(() => core.provide?.(args.value) as PC));

  const runtime = coreRuntime(core, {
    inputs,
    state: () => state.value,
    setState: (next) => (state.value = next),
    emit: (name, detail) => options.emit(name, detail),
    models: options.models as never,
    writeModel: (name, value) => options.emit(`update:${name}`, value),
  });
  onMounted(() => {
    hydrated.value = true;
    const root = options.root();
    if (root) runtime.attachTo(root);
  });
  onBeforeUnmount(() => runtime.dispose());
  watch(inputs, (next) => runtime.inputs(next));

  return { props: computed(() => core.view(args.value)), call: (name, callArgs) => runtime.call(name, callArgs) };
}
