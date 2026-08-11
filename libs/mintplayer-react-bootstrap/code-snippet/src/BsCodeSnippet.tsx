import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpCodeSnippet } from '@mintplayer/web-components/code-snippet';

/**
 * React wrapper for `<mp-code-snippet>`. Side-effect-registers the WC via the
 * import above; props are typed off MpCodeSnippet, so `annotations` and
 * `lineHref` (an object and a function) are assigned through the element ref
 * by @lit/react rather than being stringified into attributes.
 *
 * The `events` map is what turns the element's CustomEvents into React props.
 * Without it `language-detected` and `line-activate` are simply unreachable
 * from React — there is no `on*` prop for an event @lit/react was not told
 * about.
 */
export const BsCodeSnippet = createComponent({
  react: React,
  tagName: 'mp-code-snippet',
  elementClass: MpCodeSnippet,
  events: {
    onLanguageDetected: 'language-detected' as EventName<CustomEvent<{ language: string }>>,
    onLineActivate: 'line-activate' as EventName<CustomEvent<{ line: number }>>,
  },
});
