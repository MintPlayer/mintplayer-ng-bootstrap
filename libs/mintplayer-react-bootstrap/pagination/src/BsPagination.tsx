import * as React from 'react';
import { forwardRef, useState } from 'react';
import {
  connectPagination,
  isPlainClick,
  type PaginationLabels,
  type PaginationSize,
} from '@mintplayer/ui-core/pagination';
import { reactProps } from '../../machine/src/react-props';

export interface BsPaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  pageNumbers?: number[];
  /** Controlled selected page. Pair with `onPageChange`. */
  selectedPageNumber?: number;
  /** Uncontrolled initial page. */
  defaultSelectedPageNumber?: number;
  /** Cap on visible boxes, arrows included (0 = uncapped). */
  numberOfBoxes?: number;
  showArrows?: boolean;
  size?: PaginationSize;
  /** Localized accessible names; missing keys fall back to English. */
  labels?: Partial<PaginationLabels> | null;
  /** Renders every page as a link to this URL, so it works without JavaScript. */
  hrefFor?: ((page: number) => string) | null;
  onPageChange?: (page: number) => void;
}

/**
 * Bootstrap's `.pagination` markup (#437) from `@mintplayer/ui-core/pagination`.
 * Pages are buttons; with `hrefFor` they are links and a plain click selects
 * in place. Consumer props (`aria-*`, `id`, handlers) land on the `<nav>`,
 * which is also the ref.
 */
export const BsPagination = forwardRef<HTMLElement, BsPaginationProps>(function BsPagination(props, ref) {
  const {
    pageNumbers = [],
    selectedPageNumber,
    defaultSelectedPageNumber = 1,
    numberOfBoxes = 0,
    showArrows = true,
    size = 'medium',
    labels = null,
    hrefFor = null,
    onPageChange,
    ...rest
  } = props;
  const [ownPage, setOwnPage] = useState(defaultSelectedPageNumber);
  const current = selectedPageNumber ?? ownPage;
  const view = connectPagination({
    pageNumbers,
    selectedPageNumber: current,
    numberOfBoxes,
    showArrows,
    size,
    labels,
    hrefFor,
  });

  const select = (page: number | null) => {
    if (page === null || page === current) return;
    setOwnPage(page);
    onPageChange?.(page);
  };

  return (
    <nav {...reactProps(view.nav)} {...rest} ref={ref}>
      <ul className={view.listClass}>
        {view.entries.map((entry) => (
          <li key={entry.key} className={entry.itemClass}>
            {entry.kind === 'gap' ? (
              <span {...reactProps(entry.attrs)}>{entry.text}</span>
            ) : view.tag === 'a' ? (
              <a
                {...reactProps(entry.attrs)}
                href={entry.href ?? undefined}
                onClick={(event) => {
                  if (!isPlainClick(event.nativeEvent)) return;
                  event.preventDefault();
                  select(entry.target);
                }}
              >
                {entry.text}
              </a>
            ) : (
              <button {...reactProps(entry.attrs)} onClick={() => select(entry.target)}>
                {entry.text}
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
});
