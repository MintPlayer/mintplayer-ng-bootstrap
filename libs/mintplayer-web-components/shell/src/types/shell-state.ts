/**
 * Declarative sidebar state set by the consumer.
 * - `auto`  — responsive: collapsed below `breakpoint`, expanded at/above it;
 *             the toggle then flips it (inverse of the responsive default).
 * - `show`  — force expanded regardless of viewport / toggle.
 * - `hide`  — force collapsed regardless of viewport / toggle.
 */
export type ShellState = 'auto' | 'show' | 'hide';
