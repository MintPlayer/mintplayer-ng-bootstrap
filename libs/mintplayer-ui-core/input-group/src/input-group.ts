/**
 * The input group has no machine (PRD #437 §8, wave A): every front renders a
 * plain `div.input-group` and Bootstrap's own `.input-group > *` rules in the
 * page baseline join the children. What the fronts share is the class and
 * role mapping and the scoped sheet for the cases Bootstrap's direct-child
 * selectors cannot see (RTL, and a control rendered inside a framework host).
 */

/** Bootstrap's input-group sizes. `md` is the default and adds no class. */
export type InputGroupSize = 'sm' | 'md' | 'lg';

export const INPUT_GROUP_SCOPE = 'input-group';

export function inputGroupClasses(size: InputGroupSize | null | undefined = 'md'): string[] {
  return size === 'sm' || size === 'lg' ? ['input-group', `input-group-${size}`] : ['input-group'];
}

/**
 * A group is only a `group` once it has a name: an unnamed one is decorative
 * and would only add noise to the accessibility tree.
 */
export function inputGroupRole(named: boolean): 'group' | null {
  return named ? 'group' : null;
}
