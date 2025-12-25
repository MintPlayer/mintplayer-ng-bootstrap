import { SchedulerEvent } from '../models/event';
import {
  Resource,
  ResourceGroup,
  FlattenedResource,
  isResource,
  isResourceGroup,
} from '../models/resource';

/**
 * Service for resource and resource group operations
 */
export class ResourceService {
  /**
   * Flatten a hierarchical resource structure for rendering
   */
  flatten(
    items: (Resource | ResourceGroup)[],
    collapsedIds: Set<string> = new Set(),
    depth: number = 0,
    parentId?: string,
    parentCollapsed: boolean = false
  ): FlattenedResource[] {
    const result: FlattenedResource[] = [];

    for (const item of items) {
      const visible = !parentCollapsed;
      result.push({ item, depth, visible, parentId });

      if (isResourceGroup(item)) {
        const isCollapsed = collapsedIds.has(item.id);
        const children = this.flatten(
          item.children,
          collapsedIds,
          depth + 1,
          item.id,
          parentCollapsed || isCollapsed
        );
        result.push(...children);
      }
    }

    return result;
  }

  /**
   * Get all resources (leaf nodes) from a hierarchical structure
   */
  getAllResources(items: (Resource | ResourceGroup)[]): Resource[] {
    const resources: Resource[] = [];

    for (const item of items) {
      if (isResource(item)) {
        resources.push(item);
      } else if (isResourceGroup(item)) {
        resources.push(...this.getAllResources(item.children));
      }
    }

    return resources;
  }

  /**
   * Get all events from all resources
   */
  getAllEvents(items: (Resource | ResourceGroup)[]): SchedulerEvent[] {
    const resources = this.getAllResources(items);
    return resources.flatMap((r) => r.events ?? []);
  }

  /**
   * Find a resource by ID
   */
  findResourceById(
    items: (Resource | ResourceGroup)[],
    id: string
  ): Resource | undefined {
    for (const item of items) {
      if (isResource(item) && item.id === id) {
        return item;
      }
      if (isResourceGroup(item)) {
        const found = this.findResourceById(item.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  /**
   * Find a resource group by ID
   */
  findGroupById(
    items: (Resource | ResourceGroup)[],
    id: string
  ): ResourceGroup | undefined {
    for (const item of items) {
      if (isResourceGroup(item)) {
        if (item.id === id) return item;
        const found = this.findGroupById(item.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  /**
   * Find any item (resource or group) by ID
   */
  findById(
    items: (Resource | ResourceGroup)[],
    id: string
  ): Resource | ResourceGroup | undefined {
    return this.findResourceById(items, id) ?? this.findGroupById(items, id);
  }

  /**
   * Add an event to a resource
   */
  addEventToResource(
    items: (Resource | ResourceGroup)[],
    resourceId: string,
    event: SchedulerEvent
  ): (Resource | ResourceGroup)[] {
    return this.mapResources(items, (resource) => {
      if (resource.id === resourceId) {
        return {
          ...resource,
          events: [...(resource.events ?? []), event],
        };
      }
      return resource;
    });
  }

  /**
   * Update an event in a resource
   */
  updateEventInResource(
    items: (Resource | ResourceGroup)[],
    event: SchedulerEvent
  ): (Resource | ResourceGroup)[] {
    return this.mapResources(items, (resource) => {
      const eventIndex = resource.events?.findIndex((e) => e.id === event.id);
      if (eventIndex !== undefined && eventIndex >= 0 && resource.events) {
        const newEvents = [...resource.events];
        newEvents[eventIndex] = event;
        return { ...resource, events: newEvents };
      }
      return resource;
    });
  }

  /**
   * Remove an event from all resources
   */
  removeEvent(
    items: (Resource | ResourceGroup)[],
    eventId: string
  ): (Resource | ResourceGroup)[] {
    return this.mapResources(items, (resource) => {
      if (resource.events?.some((e) => e.id === eventId)) {
        return {
          ...resource,
          events: resource.events.filter((e) => e.id !== eventId),
        };
      }
      return resource;
    });
  }

  /**
   * Move an event from one resource to another
   */
  moveEventToResource(
    items: (Resource | ResourceGroup)[],
    eventId: string,
    newResourceId: string,
    updatedEvent?: Partial<SchedulerEvent>
  ): (Resource | ResourceGroup)[] {
    // Find the event first
    let foundEvent: SchedulerEvent | undefined;
    for (const resource of this.getAllResources(items)) {
      foundEvent = resource.events?.find((e) => e.id === eventId);
      if (foundEvent) break;
    }

    if (!foundEvent) return items;

    // Merge with updates
    const newEvent: SchedulerEvent = {
      ...foundEvent,
      ...updatedEvent,
      resourceId: newResourceId,
    };

    // Remove from old resource and add to new
    let result = this.removeEvent(items, eventId);
    result = this.addEventToResource(result, newResourceId, newEvent);

    return result;
  }

  /**
   * Toggle collapse state of a group
   */
  toggleGroupCollapse(
    items: (Resource | ResourceGroup)[],
    groupId: string
  ): (Resource | ResourceGroup)[] {
    return this.mapGroups(items, (group) => {
      if (group.id === groupId) {
        return { ...group, collapsed: !group.collapsed };
      }
      return group;
    });
  }

  /**
   * Set collapse state of a group
   */
  setGroupCollapse(
    items: (Resource | ResourceGroup)[],
    groupId: string,
    collapsed: boolean
  ): (Resource | ResourceGroup)[] {
    return this.mapGroups(items, (group) => {
      if (group.id === groupId) {
        return { ...group, collapsed };
      }
      return group;
    });
  }

  /**
   * Collapse all groups
   */
  collapseAll(items: (Resource | ResourceGroup)[]): (Resource | ResourceGroup)[] {
    return this.mapGroups(items, (group) => ({ ...group, collapsed: true }));
  }

  /**
   * Expand all groups
   */
  expandAll(items: (Resource | ResourceGroup)[]): (Resource | ResourceGroup)[] {
    return this.mapGroups(items, (group) => ({ ...group, collapsed: false }));
  }

  /**
   * Map over all resources in the hierarchy
   */
  private mapResources(
    items: (Resource | ResourceGroup)[],
    mapper: (resource: Resource) => Resource
  ): (Resource | ResourceGroup)[] {
    return items.map((item) => {
      if (isResource(item)) {
        return mapper(item);
      }
      return {
        ...item,
        children: this.mapResources(item.children, mapper),
      };
    });
  }

  /**
   * Map over all groups in the hierarchy
   */
  private mapGroups(
    items: (Resource | ResourceGroup)[],
    mapper: (group: ResourceGroup) => ResourceGroup
  ): (Resource | ResourceGroup)[] {
    return items.map((item) => {
      if (isResourceGroup(item)) {
        const mappedGroup = mapper(item);
        return {
          ...mappedGroup,
          children: this.mapGroups(mappedGroup.children, mapper),
        };
      }
      return item;
    });
  }

  /**
   * Get the total count of visible resources
   */
  getVisibleResourceCount(
    items: (Resource | ResourceGroup)[],
    collapsedIds: Set<string> = new Set()
  ): number {
    const flattened = this.flatten(items, collapsedIds);
    return flattened.filter((f) => f.visible && isResource(f.item)).length;
  }

  /**
   * Sort resources by order property
   */
  sortByOrder(items: (Resource | ResourceGroup)[]): (Resource | ResourceGroup)[] {
    const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return sorted.map((item) => {
      if (isResourceGroup(item)) {
        return {
          ...item,
          children: this.sortByOrder(item.children),
        };
      }
      return item;
    });
  }
}

/**
 * Singleton instance of ResourceService
 */
export const resourceService = new ResourceService();
