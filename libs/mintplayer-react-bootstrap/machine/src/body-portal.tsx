import { useEffect, useId, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { createBodyHost, removeBodyHost } from '@mintplayer/ui-core/overlay';

export interface BodyPortalProps {
  /** The overlay's declaring element: the host copies its inherited `data-bs-theme`, `dir` and `lang`. */
  from?: RefObject<Element | null>;
  children?: ReactNode;
}

/**
 * The compiled form of a view's `<teleport to="body">` (#458 §4.4): the content
 * renders into a `div[data-mp-overlay]` at the end of `<body>`, outside every
 * clipping ancestor. Client only: the host is created after mount, so the
 * server and the first client render both render nothing here (an overlay
 * cannot be opened without JS).
 */
export function BodyPortal({ from, children }: BodyPortalProps): ReactNode {
  const id = `mp-overlay-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHost(createBodyHost(document, id, from?.current ?? null));
    return () => {
      setHost(null);
      removeBodyHost(document, id);
    };
  }, [id, from]);
  return host ? createPortal(children, host) : null;
}
