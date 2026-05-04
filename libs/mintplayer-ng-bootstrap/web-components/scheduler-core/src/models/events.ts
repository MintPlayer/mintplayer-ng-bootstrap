import { SchedulerEvent } from './event';
import { Resource } from './resource';
import { ViewType } from './types';

/**
 * Base event detail interface
 */
export interface BaseEventDetail {
  /** Original DOM event */
  originalEvent?: Event;
}

/**
 * Event click event detail
 */
export interface EventClickDetail extends BaseEventDetail {
  /** The clicked event */
  event: SchedulerEvent;
}

/**
 * Event create event detail
 */
export interface EventCreateDetail extends BaseEventDetail {
  /** The newly created event */
  event: SchedulerEvent;
  /** Resource the event was created on (if applicable) */
  resource?: Resource;
}

/**
 * Event update event detail
 */
export interface EventUpdateDetail extends BaseEventDetail {
  /** The updated event */
  event: SchedulerEvent;
  /** The event before the update */
  oldEvent: SchedulerEvent;
}

/**
 * Event delete event detail
 */
export interface EventDeleteDetail extends BaseEventDetail {
  /** The deleted event */
  event: SchedulerEvent;
}

/**
 * Date click event detail
 */
export interface DateClickDetail extends BaseEventDetail {
  /** The clicked date */
  date: Date;
  /** Resource at the clicked location (if applicable) */
  resource?: Resource;
}

/**
 * Date select event detail
 */
export interface DateSelectDetail extends BaseEventDetail {
  /** Start of the selected range */
  start: Date;
  /** End of the selected range */
  end: Date;
  /** Resource at the selected location (if applicable) */
  resource?: Resource;
}

/**
 * View change event detail
 */
export interface ViewChangeDetail {
  /** The new view */
  view: ViewType;
  /** The current date in the new view */
  date: Date;
}

/**
 * Custom event map for the scheduler web component
 */
export interface SchedulerEventMap {
  'event-click': CustomEvent<EventClickDetail>;
  'event-dblclick': CustomEvent<EventClickDetail>;
  'event-create': CustomEvent<EventCreateDetail>;
  'event-update': CustomEvent<EventUpdateDetail>;
  'event-delete': CustomEvent<EventDeleteDetail>;
  'date-click': CustomEvent<DateClickDetail>;
  'date-select': CustomEvent<DateSelectDetail>;
  'view-change': CustomEvent<ViewChangeDetail>;
}
