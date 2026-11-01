import * as React from 'react';
import { forwardRef, ImgHTMLAttributes, PropsWithChildren } from 'react';
import { cardImgClass, type CardImagePosition } from '@mintplayer/ui-core/card';
import { bootstrapCard, installBootstrap } from '@mintplayer/ui-core/bootstrap';

// #452: the card partial ships with the card, scoped to the elements it stamps.
installBootstrap(bootstrapCard);

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

interface BsCardImgProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Where the image sits relative to the card body. Defaults to `top`. */
  position?: CardImagePosition;
  src?: string;
  alt?: string;
}

/**
 * Plain React `card-img` element. Renders a `card-img-top` / `card-img-bottom`
 * image, or — for `overlay` — a `card-img` paired with a `card-img-overlay`
 * div that holds `children`. Merges an incoming
 * `className` and spreads remaining props onto the `<img>`.
 */
export const BsCardImg = forwardRef<HTMLImageElement, PropsWithChildren<BsCardImgProps>>(
  ({ className, position = 'top', src, alt, children, ...rest }, ref) => {
    if (position === 'overlay') {
      return (
        <>
          <img ref={ref} data-mps="card" className={cx('card-img', className)} src={src} alt={alt ?? ''} {...rest} />
          <div data-mps="card" className="card-img-overlay">{children}</div>
        </>
      );
    }

    const positionClass = cardImgClass(position);
    return <img ref={ref} data-mps="card" className={cx(positionClass, className)} src={src} alt={alt ?? ''} {...rest} />;
  },
);
BsCardImg.displayName = 'BsCardImg';
