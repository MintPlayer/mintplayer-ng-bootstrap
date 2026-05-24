// Re-export everything framework-agnostic from the WC entry. The Angular
// wrapper component + editor directive remain Angular-specific.
export * from '@mintplayer/web-components/query-builder';

export { BsQueryBuilderComponent } from './lib/components/query-builder.component';
export { BsQueryBuilderEditorDirective } from './lib/components/query-builder-editor.directive';
