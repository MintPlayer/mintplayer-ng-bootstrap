/**
 * PRD #437 D4: a control that changes what the page shows (a page number, a
 * sort header) renders a real link when the consumer can say where that state
 * lives, so it works with JavaScript off. Without `hrefFor` it renders a
 * button, which does nothing without JS; component docs say so. The demos map
 * the state onto query parameters.
 *
 * `null` means "no link for this state" (the current page, a disabled arrow).
 */
export type HrefFor<S> = (state: S) => string | null;

/**
 * The attribute a front's root node carries once the client has taken over
 * (PRD #437 D9; replaces the old `data-js` host attribute). CSS that must
 * differ with JS on keys off `[data-mp-hydrated]`. It is an attribute, not the
 * `mp-hydrated` class the PRD first named, because classes stay the front's
 * business (each framework owns `class`) and the bags only carry attributes.
 *
 * Never present in server HTML: a core starts with `hydrated: false` and the
 * front flips it after its first client render (`afterNextRender`,
 * `useEffect`, `onMounted`, `firstUpdated`), so the hydration pass itself
 * sees identical DOM.
 */
export const HYDRATED_ATTR = 'data-mp-hydrated';

export function hydratedAttr(hydrated: boolean): { [HYDRATED_ATTR]: true | null } {
  return { [HYDRATED_ATTR]: hydrated ? true : null };
}
