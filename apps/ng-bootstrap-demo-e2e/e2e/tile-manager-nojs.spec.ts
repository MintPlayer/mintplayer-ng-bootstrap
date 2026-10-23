import { test, expect } from '@playwright/test';
import { tileManagerNojsSuite } from '../../../tools/e2e-shared/tile-manager-suites';

// Angular renders the tile manager from its own template, so SSR emits real tiles and the
// inline @container rules (#440 D14). React and Vue demos do not server-render it.
test.use({ javaScriptEnabled: false });

tileManagerNojsSuite(test, expect, { path: '/enterprise/tile-manager' });
