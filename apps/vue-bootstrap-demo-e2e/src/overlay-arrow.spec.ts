import { test, expect } from '@playwright/test';
import { overlayArrowSuite } from '../../../tools/e2e-shared/overlay-arrow-suites';

overlayArrowSuite(test, expect, { prefix: '/overlay', triggers: ['start', 'top', 'bottom', 'end'] });
