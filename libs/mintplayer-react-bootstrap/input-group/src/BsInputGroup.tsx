import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  INPUT_GROUP_SCOPE,
  inputGroupClasses,
  inputGroupRole,
  inputGroupScopedStyles,
  type InputGroupSize,
} from '@mintplayer/ui-core/input-group';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export interface BsInputGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Bootstrap sizing; `md` adds no class. */
  size?: InputGroupSize;
}

/**
 * Joins its children into one visually continuous control (PRD #437 wave A):
 * a plain `div.input-group`, so the page baseline's `.input-group > *` rules
 * apply to the children as written. The scoped sheet adds RTL and the sizing
 * of controls that render their own box. The role is `group` only when the
 * group is named; an explicit `role` wins.
 */
export const BsInputGroup = forwardRef<HTMLDivElement, PropsWithChildren<BsInputGroupProps>>(
  ({ className, size = 'md', role, ...rest }, ref) => {
    installLightStyles(INPUT_GROUP_SCOPE, inputGroupScopedStyles);
    const named = rest['aria-label'] != null || rest['aria-labelledby'] != null;
    return (
      <div
        ref={ref}
        className={cx(...inputGroupClasses(size), className)}
        data-mps={INPUT_GROUP_SCOPE}
        role={role ?? inputGroupRole(named) ?? undefined}
        {...rest}
      />
    );
  },
);
BsInputGroup.displayName = 'BsInputGroup';
