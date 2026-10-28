// Where @mintplayer/front-templates writes each core entry's compiled view
// templates (#437 S13). The outputs are gitignored; `mintplayer-ui-core:codegen`
// regenerates them.
import { defineConfig } from '../../tools/front-templates/src/index.mjs';

export default defineConfig({
  root: 'libs/mintplayer-ui-core',
  fronts: {
    angular: { outDir: (entry) => `libs/mintplayer-ng-bootstrap/${entry}/src/generated` },
    react: {
      outDir: (entry) => `libs/mintplayer-react-bootstrap/${entry}/src/generated`,
      // A relative import, like every React front's own: the lib does not import itself by package name.
      runtime: { file: 'libs/mintplayer-react-bootstrap/machine/src/react-props' },
    },
    vue: { outDir: (entry) => `libs/mintplayer-vue-bootstrap/${entry}/src/generated` },
    lit: {
      outDir: (entry) => `libs/mintplayer-web-components/${entry}/src/generated`,
      runtime: '@mintplayer/web-components/machine',
    },
  },
});
