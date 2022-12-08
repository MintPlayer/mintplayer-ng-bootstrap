import { SchedulerEvent } from "./scheduler-event";

export interface Resource {
    description: string;
    events: SchedulerEvent[];
}