import * as React from 'react';
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  TAB_CONTROL_SCOPE,
  connectTabControl,
  resolveActiveTab,
  tabControlChanged,
  tabControlKeydown,
  tabControlScopedStyles,
  tabControlTabClick,
  type TabsPosition,
} from '@mintplayer/ui-core/tab-control';
import { reactProps } from '../../machine/src/react-props';

export interface BsTabPageProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The page's identity in `activeTab` / `onTabActivate`. Defaults to its position. */
  tabId?: string;
  /** Tab content — any node, not just a string. */
  header?: React.ReactNode;
  disabled?: boolean;
  children?: React.ReactNode;
}

export interface BsTabControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The shown page's `tabId`. Uncontrolled when omitted. */
  activeTab?: string;
  /** Draw the outline around the active pane. Default true. */
  border?: boolean;
  /** Show the first enabled page while none is active. Default true. */
  selectFirstTab?: boolean;
  tabsPosition?: TabsPosition;
  /** The user picked a page. */
  onTabActivate?: (tabId: string) => void;
  /** `BsTabPage`s. */
  children?: React.ReactNode;
}

/**
 * One page of a `BsTabControl`. Renders nothing by itself: the control reads
 * its props and renders every radio, tab and pane as siblings, because the
 * CSS pairs the n-th radio with the n-th pane. Its other attributes land on
 * the pane, except `role`, which the core owns.
 */
export function BsTabPage(_props: BsTabPageProps): React.ReactElement | null {
  return null;
}

/**
 * `BsTabControl` — Bootstrap nav-tabs over one native radio per tab (#437).
 *
 *     <BsTabControl activeTab={tab} onTabActivate={setTab}>
 *       <BsTabPage tabId="home" header="Home">Home content</BsTabPage>
 *       <BsTabPage tabId="profile" header="Profile" disabled>…</BsTabPage>
 *     </BsTabControl>
 *
 * Renders the markup of `@mintplayer/ui-core/tab-control`, so the server
 * HTML is a working tab control with JavaScript off. After mount the labels
 * become APG tabs (roving tabindex, automatic activation).
 */
export const BsTabControl = forwardRef<HTMLDivElement | null, BsTabControlProps>(function BsTabControl(
  { activeTab, border, selectFirstTab = true, tabsPosition, onTabActivate, className, children, ...rest },
  ref,
) {
  installLightStyles(TAB_CONTROL_SCOPE, tabControlScopedStyles);

  const reactId = useId();
  const id = `bs-tab-control-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const rootRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

  // Server HTML and the hydrating render are the radio tier; tabs after mount.
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);

  const pages = React.Children.toArray(children)
    .filter((child): child is React.ReactElement<BsTabPageProps> => React.isValidElement(child) && child.type === BsTabPage)
    .map((child, index) => {
      const { tabId, header, disabled, children: body, role: _role, ...attrs } = child.props;
      return { key: tabId ?? String(index), header, disabled, body, attrs };
    });
  const states = pages.map((page) => ({ disabled: page.disabled }));

  const [picked, setPicked] = useState<string | null>(null);
  const requested = activeTab ?? picked;
  const requestedIndex = requested === null ? -1 : pages.findIndex((page) => page.key === requested);
  const active = resolveActiveTab(states, requestedIndex < 0 ? null : requestedIndex, selectFirstTab);

  const select = (index: number) => {
    const page = pages[index];
    if (!page || page.disabled) return;
    setPicked(page.key);
    onTabActivate?.(page.key);
  };

  const view = connectTabControl({ id, tabsPosition, border, enhanced }, states, active);
  const { class: rootClass, ...rootBag } = view.root;
  // A consumer id on a page replaces the pane's, so the tab's IDREF follows it.
  const tabBag = (index: number) => {
    const bag = view.tabs[index].tab;
    const paneId = pages[index].attrs.id;
    return paneId && bag['aria-controls'] ? { ...bag, 'aria-controls': paneId } : bag;
  };
  const paneBag = (index: number) => {
    const { class: _class, ...bag } = view.tabs[index].pane;
    return bag;
  };

  const strip = (
    <div {...reactProps(view.strip)}>
      <ul {...reactProps(view.list)}>
        {pages.map((page, index) => (
          <li key={page.key} {...reactProps(view.item)}>
            <label
              {...reactProps(tabBag(index))}
              onClick={(event) => enhanced && tabControlTabClick(event.nativeEvent, !!page.disabled) && select(index)}
              onKeyDown={(event) => {
                const target = rootRef.current && tabControlKeydown(rootRef.current, event.nativeEvent, index, states);
                if (target !== null && target !== undefined) select(target);
              }}>
              {page.header}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div
      ref={rootRef}
      {...reactProps(rootBag)}
      {...rest}
      className={[String(rootClass), className].filter(Boolean).join(' ')}
      onChange={(event) => {
        const index = rootRef.current && tabControlChanged(rootRef.current, event.nativeEvent);
        if (index !== null && index !== undefined) select(index);
      }}>
      {pages.map((page, index) => (
        <input key={page.key} {...reactProps(view.tabs[index].radio)} checked={index === active} onChange={() => undefined} />
      ))}
      {tabsPosition !== 'bottom' && strip}
      <div {...reactProps(view.content)}>
        {pages.map((page, index) => (
          <div
            key={page.key}
            {...reactProps(paneBag(index))}
            {...page.attrs}
            className={[String(view.tabs[index].pane.class), page.attrs.className].filter(Boolean).join(' ')}>
            {page.body}
          </div>
        ))}
      </div>
      {tabsPosition === 'bottom' && strip}
    </div>
  );
});
