/**
 * View types for the scheduler
 */
export type ViewType = 'year' | 'month' | 'week' | 'day' | 'timeline';

/**
 * Display mode for events
 */
export type DisplayMode = 'grid' | 'timeline';

/**
 * Time format options
 */
export type TimeFormat = '12h' | '24h';

/**
 * Days of the week (0 = Sunday, 1 = Monday, etc.)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Drag operation types
 */
export type DragOperationType = 'create' | 'move' | 'resize-start' | 'resize-end';
