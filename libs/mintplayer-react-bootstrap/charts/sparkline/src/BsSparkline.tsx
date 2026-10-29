import * as React from 'react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  SPARKLINE_SCOPE,
  connectSparkline,
  sparklineScopedStyles,
} from '@mintplayer/ui-core/charts/sparkline';
import { reactProps } from '../../../machine/src/react-props';

export interface BsSparklineProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** `null` renders a gap. */
  points?: (number | null)[];
  area?: boolean;
  showLastDot?: boolean;
  yMin?: number;
  yMax?: number;
  /** Number formatting for the generated name. Defaults to the nearest `lang` once mounted. */
  locale?: string;
  inputLabel?: string;
  summaryFormatter?: (points: (number | null)[]) => string | undefined;
}

/**
 * An axis-less inline trend for table cells (#437), rendered from
 * `@mintplayer/ui-core/charts/sparkline`, so the server HTML is the finished
 * chart. The `<span class="sparkline">` is the sized box and the ref; the
 * `role="img"` svg inside is named by `aria-label`, `inputLabel`,
 * `summaryFormatter`, or the generated "first, last, lowest, highest".
 */
export const BsSparkline = forwardRef<HTMLSpanElement | null, BsSparklineProps>(function BsSparkline(
  { points = [], area, showLastDot, yMin, yMax, locale, inputLabel, summaryFormatter, className, 'aria-label': ariaLabel, ...rest },
  ref,
) {
  installLightStyles(SPARKLINE_SCOPE, sparklineScopedStyles);

  const rootRef = useRef<HTMLSpanElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLSpanElement);
  const [lang, setLang] = useState<string | undefined>(undefined);
  useEffect(() => setLang(rootRef.current?.closest('[lang]')?.getAttribute('lang') ?? undefined), []);

  const view = connectSparkline(points, {
    area,
    showLastDot,
    yMin,
    yMax,
    locale: locale ?? lang,
    label: ariaLabel ?? inputLabel,
    summaryFormatter,
  });
  const { class: rootClass, ...rootBag } = view.root;

  return (
    <span
      ref={rootRef}
      {...reactProps(rootBag)}
      {...rest}
      className={[String(rootClass), className].filter(Boolean).join(' ')}>
      {view.svg && (
        <svg {...reactProps(view.svg)}>
          {view.fill && <path {...reactProps(view.fill)} />}
          <path {...reactProps(view.line)} />
          {view.dot && <circle {...reactProps(view.dot)} />}
        </svg>
      )}
    </span>
  );
});
