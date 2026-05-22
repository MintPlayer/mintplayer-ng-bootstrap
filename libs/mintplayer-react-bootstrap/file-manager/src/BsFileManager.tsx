import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpFileManager } from '@mintplayer/web-components/file-manager';

/**
 * React wrapper for `<mp-file-manager>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpFileManager;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsFileManager = createComponent({
  react: React,
  tagName: 'mp-file-manager',
  elementClass: MpFileManager,
});
