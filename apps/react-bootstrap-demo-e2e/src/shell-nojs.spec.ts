import { test, expect } from '@playwright/test';
import { shellNojsSuite } from '../../../tools/e2e-shared/shell-suites';

// The React demo's whole layout is a BsShell (AppShell.tsx); this runs it
// against the SSR server with scripting off.
shellNojsSuite(test, expect, { path: '/' });
