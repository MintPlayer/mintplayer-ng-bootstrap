/**
 * The registry moved to `@mintplayer/ui-core/scoped-styles` (#436 D8) so the
 * Angular, React and Vue fronts install the same sheets through the same
 * mechanism. This entry re-exports it unchanged for the light-tier elements.
 *
 * The names are listed, not `export *`: ui-core is external to this build, so
 * Rolldown cannot see what a star re-export contains. A chunk importing
 * `installLightStyles` from this entry was compiled to a lookup on a namespace
 * object that holds only the local exports, and threw at load
 * ("installLightStyles is not a function") for every consumer of the dist.
 */
export {
  SCOPED_STYLE_MARKER,
  SCOPE_ATTRIBUTE,
  adoptLightStyles,
  getLightStyleEntries,
  installLightStyles,
  installScopedStyles,
  stampScope,
  validateScope,
  writeScopedStyleTag,
} from '@mintplayer/ui-core/scoped-styles';
export type { LightStyleEntry, ScopedStyleSource } from '@mintplayer/ui-core/scoped-styles';
