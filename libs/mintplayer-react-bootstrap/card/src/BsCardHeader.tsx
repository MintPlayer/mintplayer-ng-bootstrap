import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren, useEffect, useRef } from 'react';
import { applyHeaderNavStyle, CardHeaderNavStyle } from '@mintplayer/web-components/card';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

interface BsCardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Bootstrap contextual color; emits a `text-bg-{color}` class. */
  color?: string;
  /** Promotes a slotted nav to `card-header-tabs` / `card-header-pills`. */
  navStyle?: CardHeaderNavStyle;
}

/**
 * Plain React `card-header` element. Renders a `div.card-header` that gets
 * slotted into `<mp-card>` and styled by mp-card's shadow + the global
 * card sheet. When `navStyle` is set, the kept `applyHeaderNavStyle` helper
 * promotes the first slotted nav to the matching Bootstrap class.
 * Merges an incoming `className` and spreads remaining props.
 */
export const BsCardHeader = forwardRef<HTMLDivElement, PropsWithChildren<BsCardHeaderProps>>(
  ({ className, color, navStyle, children, ...rest }, ref) => {
    const localRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (localRef.current) applyHeaderNavStyle(localRef.current, navStyle ?? null);
    }, [navStyle, children]);

    const setRef = (el: HTMLDivElement | null) => {
      localRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    };

    return (
      <div ref={setRef} className={cx('card-header', color && `text-bg-${color}`, className)} {...rest}>
        {children}
      </div>
    );
  },
);
BsCardHeader.displayName = 'BsCardHeader';
