import { test, expect } from '@playwright/test';
import { accordionNojsSuite } from '../../../tools/e2e-shared/accordion-suites';

test.use({ javaScriptEnabled: false });

accordionNojsSuite(test, expect);
