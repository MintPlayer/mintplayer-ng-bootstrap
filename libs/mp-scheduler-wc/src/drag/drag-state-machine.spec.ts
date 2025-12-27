import { DragStateMachine } from './drag-state-machine';
import { DragMachineEvent, PointerTarget } from './drag-types';
import { SchedulerEvent, TimeSlot } from '@mintplayer/scheduler-core';

describe('DragStateMachine', () => {
  let machine: DragStateMachine;

  // Test helpers
  const createSlot = (startHour: number, endHour: number): TimeSlot => ({
    start: new Date(2024, 0, 1, startHour, 0, 0),
    end: new Date(2024, 0, 1, endHour, 0, 0),
  });

  const createEvent = (id: string, startHour: number, endHour: number): SchedulerEvent => ({
    id,
    title: `Event ${id}`,
    start: new Date(2024, 0, 1, startHour, 0, 0),
    end: new Date(2024, 0, 1, endHour, 0, 0),
  });

  const createPointerDown = (
    target: PointerTarget,
    x = 100,
    y = 100,
    slot: TimeSlot | null = createSlot(9, 10)
  ): DragMachineEvent => ({
    type: 'POINTER_DOWN',
    target,
    position: { x, y },
    slot,
  });

  const createPointerMove = (
    x: number,
    y: number,
    slot: TimeSlot | null = createSlot(10, 11)
  ): DragMachineEvent => ({
    type: 'POINTER_MOVE',
    position: { x, y },
    slot,
  });

  const createPointerUp = (x = 100, y = 100): DragMachineEvent => ({
    type: 'POINTER_UP',
    position: { x, y },
  });

  const cancel = (): DragMachineEvent => ({ type: 'CANCEL' });

  beforeEach(() => {
    machine = new DragStateMachine({ dragThreshold: 5 });
  });

  describe('initial state', () => {
    it('should start in idle phase', () => {
      expect(machine.getPhase()).toBe('idle');
    });

    it('should not be active', () => {
      expect(machine.isActive()).toBe(false);
    });

    it('should not be pending', () => {
      expect(machine.isPending()).toBe(false);
    });

    it('should not be dragging', () => {
      expect(machine.isDragging()).toBe(false);
    });

    it('should have no preview', () => {
      expect(machine.getPreview()).toBeNull();
    });
  });

  describe('idle → pending transitions', () => {
    it('should transition to pending on pointer down on slot', () => {
      const target: PointerTarget = { type: 'slot' };
      machine.send(createPointerDown(target));

      expect(machine.getPhase()).toBe('pending');
      expect(machine.isPending()).toBe(true);
    });

    it('should transition to pending on pointer down on event', () => {
      const event = createEvent('1', 9, 10);
      const target: PointerTarget = { type: 'event', event };
      machine.send(createPointerDown(target));

      expect(machine.getPhase()).toBe('pending');
    });

    it('should transition to pending on pointer down on resize handle', () => {
      const event = createEvent('1', 9, 10);
      const target: PointerTarget = {
        type: 'resize-handle',
        event,
        resizeHandle: 'end',
      };
      machine.send(createPointerDown(target));

      expect(machine.getPhase()).toBe('pending');
    });

    it('should stay idle on pointer down on invalid target', () => {
      const target: PointerTarget = { type: 'none' };
      machine.send(createPointerDown(target));

      expect(machine.getPhase()).toBe('idle');
    });

    it('should stay idle on pointer down on non-draggable event', () => {
      const event: SchedulerEvent = {
        ...createEvent('1', 9, 10),
        draggable: false,
      };
      const target: PointerTarget = { type: 'event', event };
      machine.send(createPointerDown(target));

      expect(machine.getPhase()).toBe('idle');
    });

    it('should ignore pointer move in idle state', () => {
      machine.send(createPointerMove(200, 200));
      expect(machine.getPhase()).toBe('idle');
    });

    it('should ignore pointer up in idle state', () => {
      machine.send(createPointerUp());
      expect(machine.getPhase()).toBe('idle');
    });
  });

  describe('pending → active transitions', () => {
    beforeEach(() => {
      const target: PointerTarget = { type: 'slot' };
      machine.send(createPointerDown(target, 100, 100));
    });

    it('should stay pending if movement is below threshold', () => {
      machine.send(createPointerMove(102, 102)); // ~2.8 pixels
      expect(machine.getPhase()).toBe('pending');
    });

    it('should transition to active when movement exceeds threshold', () => {
      machine.send(createPointerMove(110, 100)); // 10 pixels
      expect(machine.getPhase()).toBe('active');
      expect(machine.isActive()).toBe(true);
    });

    it('should have preview in active state', () => {
      machine.send(createPointerMove(110, 100));
      expect(machine.getPreview()).not.toBeNull();
    });

    it('should be dragging in active state', () => {
      machine.send(createPointerMove(110, 100));
      expect(machine.isDragging()).toBe(true);
    });
  });

  describe('pending → idle transitions (click)', () => {
    beforeEach(() => {
      const event = createEvent('1', 9, 10);
      const target: PointerTarget = { type: 'event', event };
      machine.send(createPointerDown(target, 100, 100));
    });

    it('should transition to completing on pointer up before threshold', () => {
      machine.send(createPointerUp(101, 101));
      expect(machine.getPhase()).toBe('completing');
    });

    it('should mark result as click when released before threshold', () => {
      machine.send(createPointerUp(101, 101));
      const result = machine.getCompletionResult();
      expect(result?.wasClick).toBe(true);
    });

    it('should return to idle on cancel', () => {
      machine.send(cancel());
      expect(machine.getPhase()).toBe('idle');
    });
  });

  describe('active state behavior', () => {
    beforeEach(() => {
      const target: PointerTarget = { type: 'slot' };
      machine.send(createPointerDown(target, 100, 100, createSlot(9, 10)));
      machine.send(createPointerMove(110, 100, createSlot(10, 11)));
    });

    it('should update preview on pointer move', () => {
      const preview1 = machine.getPreview();
      machine.send(createPointerMove(120, 100, createSlot(11, 12)));
      const preview2 = machine.getPreview();

      expect(preview1).not.toEqual(preview2);
    });

    it('should keep current state if slot is null', () => {
      const state1 = machine.getState();
      machine.send(createPointerMove(120, 100, null));
      const state2 = machine.getState();

      expect(state1).toEqual(state2);
    });

    it('should transition to completing on pointer up', () => {
      machine.send(createPointerUp());
      expect(machine.getPhase()).toBe('completing');
    });

    it('should return to idle on cancel', () => {
      machine.send(cancel());
      expect(machine.getPhase()).toBe('idle');
    });
  });

  describe('completing state', () => {
    beforeEach(() => {
      const target: PointerTarget = { type: 'slot' };
      machine.send(createPointerDown(target, 100, 100, createSlot(9, 10)));
      machine.send(createPointerMove(110, 100, createSlot(10, 11)));
      machine.send(createPointerUp());
    });

    it('should have completion result', () => {
      expect(machine.getCompletionResult()).not.toBeNull();
    });

    it('should mark result as not a click for actual drag', () => {
      const result = machine.getCompletionResult();
      expect(result?.wasClick).toBe(false);
    });

    it('should return to idle when result is consumed', () => {
      machine.consumeResult();
      expect(machine.getPhase()).toBe('idle');
    });

    it('should return result when consuming', () => {
      const result = machine.consumeResult();
      expect(result).not.toBeNull();
      expect(result?.type).toBe('create');
    });

    it('should return null on second consume', () => {
      machine.consumeResult();
      expect(machine.consumeResult()).toBeNull();
    });
  });

  describe('create operation preview', () => {
    it('should extend selection from start to current slot', () => {
      const target: PointerTarget = { type: 'slot' };
      machine.send(createPointerDown(target, 100, 100, createSlot(9, 10)));
      machine.send(createPointerMove(110, 100, createSlot(11, 12)));

      const preview = machine.getPreview();
      expect(preview?.start.getHours()).toBe(9);
      expect(preview?.end.getHours()).toBe(12);
    });

    it('should work when dragging backwards', () => {
      const target: PointerTarget = { type: 'slot' };
      machine.send(createPointerDown(target, 100, 100, createSlot(11, 12)));
      machine.send(createPointerMove(110, 100, createSlot(9, 10)));

      const preview = machine.getPreview();
      expect(preview?.start.getHours()).toBe(9);
      expect(preview?.end.getHours()).toBe(12);
    });
  });

  describe('move operation preview', () => {
    it('should preserve event duration', () => {
      const event = createEvent('1', 9, 11); // 2 hour event
      const target: PointerTarget = { type: 'event', event };

      machine.send(createPointerDown(target, 100, 100, createSlot(9, 10)));
      machine.send(createPointerMove(110, 100, createSlot(12, 13)));

      const preview = machine.getPreview();
      const duration =
        (preview!.end.getTime() - preview!.start.getTime()) / (1000 * 60 * 60);
      expect(duration).toBe(2);
    });

    it('should offset event by drag distance', () => {
      const event = createEvent('1', 9, 11);
      const target: PointerTarget = { type: 'event', event };

      machine.send(createPointerDown(target, 100, 100, createSlot(9, 10)));
      machine.send(createPointerMove(110, 100, createSlot(12, 13))); // +3 hours

      const preview = machine.getPreview();
      expect(preview?.start.getHours()).toBe(12); // 9 + 3
      expect(preview?.end.getHours()).toBe(14); // 11 + 3
    });
  });

  describe('resize-start operation preview', () => {
    it('should keep end fixed while moving start', () => {
      const event = createEvent('1', 9, 12);
      const target: PointerTarget = {
        type: 'resize-handle',
        event,
        resizeHandle: 'start',
      };

      machine.send(createPointerDown(target, 100, 100, createSlot(9, 10)));
      machine.send(createPointerMove(110, 100, createSlot(10, 11)));

      const preview = machine.getPreview();
      expect(preview?.start.getHours()).toBe(10);
      expect(preview?.end.getHours()).toBe(12); // unchanged
    });

    it('should enforce minimum duration', () => {
      const event = createEvent('1', 9, 10); // 1 hour event
      const target: PointerTarget = {
        type: 'resize-handle',
        event,
        resizeHandle: 'start',
      };

      machine.send(createPointerDown(target, 100, 100, createSlot(9, 10)));
      // Try to drag start past end
      machine.send(createPointerMove(110, 100, createSlot(11, 12)));

      const preview = machine.getPreview();
      // Start should be clamped to maintain min duration (30 min default)
      expect(preview!.start.getTime()).toBeLessThan(preview!.end.getTime());
    });
  });

  describe('resize-end operation preview', () => {
    it('should keep start fixed while moving end', () => {
      const event = createEvent('1', 9, 11);
      const target: PointerTarget = {
        type: 'resize-handle',
        event,
        resizeHandle: 'end',
      };

      machine.send(createPointerDown(target, 100, 100, createSlot(11, 12)));
      machine.send(createPointerMove(110, 100, createSlot(13, 14)));

      const preview = machine.getPreview();
      expect(preview?.start.getHours()).toBe(9); // unchanged
      expect(preview?.end.getHours()).toBe(14);
    });

    it('should enforce minimum duration', () => {
      const event = createEvent('1', 9, 10); // 1 hour event
      const target: PointerTarget = {
        type: 'resize-handle',
        event,
        resizeHandle: 'end',
      };

      machine.send(createPointerDown(target, 100, 100, createSlot(10, 11)));
      // Try to drag end before start
      machine.send(createPointerMove(110, 100, createSlot(8, 9)));

      const preview = machine.getPreview();
      // End should be clamped to maintain min duration
      expect(preview!.end.getTime()).toBeGreaterThan(preview!.start.getTime());
    });
  });

  describe('reset', () => {
    it('should return to idle from any state', () => {
      const target: PointerTarget = { type: 'slot' };
      machine.send(createPointerDown(target));
      machine.send(createPointerMove(110, 100));

      machine.reset();

      expect(machine.getPhase()).toBe('idle');
      expect(machine.isActive()).toBe(false);
      expect(machine.getPreview()).toBeNull();
    });
  });
});
