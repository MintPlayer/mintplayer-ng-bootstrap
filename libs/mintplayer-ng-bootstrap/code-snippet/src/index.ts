export * from './generated';

// The core's public types and the language escape hatch, so a consumer needs one import.
export {
  CODE_SNIPPET_LABELS,
  canHighlight,
  registerLanguage,
  type CodeLineActivation,
  type CodeLineAnnotation,
  type CodeSnippetLabels,
  type CodeSnippetTheme,
} from '@mintplayer/ui-core/code-snippet';
