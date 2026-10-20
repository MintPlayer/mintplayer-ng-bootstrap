import * as React from 'react';
import { createContext, forwardRef, useContext, useEffect, useId, useImperativeHandle, useRef } from 'react';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  ACCORDION_SCOPE,
  accordionKeydown,
  accordionScopedStyles,
  accordionSummaryClick,
  accordionToggled,
  connectAccordion,
  connectAccordionTab,
  type AccordionOptions,
  type AccordionTabToggle,
} from '@mintplayer/ui-core/accordion';
import { reactProps } from '../../machine/src/react-props';

export interface BsAccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Allow several tabs to stay open at once. */
  multi?: boolean;
  /** Paint the open header with the Bootstrap active background. */
  highlightActiveTab?: boolean;
  /** A tab opened or closed. `index` is its position. */
  onTabToggle?: (change: AccordionTabToggle) => void;
  /** `BsAccordionItem`s; anything else renders as plain accordion content. */
  children?: React.ReactNode;
}

export interface BsAccordionItemProps extends React.HTMLAttributes<HTMLDetailsElement> {
  /** Header content — any node, not just a string. */
  header?: React.ReactNode;
  /**
   * Whether the tab is open. Written to the row only when it changes, so a
   * user toggle stands until the next change — follow it with `onTabToggle`.
   */
  isActive?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  /**
   * Position among its siblings, injected by `BsAccordion`. Passing it
   * yourself is only needed when items are not direct children.
   */
  index?: number;
}

interface AccordionContext {
  readonly options: AccordionOptions;
  readonly root: React.RefObject<HTMLDivElement | null>;
}

const Context = createContext<AccordionContext>({ options: { id: 'bs-accordion' }, root: { current: null } });

/** One tab: a native `<details>` row of the parent `BsAccordion`. */
export function BsAccordionItem({ header, isActive, disabled, index = 0, className, children, ...rest }: BsAccordionItemProps) {
  const { options, root } = useContext(Context);
  const view = connectAccordionTab(options, index, { disabled });
  const { class: itemClass, ...itemBag } = view.item;
  return (
    <details
      {...reactProps(itemBag)}
      open={isActive}
      {...rest}
      className={[String(itemClass), className].filter(Boolean).join(' ')}>
      <summary
        {...reactProps(view.summary)}
        onClick={(event) => accordionSummaryClick(event.nativeEvent, !!disabled)}
        onKeyDown={(event) => root.current && accordionKeydown(root.current, event.nativeEvent, index, !!disabled)}>
        {header}
      </summary>
      <div {...reactProps(view.content)}>{children}</div>
    </details>
  );
}

/**
 * `BsAccordion` — Bootstrap accordion on native `<details name>` (#437).
 *
 *     <BsAccordion multi onTabToggle={({ index, active }) => …}>
 *       <BsAccordionItem header="Profile" isActive>Body</BsAccordionItem>
 *     </BsAccordion>
 *
 * Renders the markup of `@mintplayer/ui-core/accordion`, so the server HTML is
 * the working accordion with JavaScript off. Items are numbered here: the
 * index is a tab's identity for ids and toggles, and only the parent knows
 * the order.
 */
export const BsAccordion = forwardRef<HTMLDivElement | null, BsAccordionProps>(function BsAccordion(
  { multi, highlightActiveTab, onTabToggle, className, children, ...rest },
  ref,
) {
  installLightStyles(ACCORDION_SCOPE, accordionScopedStyles);

  const reactId = useId();
  const options: AccordionOptions = {
    id: `bs-accordion-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    multi,
    highlightActiveTab,
  };
  const rootRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => rootRef.current);

  // `toggle` does not bubble: one capture-phase listener hears every row.
  const latest = useRef({ multi: !!multi, onTabToggle });
  latest.current = { multi: !!multi, onTabToggle };
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onToggle = (event: Event) => {
      const change = accordionToggled(root, event, latest.current.multi);
      if (change) latest.current.onTabToggle?.(change);
    };
    root.addEventListener('toggle', onToggle, { capture: true });
    return () => root.removeEventListener('toggle', onToggle, { capture: true });
  }, []);

  let itemIndex = 0;
  const numbered = React.Children.map(children, (child) =>
    React.isValidElement<BsAccordionItemProps>(child) && child.type === BsAccordionItem
      ? React.cloneElement(child, { index: itemIndex++ })
      : child,
  );

  const { class: rootClass, ...rootBag } = connectAccordion(options);
  return (
    <div
      ref={rootRef}
      {...reactProps(rootBag)}
      {...rest}
      className={[String(rootClass), className].filter(Boolean).join(' ')}>
      <Context.Provider value={{ options, root: rootRef }}>{numbered}</Context.Provider>
    </div>
  );
});
