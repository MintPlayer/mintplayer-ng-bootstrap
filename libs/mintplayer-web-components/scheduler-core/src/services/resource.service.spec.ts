import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceService, resourceService } from './resource.service';
import { Resource, ResourceGroup } from '../models/resource';
import { SchedulerEvent } from '../models/event';

describe('ResourceService', () => {
  let service: ResourceService;

  beforeEach(() => {
    service = new ResourceService();
  });

  const createEvent = (id: string): SchedulerEvent => ({
    id,
    title: `Event ${id}`,
    start: new Date(2025, 0, 15, 9, 0),
    end: new Date(2025, 0, 15, 17, 0),
    color: '#3788d8',
  });

  const createResource = (id: string, events: SchedulerEvent[] = []): Resource => ({
    id,
    title: `Resource ${id}`,
    events,
  });

  const createGroup = (
    id: string,
    children: (Resource | ResourceGroup)[]
  ): ResourceGroup => ({
    id,
    title: `Group ${id}`,
    children,
  });

  const createSampleHierarchy = (): (Resource | ResourceGroup)[] => [
    createGroup('dept-1', [
      createGroup('team-1', [
        createResource('res-1', [createEvent('evt-1')]),
        createResource('res-2', [createEvent('evt-2')]),
      ]),
      createGroup('team-2', [
        createResource('res-3', [createEvent('evt-3')]),
      ]),
    ]),
    createGroup('dept-2', [
      createResource('res-4', [createEvent('evt-4')]),
    ]),
  ];

  describe('flatten', () => {
    it('should flatten nested structure correctly', () => {
      const items = createSampleHierarchy();
      const flattened = service.flatten(items);

      // dept-1, team-1, res-1, res-2, team-2, res-3, dept-2, res-4
      expect(flattened.length).toBe(8);
    });

    it('should set correct depth values', () => {
      const items = createSampleHierarchy();
      const flattened = service.flatten(items);

      const dept1 = flattened.find((f) => f.item.id === 'dept-1');
      const team1 = flattened.find((f) => f.item.id === 'team-1');
      const res1 = flattened.find((f) => f.item.id === 'res-1');

      expect(dept1?.depth).toBe(0);
      expect(team1?.depth).toBe(1);
      expect(res1?.depth).toBe(2);
    });

    it('should respect collapsed state', () => {
      const items: (Resource | ResourceGroup)[] = [
        { ...createGroup('grp-1', [createResource('res-1')]), collapsed: true },
      ];
      const collapsedIds = new Set(['grp-1']);

      const flattened = service.flatten(items, collapsedIds);

      const res1 = flattened.find((f) => f.item.id === 'res-1');
      expect(res1?.visible).toBe(false);
    });

    it('should set all items visible when no collapsed groups', () => {
      const items = createSampleHierarchy();
      const flattened = service.flatten(items);

      expect(flattened.every((f) => f.visible)).toBe(true);
    });

    it('should set correct parentId', () => {
      const items = createSampleHierarchy();
      const flattened = service.flatten(items);

      const res1 = flattened.find((f) => f.item.id === 'res-1');
      expect(res1?.parentId).toBe('team-1');
    });
  });

  describe('getAllResources', () => {
    it('should return all leaf resources', () => {
      const items = createSampleHierarchy();
      const resources = service.getAllResources(items);

      expect(resources.length).toBe(4);
      expect(resources.map((r) => r.id)).toEqual([
        'res-1',
        'res-2',
        'res-3',
        'res-4',
      ]);
    });

    it('should work with deeply nested groups', () => {
      const items: (Resource | ResourceGroup)[] = [
        createGroup('l1', [
          createGroup('l2', [
            createGroup('l3', [
              createResource('deep-res'),
            ]),
          ]),
        ]),
      ];

      const resources = service.getAllResources(items);

      expect(resources.length).toBe(1);
      expect(resources[0].id).toBe('deep-res');
    });

    it('should return empty array for empty input', () => {
      const resources = service.getAllResources([]);
      expect(resources.length).toBe(0);
    });
  });

  describe('getAllEvents', () => {
    it('should return all events from all resources', () => {
      const items = createSampleHierarchy();
      const events = service.getAllEvents(items);

      expect(events.length).toBe(4);
    });
  });

  describe('findResourceById', () => {
    it('should find resource at any depth', () => {
      const items = createSampleHierarchy();

      const res1 = service.findResourceById(items, 'res-1');
      const res4 = service.findResourceById(items, 'res-4');

      expect(res1?.id).toBe('res-1');
      expect(res4?.id).toBe('res-4');
    });

    it('should return undefined for non-existent ID', () => {
      const items = createSampleHierarchy();
      const result = service.findResourceById(items, 'non-existent');

      expect(result).toBeUndefined();
    });

    it('should not return groups', () => {
      const items = createSampleHierarchy();
      const result = service.findResourceById(items, 'dept-1');

      expect(result).toBeUndefined();
    });
  });

  describe('findGroupById', () => {
    it('should find group at any depth', () => {
      const items = createSampleHierarchy();

      const dept1 = service.findGroupById(items, 'dept-1');
      const team1 = service.findGroupById(items, 'team-1');

      expect(dept1?.id).toBe('dept-1');
      expect(team1?.id).toBe('team-1');
    });

    it('should return undefined for non-existent ID', () => {
      const items = createSampleHierarchy();
      const result = service.findGroupById(items, 'non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should find both resources and groups', () => {
      const items = createSampleHierarchy();

      const res1 = service.findById(items, 'res-1');
      const dept1 = service.findById(items, 'dept-1');

      expect(res1?.id).toBe('res-1');
      expect(dept1?.id).toBe('dept-1');
    });
  });

  describe('addEventToResource', () => {
    it('should add event to correct resource', () => {
      const items = createSampleHierarchy();
      const newEvent = createEvent('new-evt');

      const result = service.addEventToResource(items, 'res-1', newEvent);

      const res1 = service.findResourceById(result, 'res-1');
      expect(res1?.events?.length).toBe(2);
      expect(res1?.events?.map((e) => e.id)).toContain('new-evt');
    });

    it('should return new object (immutability)', () => {
      const items = createSampleHierarchy();
      const newEvent = createEvent('new-evt');

      const result = service.addEventToResource(items, 'res-1', newEvent);

      expect(result).not.toBe(items);
    });

    it('should not modify original resource', () => {
      const items = createSampleHierarchy();
      const originalRes1 = service.findResourceById(items, 'res-1');
      const originalLength = originalRes1?.events?.length;

      const newEvent = createEvent('new-evt');
      service.addEventToResource(items, 'res-1', newEvent);

      expect(originalRes1?.events?.length).toBe(originalLength);
    });
  });

  describe('updateEventInResource', () => {
    it('should update existing event', () => {
      const items = createSampleHierarchy();
      const updatedEvent: SchedulerEvent = {
        ...createEvent('evt-1'),
        title: 'Updated Event',
      };

      const result = service.updateEventInResource(items, updatedEvent);

      const res1 = service.findResourceById(result, 'res-1');
      const event = res1?.events?.find((e) => e.id === 'evt-1');
      expect(event?.title).toBe('Updated Event');
    });

    it('should return new object (immutability)', () => {
      const items = createSampleHierarchy();
      const updatedEvent: SchedulerEvent = {
        ...createEvent('evt-1'),
        title: 'Updated Event',
      };

      const result = service.updateEventInResource(items, updatedEvent);

      expect(result).not.toBe(items);
    });
  });

  describe('removeEvent', () => {
    it('should remove event from resource', () => {
      const items = createSampleHierarchy();

      const result = service.removeEvent(items, 'evt-1');

      const res1 = service.findResourceById(result, 'res-1');
      expect(res1?.events?.length).toBe(0);
    });

    it('should not affect other resources', () => {
      const items = createSampleHierarchy();

      const result = service.removeEvent(items, 'evt-1');

      const res2 = service.findResourceById(result, 'res-2');
      expect(res2?.events?.length).toBe(1);
    });
  });

  describe('moveEventToResource', () => {
    it('should move event from one resource to another', () => {
      const items = createSampleHierarchy();

      const result = service.moveEventToResource(items, 'evt-1', 'res-2');

      const res1 = service.findResourceById(result, 'res-1');
      const res2 = service.findResourceById(result, 'res-2');

      expect(res1?.events?.length).toBe(0);
      expect(res2?.events?.length).toBe(2);
      expect(res2?.events?.map((e) => e.id)).toContain('evt-1');
    });

    it('should apply event updates during move', () => {
      const items = createSampleHierarchy();

      const result = service.moveEventToResource(items, 'evt-1', 'res-2', {
        title: 'Moved Event',
      });

      const res2 = service.findResourceById(result, 'res-2');
      const movedEvent = res2?.events?.find((e) => e.id === 'evt-1');
      expect(movedEvent?.title).toBe('Moved Event');
    });
  });

  describe('toggleGroupCollapse', () => {
    it('should toggle collapsed state correctly', () => {
      const items: (Resource | ResourceGroup)[] = [
        { ...createGroup('grp-1', [createResource('res-1')]), collapsed: false },
      ];

      const result = service.toggleGroupCollapse(items, 'grp-1');

      const grp = service.findGroupById(result, 'grp-1');
      expect(grp?.collapsed).toBe(true);
    });

    it('should toggle from collapsed to expanded', () => {
      const items: (Resource | ResourceGroup)[] = [
        { ...createGroup('grp-1', [createResource('res-1')]), collapsed: true },
      ];

      const result = service.toggleGroupCollapse(items, 'grp-1');

      const grp = service.findGroupById(result, 'grp-1');
      expect(grp?.collapsed).toBe(false);
    });
  });

  describe('setGroupCollapse', () => {
    it('should set collapsed state to true', () => {
      const items: (Resource | ResourceGroup)[] = [
        { ...createGroup('grp-1', [createResource('res-1')]), collapsed: false },
      ];

      const result = service.setGroupCollapse(items, 'grp-1', true);

      const grp = service.findGroupById(result, 'grp-1');
      expect(grp?.collapsed).toBe(true);
    });

    it('should set collapsed state to false', () => {
      const items: (Resource | ResourceGroup)[] = [
        { ...createGroup('grp-1', [createResource('res-1')]), collapsed: true },
      ];

      const result = service.setGroupCollapse(items, 'grp-1', false);

      const grp = service.findGroupById(result, 'grp-1');
      expect(grp?.collapsed).toBe(false);
    });
  });

  describe('collapseAll', () => {
    it('should collapse all groups', () => {
      const items = createSampleHierarchy();

      const result = service.collapseAll(items);

      const dept1 = service.findGroupById(result, 'dept-1');
      const team1 = service.findGroupById(result, 'team-1');
      const dept2 = service.findGroupById(result, 'dept-2');

      expect(dept1?.collapsed).toBe(true);
      expect(team1?.collapsed).toBe(true);
      expect(dept2?.collapsed).toBe(true);
    });
  });

  describe('expandAll', () => {
    it('should expand all groups', () => {
      const items: (Resource | ResourceGroup)[] = [
        {
          ...createGroup('grp-1', [
            { ...createGroup('grp-2', [createResource('res-1')]), collapsed: true },
          ]),
          collapsed: true,
        },
      ];

      const result = service.expandAll(items);

      const grp1 = service.findGroupById(result, 'grp-1');
      const grp2 = service.findGroupById(result, 'grp-2');

      expect(grp1?.collapsed).toBe(false);
      expect(grp2?.collapsed).toBe(false);
    });
  });

  describe('getVisibleResourceCount', () => {
    it('should count visible resources', () => {
      const items = createSampleHierarchy();
      const count = service.getVisibleResourceCount(items);

      expect(count).toBe(4);
    });

    it('should respect collapsed groups', () => {
      const items = createSampleHierarchy();
      const collapsedIds = new Set(['team-1']);

      const count = service.getVisibleResourceCount(items, collapsedIds);

      // res-1 and res-2 are hidden, res-3 and res-4 are visible
      expect(count).toBe(2);
    });
  });

  describe('sortByOrder', () => {
    it('should sort by order property', () => {
      const items: (Resource | ResourceGroup)[] = [
        { ...createResource('res-3'), order: 3 },
        { ...createResource('res-1'), order: 1 },
        { ...createResource('res-2'), order: 2 },
      ];

      const result = service.sortByOrder(items);

      expect(result[0].id).toBe('res-1');
      expect(result[1].id).toBe('res-2');
      expect(result[2].id).toBe('res-3');
    });

    it('should sort nested children', () => {
      const items: (Resource | ResourceGroup)[] = [
        createGroup('grp-1', [
          { ...createResource('res-2'), order: 2 },
          { ...createResource('res-1'), order: 1 },
        ]),
      ];

      const result = service.sortByOrder(items);
      const grp = result[0] as ResourceGroup;

      expect(grp.children[0].id).toBe('res-1');
      expect(grp.children[1].id).toBe('res-2');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(resourceService).toBeInstanceOf(ResourceService);
    });
  });
});
