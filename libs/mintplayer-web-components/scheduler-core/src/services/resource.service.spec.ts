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

  describe('collapse leaves the other groups alone', () => {
    it('toggling one nested group changes only that group', () => {
      const items = createSampleHierarchy();
      const result = service.toggleGroupCollapse(items, 'team-1');
      expect(service.findGroupById(result, 'team-1')?.collapsed).toBe(true);
      expect(service.findGroupById(result, 'dept-1')?.collapsed).toBeFalsy();
      expect(service.findGroupById(result, 'dept-2')?.collapsed).toBeFalsy();
    });

    it('setting one group keeps the others as they were', () => {
      const items = createSampleHierarchy();
      const result = service.setGroupCollapse(items, 'dept-2', true);
      expect(service.findGroupById(result, 'dept-2')?.collapsed).toBe(true);
      expect(service.findGroupById(result, 'team-1')?.collapsed).toBeFalsy();
    });
  });

  describe('sortByOrder without explicit orders', () => {
    it('treats a missing order as 0 and keeps ties in their authored order', () => {
      const items: (Resource | ResourceGroup)[] = [
        { ...createResource('b'), order: 1 },
        createResource('a'),
        { ...createResource('c'), order: -1 },
        createResource('d'),
      ];
      expect(service.sortByOrder(items).map((i) => i.id)).toEqual(['c', 'a', 'd', 'b']);
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
