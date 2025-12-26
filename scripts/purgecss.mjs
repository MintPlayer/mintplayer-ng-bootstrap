import { PurgeCSS } from 'purgecss';
import { writeFileSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..').replace(/\\/g, '/');

const cssDir = join(rootDir, 'dist/apps/ng-bootstrap-demo/browser/browser').replace(/\\/g, '/');

// Find all CSS files (exclude theme CSS files like solarized-dark.css used by highlight.js)
const cssFiles = readdirSync(cssDir).filter(f => f.endsWith('.css') && f.startsWith('styles-'));

// Find content files using glob
const contentPatterns = [
  `${rootDir}/apps/ng-bootstrap-demo/src/**/*.html`,
  `${rootDir}/apps/ng-bootstrap-demo/src/**/*.ts`,
  `${rootDir}/libs/mintplayer-ng-bootstrap/**/src/**/*.html`,
  `${rootDir}/libs/mintplayer-ng-bootstrap/**/src/**/*.ts`,
];

const contentFiles = (await Promise.all(contentPatterns.map(p => glob(p)))).flat();
console.log(`Found ${contentFiles.length} content files to analyze`);

for (const cssFile of cssFiles) {
  const cssPath = join(cssDir, cssFile).replace(/\\/g, '/');

  const purgeCSSResult = await new PurgeCSS().purge({
    content: contentFiles,
    css: [cssPath],
    safelist: {
      standard: [
        // Bootstrap dynamic classes
        /^show$/,
        /^fade$/,
        /^collapse$/,
        /^collapsing$/,
        /^modal/,
        /^offcanvas/,
        /^toast/,
        /^tooltip/,
        /^popover/,
        /^dropdown/,
        /^nav/,
        /^navbar/,
        /^tab/,
        /^accordion/,
        /^alert/,
        /^badge/,
        /^btn/,
        /^card/,
        /^carousel/,
        /^spinner/,
        /^progress/,
        /^list-group/,
        /^breadcrumb/,
        /^pagination/,
        /^placeholder/,
        /^table/,
        /^form/,
        /^input/,
        /^select/,
        /^invalid/,
        /^valid/,
        /^is-/,
        /^was-/,
        /^has-/,
        // CDK Overlay classes
        /^cdk-/,
        // Bootstrap responsive classes
        /^d-/,
        /^col-/,
        /^row/,
        /^container/,
        /^g-/,
        /^m[trblxy]?-/,
        /^p[trblxy]?-/,
        /^text-/,
        /^bg-/,
        /^border/,
        /^rounded/,
        /^shadow/,
        /^w-/,
        /^h-/,
        /^flex/,
        /^align/,
        /^justify/,
        /^position/,
        /^top-/,
        /^bottom-/,
        /^start-/,
        /^end-/,
        /^float/,
        /^overflow/,
        /^visible/,
        /^invisible/,
        /^opacity/,
        /^z-/,
        // Angular specific
        /^ng-/,
        /^router-/,
        // Active/hover states
        /^active$/,
        /^disabled$/,
        /^focus$/,
        /^hover$/,
        /^open$/,
        /^closed$/,
      ],
      deep: [
        /data-bs-/,
        /aria-/,
      ],
      greedy: [
        /modal/,
        /tooltip/,
        /popover/,
        /dropdown/,
        /offcanvas/,
      ]
    },
    keyframes: true,
    fontFace: true,
    variables: true,
  });

  if (purgeCSSResult.length > 0) {
    const originalSize = readFileSync(cssPath).length;
    const purgedCss = purgeCSSResult[0].css;
    writeFileSync(cssPath, purgedCss);
    const newSize = purgedCss.length;
    console.log(`${cssFile}: ${(originalSize / 1024).toFixed(1)}KB -> ${(newSize / 1024).toFixed(1)}KB (saved ${((originalSize - newSize) / 1024).toFixed(1)}KB)`);
  }
}

console.log('PurgeCSS completed!');
