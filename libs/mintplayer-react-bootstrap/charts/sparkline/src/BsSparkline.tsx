import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpSparkline } from '@mintplayer/web-components/charts/sparkline';

/** React wrapper for `<mp-sparkline>`. Side-effect-registers the WC. */
export const BsSparkline = createComponent({
  react: React,
  tagName: 'mp-sparkline',
  elementClass: MpSparkline,
});
