import { SchedulerEvent } from "./scheduler-event";
import { SchedulerEventPart } from "./scheduler-event-part";

export interface SchedulerEventWithParts {
    event: SchedulerEvent;
    parts: SchedulerEventPart[];
}