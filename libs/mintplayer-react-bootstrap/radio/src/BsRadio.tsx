import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpRadio, type RadioChangeEventDetail } from '@mintplayer/web-components/radio';

/**
 * React wrapper for `<mp-radio>`. Side-effect-registers the WC via the
 * import above. The `events` map surfaces the WC's CustomEvent dispatch
 * as an idiomatic React `onChange` prop with full detail typing.
 */
export const BsRadio = createComponent({
  react: React,
  tagName: 'mp-radio',
  elementClass: MpRadio,
  events: {
    onChange: 'change' as EventName<CustomEvent<RadioChangeEventDetail>>,
  },
});
