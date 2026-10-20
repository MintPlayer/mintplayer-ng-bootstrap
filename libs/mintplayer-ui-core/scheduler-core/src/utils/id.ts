/**
 * Generate a unique ID
 */
export function generateId(prefix: string = 'evt'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a unique event ID
 */
export function generateEventId(): string {
  return generateId('evt');
}

/**
 * Generate a unique resource ID
 */
export function generateResourceId(): string {
  return generateId('res');
}

/**
 * Generate a unique group ID
 */
export function generateGroupId(): string {
  return generateId('grp');
}
