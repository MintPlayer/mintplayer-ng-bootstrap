import { FullcalendarEvent } from "./fullcalendar-event";
import { FullCalendarEventPart } from "./fullcalendar-event-part";

export interface FullcalendarEventWithParts {
    event: FullcalendarEvent;
    parts: FullCalendarEventPart[];
}