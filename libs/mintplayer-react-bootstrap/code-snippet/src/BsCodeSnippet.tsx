import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpCodeSnippet } from '@mintplayer/web-components/code-snippet';
/**
 * React wrapper for `<mp-code-snippet>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpCodeSnippet;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsCodeSnippet = createComponent({
  react: React,
  tagName: 'mp-code-snippet',
  elementClass: MpCodeSnippet,
});
