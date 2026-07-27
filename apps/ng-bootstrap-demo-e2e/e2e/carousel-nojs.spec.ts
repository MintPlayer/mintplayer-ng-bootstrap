import { test, expect } from '@playwright/test';
import { carouselNojsSuite } from '../../../tools/e2e-shared/carousel-suites';

test.use({ javaScriptEnabled: false });

carouselNojsSuite(test, expect, { path: '/enterprise/carousel' });
