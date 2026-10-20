// The primary entry is intentionally tiny: consumers import the sub-entries
// (`@mintplayer/ui-core/store`, `/async`, `/typeahead`, ...) so a front only
// bundles the cores it renders.
export * from '../store/src';
