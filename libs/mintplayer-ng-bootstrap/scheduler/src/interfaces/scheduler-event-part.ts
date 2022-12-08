import { SchedulerEvent } from "./scheduler-event";

export interface SchedulerEventPart {
    start: Date;
    end: Date;
    event: SchedulerEvent | null;
}