import {
  getCurrentInstance,
  getCurrentScope,
  onMounted,
  onScopeDispose,
  readonly,
  shallowRef,
  type Ref,
} from 'vue';
import {
  getBsThemeStore,
  resolveMode,
  type BsEffectiveThemeMode,
  type BsThemeMode,
} from '@mintplayer/web-components/theming';

export interface UseBsThemeResult {
  /** The mode the user picked: `auto`, `light`, `dark` or a custom mode. */
  mode: Readonly<Ref<BsThemeMode>>;
  /** The mode applied to `<html data-bs-theme>`: `auto` resolved against the OS preference. */
  effectiveMode: Readonly<Ref<BsEffectiveThemeMode>>;
  /** Set, persist and apply a mode. An invalid mode is a no-op with a warning; a no-op on the server. */
  setMode: (mode: BsThemeMode) => void;
  /**
   * Stop mirroring the store. Called automatically when the calling effect
   * scope is disposed; call it yourself when using the composable outside any
   * scope (a plain module, a store setup). Idempotent; a no-op on the server.
   */
  stop: () => void;
}

const isBrowser = () => typeof window !== 'undefined';

const setMode = (mode: BsThemeMode): void => {
  if (!isBrowser()) return;
  getBsThemeStore().setMode(mode);
};

/**
 * The document's colour mode as readonly refs, mirrored from the shared
 * browser store (`@mintplayer/web-components/theming`). They update when the
 * mode changes from anywhere: `setMode`, a `<BsThemeToggle>`, another
 * framework's adapter on the same page, another tab, or the OS preference
 * while in `auto`.
 *
 * The subscription is released when the calling effect scope is disposed
 * (the component unmounts, or a manual `effectScope()` stops). Called outside
 * any scope, nothing can release it automatically, so call the returned `stop()`.
 *
 * SSR-safe, and consistent with the React adapter: on the server the store is
 * never touched and the refs hold `auto` resolved with `prefersDark = false`
 * (`effectiveMode` = `light`), because the server cannot see the visitor's OS
 * preference. Inside a component the refs keep that value until `onMounted`,
 * so a hydrating client renders exactly what the server rendered and only
 * then switches to the real mode; outside a component they sync immediately.
 */
export function useBsTheme(): UseBsThemeResult {
  const mode = shallowRef<BsThemeMode>('auto');
  const effectiveMode = shallowRef<BsEffectiveThemeMode>(resolveMode('auto', false));
  let stop = (): void => undefined;

  if (isBrowser()) {
    const store = getBsThemeStore();
    const sync = () => {
      mode.value = store.getMode();
      effectiveMode.value = store.effectiveMode();
    };
    const unsubscribe = store.subscribe(sync);
    let stopped = false;
    stop = () => {
      if (stopped) return;
      stopped = true;
      unsubscribe();
    };
    if (getCurrentScope()) onScopeDispose(stop);

    if (getCurrentInstance()) onMounted(sync);
    else sync();
  }

  return {
    mode: readonly(mode) as Readonly<Ref<BsThemeMode>>,
    effectiveMode: readonly(effectiveMode) as Readonly<Ref<BsEffectiveThemeMode>>,
    setMode,
    stop,
  };
}
