// Generates TS string modules from the source HTML/SCSS files for the web component.
// This preserves runtime sync rendering, while letting you edit real .html/.scss.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(process.cwd(), 'libs/mintplayer-ng-bootstrap/dock/src/lib/web-components');
const htmlPath = resolve(root, 'mint-dock-manager.element.html');
const scssPath = resolve(root, 'mint-dock-manager.element.scss');
const outHtmlTs = resolve(root, 'mint-dock-manager.element-html.ts');
const outCssTs = resolve(root, 'mint-dock-manager.element-css.ts');

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

async function tryCompileScss(inputPath, scss) {
  try {
    // Optional: compile SCSS to CSS if 'sass' is available
    const sass = await import('sass');
    const result = sass.compileString
      ? sass.compileString(scss, { loadPaths: [dirname(inputPath)] })
      : sass.default.compileString(scss, { loadPaths: [dirname(inputPath)] });
    return result.css; // compiled CSS
  } catch (e) {
    // Fallback: passthrough as-is (must be valid CSS subset)
    console.warn('[mint-dock] Note: SCSS not compiled (sass not found). Using raw content.');
    return scss;
  }
}

function toTsStringLiteral(content) {
  // Use backtick template literal safely
  return '`\r\n' + content.replace(/`/g, '\`') + '\r\n`';
}

async function main() {
  const html = readFileSync(htmlPath, 'utf-8');
  const scss = readFileSync(scssPath, 'utf-8');
  const css = await tryCompileScss(scssPath, scss);

  const htmlTs = `export const dockManagerHtml = ${toTsStringLiteral(html)};\n`;
  const cssTs = `export const dockManagerCss = ${toTsStringLiteral(css)};\n`;

  ensureDir(outHtmlTs);
  ensureDir(outCssTs);
  writeFileSync(outHtmlTs, htmlTs, 'utf-8');
  writeFileSync(outCssTs, cssTs, 'utf-8');
  console.log('[mint-dock] Generated template string modules.');
}

main();
