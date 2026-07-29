import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpSignaturePadElement, type Signature } from '@mintplayer/web-components/signature-pad';

/**
 * React wrapper for `<mp-signature-pad>`. Side-effect-registers the WC via
 * the import above. The `signature` model object is assigned as a property
 * by `@lit/react`; `signature-change` fires on every mutation (stroke point,
 * typed character, undo, clear).
 */
export const BsSignaturePad = createComponent({
  react: React,
  tagName: 'mp-signature-pad',
  elementClass: MpSignaturePadElement,
  events: {
    onSignatureChange: 'signature-change' as EventName<CustomEvent<Signature>>,
  },
});
