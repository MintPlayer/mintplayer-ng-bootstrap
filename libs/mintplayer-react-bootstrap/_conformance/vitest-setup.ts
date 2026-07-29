// Lit prints "Lit is in dev mode." once per vitest worker; across the whole
// suite that clobbers CI logs. Pre-seeding the issued-warnings set with the
// warning's CODE is Lit's supported off-switch (reactive-element checks
// `litIssuedWarnings.has(code)` before warning). Must run before lit loads.
(globalThis as { litIssuedWarnings?: Set<unknown> }).litIssuedWarnings = new Set(['dev-mode']);

/* React 19 requires this flag before `act()` will run; without it every render in
   the passthrough spec warns and the assertions race the commit. */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
