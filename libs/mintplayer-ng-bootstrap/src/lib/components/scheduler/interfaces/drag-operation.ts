import { EDragOperation } from "../enums/drag-operation";
import { SchedulerEvent } from "./scheduler-event";

export interface DragOperation {
    operation: EDragOperation;
    event: SchedulerEvent;
    meta: any;
}