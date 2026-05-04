// Main component export
export { MpSplitter } from './components';
export type { SplitterResizeEventDetail } from './components';

// State management
export { SplitterStateManager } from './state';
export type { SplitterState, SplitterStateListener } from './state';

// Types
export type { Direction, Point, ResizeOperation, PanelInfo } from './types';
export { ResizeState } from './types';

// Managers
export { ResizeManager } from './managers';
export type { ResizeManagerOptions } from './managers';

// Input handling
export { InputHandler, normalizePointerEvent } from './input';
export type { InputHandlerCallbacks, NormalizedPointerEvent } from './input';

// Styles (for custom styling extensions)
export { splitterStyles } from './styles';
