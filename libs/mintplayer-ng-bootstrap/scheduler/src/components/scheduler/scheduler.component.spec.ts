import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  Resource,
  ResourceGroup,
  SchedulerEvent,
  SchedulerOptions,
  ViewType,
} from '@mintplayer/web-components/scheduler-core';
import type { MpScheduler } from '@mintplayer/web-components/scheduler';
import { BsSchedulerComponent } from './scheduler.component';

/**
 * `<bs-scheduler>` is a bridge: inputs and models are assigned to the
 * `<mp-scheduler>` element as properties, every WC event is re-emitted on its
 * output, the two-way models follow the element's own navigation and
 * selection, and the public methods delegate to the element.
 */

const EVENT: SchedulerEvent = {
  id: 'e1',
  title: 'Standup',
  start: new Date(2025, 0, 6, 9, 0),
  end: new Date(2025, 0, 6, 9, 30),
};

@Component({
  imports: [BsSchedulerComponent],
  template: `
    <bs-scheduler #sched
      [events]="events()" [resources]="resources()" [options]="options()"
      [readonly]="readonly()" [eventEditor]="eventEditor()"
      [(view)]="view" [(date)]="date" [(selectedEvent)]="selectedEvent" [(selectedRange)]="selectedRange"
      (eventSelected)="log('eventSelected', $event)" (eventDblClick)="log('eventDblClick', $event)"
      (eventCreate)="log('eventCreate', $event)" (eventUpdate)="log('eventUpdate', $event)"
      (eventDelete)="log('eventDelete', $event)" (dateClick)="log('dateClick', $event)"
      (selectionChange)="log('selectionChange', $event)" (resourceCreate)="log('resourceCreate', $event)"
      (groupCreate)="log('groupCreate', $event)" (resourceUpdate)="log('resourceUpdate', $event)"
      (resourceDelete)="log('resourceDelete', $event)"
    ></bs-scheduler>`,
})
class HostComponent {
  readonly events = signal<SchedulerEvent[]>([EVENT]);
  readonly resources = signal<(Resource | ResourceGroup)[]>([]);
  readonly options = signal<Partial<SchedulerOptions>>({});
  readonly readonly = signal(false);
  readonly eventEditor = signal(true);
  readonly view = signal<ViewType>('week');
  readonly date = signal(new Date(2025, 0, 6));
  readonly selectedEvent = signal<SchedulerEvent | null>(null);
  readonly selectedRange = signal<{ start: Date; end: Date } | null>(null);
  readonly emitted: [string, unknown][] = [];
  log(name: string, detail: unknown): void {
    this.emitted.push([name, detail]);
  }
}

describe('BsSchedulerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const host = () => fixture.componentInstance;
  const wc = () => fixture.nativeElement.querySelector('mp-scheduler') as MpScheduler;
  const wrapper = () =>
    fixture.debugElement.children[0].componentInstance as BsSchedulerComponent;
  const fire = (type: string, detail: unknown) => {
    wc().dispatchEvent(new CustomEvent(type, { detail }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  describe('inputs reach the element', () => {
    it('assigns the initial inputs and models as properties', () => {
      expect(wc().events).toEqual([EVENT]);
      expect(wc().view).toBe('week');
      expect(wc().date).toEqual(new Date(2025, 0, 6));
    });

    it('re-assigns a property when its input changes', () => {
      const group: ResourceGroup = { id: 'g', title: 'Team', children: [] };
      host().resources.set([group]);
      host().options.set({ locale: 'nl-BE' });
      host().view.set('month');
      host().selectedEvent.set(EVENT);
      fixture.detectChanges();
      expect(wc().resources).toEqual([group]);
      expect(wc().options.locale).toBe('nl-BE');
      expect(wc().view).toBe('month');
      expect(wc().selectedEvent?.id).toBe('e1');
    });

    // The element answers a view write with a view-change carrying its CURRENT
    // date. Taking that as navigation would overwrite a date the consumer set
    // in the same tick ("show the day view of 3 Feb" landing on the old date).
    it('keeps a view and a date the consumer sets together', () => {
      const date = new Date(2025, 1, 3);
      host().view.set('day');
      host().date.set(date);
      fixture.detectChanges();
      expect(host().view()).toBe('day');
      expect(host().date()).toBe(date);
      expect(wc().view).toBe('day');
      expect(wc().date.getTime()).toBe(date.getTime());
    });

    it('maps readonly onto a present-or-absent attribute', () => {
      expect(wc().hasAttribute('readonly')).toBe(false);
      host().readonly.set(true);
      fixture.detectChanges();
      expect(wc().getAttribute('readonly')).toBe('');
    });

    it('writes the event-editor switch as a literal true/false', () => {
      expect(wc().getAttribute('event-editor')).toBe('true');
      host().eventEditor.set(false);
      fixture.detectChanges();
      expect(wc().getAttribute('event-editor')).toBe('false');
    });
  });

  describe('WC events are re-emitted on the outputs', () => {
    const plain: [string, string][] = [
      ['event-dblclick', 'eventDblClick'],
      ['event-create', 'eventCreate'],
      ['event-update', 'eventUpdate'],
      ['event-delete', 'eventDelete'],
      ['date-click', 'dateClick'],
      ['resource-create', 'resourceCreate'],
      ['group-create', 'groupCreate'],
      ['resource-update', 'resourceUpdate'],
      ['resource-delete', 'resourceDelete'],
    ];

    it.each(plain)('forwards %s as (%s) with the detail unchanged', (type, output) => {
      const detail = { marker: type };
      fire(type, detail);
      expect(host().emitted).toEqual([[output, detail]]);
    });

    it('forwards event-selected and adopts the event as the selectedEvent model', () => {
      const detail = { event: EVENT };
      fire('event-selected', detail);
      expect(host().emitted[0]).toEqual(['eventSelected', detail]);
      expect(host().selectedEvent()).toBe(EVENT);
    });

    it('forwards selection-change and adopts both selection dimensions', () => {
      const range = { start: new Date(2025, 0, 7, 10), end: new Date(2025, 0, 7, 11) };
      const detail = { selectedEvent: null, range, view: 'week' };
      fire('selection-change', detail);
      expect(host().emitted).toEqual([['selectionChange', detail]]);
      expect(host().selectedEvent()).toBeNull();
      expect(host().selectedRange()).toBe(range);
    });

    // Internal navigation (prev/next/today, the view switcher) reaches the
    // consumer only through view-change; the models must follow it.
    it('writes view-change back into both the view and date models', () => {
      const date = new Date(2025, 1, 3);
      fire('view-change', { view: 'day', date });
      expect(host().view()).toBe('day');
      expect(host().date()).toBe(date);
      expect(host().emitted).toEqual([]);
    });

    it('stops listening once destroyed', () => {
      const el = wc();
      fixture.destroy();
      el.dispatchEvent(new CustomEvent('event-create', { detail: {} }));
      expect(host().emitted).toEqual([]);
    });
  });

  describe('methods delegate to the element', () => {
    it.each(['next', 'prev', 'today', 'clearSelection', 'refetchEvents'] as const)(
      '%s() calls through',
      (method) => {
        const spy = vi.spyOn(wc(), method).mockImplementation(() => undefined);
        wrapper()[method]();
        expect(spy).toHaveBeenCalledTimes(1);
      },
    );

    it('passes the argument through for gotoDate, changeView and the event CRUD calls', () => {
      const el = wc();
      const date = new Date(2025, 5, 1);
      const spies = {
        gotoDate: vi.spyOn(el, 'gotoDate').mockImplementation(() => undefined),
        changeView: vi.spyOn(el, 'changeView').mockImplementation(() => undefined),
        addEvent: vi.spyOn(el, 'addEvent').mockImplementation(() => undefined),
        updateEvent: vi.spyOn(el, 'updateEvent').mockImplementation(() => undefined),
        removeEvent: vi.spyOn(el, 'removeEvent').mockImplementation(() => undefined),
      };
      wrapper().gotoDate(date);
      wrapper().changeView('year');
      wrapper().addEvent(EVENT);
      wrapper().updateEvent(EVENT);
      wrapper().removeEvent('e1');
      expect(spies.gotoDate).toHaveBeenCalledWith(date);
      expect(spies.changeView).toHaveBeenCalledWith('year');
      expect(spies.addEvent).toHaveBeenCalledWith(EVENT);
      expect(spies.updateEvent).toHaveBeenCalledWith(EVENT);
      expect(spies.removeEvent).toHaveBeenCalledWith('e1');
    });

    it('lets the models follow navigation the methods cause', () => {
      wrapper().changeView('day');
      fixture.detectChanges();
      wrapper().next();
      fixture.detectChanges();
      expect(host().view()).toBe('day');
      expect(host().date().getDate()).toBe(7);
    });

    it('returns what the element finds for getEventById', () => {
      expect(wrapper().getEventById('e1')?.title).toBe('Standup');
      expect(wrapper().getEventById('missing')).toBeNull();
    });
  });
});
