import { SchedulerEvent } from "./scheduler-event";

export interface TimelineTrack {
    index: number;
    events: SchedulerEvent[];
}