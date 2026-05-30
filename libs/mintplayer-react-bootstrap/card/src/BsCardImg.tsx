import * as React from 'react';
import { forwardRef, ImgHTMLAttributes, PropsWithChildren } from 'react';
import { CardImagePosition } from '@mintplayer/web-components/card';

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
 * div that holds `children`. The result gets slotted into `<mp-card>` and
 * styled by mp-card's shadow + the global card sheet. Merges an incoming
 * `className` and spreads remaining props onto the `<img>`.
 */
export const BsCardImg = forwardRef<HTMLImageElement, PropsWithChildren<BsCardImgProps>>(
  ({ className, position = 'top', src, alt, children, ...rest }, ref) => {
    if (position === 'overlay') {
      return (
        <>
          <img ref={ref} className={cx('card-img', className)} src={src} alt={alt} {...rest} />
          <div className="card-img-overlay">{children}</div>
        </>
      );
    }

    const positionClass = position === 'bottom' ? 'card-img-bottom' : 'card-img-top';
    return <img ref={ref} className={cx(positionClass, className)} src={src} alt={alt} {...rest} />;
  },
);
BsCardImg.displayName = 'BsCardImg';
