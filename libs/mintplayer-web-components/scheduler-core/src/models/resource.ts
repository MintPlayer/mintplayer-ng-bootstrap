import { SchedulerEvent } from './event';

/**
 * Represents a resource (e.g., a room, employee, machine)
 */
export interface Resource {
  /** Unique identifier for the resource */
  id: string;
  /** Display title of the resource */
  title: string;
  /** Events assigned to this resource */
  events?: SchedulerEvent[];
  /** Background color for this resource's events */
  color?: string;
  /** Default event color for this resource */
  eventColor?: string;
  /** Sort order */
  order?: number;
  /** Custom properties for extending resource data */
  extendedProps?: Record<string, unknown>;
}

/**
 * Represents a group of resources (e.g., a department, category)
 */
export interface ResourceGroup {
  /** Unique identifier for the group */
  id: string;
  /** Display title of the group */
  title: string;
  /** Child resources or nested groups */
  children: (Resource | ResourceGroup)[];
  /** Whether the group is collapsed in the UI */
  collapsed?: boolean;
  /** Background color for the group header */
  color?: string;
  /** Sort order */
  order?: number;
}

/**
 * Type guard to check if an item is a Resource
 */
export function isResource(item: Resource | ResourceGroup): item is Resource {
  return 'events' in item || !('children' in item);
}

/**
 * Type guard to check if an item is a ResourceGroup
 */
export function isResourceGroup(item: Resource | ResourceGroup): item is ResourceGroup {
  return 'children' in item;
}

/**
 * Flattened resource with depth information for rendering
 */
export interface FlattenedResource {
  /** The resource or group */
  item: Resource | ResourceGroup;
  /** Nesting depth (0 = top level) */
  depth: number;
  /** Whether this item is visible (not in a collapsed group) */
  visible: boolean;
  /** Parent group ID if any */
  parentId?: string;
}
