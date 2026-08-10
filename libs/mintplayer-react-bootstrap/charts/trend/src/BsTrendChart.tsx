import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpTrendChart,
  type TrendHoverEventDetail,
  type TrendPointEventDetail,
} from '@mintplayer/web-components/charts/trend';

/** React wrapper for `<mp-trend-chart>`. Side-effect-registers the WC. */
export const BsTrendChart = createComponent({
  react: React,
  tagName: 'mp-trend-chart',
  elementClass: MpTrendChart,
  events: {
    onTrendPointHover: 'trend-point-hover' as EventName<CustomEvent<TrendHoverEventDetail>>,
    onTrendPointSelect: 'trend-point-select' as EventName<CustomEvent<TrendPointEventDetail>>,
  },
});
