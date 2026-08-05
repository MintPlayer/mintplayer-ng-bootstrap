import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpInputGroup } from '@mintplayer/web-components/input-group';

/**
 * React wrapper for `<mp-input-group>` — joins its children into one visually
 * continuous control. No events to surface; children pass through as light DOM,
 * which is exactly what the group styles.
 *
 * Consumers slot native controls, `<BsSelect>`, `<BsPhoneInput>` or anything
 * else; the group is authoritative about the corners and the 1px overlap.
 */
export const BsInputGroup = createComponent({
  react: React,
  tagName: 'mp-input-group',
  elementClass: MpInputGroup,
  events: {},
});
