// Where @mintplayer/nx-component-compiler writes each core entry's generated
// templates and components (PRD #437 D10). The outputs are gitignored; the
// `compile-components` target (inferred by the plugin from this file)
// regenerates them.
import { defineConfig } from '../mintplayer-component-compiler/src/index.mjs';

export default defineConfig({
  root: 'libs/mintplayer-ui-core',
  package: '@mintplayer/ui-core',
  fronts: {
    angular: {
      outDir: (entry) => `libs/mintplayer-ng-bootstrap/${entry}/src/generated`,
      runtime: '@mintplayer/ng-bootstrap/machine',
      // ng-packagr builds each entry apart: a composed child of another entry imports it by package name.
      entryModule: (entry) => `@mintplayer/ng-bootstrap/${entry}`,
    },
    react: {
      outDir: (entry) => `libs/mintplayer-react-bootstrap/${entry}/src/generated`,
      // Relative imports, like every React front's own: the lib does not import itself by package name.
      runtime: { file: 'libs/mintplayer-react-bootstrap/machine/src/index' },
    },
    vue: {
      outDir: (entry) => `libs/mintplayer-vue-bootstrap/${entry}/src/generated`,
      runtime: { file: 'libs/mintplayer-vue-bootstrap/machine/src/index' },
    },
    lit: {
      outDir: (entry) => `libs/mintplayer-web-components/${entry}/src/generated`,
      runtime: '@mintplayer/web-components/machine',
      entryModule: (entry) => `@mintplayer/web-components/${entry}`,
    },
  },
});
