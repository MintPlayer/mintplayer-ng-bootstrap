// Lit prints "Lit is in dev mode." once per vitest worker; across the whole
// suite that clobbers CI logs. Pre-seeding the issued-warnings set with the
// warning's CODE is Lit's supported off-switch (reactive-element checks
// `litIssuedWarnings.has(code)` before warning). Must run before lit loads.
(globalThis as { litIssuedWarnings?: Set<unknown> }).litIssuedWarnings = new Set(['dev-mode']);

