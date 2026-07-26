import { test, expect } from '@playwright/test';
import { carouselJsSuite } from '../../../tools/e2e-shared/carousel-suites';

carouselJsSuite(test, expect, { nested: true });
