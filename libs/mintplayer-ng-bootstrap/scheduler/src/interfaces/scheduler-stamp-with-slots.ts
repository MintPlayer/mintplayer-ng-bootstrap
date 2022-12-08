import { TimeSlot } from "./time-slot";

export interface SchedulerStampWithSlots {
    /** Some meta information, eg. the date or time that all timeslots have in common. */
    stamp: Date;

    slots: TimeSlot[];
}