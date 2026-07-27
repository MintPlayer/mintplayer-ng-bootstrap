import { test, expect } from '@playwright/test';
import { accordionJsSuite } from '../../../tools/e2e-shared/accordion-suites';

accordionJsSuite(test, expect);
