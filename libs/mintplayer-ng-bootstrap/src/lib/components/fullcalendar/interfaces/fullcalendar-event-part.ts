import { FullcalendarEvent } from "./fullcalendar-event";

export interface FullCalendarEventPart {
    start: Date;
    end: Date;
    event: FullcalendarEvent;
}