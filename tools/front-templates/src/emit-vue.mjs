// Vue: the source SFC is already a Vue component; the only change is dropping
// the `mp-host` marker, which means nothing to a front without a host element.
import { GENERATOR, HOST_MARKER } from './source.mjs';

export function emitVue(src, { generator = GENERATOR } = {}) {
  const marker = new RegExp(`\\s${HOST_MARKER}(?=[\\s/>])`, 'g');
  const header = `<!-- GENERATED from ${src.file.replace(/\\/g, '/')} by ${generator}. Do not edit. -->\n`;
  const template = src.templateContent.replace(marker, '');
  return header + src.sfcText.replace(src.templateContent, template);
}
