/**
 * PRD #437 C4: a component's scoped sheet never imports a Bootstrap partial
 * that emits CSS. Bootstrap reaches every component node from the page
 * baseline (`@layer mp.bootstrap`, libs/mintplayer-ui-core/styles/bootstrap.scss);
 * a rescoped copy in `@layer mp.components` would ship the rules twice AND
 * out-rank the page's own theming, which is the specificity trap the
 * typeahead pilot shipped with (`.form-control[data-mps=typeahead]`).
 *
 * The configuration partials emit nothing and are what a sheet needs for
 * Bootstrap's `$variables` and mixins, so they are the only ones allowed.
 */
const CONFIG_PARTIALS = new Set(['functions', 'variables', 'variables-dark', 'maps', 'mixins']);

const sources = import.meta.glob<string>('../**/*.scoped.scss', { query: '?raw', import: 'default', eager: true });

/** Every bootstrap/scss/<partial> a sheet pulls in through @import, @use or @forward. */
function bootstrapPartialsOf(scss: string): string[] {
  return [...scss.matchAll(/@(?:import|use|forward)\s+["'](?:node_modules\/|~)?bootstrap\/scss\/([^"']+)["']/g)].map(
    (match) => match[1].replace(/^_/, '').replace(/\.scss$/, ''),
  );
}

describe('no Bootstrap partials in scoped sheets', () => {
  it('finds the scoped sheets', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(0);
  });

  it.each(Object.entries(sources))('%s imports only configuration partials', (_path, scss) => {
    expect(bootstrapPartialsOf(scss).filter((partial) => !CONFIG_PARTIALS.has(partial))).toEqual([]);
  });

  it('recognises a rule-emitting partial (the check is not vacuous)', () => {
    expect(bootstrapPartialsOf('@import "node_modules/bootstrap/scss/forms/form-control";')).toEqual([
      'forms/form-control',
    ]);
  });
});
