import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
// Side-effect-registers both WCs on import. The React SSR entry installs the
// lit-ssr DOM shim before any wrapper module loads, so this is Node-safe.
import {
  MpAccordion,
  MpAccordionTab,
  type AccordionTabToggleDetail,
} from '@mintplayer/web-components/accordion';

export interface BsAccordionProps {
  /** Allow several tabs to stay open at once (checkbox machine with JS off). */
  multi?: boolean;
  /** Paint the open header with the Bootstrap active background. */
  highlightActiveTab?: boolean;
  /** A tab opened or closed. `detail.index` is its position. */
  onTabToggle?: (event: CustomEvent<AccordionTabToggleDetail>) => void;
  className?: string;
  /** `BsAccordionItem`s; anything else renders as plain accordion content. */
  children?: React.ReactNode;
}

export interface BsAccordionItemProps {
  /** Header content — any node, not just a string. */
  header?: React.ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  /**
   * Position among its siblings, injected by `BsAccordion`. Passing it
   * yourself is only needed when items are not direct children.
   */
  index?: number;
}

/**
 * Retyped to the wire shape the facades emit: attribute-named/attribute-valued
 * props, so React SSR serialises them into the HTML where the DSD injector and
 * the no-JS CSS can see them (carousel lesson — `@lit/react` drops props whose
 * names match a prototype accessor).
 */
type MpAccordionInnerProps = {
  multi?: boolean;
  'highlight-active-tab'?: boolean;
  className?: string;
  children?: React.ReactNode;
  onTabToggle?: (event: CustomEvent<AccordionTabToggleDetail>) => void;
} & React.RefAttributes<MpAccordion>;

type MpAccordionTabInnerProps = {
  'accordion-tab'?: string;
  slot?: string;
  'is-active'?: string;
  disabled?: string;
  children?: React.ReactNode;
} & React.RefAttributes<MpAccordionTab>;

const MpAccordionComponent = createComponent({
  react: React,
  tagName: 'mp-accordion',
  elementClass: MpAccordion,
  events: {
    onTabToggle: 'mp-accordion-tab-toggle' as EventName<CustomEvent<AccordionTabToggleDetail>>,
  },
}) as unknown as React.ForwardRefExoticComponent<MpAccordionInnerProps>;

const MpAccordionTabComponent = createComponent({
  react: React,
  tagName: 'mp-accordion-tab',
  elementClass: MpAccordionTab,
}) as unknown as React.ForwardRefExoticComponent<MpAccordionTabInnerProps>;

/**
 * One tab: a header and a body that render as SIBLINGS, not as a wrapper
 * around them. Named slots only accept direct children of `<mp-accordion>`,
 * so the header cannot live inside the tab element — a React fragment lets
 * one component contribute both.
 */
export function BsAccordionItem({
  header,
  isActive,
  disabled,
  index = 0,
  children,
}: BsAccordionItemProps) {
  return (
    <>
      <span accordion-header="" slot={`h${index}`}>
        {header}
      </span>
      <MpAccordionTabComponent
        accordion-tab=""
        slot={`c${index}`}
        {...(isActive ? { 'is-active': '' } : {})}
        {...(disabled ? { disabled: '' } : {})}>
        {children}
      </MpAccordionTabComponent>
    </>
  );
}

/**
 * React wrapper for `<mp-accordion>`.
 *
 *     <BsAccordion multi onTabToggle={e => …}>
 *       <BsAccordionItem header="Profile" isActive>Body</BsAccordionItem>
 *     </BsAccordion>
 *
 * Items are numbered here rather than by themselves: the index is a tab's
 * identity for slots and toggle events, and only the parent knows the order.
 */
export const BsAccordion = React.forwardRef<MpAccordion, BsAccordionProps>(function BsAccordion(
  { multi, highlightActiveTab, children, ...props },
  ref,
) {
  let itemIndex = 0;
  const numbered = React.Children.map(children, (child) =>
    React.isValidElement<BsAccordionItemProps>(child) && child.type === BsAccordionItem
      ? React.cloneElement(child, { index: itemIndex++ })
      : child,
  );

  return (
    <MpAccordionComponent
      ref={ref}
      {...(multi ? { multi: true } : {})}
      {...(highlightActiveTab ? { 'highlight-active-tab': true } : {})}
      {...props}>
      {numbered}
    </MpAccordionComponent>
  );
});
